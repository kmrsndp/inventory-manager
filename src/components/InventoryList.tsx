"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { addProduct, updateProduct, deleteProduct, onInventoryChange } from '@/services/firestoreService';
import { useAuth } from '@/context/AuthContext';
import { UploadCloud, Pencil, Trash2 } from 'lucide-react';
import EditRow from './EditRow';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import toast, { Toaster } from 'react-hot-toast';

interface InventoryItem {
  id?: string; // Optional for new items, required for existing
  'Item Name': string;
  'Category': string;
  'Price': number;
  'Quantity': number;
  'Supplier': string;
  'Last Updated': string;
  userId: string;
}

export default function InventoryList() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const unsubscribe = onInventoryChange(user.uid, (items: InventoryItem[]) => {
        setInventoryItems(items);
        setLoading(false);
      }, (err: Error) => {
        console.error("Failed to fetch inventory:", err);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!user) {
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: InventoryItem[] = XLSX.utils.sheet_to_json(worksheet);

        try {
          // Add each item to Firestore
          for (const item of json) {
            await addProduct(item, user.uid);
          }
        } catch (err) {
          console.error("Error uploading inventory data:", err);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading inventory...</div>;
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
                <th className="py-3 px-4 text-right text-sm text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventoryItems.map((item, index) => (
                editingItem?.id === item.id && editingItem ? (
                  <EditRow
                    key={item.id}
                    item={editingItem}
                    onSave={async (updatedItem: InventoryItem) => {
                      if (!user || !updatedItem.id) return;
                      try {
                        await updateProduct(updatedItem.id, updatedItem);
                        toast.success('Item updated successfully!');
                      } catch (error) {
                        toast.error('Failed to update item.');
                        console.log("error " + error);
                        
                      } finally {
                        setEditingItem(null);
                      }
                    }}
                    onCancel={() => setEditingItem(null)}
                  />
                ) : (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4 text-left text-gray-700">{item['Item Name']}</td>
                    <td className="py-3 px-4 text-left text-gray-700">{item.Category}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.Price)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{item.Quantity}</td>
                    <td className="py-3 px-4 text-left text-gray-700">{item.Supplier}</td>
                    <td className="py-3 px-4 text-left text-gray-700">{new Date(item['Last Updated']).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button onClick={() => setEditingItem(item)} className="p-1 rounded-full hover:bg-gray-100">
                        <Pencil size={16} className="text-gray-600" />
                      </button>
                      <button onClick={() => setDeletingItem(item)} className="p-1 rounded-full hover:bg-red-100">
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-600 mt-4">No inventory items found. Please upload an Excel file.</p>
      )}
      {deletingItem && (
        <ConfirmDeleteDialog
          item={{ id: deletingItem.id!, name: deletingItem['Item Name'] }}
          onConfirm={async () => {
            if (!user || !deletingItem.id) return;
            try {
              await deleteProduct(deletingItem.id);
              toast.success('Item deleted successfully!');
            } catch {
              toast.error('Failed to delete item.');
            } finally {
              setDeletingItem(null);
            }
          }}
          onCancel={() => setDeletingItem(null)}
        />
      )}
      <Toaster />
    </section>
  );
}
