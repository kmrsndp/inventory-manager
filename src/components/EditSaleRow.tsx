"use client";

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

interface SaleData {
  id?: string;
  Date: string;
  item: string;
  price: number;
  qty: number;
  'sold to'?: string;
  'total price': number;
  userId: string;
}

interface EditSaleRowProps {
  sale: SaleData;
  onSave: (sale: SaleData) => void;
  onCancel: () => void;
}

export default function EditSaleRow({ sale, onSave, onCancel }: EditSaleRowProps) {
  const [formData, setFormData] = useState(sale);

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
          type="date"
          name="Date"
          value={formData.Date}
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-full p-1 border rounded text-gray-800"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="text"
          name="item"
          value={formData.item}
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-full p-1 border rounded text-gray-800"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="number"
          name="price"
          value={formData.price}
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-full p-1 border rounded text-gray-800"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="number"
          name="qty"
          value={formData.qty}
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-full p-1 border rounded text-gray-800"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="text"
          name="sold to"
          value={formData['sold to'] || ''}
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-full p-1 border rounded text-gray-800"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="number"
          name="total price"
          value={formData['total price']}
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
