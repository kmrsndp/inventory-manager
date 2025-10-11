"use client";

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

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

interface EditRowProps {
  item: InventoryItem;
  onSave: (item: InventoryItem) => void;
  onCancel: () => void;
}

export default function EditRow({ item, onSave, onCancel }: EditRowProps) {
  const [formData, setFormData] = useState(item);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <tr className="bg-gray-50 border-l-4 border-indigo-500">
      <td className="py-3 px-4">
        <input
          type="text"
          name="Item Name"
          value={formData['Item Name']}
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-full p-1 border rounded text-gray-800"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="text"
          name="Category"
          value={formData.Category}
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-full p-1 border rounded text-gray-800"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="number"
          name="Price"
          value={formData.Price}
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-full p-1 border rounded text-gray-800"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="number"
          name="Quantity"
          value={formData.Quantity}
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-full p-1 border rounded text-gray-800"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="text"
          name="Supplier"
          value={formData.Supplier}
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-full p-1 border rounded text-gray-800"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="date"
          name="Last Updated"
          value={formData['Last Updated']}
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-full p-1 border rounded text-gray-800"
        />
      </td>
      <td className="py-3 px-4 text-right space-x-2">
        <button onClick={() => onSave(formData)} className="p-1 rounded-full hover:bg-green-100">
          <Check size={16} className="text-green-600" />
        </button>
        <button onClick={onCancel} className="p-1 rounded-full hover:bg-red-100">
          <X size={16} className="text-red-600" />
        </button>
      </td>
    </tr>
  );
}
