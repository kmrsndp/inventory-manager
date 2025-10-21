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
  planType: "Monthly" | "Quarterly" | "Half-Yearly" | "Unknown";
  startDate: string | null;
  planMonths: number | null;
  lastAttendance: string | null;
  nextPaymentDueByPlan: string | null;
  durationMonths: number | null; // Re-adding durationMonths, can be null if not explicitly set
  nextDueDate: string | null;
  status: "Active" | "DueSoon" | "Overdue" | "Stopped" | "Unknown";
  totalPaid: number;
  payments: Payment[];
  conflictInfo?: ConflictInfo;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  importMonth?: string;
}
