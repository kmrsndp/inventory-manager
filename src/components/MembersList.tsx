'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { onMembersChange, updateMember, deleteMember } from '@/services/memberService';
import { Member } from '@/types/member';
import { Pencil, Trash2 } from 'lucide-react';
import MemberModal from './MemberModal'; // Assuming a modal for editing members
import ConfirmMemberDeleteDialog from './ConfirmMemberDeleteDialog'; // Assuming a dialog for confirming member deletion
import toast, { Toaster } from 'react-hot-toast';

export default function MembersList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const unsubscribe = onMembersChange(user.uid, (fetchedMembers: Member[]) => {
        setMembers(fetchedMembers);
        setLoading(false);
      }, (err: Error) => {
        console.error("Failed to fetch members:", err);
        setLoading(false);
        toast.error('Failed to load members.');
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleUpdateMember = async (updatedMember: Member) => {
    if (!user || !updatedMember.id) return;
    try {
      await updateMember(updatedMember.id, updatedMember);
      toast.success('Member updated successfully!');
    } catch (error) {
      toast.error('Failed to update member.');
      console.error("Error updating member:", error);
    } finally {
      setEditingMember(null);
    }
  };

  const handleDeleteMember = async () => {
    if (!user || !deletingMember?.id) return;
    try {
      await deleteMember(deletingMember.id);
      toast.success('Member deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete member.');
      console.error("Error deleting member:", error);
    } finally {
      setDeletingMember(null);
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading members...</div>;
  }

  if (!user) {
    return <div className="text-center mt-8 text-gray-600">Please log in to view and manage members.</div>;
  }

  return (
    <section id="members-list" className="bg-white shadow-md shadow-gray-100/50 rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-medium text-gray-700">Members List</h2>

      {members.length > 0 ? (
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 shadow-sm">
              <tr>
                <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Name</th>
                <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Mobile</th>
                <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Last Attendance</th>
                <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Next Payment Due</th>
                <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Attended Months</th>
                <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Status</th> {/* Added Status column */}
                <th className="py-3 px-4 text-right text-sm text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-left text-gray-700">{member.name}</td>
                  <td className="py-3 px-4 text-left text-gray-700">{member.mobileNormalized}</td>
                  <td className="py-3 px-4 text-left text-gray-700">
                    {member.planType && member.planMonths ? `${member.planType} (${member.planMonths}M)` : member.planRaw || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-left text-gray-700">{member.lastAttendance || 'N/A'}</td>
                  <td className="py-3 px-4 text-left text-gray-700">{member.nextPaymentDueByPlan || 'N/A'}</td>
                  <td className="py-3 px-4 text-left text-gray-700">{member.attendedMonths.join(', ') || 'N/A'}</td>
                  <td className="py-3 px-4 text-left text-gray-700">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.status === 'Active' ? 'bg-green-100 text-green-800' :
                      member.status === 'DueSoon' ? 'bg-yellow-100 text-yellow-800' :
                      member.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {member.status || 'Unknown'}
                    </span>
                  </td> {/* Display Status */}
                  <td className="py-3 px-4 text-right space-x-2">
                    <button onClick={() => setEditingMember(member)} className="p-1 rounded-full hover:bg-gray-100">
                      <Pencil size={16} className="text-gray-600" />
                    </button>
                    <button onClick={() => setDeletingMember(member)} className="p-1 rounded-full hover:bg-red-100">
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-600 mt-4">No members found. Import an Excel file to add members.</p>
      )}

      {editingMember && (
        <MemberModal
          member={editingMember}
          onSave={handleUpdateMember}
          onClose={() => setEditingMember(null)}
        />
      )}

      {deletingMember && (
        <ConfirmMemberDeleteDialog
          member={deletingMember}
          onConfirm={handleDeleteMember}
          onCancel={() => setDeletingMember(null)}
        />
      )}
      <Toaster />
    </section>
  );
}
