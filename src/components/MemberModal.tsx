import { useState, useEffect } from 'react';
import { Member, Payment } from '@/types/member';
import { X, Plus, Edit, Trash2, Clock, List, User, Calendar, DollarSign } from 'lucide-react'; // Combined imports
import { format, parseISO, isBefore, addMonths } from 'date-fns'; // Keep addMonths for planMonths calculation
import { updateMember, deleteMember } from '@/services/memberService';
import toast from 'react-hot-toast';
import ConfirmMemberDeleteDialog from './ConfirmMemberDeleteDialog';

interface MemberModalProps {
  member: Member | null;
  onClose: () => void;
  onSave: (updatedMember: Member) => Promise<void>; // Use onSave prop
}

export default function MemberModal({ member, onClose, onSave }: MemberModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMember, setEditedMember] = useState<Member | null>(null);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState<Payment>({ date: format(new Date(), 'yyyy-MM-dd'), amount: 0, method: '' });
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (member) {
      setEditedMember({ ...member });
      setIsEditing(false);
      setShowAddPaymentForm(false);
      setNewPayment({ date: format(new Date(), 'yyyy-MM-dd'), amount: 0, method: '' });
    }
  }, [member]);

  if (!member) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedMember(prev => {
      if (!prev) return null;
      if (name === 'planMonths') { // Keep planMonths logic
        const planMonths = parseInt(value, 10);
        const newNextPaymentDueByPlan = prev.lastAttendance && !isNaN(planMonths)
          ? format(addMonths(parseISO(prev.lastAttendance), planMonths), 'yyyy-MM-dd')
          : null;
        return { ...prev, [name]: isNaN(planMonths) ? null : planMonths, nextPaymentDueByPlan: newNextPaymentDueByPlan };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSave = async () => {
    if (!editedMember) return;
    try {
      await onSave(editedMember); // Use the onSave prop
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save member:', error);
      toast.error('Failed to save member.');
    }
  };

  const handleAddPayment = async () => {
    if (!editedMember || !newPayment.amount || !newPayment.method) {
      toast.error('Please fill all payment fields.');
      return;
    }

    const updatedPayments = [...(editedMember.payments || []), newPayment];
    const updatedTotalPaid = (editedMember.totalPaid || 0) + newPayment.amount;

    const updatedMemberWithPayment = {
      ...editedMember,
      payments: updatedPayments,
      totalPaid: updatedTotalPaid,
    };

    try {
      await updateMember(editedMember.id, updatedMemberWithPayment);
      toast.success('Payment added successfully!');
      setShowAddPaymentForm(false);
      setNewPayment({ date: format(new Date(), 'yyyy-MM-dd'), amount: 0, method: '' });
      setEditedMember(updatedMemberWithPayment); // Update local state immediately
    } catch (error) {
      console.error('Failed to add payment:', error);
      toast.error('Failed to add payment.');
    }
  };

  const handleDelete = async () => {
    if (!member?.id) return;
    try {
      await deleteMember(member.id);
      toast.success('Member deleted successfully!');
      onClose(); // Close the modal after deletion
    } catch (error) {
      console.error('Failed to delete member:', error);
      toast.error('Failed to delete member.');
    } finally {
      setShowConfirmDelete(false);
    }
  };

  const getStatusBadgeClass = (status: Member['status']) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'DueSoon': return 'bg-yellow-100 text-yellow-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Stopped': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentStatus = editedMember?.nextDueDate && isBefore(parseISO(editedMember.nextDueDate), new Date())
    ? 'Overdue'
    : editedMember?.status || 'Unknown';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6 border-b pb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
              <User size={28} />
              <span>{editedMember?.name}</span>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(currentStatus as Member['status'])}`}>
                {currentStatus}
              </span>
            </h2>
            <p className="text-gray-600 mt-2 flex items-center space-x-2">
              <Clock size={16} />
              <span>Mobile: {editedMember?.mobile}</span>
              <span className="ml-4">Plan: {editedMember?.planType === 'Unknown' ? 'N/A' : editedMember?.planType}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              {isEditing ? (
                <input
                  type="date"
                  name="startDate"
                  value={editedMember?.startDate || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                />
              ) : (
                <p className="mt-1 block w-full px-3 py-2 bg-gray-50 rounded-md border border-gray-300 text-gray-900 sm:text-sm">
                  {editedMember?.startDate ? format(parseISO(editedMember.startDate), 'dd-MMM-yyyy') : 'N/A'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Plan Months</label>
              {isEditing ? (
                <input
                  type="number"
                  name="planMonths"
                  value={editedMember?.planMonths || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                />
              ) : (
                <p className="mt-1 block w-full px-3 py-2 bg-gray-50 rounded-md border border-gray-300 text-gray-900 sm:text-sm">
                  {editedMember?.planMonths || 'N/A'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Attendance</label>
              <p className="mt-1 block w-full px-3 py-2 bg-gray-50 rounded-md border border-gray-300 text-gray-900 sm:text-sm">
                {editedMember?.lastAttendance ? format(parseISO(editedMember.lastAttendance), 'dd-MMM-yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Next Payment Due</label>
              <p className="mt-1 block w-full px-3 py-2 bg-gray-50 rounded-md border border-gray-300 text-gray-900 sm:text-sm">
                {editedMember?.nextPaymentDueByPlan ? format(parseISO(editedMember.nextPaymentDueByPlan), 'dd-MMM-yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Paid</label>
              <p className="mt-1 block w-full px-3 py-2 bg-gray-50 rounded-md border border-gray-300 text-gray-900 sm:text-sm">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(editedMember?.totalPaid || 0)}
              </p>
            </div>
          </div>

          {/* Payment History */}
          <div className="border-t pt-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center space-x-2">
              <List size={20} />
              <span>Payment History</span>
            </h3>
            {editedMember?.payments && editedMember.payments.length > 0 ? (
              <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {editedMember.payments.map((payment, index) => (
                      <tr key={index}>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-700">{format(parseISO(payment.date), 'dd-MMM-yyyy')}</td>
                        <td className="py-3 px-4 whitespace-nowrap text-right text-gray-700">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payment.amount)}</td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-700">{payment.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">No payment history available.</p>
            )}

            {/* Add Payment Form */}
            {showAddPaymentForm && (
              <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                <h4 className="text-lg font-semibold text-gray-700 mb-3">Add New Payment</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                      type="date"
                      id="paymentDate"
                      name="date"
                      value={newPayment.date}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700">Amount</label>
                    <input
                      type="number"
                      id="paymentAmount"
                      name="amount"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">Method</label>
                    <select
                      id="paymentMethod"
                      name="method"
                      value={newPayment.method}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, method: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                    >
                      <option value="">Select Method</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddPaymentForm(false)}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPayment}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <Plus size={18} />
                    <span>Add Payment</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-end space-x-4 border-t pt-4">
          {!showAddPaymentForm && (
            <button
              onClick={() => setShowAddPaymentForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Add Payment</span>
            </button>
          )}
          {isEditing ? (
            <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center space-x-2">
              <Edit size={18} />
              <span>Save Changes</span>
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2">
              <Edit size={18} />
              <span>Edit Member</span>
            </button>
          )}
          <button onClick={() => setShowConfirmDelete(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2">
            <Trash2 size={18} />
            <span>Delete Member</span>
          </button>
          <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">
            Close
          </button>
        </div>
      </div>

      {showConfirmDelete && (
        <ConfirmMemberDeleteDialog
          member={{ id: member.id, name: member.name }}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}
    </div>
  );
}
