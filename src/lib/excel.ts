/* excel.ts — improved mobile detection + defensive assignments */

import * as XLSX from "xlsx";
import { Member } from "@/types/member";
import { v4 as uuidv4 } from "uuid";
import { Timestamp } from "firebase/firestore";
import { addMonths, format } from "date-fns";

/**
 * Excel parser: improved defenses to avoid names ending up in mobile field.
 * - Ensures mobile column is validated before assignment
 * - Ensures mobileNormalized is null/'NA' for invalid entries
 * - Keeps existing heuristics for plan/startDate/month detection
 */

// Constants
const MONTH_NAMES = [
  "JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
  "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"
];

// Flexible date parse
function tryParseDateFlex(cell: unknown): string | null {
  if (cell === undefined || cell === null) return null;
  if (typeof cell === "number") {
    try {
      const d = XLSX.SSF.parse_date_code(cell);
      if (d && d.y) return new Date(d.y, d.m - 1, d.d).toISOString().slice(0, 10);
    } catch { /* fallback */ }
  }
  const s = String(cell).trim();
  if (!s || /^x+$/i.test(s)) return null;
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  // common slash format fallback
  const partsSlash = s.split("/");
  if (partsSlash.length === 3) {
    const p1 = parseInt(partsSlash[0], 10);
    const p2 = parseInt(partsSlash[1], 10);
    let p3 = parseInt(partsSlash[2], 10);
    if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
      if (p3 < 100) p3 += (p3 > 50 ? 1900 : 2000);
      let day = p1; let month = p2; const year = p3;
      if (p1 > 12) {
        day = p2;
        month = p1;
      }
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }

  // dash format fallback
  const partsDash = s.split("-");
  if (partsDash.length === 3) {
    const [a, b, c] = partsDash;
    if (a.length === 4) {
      const d = new Date(`${a}-${b}-${c}`);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } else {
      const day = parseInt(a, 10), month = parseInt(b, 10), year = parseInt(c, 10);
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }

  return null;
}

// Normalize mobile -> returns normalized 10-digit string OR null
function normalizeMobileFlexible(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value);
  const digits = s.replace(/\D/g, "");
  if (!digits) return null;
  // Remove leading country code '91' if present and length > 10
  if (digits.length > 10 && digits.endsWith(digits.slice(-10))) {
    // fallback, just use last 10 digits
    return digits.slice(-10);
  }
  if (digits.length >= 10) return digits.slice(-10);
  // Accept shorter numbers if between 8-9 digits (per your earlier threshold)
  if (digits.length >= 8) return digits;
  return null;
}

// boolean check if a cell is plausibly a phone
function isLikelyMobile(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  const digits = String(value).replace(/\D/g, "");
  // treat anything 8-13 digits as likely phone (covers missing leading 0/country code)
  if (!digits) return false;
  return digits.length >= 8 && digits.length <= 13;
}

// header detection (first N rows)
function detectHeaderRow(jsonData: (string|number)[][], maxScanRows = 12): number {
  const keywords = ["NAME", "CONTACT", "MOBILE", "NO.", "NO. OF MONTHS", "DURATION", "DATE", "START", "DUE", "SR NO"];
  for (let r = 0; r < Math.min(maxScanRows, jsonData.length); r++) {
    const row = (jsonData[r] || []).map(c => String(c || "").toUpperCase());
    let matches = 0;
    for (const cell of row) {
      for (const kw of keywords) {
        if (cell.includes(kw)) { matches++; break; }
      }
    }
    if (matches >= 2) return r;
  }
  return 0;
}

function detectMonthInRow(row: (string|number)[]): string | null {
  if (!Array.isArray(row)) return null;
  for (const cell of row) {
    if (cell === undefined || cell === null) continue;
    const s = String(cell).toUpperCase();
    for (const m of MONTH_NAMES) {
      if (s.includes(m)) return m;
    }
  }
  return null;
}

function parsePlanToken(token: unknown): { planType: Member["planType"] | null; planMonths: number | null } {
  if (token === undefined || token === null) return { planType: null, planMonths: null };
  const s = String(token).toUpperCase().replace(/\s+/g, "").replace(/MONTHS?/g, "M").replace(/MTHS?/g, "M");
  if (/^X+$/.test(s) || s === "NA" || s === "N/A") return { planType: null, planMonths: null };
  const digits = s.replace(/\D/g, "");
  if (digits === "1") return { planType: "Monthly", planMonths: 1 };
  if (digits === "3") return { planType: "Quarterly", planMonths: 3 };
  if (digits === "6") return { planType: "Half-Yearly", planMonths: 6 };
  if (digits === "12") return { planType: "Yearly", planMonths: 12 };
  return { planType: null, planMonths: null };
}

// Heuristic mobile column detector
function detectMobileColumn(jsonData: (string|number)[][], headerRowIndex: number, maxCols = 40): number | null {
  const headerRow = (jsonData[headerRowIndex] || []).map(c => String(c || "").toUpperCase());
  const rowsToScan = Math.min(jsonData.length, headerRowIndex + 400);
  const scores: number[] = new Array(maxCols).fill(0);

  for (let c = 0; c < maxCols; c++) {
    let numericCells = 0;
    let totalNonEmpty = 0;
    let alphabeticCells = 0;
    const seenDigits = new Set<string>();

    for (let r = headerRowIndex + 1; r < rowsToScan; r++) {
      const cell = (jsonData[r] || [])[c];
      if (cell === undefined || cell === null || String(cell).trim() === "") continue;
      totalNonEmpty++;
      const s = String(cell).trim();
      const digits = s.replace(/\D/g, "");
      if (digits.length >= 6 && digits.length <= 13) {
        numericCells++;
        seenDigits.add(digits);
      } else {
        if (/[A-Za-z]/.test(s)) alphabeticCells++;
      }
    }

    let headerScore = 0;
    const headerCell = headerRow[c] || "";
    if (headerCell.includes("CONTACT") || headerCell.includes("PHONE") || headerCell.includes("MOBILE")) headerScore += 50;
    if (headerCell.includes("NO.") || headerCell.includes("SR")) headerScore -= 10;

    const numericRatio = totalNonEmpty > 0 ? (numericCells / totalNonEmpty) : 0;
    const uniquenessBonus = seenDigits.size > 3 ? Math.min(10, seenDigits.size / 2) : 0;
    const alphaPenalty = totalNonEmpty > 0 ? (alphabeticCells / totalNonEmpty) * 30 : 0;

    scores[c] = headerScore + numericCells + (numericRatio * 40) + uniquenessBonus - alphaPenalty;
  }

  let bestIdx: number | null = null;
  let bestScore = 0;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      bestIdx = i;
    }
  }
  if (bestScore >= 8) return bestIdx;
  return null;
}

/**
 * parseExcelData(file) => Partial<Member>[]
 */
export const parseExcelData = (file: File): Promise<Partial<Member>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as (string|number)[][];

        const headerRowIndex = detectHeaderRow(jsonData, 12);
        const rawHeaders = (jsonData[headerRowIndex] || []).map(h => String(h || "").trim().toUpperCase());
        const guessedMobileCol = detectMobileColumn(jsonData, headerRowIndex, Math.max(rawHeaders.length, 12));

        const members: Partial<Member>[] = [];
        let currentMonthLabel = "";

        for (let r = headerRowIndex + 1; r < jsonData.length; r++) {
          const row = jsonData[r] || [];

          const monthFound = detectMonthInRow(row);
          if (monthFound) {
            currentMonthLabel = monthFound;
            continue;
          }

          if (row.every(c => String(c).trim() === "")) continue;

          const rowObj: Record<string, unknown> = {};
          for (let c = 0; c < rawHeaders.length; c++) {
            rowObj[rawHeaders[c] || `COL_${c}`] = row[c];
          }

          // name candidate (make it a let so we can swap safely)
          let nameCand: string | number | null = (rowObj["NAME"] || rowObj["MEMBER"] || rowObj["MEMBER NAME"] || row[1] || row[0] || "") as string | number | null;
          nameCand = String(nameCand || "").trim();

          // attempt to get a mobile candidate from guessed column
          let mobileCand: string | number | null = (guessedMobileCol !== null && guessedMobileCol < row.length) ? row[guessedMobileCol] : null;

          // fallback: scan first 12 columns for digit-ish value
          if (!mobileCand) {
            for (let c = 0; c < Math.min(12, row.length); c++) {
              const cell = row[c];
              if (isLikelyMobile(cell)) { mobileCand = cell; break; }
            }
          }

          // fallback to named header columns
          if (!mobileCand) {
            mobileCand = (rowObj["CONTACT"] || rowObj["CONTACT NO"] || rowObj["MOBILE"] || null) as string | number | null;
          }

          // If mobileCand looks like a name and nameCand looks like a phone, swap them.
          // Use the stronger checks (isLikelyMobile)
          if (!isLikelyMobile(mobileCand) && isLikelyMobile(nameCand)) {
            console.warn(`Row ${r + 1}: swapping name/mobile because name looks numeric-ish`, nameCand, mobileCand);
            const tmp = mobileCand;
            mobileCand = nameCand;
            nameCand = tmp || "";
          }

          // Final validation: only accept mobileCand if it passes plausible mobile check
          let mobileNormalized: string | null = null;
          if (isLikelyMobile(mobileCand)) {
            mobileNormalized = normalizeMobileFlexible(mobileCand);
            if (mobileNormalized === null) {
              // treat as invalid
              console.warn(`Row ${r + 1}: mobile candidate failed normalization`, mobileCand);
            }
          } else {
            // not plausible
            mobileCand = null;
          }

          // parse plan & startDate
          const planRawCandidate = rowObj["NO. OF MONTHS"] || rowObj["MONTHS"] || row[5] || null;
          const planParsed = parsePlanToken(planRawCandidate);
          // try startDate candidates (common column indices: 0..4)
          let startDateIso: string | null = null;
          for (let c = 0; c < Math.min(6, row.length); c++) {
            const d = tryParseDateFlex(row[c]);
            if (d) { startDateIso = d; break; }
          }
          const rawStartDate = startDateIso ? new Date(startDateIso) : null;

          // Build member object: ensure mobile is 'NA' if not valid
          const mobileFinal = mobileCand ? String(mobileCand).trim() : "NA";
          const mobileNormalizedFinal = mobileNormalized || "NA";

          const memberData: Partial<Member> = {
            id: uuidv4(),
            name: String(nameCand || "").trim() || "Unknown",
            mobile: mobileFinal,
            mobileNormalized: mobileNormalizedFinal,
            planRaw: planRawCandidate ? String(planRawCandidate) : null,
            planType: planParsed.planType || "Unknown",
            planMonths: planParsed.planMonths || null,
            startDate: startDateIso || null,
            nextDueDate: (rawStartDate && planParsed.planMonths) ? format(addMonths(rawStartDate, planParsed.planMonths), "yyyy-MM-dd") : null,
            totalPaid: 0,
            payments: [],
            status: "Active",
            importMonth: currentMonthLabel || "UNKNOWN",
            importMonthISO: "",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          members.push(memberData);
        } // rows loop

        resolve(members);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
