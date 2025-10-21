"use client";

import { useState, useEffect, useRef } from 'react';
import { Upload, MoreVertical } from 'lucide-react';
import { Member } from '@/types/member';
import { parseExcelData } from '@/lib/excel';
import { importMembers, getMembers, updateMemberStatus } from '@/services/memberService';
import toast, { Toaster } from 'react-hot-toast';
import MemberModal from '@/components/MemberModal';
import { format, parseISO, isBefore } from 'date-fns';
import { updateMember } from '@/services/memberService'; // Import updateMember

export default function BurnBlastPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const membersData = await getMembers();
      setMembers(membersData);
    } catch {
      toast.error('Failed to fetch members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeMembers = async () => {
      await updateMemberStatus(); // Update statuses on page load
      fetchMembers();
    };
    initializeMembers();
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const toastId = toast.loading('Importing members...');
      try {
        const parsedData = await parseExcelData(file);
        await importMembers(parsedData);
        toast.success('Members imported successfully!', { id: toastId });
        fetchMembers();
      } catch {
        toast.error('Failed to import members.', { id: toastId });
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleEdit = (member: Member) => {
    setSelectedMember(member);
  };

  const handleCloseModal = () => {
    setSelectedMember(null);
  };

  const handleSaveMember = async (updatedMember: Member) => {
    try {
      await updateMember(updatedMember.id, updatedMember);
      toast.success('Member updated successfully!');
      fetchMembers(); // Refresh the list after update
      handleCloseModal();
    } catch (error) {
      console.error('Failed to update member:', error);
      toast.error('Failed to update member.');
    }
  };

  return (
    <div className="p-8">
      <Toaster position="top-right" />
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Burn & Blast</h1>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".xlsx, .xls"
        />
        <button
          onClick={handleImportClick}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-300 flex items-center space-x-2"
        >
          <Upload size={20} />
          <span>Import Excel</span>
        </button>
      </header>
      <main>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Members</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <div className="text-gray-700">Loading members...</div>
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id}>
                      <td className="py-4 px-4 whitespace-nowrap text-gray-700 cursor-pointer hover:text-indigo-600" onClick={() => handleEdit(member)}>
                        {member.name}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-gray-700">{member.mobile}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-gray-700">
                        {member.planType === 'Unknown' ? 'N/A' : member.planType}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-gray-700">
                        {member.nextDueDate ? format(parseISO(member.nextDueDate), 'dd-MMM-yyyy') : 'N/A'}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-gray-700">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            member.nextDueDate && isBefore(parseISO(member.nextDueDate), new Date())
                              ? 'bg-red-100 text-red-800' // Overdue
                              : member.status === 'Active' ? 'bg-green-100 text-green-800' :
                                member.status === 'DueSoon' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800' // Default for 'Stopped' or other statuses
                          }`}
                        >
                          {member.nextDueDate && isBefore(parseISO(member.nextDueDate), new Date()) ? 'Overdue' : member.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-gray-700">
                        {/* The MoreVertical button can be kept for other actions or removed if not needed */}
                        <button onClick={() => handleEdit(member)} className="text-gray-500 hover:text-gray-700">
                          <MoreVertical size={20} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <MemberModal
        member={selectedMember}
        onClose={handleCloseModal}
        onSave={handleSaveMember} // Pass handleSaveMember to the modal
      />
    </div>
  );
}
