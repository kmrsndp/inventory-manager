"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { addProduct, getProducts } from '@/services/firestoreService';
import { useAuth } from '@/context/AuthContext';
import { UploadCloud } from 'lucide-react'; // Moved to top-level

interface InventoryItem {
  id?: string; // Optional for new items, required for existing
  'Item Name': string;
  'Category': string;
  'Price': number;
  'Quantity': number;
  'Supplier': string;
  'Last Updated': string;
}

export default function InventoryList() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchInventory = React.useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items = await getProducts();
      setInventoryItems(items as InventoryItem[]);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      setError("Failed to load inventory items.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInventory();
  }, [user, fetchInventory]); // Refetch when user changes

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!user) {
        setError("You must be logged in to upload inventory data.");
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: InventoryItem[] = XLSX.utils.sheet_to_json(worksheet);

        setError(null);
        try {
          // Add each item to Firestore
          for (const item of json) {
            await addProduct(item);
          }
          // After successful upload, refetch inventory to update UI
          await fetchInventory();
        } catch (err) {
          console.error("Error uploading inventory data:", err);
          setError("Failed to upload inventory data to Firestore.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading inventory...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  if (!user) {
    return <div className="text-center mt-8 text-gray-600">Please log in to view and manage inventory.</div>;
  }

  return (
    <section id="inventory-list" className="bg-white shadow-md shadow-gray-100/50 rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-medium text-gray-700">Items List</h2>
      <div className="mb-4">
        <label
          htmlFor="inventory-excel-upload"
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
        >
          <UploadCloud size={32} className="text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Click or drag an Excel file here to upload</p>
          <input
            type="file"
            id="inventory-excel-upload"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {inventoryItems.length > 0 ? (
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 shadow-sm">
              <tr>
                <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Item Name</th>
                <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Category</th>
                <th className="py-3 px-4 text-right text-sm text-gray-500 uppercase tracking-wider">Price</th>
                <th className="py-3 px-4 text-right text-sm text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Last Updated</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventoryItems.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-3 px-4 text-left text-gray-700">{item['Item Name']}</td>
                  <td className="py-3 px-4 text-left text-gray-700">{item.Category}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.Price)}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.Quantity}</td>
                  <td className="py-3 px-4 text-left text-gray-700">{item.Supplier}</td>
                  <td className="py-3 px-4 text-left text-gray-700">{new Date(item['Last Updated']).toLocaleDateString()}</td>
                </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : (
        <p className="text-center text-gray-600 mt-4">No inventory items found. Please upload an Excel file.</p>
      )}
    </section>
  );
}
