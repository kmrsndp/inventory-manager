"use client";

import React from 'react';

interface InventoryItem {
  id?: string;
  'Item Name': string;
  'Category': string;
  'Price': number;
  'Quantity': number;
  'Supplier': string;
  'Last Updated': string;
  userId: string;
}

interface ConfirmDeleteDialogProps {
  item: InventoryItem;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteDialog({ item, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
      <div className="bg-gray-200 p-6 rounded-lg shadow-lg">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Confirm Deletion</h2>
        <p className="text-gray-800">Are you sure you want to delete "{item['Item Name']}"?</p>
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-200 text-gray-800">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 text-white">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
