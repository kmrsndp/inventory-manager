import * as admin from 'firebase-admin';
import { Member, ImportReport } from './types';
import { computeDerivedDates } from './parser'; // Import computeDerivedDates
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // You might need to specify databaseURL if not using default project
    // databaseURL: 'https://your-project-id.firebaseio.com'
  });
}

const db = admin.firestore();
const membersCollection = db.collection('members');

const BATCH_SIZE = 500;

/**
 * Merges a new member's data with an existing member's data from Firestore.
 * @param existingMember The existing member document from Firestore.
 * @param importedMember The member object parsed from Excel.
 * @param rowNumber The row number from the Excel file for conflict reporting.
 * @returns The merged Member object and an updated conflict list.
 */
async function mergeMemberData(
  existingMember: Member,
  importedMember: Member,
  rowNumber: number,
  report: ImportReport
): Promise<Member> {
  const mergedMember: Member = { ...existingMember };

  // Merge attendance: union existing & imported attendance (dedupe)
  const allAttendance = [...(existingMember.attendance || []), ...(importedMember.attendance || [])];
  mergedMember.attendance = Array.from(new Set(allAttendance)).sort();

  // startDate: existing startDate if set; else use imported startDate.
  if (!mergedMember.startDate && importedMember.startDate) {
    mergedMember.startDate = importedMember.startDate;
  }

  // planType / planMonths: if existing is missing, use imported; if both set and differ, keep existing but write conflictInfo.
  if (!mergedMember.planType || mergedMember.planType === 'Unknown') {
    mergedMember.planType = importedMember.planType;
    mergedMember.planMonths = importedMember.planMonths;
  } else if (mergedMember.planType !== importedMember.planType || mergedMember.planMonths !== importedMember.planMonths) {
    mergedMember.conflictInfo = {
      ...mergedMember.conflictInfo,
      note: (mergedMember.conflictInfo?.note ? mergedMember.conflictInfo.note + '; ' : '') + 'Plan type/months differ on import.',
    };
  }

  // name conflict: if existing.name != imported.name -> add conflictInfo
  if (existingMember.name !== importedMember.name) {
    mergedMember.conflictInfo = {
      ...mergedMember.conflictInfo,
      previousName: existingMember.name,
      importedName: importedMember.name,
      note: (mergedMember.conflictInfo?.note ? mergedMember.conflictInfo.note + '; ' : '') + 'Auto-merged on import, verify name.',
    };
    report.conflicts.push({
      mobile: importedMember.mobileNormalized,
      existingName: existingMember.name,
      importedName: importedMember.name,
      rowNumber,
    });
  }

  // Update other fields from imported if they are newer or more complete
  mergedMember.nextDueDate = importedMember.nextDueDate || mergedMember.nextDueDate;
  mergedMember.totalPaid = importedMember.totalPaid || mergedMember.totalPaid;
  mergedMember.importMonth = importedMember.importMonth || mergedMember.importMonth;
  mergedMember.updatedAt = Timestamp.now(); // Update to Timestamp

  // Recompute derived dates based on merged attendance and plan
  const recomputedMember = computeDerivedDates(mergedMember);

  return recomputedMember;
}

/**
 * Writes an array of Member objects to Firestore, handling merges and batching.
 * @param members The array of Member objects to write.
 * @param report The import report object to update.
 * @returns A promise that resolves when all writes are complete.
 */
export async function writeMembersToFirestore(members: Member[], report: ImportReport): Promise<void> {
  let batch = db.batch();
  let batchCount = 0;

  for (let i = 0; i < members.length; i++) {
    const importedMember = members[i];
    const memberRef = membersCollection.doc(importedMember.mobileNormalized); // Use mobileNormalized as doc ID for idempotency

    try {
      const existingDoc = await memberRef.get();

      if (existingDoc.exists) {
        const existingMember = existingDoc.data() as Member;
        const mergedMember = await mergeMemberData(existingMember, importedMember, i + 2, report); // i+2 for row number (1-indexed, skip header)
        batch.set(memberRef, mergedMember, { merge: true });
        report.updated++;
      } else {
        // Convert ISO strings to Timestamp for new members
        const newMember: Member = {
          ...importedMember,
          createdAt: Timestamp.fromDate(new Date(importedMember.createdAt as unknown as string)),
          updatedAt: Timestamp.fromDate(new Date(importedMember.updatedAt as unknown as string)),
        };
        batch.set(memberRef, newMember);
        report.created++;
      }

      batchCount++;
      if (batchCount === BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    } catch (error) {
      console.error(`Error processing member ${importedMember.mobileNormalized}:`, error);
      // Optionally, add to a failed list in the report
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
}
