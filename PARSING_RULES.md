# Excel Parsing Rules & Logic (used for REGISTER_2_structured_v5.xlsx)

This document describes the exact parsing rules applied by the TypeScript parser (`parser.ts`) to transform the raw Excel register into a structured dataset suitable for Firestore / UI ingestion.

## Overview
Source files are messy: they contain month header rows (e.g., "FEBRUARY") that group rows below, merged cells, and a wide "duration" grid of attendance dates. The parser aims to be robust with heuristics and produce deterministic structured output:
- `members` (one object per normalized mobile, or UUID if no mobile),
- `attendance` (long-form attendance rows),
- `manual_review` (rows that require human attention),
- `diagnostics` (header detection and plan column metrics).

## High-level steps
1. Read workbook using SheetJS (`xlsx`) as raw rows (array of arrays). Use `defval: ''` to preserve empty cells.
2. Detect month header rows (rows that contain any month name like January..December).
3. Infer header year:
   - prefer a 4-digit year on the same header row if present;
   - else search column B (index 1) in next 30 rows for parseable dates and use the year;
   - else search any column in next 30 rows for parseable dates;
   - else for the **first** header row at Excel row 2 (index 1) use 2023 (user-provided contextual rule);
   - else fallback to previous detected header year or current year.
4. Map row ranges to their header's month-year context (produce `importMonth` like `FEBRUARY-2023` and `importMonthISO` like `2023-02`).
5. Detect `plan` column (NO. OF MONTHS) by scanning columns for tokens: `1`, `1M`, `3`, `3M`, `6`, `6M`, `12` (optionally suffixed by `M` / `MONTH(S)` etc.). Prefer column F (index 5) if it has matches.
6. For each non-header, non-empty row:
   - Extract `name` (prefer column 2, else scan first 10 columns for UPPERCASE name-like tokens).
   - Extract `mobile` (prefer column 3, else scan first 12 columns for phone-like tokens).
   - Normalize mobile: strip non-digits; if starts with 91 and >10 digits keep last 10; accept 10-digit or >=8-digit values.
   - Extract `planRaw` from detected plan column or fallback scan.
   - Map `planRaw` → `planType` and `planMonths`: 1→Monthly, 3→Quarterly, 6→Half-Yearly, 12→Yearly. Keep `planRaw` as audit.
   - Detect `startDate` from first 6 columns (try multiple date formats).
   - Detect attendance dates scanning columns from index 6 onwards; parse numeric excel serials and common date formats.
   - Append attendance rows to `attendance` list (member_mobile, name, attendance_date ISO, attended_month YYYY-MM, import_month context).
   - Build `members` map keyed by normalized mobile (or uuid if missing); merge attendance across duplicate mobiles and dedupe.
   - Flag rows for `manual_review` when missing `planRaw` or plan couldn't be mapped OR missing mobile.
7. After all rows, compute derived dates for each member:
   - `lastAttendance` = last date in `attendance` array (ISO);
   - `nextExpectedAttendance` = lastAttendance + 1 month;
   - `nextPaymentDueByPlan` = lastAttendance + `planMonths` months (if `planMonths` known).
8. Output structured arrays and write JSON or XLSX files as needed.

## Important heuristics & design decisions
- **Mobile as primary key**: mobileNormalized is the unique identifier for members in the structured dataset; if missing mobile, a UUID is generated and `mobile` is set to 'NA'.
- **PlanRaw retained**: keep the original `planRaw` string to preserve source info and for manual resolution if mapping fails.
- **ImportMonth is provenance only**: it indicates where in the original sheet the row lived. It is NOT the payment/due/start date.
- **Manual review**: intentionally conservative — only rows that cannot be confidently parsed are flagged.

## Output schema (member)
```json
{
  "id": "string",
  "name": "string",
  "mobile": "string",
  "mobileNormalized": "string",
  "planRaw": "string|null",
  "planType": "Monthly|Quarterly|Half-Yearly|Yearly|null",
  "planMonths": 1|3|6|12|null,
  "startDate": "YYYY-MM-DD|null",
  "lastAttendance": "YYYY-MM-DD|null",
  "nextExpectedAttendance": "YYYY-MM-DD|null",
  "nextPaymentDueByPlan": "YYYY-MM-DD|null",
  "attendedMonths": ["YYYY-MM", ...],
  "attendanceCount": number,
  "importMonth": "MONTHNAME-YYYY or UNKNOWN",
  "importMonthISO": "YYYY-MM or ''"
}
```

## Notes for future improvements
- For better accuracy: ask data provider to remove month header rows and add an explicit `importMonth` column or provide the clean "members" sheet.
- Add a small preview/confirm UI to correct detected plan column and ambiguous plan tokens prior to import.
- Provide UI to merge/split accounts when multiple people share a mobile number.

## Running & testing
- Example: run `node -r ts-node/register parser.ts /path/to/REGISTER.xlsx`
- The script writes parsed JSON into `parsed_output/` folder by default.
- Unit tests should mock `xlsx` reading and supply small sample worksheets to validate detection rules.

