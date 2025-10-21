import { Timestamp } from 'firebase/firestore';

export interface Payment {
  date: string;
  amount: number;
  method: string;
}

export interface ConflictInfo {
  previousName: string;
  importedName: string;
  note: string;
}

export interface Member {
  id: string;
  name: string;
  mobile: string;
  mobileNormalized: string;
  planRaw?: string | null;
  planType?: "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly" | "Unknown" | string | null;
  planMonths: number | null;
  startDate: string | null;
  lastAttendance: string | null;
  nextExpectedAttendance: string | null;
  nextPaymentDueByPlan: string | null;
  attendedMonths: string[];
  attendance: string[]; // Added for parser.ts
  attendanceCount: number;
  nextDueDate: string | null;
  status: "Active" | "DueSoon" | "Overdue" | "Stopped" | "Unknown";
  totalPaid: number | null; // Changed to allow null
  payments: Payment[];
  needsReview?: boolean; // Added for parser.ts
  conflictInfo?: ConflictInfo | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  importMonth: string;
  importMonthISO: string;
}
