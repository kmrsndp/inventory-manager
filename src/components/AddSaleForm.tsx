"use client";

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { addSale, getProducts, updateProduct, getMonthlySales } from '@/services/firestoreService';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { PlusCircle } from 'lucide-react';

interface ProductData {
  id: string;
  'Item Name': string;
  'Price': number;
  'Quantity': number;
}

interface SaleData {
  id: string;
  'total price': number;
  userId: string;
  // Other fields can be added if needed
}

export default function AddSaleForm() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [customerName, setCustomerName] = useState<string>('');
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [monthlySalesTotal, setMonthlySalesTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Fetch products and monthly sales in parallel
        const [fetchedProducts, monthlySales] = await Promise.all([
          getProducts(user.uid) as Promise<ProductData[]>,
          getMonthlySales(user.uid) as Promise<SaleData[]>
        ]);

        setProducts(fetchedProducts);
        if (fetchedProducts.length > 0) {
          setSelectedProduct(fetchedProducts[0]);
        }

        const total = monthlySales.reduce((acc, sale) => acc + (sale['total price'] || 0), 0);
        setMonthlySalesTotal(total);

      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setError("Failed to load data for sale form.");
        toast.error("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user]);

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const product = products.find(p => p.id === e.target.value);
    setSelectedProduct(product || null);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setQuantity('');
    } else {
      const qty = parseInt(value, 10);
      if (!isNaN(qty) && qty > 0) {
        setQuantity(qty);
      } else {
        setQuantity(1);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      toast.error("You must be logged in to add a sale.");
      return;
    }
    if (!selectedProduct) {
      toast.error("Please select a product.");
      return;
    }
    if (quantity === '' || quantity <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }
    if (quantity > selectedProduct.Quantity) {
      toast.error(`Not enough stock for ${selectedProduct['Item Name']}. Available: ${selectedProduct.Quantity}`);
      return;
    }

    const totalPrice = selectedProduct.Price * Number(quantity);

    const saleData = {
      Date: saleDate.toISOString().split('T')[0],
      item: selectedProduct['Item Name'],
      product_id: selectedProduct.id,
      price: selectedProduct.Price,
      qty: quantity,
      'sold to': customerName || 'N/A',
      'total price': totalPrice,
      userId: user.uid, // Add userId here
    };

    try {
      await addSale(saleData, user.uid);

      // Update product stock
      const updatedStock = selectedProduct.Quantity - Number(quantity);
      await updateProduct(selectedProduct.id, { Quantity: updatedStock });

      toast.success("Sale added and inventory updated successfully!");
      // Reset form
      setQuantity(1);
      setCustomerName('');
      setSaleDate(new Date());
      // Refetch products to update stock in dropdown
      const updatedProducts = await getProducts(user.uid) as ProductData[];
      setProducts(updatedProducts);
      setSelectedProduct(updatedProducts.find(p => p.id === selectedProduct.id) || null);
      
      // Refetch monthly sales to update summary
      const monthlySales = await getMonthlySales(user.uid) as SaleData[];
      const total = monthlySales.reduce((acc, sale) => acc + (sale['total price'] || 0), 0);
      setMonthlySalesTotal(total);

    } catch (err) {
      console.error("Error adding sale or updating inventory:", err);
      setError("Failed to add sale or update inventory.");
      toast.error("Failed to add sale.");
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading products...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  if (!user) {
    return <div className="text-center mt-8 text-gray-600">Please log in to add sales.</div>;
  }

  if (products.length === 0) {
    return <div className="text-center mt-8 text-gray-600">No products available. Please add products to inventory first.</div>;
  }

  return (
    <section className="bg-white shadow-md shadow-gray-100/50 rounded-2xl p-6 space-y-6">
      <h2 className="text-lg font-medium text-gray-700 flex items-center space-x-2">
        <PlusCircle size={20} />
        <span>Add New Sale</span>
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-sm font-medium text-gray-500">Remaining Stock</p>
          <p className="text-xl font-semibold text-gray-800">
            {selectedProduct ? Math.max(0, selectedProduct.Quantity - (Number(quantity) || 0)) : 'N/A'}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-sm font-medium text-gray-500">This Month’s Sales Total</p>
          <p className="text-xl font-semibold text-gray-800">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(monthlySalesTotal)}
          </p>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
        <div>
          <label htmlFor="saleDate" className="block text-sm font-medium text-gray-700">Date</label>
          <DatePicker
            selected={saleDate}
            onChange={(date: Date | null) => setSaleDate(date || new Date())}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
            dateFormat="yyyy-MM-dd"
            required
          />
        </div>
        <div>
          <label htmlFor="product" className="block text-sm font-medium text-gray-700">Product</label>
          <select
            id="product"
            value={selectedProduct?.id || ''}
            onChange={handleProductChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
            required
          >
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product['Item Name']} (Stock: {product.Quantity})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={handleQuantityChange}
            min="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
            required
          />
        </div>
        <div>
          <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Customer Name (Optional)</label>
          <input
            type="text"
            id="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Enter customer name"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            Add Sale
          </button>
        </div>
      </form>
    </section>
  );
}
