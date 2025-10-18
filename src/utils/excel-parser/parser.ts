import * as XLSX from 'xlsx';
import { parse, isValid, format, addMonths } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Member, ImportReport, ParsedRow } from './types';

// Month names for detection
export const MONTH_NAMES = [
  'jan', 'january', 'feb', 'february', 'mar', 'march', 'apr', 'april',
  'may', 'jun', 'june', 'jul', 'july', 'aug', 'august', 'sep', 'september',
  'oct', 'october', 'nov', 'november', 'dec', 'december'
];

// Column mapping
const COLUMN_MAP: { [key: string]: string } = {
  'name': 'name',
  'customer': 'name',
  'member name': 'name',
  'contact': 'mobile',
  'contact no.': 'mobile',
  'mobile': 'mobile',
  'start date': 'startDate',
  'join date': 'startDate',
  'no. of months': 'planRaw',
  'duration': 'planRaw',
  'plan': 'planRaw',
  'due date': 'nextDueDate',
};

/**
 * Normalizes a header string (lowercase, remove punctuation, trim).
 * @param header The header string to normalize.
 * @returns Normalized header string.
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

/**
 * Checks if a row is the main header row based on known column names.
 * @param row The row data.
 * @returns True if the row is likely the main header.
 */
function isMainHeaderRow(row: any[]): boolean {
  const normalizedHeaders = row.map(h => normalizeHeader(String(h || '')));
  const knownHeaders = Object.keys(COLUMN_MAP);
  const matchCount = normalizedHeaders.filter(h => knownHeaders.includes(h)).length;
  return matchCount >= 2; // Require at least 2 matching headers
}

/**
 * Normalizes a mobile number: removes non-digits, country prefix, keeps last 10 digits.
 * @param mobile The mobile number string to normalize.
 * @returns Normalized mobile number or null if invalid.
 */
function normalizeMobile(mobile: string): string | null {
  if (!mobile) return null;
  let normalized = mobile.replace(/\D/g, ''); // Remove non-digits
  if (normalized.startsWith('91') && normalized.length > 10) {
    normalized = normalized.substring(2); // Remove +91 prefix
  }
  if (normalized.length > 10) {
    normalized = normalized.substring(normalized.length - 10); // Keep last 10 digits
  }
  return normalized.length >= 8 ? normalized : null; // Minimum 8 digits for validity
}

/**
 * Detects if a row is a month header row.
 * @param row The row data.
 * @returns The month name if it's a month header, otherwise null.
 */
function detectMonthHeader(row: ParsedRow): string | null {
  for (const cellValue of Object.values(row)) {
    if (typeof cellValue === 'string') {
      const normalizedCell = cellValue.toLowerCase().trim();
      // console.log("Header cell (detectMonthHeader):", normalizedCell); // Debug logging
      for (const month of MONTH_NAMES) {
        if (normalizedCell.includes(month)) {
          return month.toUpperCase();
        }
      }
    }
  }
  return null;
}

/**
 * Parses the planRaw string into planType and planMonths.
 * @param planRaw The raw plan string (e.g., "1M", "3", "6M").
 * @returns An object with planType and planMonths.
 */
function parsePlan(planRaw: string): { planType: Member['planType']; planMonths: number | null } {
  if (!planRaw) return { planType: 'Unknown', planMonths: null };
  const raw = String(planRaw).toUpperCase().replace('M', '');
  switch (raw) {
    case '1':
      return { planType: 'Monthly', planMonths: 1 };
    case '3':
      return { planType: 'Quarterly', planMonths: 3 };
    case '6':
      return { planType: 'Half-Yearly', planMonths: 6 };
    case '12':
      return { planType: 'Yearly', planMonths: 12 };
    default:
      return { planType: 'Unknown', planMonths: null };
  }
}

/**
 * Attempts to parse a cell value as a date.
 * Handles Excel serial dates and common string date formats.
 * @param cellValue The value from the Excel cell.
 * @returns A Date object if parsing is successful, otherwise null.
 */
function parseExcelDate(cellValue: any): Date | null {
  if (typeof cellValue === 'number') {
    // Assume Excel serial date
    const date = XLSX.SSF.parse_date_code(cellValue);
    return new Date(date.y, date.m - 1, date.d);
  } else if (typeof cellValue === 'string') {
    const formats = [
      'MM/dd/yy', 'dd/MM/yy', 'yyyy-MM-dd', 'MM-dd-yyyy', 'dd-MM-yyyy',
      'MM/dd/yyyy', 'dd/MM/yyyy'
    ];
    for (const fmt of formats) {
      const parsedDate = parse(cellValue, fmt, new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
  }
  return null;
}

/**
 * Extracts attendance dates from a row.
 * @param row The parsed row data.
 * @param headerMap The mapping of normalized headers to original headers.
 * @returns An array of ISO date strings for attendance.
 */
function extractAttendance(row: ParsedRow, headerMap: { [key: string]: string }): string[] {
  const attendanceDates: Date[] = [];
  for (const key in row) {
    const normalizedKey = normalizeHeader(key);
    if (!COLUMN_MAP[normalizedKey] && row[key] !== null && row[key] !== undefined && String(row[key]).toLowerCase() !== 'xxxxxxxx') {
      const date = parseExcelDate(row[key]);
      if (date) {
        attendanceDates.push(date);
      }
    }
  }
  // Deduplicate and sort
  const uniqueDates = Array.from(new Set(attendanceDates.map(d => d.getTime())))
    .map(time => new Date(time))
    .sort((a, b) => a.getTime() - b.getTime());

  return uniqueDates.map(d => format(d, 'yyyy-MM-dd'));
}

/**
 * Computes derived date fields for a member.
 * @param member The member object.
 * @returns The member object with derived date fields.
 */
function computeDerivedDates(member: Member): Member {
  if (member.attendance.length > 0) {
    member.lastAttendance = member.attendance[member.attendance.length - 1];
    const lastAttDate = parse(member.lastAttendance, 'yyyy-MM-dd', new Date());

    if (isValid(lastAttDate)) {
      member.nextExpectedAttendance = format(addMonths(lastAttDate, 1), 'yyyy-MM-dd');
      if (member.planMonths) {
        member.nextPaymentDueByPlan = format(addMonths(lastAttDate, member.planMonths), 'yyyy-MM-dd');
      }
    }
  }

  // If nextDueDate is explicitly provided and valid, prefer it
  if (member.nextDueDate) {
    const parsedNextDueDate = parseExcelDate(member.nextDueDate);
    if (parsedNextDueDate && isValid(parsedNextDueDate)) {
      member.nextDueDate = format(parsedNextDueDate, 'yyyy-MM-dd');
    } else {
      member.nextDueDate = null; // Invalidate if not a valid date
    }
  } else {
    // If no explicit nextDueDate, use nextPaymentDueByPlan as nextDueDate
    member.nextDueDate = member.nextPaymentDueByPlan;
  }

  member.attendedMonths = Array.from(new Set(member.attendance.map(dateStr => format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'yyyy-MM')))).sort();

  return member;
}

// 1) Detect planRaw column index by scanning entire sheet data for the best-matching column
function detectPlanColumn(allRows: any[][]): number | null {
  const planRegex = /^\s*\d+\s*M?\s*$/i; // matches "1","1M","3M","6M","12", etc.
  const counts: { [col: number]: number } = {};

  for (let r = 0; r < allRows.length; r++) {
    const row = allRows[r];
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell !== undefined && cell !== null && String(cell).trim() !== '') {
        if (planRegex.test(String(cell))) {
          counts[c] = (counts[c] || 0) + 1;
        }
      }
    }
  }
  // choose column with max count (require at least 2 matches to be safe)
  let bestCol: number | null = null;
  let bestCount = 0;
  for (const [colStr, cnt] of Object.entries(counts)) {
    const col = parseInt(colStr, 10);
    if (cnt > bestCount && cnt >= 2) {
      bestCount = cnt;
      bestCol = col;
    }
  }
  return bestCol;
}

/**
 * Parses an Excel file and returns an array of Member objects.
 * @param filePath The path to the Excel file.
 * @returns A promise that resolves to an array of Member objects and an import report.
 */
export async function parseExcel(filePath: string): Promise<{ members: Member[]; report: ImportReport }> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Read all rows to detect plan column
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: -1, raw: false, defval: "" });
  const planColIndex = detectPlanColumn(rawRows);
  console.log('Detected plan column index:', planColIndex);

  const members: Member[] = [];
  const report: ImportReport = {
    totalRows: 0, // Will be updated after reading all data rows
    parsedRows: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    conflicts: [],
  };

  let currentImportMonth: string | null = null;

  // Step 1: Find the main header row by scanning the first few rows
  let mainHeaders: string[] = [];
  let headerRowIndex = -1;

  for (let i = 0; i < 10 && i < rawRows.length; i++) { // Scan up to 10 rows
    const row = rawRows[i];
    if (Array.isArray(row) && isMainHeaderRow(row)) {
      mainHeaders = row.map(h => String(h || '')).filter(h => h !== '');
      headerRowIndex = i;
      console.log(`Detected Main Headers at row ${i + 1}:`, mainHeaders); // DEBUG
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.warn('Could not detect main header row.');
    return { members, report }; // Cannot proceed without main headers
  }

  // Step 2: Try to detect a month header in the rows before the main header
  for (let i = 0; i < headerRowIndex; i++) {
    const possibleHeaderRow = rawRows[i];
    if (Array.isArray(possibleHeaderRow)) {
      const rowData: ParsedRow = {};
      possibleHeaderRow.forEach((cell, idx) => (rowData[`col_${idx}`] = cell));
      const detectedMonth = detectMonthHeader(rowData);
      if (detectedMonth) {
        currentImportMonth = detectedMonth;
        break; // Found one, no need to look further
      }
    }
  }

  // All rows before and including the header are considered "skipped" from data processing
  report.skipped = headerRowIndex + 1;

  // Step 3: Read the actual data rows starting from after the header row
  const dataRows = rawRows.slice(headerRowIndex + 1);
  report.totalRows = dataRows.length;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + headerRowIndex + 2; // 1-indexed row number

    if (row === undefined || row === null || !Array.isArray(row) || row.every(cell => cell === null || cell === undefined || cell === '')) {
      report.skipped++;
      continue; // Skip invalid or entirely empty rows
    }


    report.parsedRows++;

    const rowData: ParsedRow = {};
    mainHeaders.forEach((header, index) => {
      rowData[header] = row[index];
    });
    // If we detected plan column index, fill planRaw explicitly
    if (planColIndex !== null && planColIndex < row.length) {
      // prefer the string as-is (trim)
      rowData['planRaw_detected'] = row[planColIndex] ?? '';
    }
    // Include any additional cells that might be attendance dates beyond the main headers
    for (let j = mainHeaders.length; j < row.length; j++) {
      rowData[`col_${j}`] = row[j]; // Use a generic key for extra columns
    }

    const normalizedRow: ParsedRow = {};
    const headerMap: { [key: string]: string } = {}; // Map normalized header to original
    for (const key in rowData) {
      const normalizedKey = normalizeHeader(key);
      // Check if the normalized key is in COLUMN_MAP or if it's a generic attendance column
      if (COLUMN_MAP[normalizedKey]) {
        normalizedRow[COLUMN_MAP[normalizedKey]] = rowData[key];
      } else if (normalizedKey.startsWith('col_')) { // This is a generic attendance column
        normalizedRow[normalizedKey] = rowData[key]; // Keep original for attendance extraction
      } else {
        // If it's not a mapped column and not a generic col_X, it might be an unmapped header
        normalizedRow[normalizedKey] = rowData[key];
      }
      headerMap[normalizedKey] = key;
    }

    const mobile = normalizeMobile(normalizedRow.mobile);
    const name = normalizedRow.name ? String(normalizedRow.name).trim() : null;

    if (!name && !mobile) {
      report.skipped++;
      continue;
    }
    if (!mobile) {
      report.skipped++;
      continue;
    }

    // existing logic picked normalizedRow.planRaw = rowData['...'] via header mapping
    // modify to prefer explicit detected column first:
    const rawPlanCandidate = normalizedRow['planRaw'] || rowData['planRaw_detected'] || normalizedRow['col_5'] || normalizedRow['col_6'] || '';
    normalizedRow['planRaw'] = rawPlanCandidate ? String(rawPlanCandidate).trim() : '';

    const { planType, planMonths } = parsePlan(normalizedRow.planRaw);
    const attendance = extractAttendance(normalizedRow, headerMap);
    const startDate = normalizedRow.startDate ? format(parseExcelDate(normalizedRow.startDate)!, 'yyyy-MM-dd') : null;

    let member: Member = {
      id: uuidv4(),
      name: name || '',
      mobile: normalizedRow.mobile,
      mobileNormalized: mobile,
      planType,
      planMonths,
      startDate,
      nextDueDate: normalizedRow.nextDueDate || null,
      lastAttendance: null,
      nextExpectedAttendance: null,
      nextPaymentDueByPlan: null,
      attendance,
      attendedMonths: [],
      totalPaid: null,
      conflictInfo: null,
      importMonth: currentImportMonth,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    member = computeDerivedDates(member);
    members.push(member);
  }

  // Add fallback for importMonth if it's still null
  members.forEach(m => {
    if (!m.importMonth) {
      m.importMonth = "UNKNOWN";
    }
  });

  return { members, report };
}
