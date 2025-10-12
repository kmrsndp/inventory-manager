"use client";

import React from "react";

interface SaleData {
  id?: string;
  Date: string;
  item: string;
  price: number;
  qty: number;
  "sold to"?: string;
  "total price": number;
  userId: string;
}

interface ConfirmDeleteSaleDialogProps {
  sale: SaleData;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteSaleDialog({ sale, onConfirm, onCancel }: ConfirmDeleteSaleDialogProps) {
  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Confirm Deletion</h2>
        <p className="text-gray-800">
          Are you sure you want to delete <span className="font-semibold text-red-600">{sale.item}</span>?
        </p>
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
