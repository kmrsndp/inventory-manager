import { Timestamp } from 'firebase/firestore';

export interface Member {
  id: string;
  name: string;
  mobile: string;
  mobileNormalized: string;
  planType: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly' | 'Unknown' | null;
  planMonths: number | null;
  planRaw?: string; // Add planRaw to the interface
  startDate: string | null; // ISO YYYY-MM-DD
  nextDueDate: string | null; // ISO
  lastAttendance: string | null; // ISO
  nextExpectedAttendance: string | null; // ISO
  nextPaymentDueByPlan: string | null; // ISO
  attendance: string[]; // ISO strings
  attendedMonths: string[]; // YYYY-MM
  totalPaid: number | null;
  conflictInfo: { previousName?: string; importedName?: string; note?: string } | null;
  importMonth: string | null;
  createdAt: Timestamp; // Changed to Timestamp
  updatedAt: Timestamp; // Changed to Timestamp
  attendanceCount: number; // Added to Member interface
}

export interface ImportReport {
  totalRows: number;
  parsedRows: number;
  created: number;
  updated: number;
  skipped: number;
  conflicts: { mobile: string; existingName: string; importedName: string; rowNumber: number }[];
  errors: any[]; // Added for error reporting
}

export interface AttendanceRow {
  member_mobile: string;
  member_name: string;
  attendance_date: string; // ISO date
  attended_month: string; // YYYY-MM
  import_month: string;
}

export interface ManualReviewRow {
  row_index: number;
  name?: string;
  mobile_candidate?: string;
  mobile_normalized?: string;
  planRaw?: string;
  importMonth?: string;
  reason?: string;
}

export interface Diagnostics {
  detectedHeaders: { row_idx: number; month: string; year: number }[];
  planDetection: { bestCol: number | null; counts: [number, number][] };
  rawRows: number;
  rawCols: number;
  totalRows: number; // Added for import report
  parsedRows: number; // Added for import report
  skippedRows: number; // Added for import report
}

export interface ParsedRow {
  [key: string]: any;
}
