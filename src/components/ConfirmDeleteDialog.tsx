"use client";

import React from 'react';

interface DeletableItem {
  id: string;
  name: string;
}

interface ConfirmDeleteDialogProps {
  item: DeletableItem;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteDialog({ item, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Confirm Deletion</h2>
        <p className="text-gray-700">Are you sure you want to delete "<span className="font-semibold">{item.name}</span>"?</p>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
