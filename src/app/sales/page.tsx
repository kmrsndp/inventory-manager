"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { addSale, onSalesChange, updateSale, deleteSale, onInventoryChange } from '@/services/firestoreService';
import { useAuth } from '@/context/AuthContext';
import AuthGuardWrapper from '@/components/Auth/AuthGuardWrapper';
import { UploadCloud, Pencil, Trash2 } from 'lucide-react';
import EditSaleRow from '@/components/EditSaleRow';
import ConfirmDeleteSaleDialog from '@/components/ConfirmDeleteSaleDialog';
import toast, { Toaster } from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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

interface ProductData {
  id?: string;
  'Item Name': string;
  'Category': string;
  'Price': number;
  'Quantity': number;
  'Supplier': string;
  'Last Updated': string;
  userId: string;
}

export default function SalesPage() {
  const [salesData, setSalesData] = useState<SaleData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [chartData, setChartData] = useState<{ labels: string[]; datasets: { label: string; data: number[]; borderColor: string; backgroundColor: string; tension: number; }[] }>({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [editingSale, setEditingSale] = useState<SaleData | null>(null);
  const [deletingSale, setDeletingSale] = useState<SaleData | null>(null);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const unsubscribeSales = onSalesChange(user.uid, (sales: SaleData[]) => {
        setSalesData(sales);
        processSalesDataForChart(sales);
        setLoading(false);
      }, (err: Error) => {
        console.error("Failed to fetch sales:", err);
        setError("Failed to load sales data.");
        setLoading(false);
      });

      const unsubscribeProducts = onInventoryChange(user.uid, (products: ProductData[]) => {
        setProducts(products);
      }, (err: Error) => {
        console.error("Failed to fetch products:", err);
        setError("Failed to load products.");
      });

      return () => {
        unsubscribeSales();
        unsubscribeProducts();
      };
    }
  }, [user]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!user) {
        setError("You must be logged in to upload sales data.");
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: SaleData[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });

        setError(null);
        try {
          for (const sale of json) {
            // Ensure 'total price' is calculated if not present or incorrect
            if (sale.price && sale.qty && !sale['total price']) {
              sale['total price'] = sale.price * sale.qty;
            }
            await addSale(sale, user.uid);
          }
        } catch (err) {
          console.error("Error uploading sales data:", err);
          setError("Failed to upload sales data to Firestore.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processSalesDataForChart = (data: SaleData[]) => {
    const monthlySales: { [key: string]: number } = {};

    data.forEach(sale => {
      const date = new Date(sale.Date);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlySales[monthYear] = (monthlySales[monthYear] || 0) + sale['total price'];
    });

    const sortedMonths = Object.keys(monthlySales).sort();

    setChartData({
      labels: sortedMonths,
      datasets: [
        {
          label: 'Monthly Sales',
          data: sortedMonths.map(month => monthlySales[month]),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.1,
        },
      ],
    });
  };

  // Calculate summary data
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let totalSalesCurrentMonth = 0;
  let totalRemainingStock = 0;

  salesData.forEach(sale => {
    const saleDate = new Date(sale.Date);
    if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
      totalSalesCurrentMonth += sale['total price'];
    }
  });

  products.forEach(product => {
    const quantity = Number(product.Quantity);
    if (!isNaN(quantity)) {
      totalRemainingStock += quantity;
    }
  });


  if (loading) {
    return <div className="text-center mt-8">Loading sales data...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  if (!user) {
    return (
      <>
        <AuthGuardWrapper />
        <div className="text-center mt-8 text-gray-600">Please log in to view and manage sales data.</div>
      </>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <AuthGuardWrapper />
      <section className="bg-white shadow-md shadow-gray-100/50 rounded-2xl p-6 space-y-6">
        <h2 className="text-lg font-medium text-gray-700">Sales Records</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h4 className="text-sm font-medium text-gray-600">This Months Sales Total</h4>
            <p className="text-2xl font-bold text-gray-800">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalSalesCurrentMonth)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h4 className="text-sm font-medium text-gray-600">Total Remaining Stock</h4>
            <p className="text-2xl font-bold text-gray-800">{totalRemainingStock}</p>
          </div>
        </div>
        <div className="mb-4">
          <label
            htmlFor="excel-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
          >
            <UploadCloud size={32} className="text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Click or drag an Excel file here to upload</p>
          <input
            type="file"
            id="excel-upload"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        </div>

        {salesData.length > 0 ? (
          <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 shadow-sm">
                <tr>
                  <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="py-3 px-4 text-right text-sm text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="py-3 px-4 text-right text-sm text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="py-3 px-4 text-left text-sm text-gray-500 uppercase tracking-wider">Sold To</th>
                  <th className="py-3 px-4 text-right text-sm text-gray-500 uppercase tracking-wider">Total Price</th>
                  <th className="py-3 px-4 text-right text-sm text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesData.map((sale, index) => (
                  editingSale?.id === sale.id && editingSale ? (
                    <EditSaleRow
                      key={sale.id}
                      sale={editingSale}
                      onSave={async (updatedSale: SaleData) => {
                        if (!user || !updatedSale.id) return;
                        try {
                          await updateSale(updatedSale.id, updatedSale);
                          toast.success('Sale updated successfully!');
                        } catch (error) {
                          toast.error('Failed to update sale.');
                          console.log("error thrown is", error);
                        } finally {
                          setEditingSale(null);
                        }
                      }}
                      onCancel={() => setEditingSale(null)}
                    />
                  ) : (
                    <tr key={sale.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-3 px-4 text-left text-gray-700">{new Date(sale.Date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-left text-gray-700">{sale.item}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(sale.price)}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{sale.qty}</td>
                      <td className="py-3 px-4 text-left text-gray-700">{sale['sold to'] || 'N/A'}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(sale['total price'])}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button onClick={() => setEditingSale(sale)} className="p-1 rounded-full hover:bg-gray-100">
                          <Pencil size={16} className="text-gray-600" />
                        </button>
                        <button onClick={() => setDeletingSale(sale)} className="p-1 rounded-full hover:bg-red-100">
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
          <p className="text-center text-gray-600 mt-4">No sales data found. Please upload an Excel file.</p>
        )}
      </section>

      {chartData.labels && chartData.labels.length > 0 && (
        <section className="bg-white shadow-md shadow-gray-100/50 rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-medium text-gray-700">Monthly Sales Chart</h3>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <Line data={chartData} />
          </div>
        </section>
      )}
      {deletingSale && (
        <ConfirmDeleteSaleDialog
          sale={deletingSale}
          onConfirm={async () => {
            if (!user || !deletingSale.id) return;
            try {
              await deleteSale(deletingSale.id);
              toast.success('Sale deleted successfully!');
            } catch (error) {
              toast.error('Failed to delete sale.');
              console.log("error thrown is", error);
              
            } finally {
              setDeletingSale(null);
            }
          }}
          onCancel={() => setDeletingSale(null)}
        />
      )}
      <Toaster />
    </div>
  );
}
