import { db } from '@/lib/firebase';
import { Member } from '@/types/member';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  Timestamp,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { format, isBefore, isAfter, subDays, parseISO } from 'date-fns';

const membersCollection = collection(db, 'members');

export const getMemberByMobile = async (mobile: string): Promise<Member | null> => {
  const q = query(membersCollection, where('mobile', '==', mobile));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data() as Member;
  }
  return null;
};

export const importMembers = async (members: Partial<Member>[]) => {
  const batch = writeBatch(db);

  for (const member of members) {
    if (!member.mobile) {
      console.warn('Skipping member due to missing mobile number:', member);
      continue;
    }

    try {
      const existingMember = await getMemberByMobile(member.mobile);

      if (existingMember) {
        const memberRef = doc(db, 'members', existingMember.id);
        const updateData: Partial<Member> = {
          name: member.name, // Update name as well
          planType: member.planType,
          startDate: member.startDate,
          nextDueDate: member.nextDueDate,
          status: member.status, // Update status if provided
          updatedAt: Timestamp.now(),
          importMonth: member.importMonth,
        };

        // Only update conflictInfo if there's a name mismatch
        if (member.name && existingMember.name.toLowerCase() !== member.name.toLowerCase()) {
          updateData.conflictInfo = {
            previousName: existingMember.name,
            importedName: member.name,
            note: `Name mismatch during import on ${new Date().toLocaleDateString()}`,
          };
        }
        batch.update(memberRef, updateData);
      } else {
        const newMemberRef = doc(membersCollection);
        const newMember: Member = {
          id: newMemberRef.id,
          name: member.name || 'Unknown', // Default name if missing
          mobile: member.mobile!, // Mobile should always be present due to earlier check
          planType: member.planType || 'Unknown', // Default planType
          startDate: member.startDate || format(new Date(), 'yyyy-MM-dd'), // Default startDate
          durationMonths: 0, // Not directly used from Excel anymore
          nextDueDate: member.nextDueDate || null, // Can be null
          status: member.status || 'Active', // Default status
          totalPaid: 0,
          payments: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          importMonth: member.importMonth,
        };
        batch.set(newMemberRef, newMember);
      }
    } catch (error) {
      console.error(`Error processing member ${member.mobile}:`, error);
      // Continue to next member even if one fails
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    console.error('Error committing batch:', error);
    throw error; // Re-throw to be caught by the UI component
  }
};

export const getMembers = async (): Promise<Member[]> => {
  const querySnapshot = await getDocs(membersCollection);
  return querySnapshot.docs.map(doc => doc.data() as Member);
};

export const updateMember = async (id: string, memberData: Partial<Member>) => {
  const memberRef = doc(db, 'members', id);
  await updateDoc(memberRef, {
    ...memberData,
    updatedAt: Timestamp.now(),
  });
};

export const deleteMember = async (id: string) => {
  const memberRef = doc(db, 'members', id);
  await deleteDoc(memberRef);
};

export const updateMemberStatus = async (): Promise<{ totalMembers: number; activeCount: number; dueSoonCount: number; overdueCount: number }> => {
  const querySnapshot = await getDocs(membersCollection);
  const members = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Member[];

  let activeCount = 0;
  let dueSoonCount = 0;
  let overdueCount = 0;
  const today = new Date();

  const batch = writeBatch(db);

  for (const member of members) {
    let newStatus: Member['status'] = member.status;
    if (member.nextDueDate) {
      const nextDueDate = parseISO(member.nextDueDate);
      if (isBefore(today, nextDueDate)) {
        // If today is within 7 days before nextDueDate
        if (isAfter(today, subDays(nextDueDate, 7))) {
          newStatus = 'DueSoon';
        } else {
          newStatus = 'Active';
        }
      } else if (isAfter(today, nextDueDate)) {
        newStatus = 'Overdue';
      }
    } else {
      newStatus = 'Unknown'; // Or a default status if nextDueDate is missing
    }

    if (newStatus !== member.status) {
      const memberRef = doc(db, 'members', member.id);
      batch.update(memberRef, { status: newStatus, updatedAt: Timestamp.now() });
    }

    // Count for summary
    if (newStatus === 'Active') {
      activeCount++;
    } else if (newStatus === 'DueSoon') {
      dueSoonCount++;
    } else if (newStatus === 'Overdue') {
      overdueCount++;
    }
  }

  await batch.commit();

  return {
    totalMembers: members.length,
    activeCount,
    dueSoonCount,
    overdueCount,
  };
};
