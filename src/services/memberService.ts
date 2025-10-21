import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  writeBatch,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

export interface Member {
  id: string;
  name: string;
  mobile?: string;
  mobileNormalized?: string;
  planType?: string;
  planRaw?: string;
  startDate?: string;
  endDate?: string;
  lastAttendance?: string | null;
  createdAt?: string;
  status?: string;
}

/**
 * Normalize mobile number and fallback to 'NA' when missing/invalid
 */
function normalizeMobile(mobile: string | undefined): string {
  if (!mobile || mobile.trim() === "" || isNaN(Number(mobile))) return "NA";
  return mobile.replace(/[^0-9]/g, "").trim();
}

/**
 * Import members in safe Firestore batches (max 400 ops per batch)
 */
export async function importMembers(members: Member[]) {
  console.log(`🚀 Starting import for ${members.length} members`);

  let processed = 0;
  let failed = 0;
  let batch = writeBatch(db);
  let opCount = 0;

  for (const [i, member] of members.entries()) {
    try {
      const normalizedMobile = normalizeMobile(member.mobile);

      const cleanMember = {
        ...member,
        mobile: normalizedMobile,
        mobileNormalized: normalizedMobile,
        lastAttendance: member.lastAttendance || null,
        createdAt: member.createdAt || new Date().toISOString(),
        status: member.status || "active",
      };

      const memberRef = doc(db, "members", cleanMember.id);
      batch.set(memberRef, cleanMember);
      opCount++;

      if (opCount >= 400) {
        await batch.commit();
        console.log(`✅ Batch committed for ${opCount} records`);
        processed += opCount;
        batch = writeBatch(db);
        opCount = 0;
      }
    } catch (error) {
      failed++;
      console.error("❌ Error importing member", member, error);
    }
  }

  if (opCount > 0) {
    await batch.commit();
    processed += opCount;
  }

  console.log(`🎯 Import complete. Processed=${processed}, Failed=${failed}`);
}

/**
 * Fetch all members
 */
export async function getMembers(): Promise<Member[]> {
  const q = query(collection(db, "members"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Member[];
}

/**
 * Update a member record (used by MemberModal)
 */
export async function updateMember(id: string, data: Partial<Member>) {
  const ref = doc(db, "members", id);
  await updateDoc(ref, data);
  console.log(`🟢 Member ${id} updated`, data);
}

/**
 * Update member status only
 */
export async function updateMemberStatus(id: string, status: string) {
  const ref = doc(db, "members", id);
  await updateDoc(ref, { status });
  console.log(`🔵 Member ${id} status updated → ${status}`);
}

/**
 * Delete a member
 */
export async function deleteMember(id: string) {
  const ref = doc(db, "members", id);
  await deleteDoc(ref);
  console.log(`🗑️ Member ${id} deleted`);
}
