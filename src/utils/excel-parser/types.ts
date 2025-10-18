export interface Member {
  id: string;
  name: string;
  mobile: string;
  mobileNormalized: string;
  planType: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly' | 'Unknown';
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
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface ImportReport {
  totalRows: number;
  parsedRows: number;
  created: number;
  updated: number;
  skipped: number;
  conflicts: { mobile: string; existingName: string; importedName: string; rowNumber: number }[];
}

export interface ParsedRow {
  [key: string]: any;
}
