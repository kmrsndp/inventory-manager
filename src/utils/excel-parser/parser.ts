/**
 * parser.ts
 * TypeScript implementation of the Excel parsing logic used to generate REGISTER_2_structured_v5.xlsx
 *
 * - Reads a raw Excel register (messy layout with month header rows and wide attendance grid)
 * - Detects month header rows and infers year context (using column B dates as primary source)
 * - Detects plan column (NO. OF MONTHS, e.g., 1M/3M/6M/12) by scanning columns
 * - Extracts per-row: name, mobile, planRaw, startDate, attendance dates (long-form)
 * - Normalizes mobile numbers and maps planRaw -> planType/planMonths
 * - Produces structured output: members[], attendance[], manualReview[], diagnostics
 *
 * Usage:
 *   node -r ts-node/register parser.ts /path/to/REGISTER.xlsx
 *
 * Dependencies:
 *   npm i xlsx date-fns uuid
 *   (optionally) npm i firebase-admin --save to enable Firestore uploader (see TODO in file)
 */

import * as XLSX from 'xlsx';
import { parse as dfParse, isValid as dfIsValid, addMonths, format as dfFormat } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export type Member = {
  id: string;
  name: string;
  mobile: string; // raw mobile cell value or 'NA'
  mobileNormalized: string; // normalized digits or 'NA'
  planRaw: string | null; // raw token from sheet (e.g., "1M", "3M")
  planType: string | null;
  planMonths: number | null;
  startDate: string | null; // ISO yyyy-mm-dd
  lastAttendance: string | null; // ISO
  nextExpectedAttendance: string | null; // ISO
  nextPaymentDueByPlan: string | null; // ISO
  attendedMonths: string[]; // YYYY-MM string list
  attendanceCount: number;
  importMonth: string; // e.g., FEBRUARY-2023 or UNKNOWN
  importMonthISO: string; // e.g., 2023-02 or ''
  needsReview?: boolean;
};

export type AttendanceRow = {
  member_mobile: string;
  member_name: string;
  attendance_date: string; // ISO date
  attended_month: string; // YYYY-MM
  import_month: string;
};

export type ManualReviewRow = {
  row_index: number;
  name?: string;
  mobile_candidate?: string;
  mobile_normalized?: string;
  planRaw?: string;
  importMonth?: string;
  reason?: string;
};

export type Diagnostics = {
  detectedHeaders: { row_idx: number; month: string; year: number }[];
  planDetection: { bestCol: number | null; counts: [number, number][] };
  rawRows: number;
  rawCols: number;
};

// --- Helpers ---

function normalizeMobile(s: any): string | null {
  if (s === undefined || s === null) return null;
  const str = String(s);
  const digits = str.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.slice(-10);
  }
  if (digits.length === 10) return digits;
  if (digits.length >= 8) return digits;
  return null;
}

function tryParseDate(cell: any): string | null {
  if (cell === undefined || cell === null) return null;
  // Excel serial number: if number and integer-like > 18000 treat specially
  if (typeof cell === 'number') {
    try {
      // Let xlsx help by converting via utils
      const d = XLSX.SSF.parse_date_code(cell);
      if (d && d.y) {
        const iso = new Date(d.y, d.m - 1, d.d).toISOString().slice(0, 10);
        return iso;
      }
    } catch (e) {
      // fallthrough
    }
  }
  const s = String(cell).trim();
  if (s === '' || s.toLowerCase().startsWith('x')) return null;
  // Try Date parsing using Date constructor and fallbacks of common formats
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  // try common formats - use simple heuristics
  const patterns = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // yyyy-mm-dd
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // dd/mm/yyyy or mm/dd/yyyy ambiguous
    /^(\d{2})-(\d{2})-(\d{4})$/,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) {
      // last group year
      let iso = null;
      if (p === patterns[0]) {
        iso = `${m[1]}-${m[2]}-${m[3]}`;
      } else {
        // assume day/month/year
        iso = `${m[3]}-${m[2]}-${m[1]}`;
      }
      const d2 = new Date(iso);
      if (!isNaN(d2.getTime())) return d2.toISOString().slice(0, 10);
    }
  }
  // as last resort try Date.parse via Date constructor already tried; give up
  return null;
}

function mapPlanRaw(pr: string | null): { planType: string | null; planMonths: number | null } {
  if (!pr) return { planType: null, planMonths: null };
  const s = String(pr).toUpperCase().replace(/\s+/g, '').replace(/MONTHS?|MTHS?/g, 'M');
  const digits = s.replace(/\D/g, '');
  switch (digits) {
    case '1': return { planType: 'Monthly', planMonths: 1 };
    case '3': return { planType: 'Quarterly', planMonths: 3 };
    case '6': return { planType: 'Half-Yearly', planMonths: 6 };
    case '12': return { planType: 'Yearly', planMonths: 12 };
    default: return { planType: null, planMonths: null };
  }
}

// Detect month header in a row
const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
function detectMonthHeaderInRow(rowValues: any[]): string | null {
  if (!Array.isArray(rowValues)) {
    return null;
  }
  for (const cell of rowValues) {
    if (cell === undefined || cell === null) continue;
    const s = String(cell).toLowerCase();
    for (const m of MONTHS) {
      if (s.includes(m)) return m.toUpperCase();
    }
  }
  return null;
}

function isColumnHeaderRow(row: any[]): boolean {
  if (!Array.isArray(row)) return false;
  const headerKeywords = ['NAME', 'CONTACT', 'DATE', 'MONTHS', 'SR NO'];
  let matchCount = 0;
  for (const cell of row) {
    if (typeof cell !== 'string') continue;
    const s = String(cell).toUpperCase();
    for (const keyword of headerKeywords) {
      if (s.includes(keyword)) {
        matchCount++;
        break;
      }
    }
  }
  return matchCount >= 3;
}

// --- Main parse function ---
export function parseExcelToStructured(filePath: string): {
  members: Member[];
  attendance: AttendanceRow[];
  manualReview: ManualReviewRow[];
  diagnostics: Diagnostics;
} {
  if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath);
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: -1, raw: false, defval: '' });

  const rowsCount = rawRows.length;
  const colsCount = rawRows.reduce((acc, r) => Math.max(acc, (Array.isArray(r) ? r.length : 0)), 0);

  const headerCandidates: { idx: number; month: string }[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i] as any[];
    const mh = detectMonthHeaderInRow(row || []);
    if (mh) headerCandidates.push({ idx: i, month: mh });
  }

  const headersWithYear: { row_idx: number; month: string; year: number }[] = [];
  let prevYear: number | null = null;
  for (let h = 0; h < headerCandidates.length; h++) {
    const { idx, month } = headerCandidates[h];
    let inferredYear: number | null = null;
    const row = rawRows[idx] as any[];
    for (const cell of row) {
      if (typeof cell === 'string') {
        const m = cell.match(/(19|20)\d{2}/);
        if (m) {
          inferredYear = parseInt(m[0], 10);
          break;
        }
      } else if (cell instanceof Date) {
        inferredYear = cell.getFullYear();
        break;
      }
    }
    if (!inferredYear) {
      for (let r = idx + 1; r <= Math.min(idx + 30, rawRows.length - 1); r++) {
        const maybe = rawRows[r] && rawRows[r][1];
        const tryYear = tryParseDate(maybe);
        if (tryYear) {
          inferredYear = parseInt(tryYear.slice(0, 4), 10);
          break;
        }
      }
    }
    if (!inferredYear) {
      for (let r = idx + 1; r <= Math.min(idx + 30, rawRows.length - 1); r++) {
        const row2 = rawRows[r] as any[];
        for (const cell of row2) {
          const tryYear = tryParseDate(cell);
          if (tryYear) {
            inferredYear = parseInt(tryYear.slice(0, 4), 10);
            break;
          }
        }
        if (inferredYear) break;
      }
    }
    if (!inferredYear && h === 0 && idx === 1) inferredYear = 2023;
    if (!inferredYear) inferredYear = prevYear || new Date().getFullYear();
    prevYear = inferredYear;
    headersWithYear.push({ row_idx: idx, month, year: inferredYear });
  }

  const rowToImport: { [rowIdx: number]: { importMonth: string; importMonthISO: string } } = {};
  for (let hi = 0; hi < headersWithYear.length; hi++) {
    const header = headersWithYear[hi];
    const start = header.row_idx + 1;
    const end = (hi + 1 < headersWithYear.length) ? (headersWithYear[hi + 1].row_idx - 1) : (rawRows.length - 1);
    const mm = header.month;
    const yyyy = header.year;
    const mmNum = MONTHS.indexOf(mm.toLowerCase()) + 1;
    const iso = `${yyyy}-${String(mmNum).padStart(2, '0')}`;
    for (let r = start; r <= end; r++) {
      rowToImport[r] = { importMonth: `${mm}-${yyyy}`, importMonthISO: iso };
    }
  }
  let lastKnown: { importMonth: string; importMonthISO: string } | null = null;
  for (let r = 0; r < rawRows.length; r++) {
    if (rowToImport[r]) lastKnown = rowToImport[r];
    else rowToImport[r] = lastKnown || { importMonth: 'UNKNOWN', importMonthISO: '' };
  }

  const planTokenRegex = /^\s*(1|3|6|12)\s*(?:M|MONTHS?|MTHS?)?\s*$/i;
  const colCounts: { col: number; count: number }[] = [];
  const maxCols = colsCount;
  for (let c = 0; c < maxCols; c++) {
    let cnt = 0;
    for (let r = 0; r < rawRows.length; r++) {
      const cell = rawRows[r] && rawRows[r][c];
      if (cell === undefined || cell === null) continue;
      if (typeof cell === 'string' || typeof cell === 'number') {
        if (planTokenRegex.test(String(cell).trim())) cnt++;
      }
    }
    colCounts.push({ col: c, count: cnt });
  }
  colCounts.sort((a, b) => b.count - a.count);
  let bestPlanCol: number | null = null;
  if (colCounts.length > 0 && colCounts[0].count >= 1) bestPlanCol = colCounts[0].col;
  if (colCounts.some(x => x.col === 5 && x.count >= 1)) bestPlanCol = 5;

  const membersMap: { [id: string]: any } = {};
  const attendance: AttendanceRow[] = [];
  const manualReview: ManualReviewRow[] = [];

  let columnHeaderRowIndex = -1;
  const attendanceDateColumns: { colIndex: number; date: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i] as any[];
    if (isColumnHeaderRow(row)) {
      columnHeaderRowIndex = i;
      for (let c = 0; c < row.length; c++) {
        const headerCell = row[c];
        const d = tryParseDate(headerCell);
        if (d) {
          attendanceDateColumns.push({ colIndex: c, date: d });
        }
      }
      break;
    }
  }

  function isLikelyUpperName(cell: any) {
    if (cell === undefined || cell === null) return false;
    const s = String(cell);
    return /^[A-Z .\-]{2,200}$/.test(s.trim());
  }

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r] as any[];
    if (r === columnHeaderRowIndex || detectMonthHeaderInRow(row || [])) continue;
    if (!row || !Array.isArray(row) || row.every(c => (c === undefined || c === null || String(c).trim() === ''))) continue;

    const context = rowToImport[r] || { importMonth: 'UNKNOWN', importMonthISO: '' };

    let name: string | null = null;
    if (row.length > 1 && isLikelyUpperName(row[1])) name = String(row[1]).trim();
    if (!name) {
      for (let c = 0; c < Math.min(10, row.length); c++) {
        if (isLikelyUpperName(row[c])) {
          name = String(row[c]).trim();
          break;
        }
      }
    }
    let mobileCandidate: any = null;
    if (row.length > 2 && String(row[2]).match(/\d/)) mobileCandidate = row[2];
    if (!mobileCandidate) {
      for (let c = 0; c < Math.min(12, row.length); c++) {
        if (String(row[c]).match(/\d{6,13}/)) {
          mobileCandidate = row[c];
          break;
        }
      }
    }
    const mobileNormalized = normalizeMobile(mobileCandidate);

    let planRaw: string | null = null;
    if (bestPlanCol !== null && bestPlanCol < row.length) {
      const v = row[bestPlanCol];
      if (v !== undefined && v !== null && String(v).trim() !== '' && planTokenRegex.test(String(v).trim())) {
        planRaw = String(v).trim();
      }
    }
    if (!planRaw) {
      for (let c = 2; c < Math.min(8, row.length); c++) {
        const v = row[c];
        if (v !== undefined && v !== null && planTokenRegex.test(String(v).trim())) {
          planRaw = String(v).trim();
          break;
        }
      }
    }

    let startDate: string | null = null;
    for (let c = 0; c < Math.min(6, row.length); c++) {
      const d = tryParseDate(row[c]);
      if (d) {
        startDate = d;
        break;
      }
    }

    const attDates: string[] = [];
    for (const attCol of attendanceDateColumns) {
      const cellValue = row[attCol.colIndex];
      if (cellValue !== undefined && cellValue !== null && String(cellValue).trim().toUpperCase() === 'P') {
        const d = attCol.date;
        attDates.push(d);
        attendance.push({
          member_mobile: mobileNormalized || 'NA',
          member_name: name || 'UNKNOWN',
          attendance_date: d,
          attended_month: d.slice(0, 7),
          import_month: context.importMonth,
        });
      }
    }

    if (!name && !mobileNormalized && attDates.length === 0) continue;

    const memberId = mobileNormalized || uuidv4();
    const mapped = mapPlanRaw(planRaw);
    if (!membersMap[memberId]) {
      membersMap[memberId] = {
        id: memberId,
        name: name || '',
        mobile: mobileCandidate ? String(mobileCandidate) : 'NA',
        mobileNormalized: mobileNormalized || 'NA',
        planRaw: planRaw || '',
        planType: mapped.planType,
        planMonths: mapped.planMonths,
        startDate,
        attendance: Array.from(new Set(attDates)).sort(),
        attendedMonths: Array.from(new Set(attDates.map(d => d.slice(0, 7)))).sort(),
        lastAttendance: attDates.length > 0 ? attDates.sort().slice(-1)[0] : null,
        importMonth: context.importMonth,
        importMonthISO: context.importMonthISO,
      };
    } else {
      const ex = membersMap[memberId];
      ex.attendance = Array.from(new Set(ex.attendance.concat(attDates))).sort();
      ex.attendedMonths = Array.from(new Set(ex.attendedMonths.concat(attDates.map(d => d.slice(0, 7))))).sort();
      if (!ex.startDate && startDate) ex.startDate = startDate;
      if (!ex.planRaw && planRaw) {
        ex.planRaw = planRaw;
        const mm = mapPlanRaw(planRaw);
        ex.planType = mm.planType;
        ex.planMonths = mm.planMonths;
      }
    }

    if ((!planRaw || mapped.planType === null) || !mobileNormalized) {
      manualReview.push({
        row_index: r + 1,
        name: name || '',
        mobile_candidate: mobileCandidate ? String(mobileCandidate) : '',
        mobile_normalized: mobileNormalized || 'NA',
        planRaw: planRaw || '',
        importMonth: context.importMonth,
        reason: (!planRaw ? 'missing_plan' : 'unknown_plan') + (!mobileNormalized ? ';no_mobile' : ''),
      });
    }
  }

  const members: Member[] = [];
  for (const id of Object.keys(membersMap)) {
    const m = membersMap[id];
    if (m.attendance && m.attendance.length > 0) m.lastAttendance = m.attendance.slice(-1)[0];
    if (m.lastAttendance) {
      try {
        const dt = new Date(m.lastAttendance);
        m.nextExpectedAttendance = dfFormat(addMonths(dt, 1), 'yyyy-MM-dd');
        if (m.planMonths) m.nextPaymentDueByPlan = dfFormat(addMonths(dt, m.planMonths), 'yyyy-MM-dd');
        else m.nextPaymentDueByPlan = null;
      } catch (e) {
        m.nextExpectedAttendance = null;
        m.nextPaymentDueByPlan = null;
      }
    } else {
      m.nextExpectedAttendance = null;
      m.nextPaymentDueByPlan = null;
    }
    members.push({
      id: m.id,
      name: m.name,
      mobile: m.mobile,
      mobileNormalized: m.mobileNormalized,
      planRaw: m.planRaw,
      planType: m.planType || null,
      planMonths: m.planMonths || null,
      startDate: m.startDate || null,
      lastAttendance: m.lastAttendance || null,
      nextExpectedAttendance: m.nextExpectedAttendance || null,
      nextPaymentDueByPlan: m.nextPaymentDueByPlan || null,
      attendedMonths: m.attendedMonths || [],
      attendanceCount: m.attendance ? m.attendance.length : 0,
      importMonth: m.importMonth || 'UNKNOWN',
      importMonthISO: m.importMonthISO || '',
      needsReview: false,
    });
  }

  const diagnostics: Diagnostics = {
    detectedHeaders: headersWithYear,
    planDetection: { bestCol: bestPlanCol, counts: colCounts.map(x => [x.col, x.count]) },
    rawRows: rowsCount,
    rawCols: colsCount,
  };

  return { members, attendance, manualReview, diagnostics };
}

// If invoked directly as script, save output JSON files
if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.error('Usage: node parser.js <path-to-excel-file>');
    process.exit(2);
  }
  const filePath = path.resolve(argv[0]);
  const outDir = path.resolve(process.cwd(), 'parsed_output');
  fs.mkdirSync(outDir, { recursive: true });
  const { members, attendance, manualReview, diagnostics } = parseExcelToStructured(filePath);
  fs.writeFileSync(path.join(outDir, 'members.json'), JSON.stringify(members, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'attendance.json'), JSON.stringify(attendance, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'manual_review.json'), JSON.stringify(manualReview, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2), 'utf8');
  console.log('Parsed output saved to parsed_output/');
}
