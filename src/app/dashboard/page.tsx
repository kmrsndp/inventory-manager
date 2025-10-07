"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthGuardWrapper from '@/components/Auth/AuthGuardWrapper';
import { getSales, getProducts } from '@/services/firestoreService';
import { LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import KPICard from '@/components/KPICard';
import { TrendingUp, Package, AlertTriangle } from 'lucide-react';

interface SaleData {
  id?: string;
  Date: string;
  item: string;
  price: number;
  qty: number;
  'total price': number;
}

interface ProductData {
  id?: string;
  'Item Name': string;
  'Category': string;
  'Price': number;
  'Quantity': number;
  'Supplier': string;
  'Last Updated': string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [sales, setSales] = useState<SaleData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoadingData(false);
        return;
      }
      setLoadingData(true);
      setError(null);
      try {
        const fetchedSales = await getSales() as SaleData[];
        const fetchedProducts = await getProducts() as ProductData[];
        setSales(fetchedSales);
        setProducts(fetchedProducts);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoadingData(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  // Process data for charts and KPIs
  const processData = () => {
    const currentMonth = new Date().getMonth();
    const lastMonth = (currentMonth === 0) ? 11 : currentMonth - 1;
    const currentYear = new Date().getFullYear();

    let totalSalesCurrentMonth = 0;
    let totalSalesLastMonth = 0;
    let totalInventoryValue = 0;
    let lowStockItems = 0;

    const monthlySalesMap: { [key: string]: number } = {};
    const yearlySalesMap: { [key: string]: number } = {};
    const topProductsMap: { [key: string]: number } = {};

    sales.forEach(sale => {
      const saleDate = new Date(sale.Date);
      const saleMonth = saleDate.getMonth();
      const saleYear = saleDate.getFullYear();
      const monthYearKey = `${saleYear}-${(saleMonth + 1).toString().padStart(2, '0')}`;
      const yearKey = saleYear.toString();

      // Monthly sales
      monthlySalesMap[monthYearKey] = (monthlySalesMap[monthYearKey] || 0) + sale['total price'];

      // Yearly sales
      yearlySalesMap[yearKey] = (yearlySalesMap[yearKey] || 0) + sale['total price'];

      // Current and last month sales
      if (saleYear === currentYear) {
        if (saleMonth === currentMonth) {
          totalSalesCurrentMonth += sale['total price'];
        } else if (saleMonth === lastMonth) {
          totalSalesLastMonth += sale['total price'];
        }
      }

      // Top products by revenue
      topProductsMap[sale.item] = (topProductsMap[sale.item] || 0) + sale['total price'];
    });

    products.forEach(product => {
      totalInventoryValue += product.Price * product.Quantity;
      if (product.Quantity < 5) { // Arbitrary low stock threshold
        lowStockItems++;
      }
    });

    const monthlySalesChartData = Object.keys(monthlySalesMap).sort().map(key => ({
      month: key,
      sales: monthlySalesMap[key],
    }));

    const yearlySalesChartData = Object.keys(yearlySalesMap).sort().map(key => ({
      year: key,
      sales: yearlySalesMap[key],
    }));

    const topProductsChartData = Object.entries(topProductsMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5) // Top 5 products
      .map(([item, sales]) => ({ item, sales }));

    const monthlyGrowth = totalSalesLastMonth > 0
      ? ((totalSalesCurrentMonth - totalSalesLastMonth) / totalSalesLastMonth) * 100
      : (totalSalesCurrentMonth > 0 ? 100 : 0);

    return {
      totalSalesCurrentMonth,
      totalSalesLastMonth,
      monthlyGrowth,
      monthlySalesChartData,
      yearlySalesChartData,
      topProductsChartData,
      totalInventoryValue,
      lowStockItems,
    };
  };

  const dashboardData = processData();

  if (authLoading || loadingData) {
    return <div className="text-center mt-8">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  if (!user) {
    return (
      <>
        <AuthGuardWrapper />
        <div className="text-center mt-8 text-gray-600">Please log in to view the dashboard.</div>
      </>
    );
  }

  return (
    <div className="space-y-8">
      <AuthGuardWrapper />
      <h2 className="text-2xl font-semibold tracking-tight text-gray-800">Dashboard Overview</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Current Month Sales"
          value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(dashboardData.totalSalesCurrentMonth)}
          icon={TrendingUp}
          change={dashboardData.monthlyGrowth.toFixed(2)}
          changeType={dashboardData.monthlyGrowth >= 0 ? 'positive' : 'negative'}
        />
        <KPICard
          title="Total Inventory Value"
          value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(dashboardData.totalInventoryValue)}
          icon={Package}
        />
        <KPICard
          title="Low Stock Items"
          value={dashboardData.lowStockItems.toString()}
          icon={AlertTriangle}
          changeType={dashboardData.lowStockItems > 0 ? 'negative' : 'positive'}
        />
        {/* Add more KPI cards as needed */}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-md shadow-gray-100/50 rounded-2xl p-6">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Monthly Sales Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.monthlySalesChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white shadow-md shadow-gray-100/50 rounded-2xl p-6">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Top 5 Products by Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.topProductsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="item" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white shadow-md shadow-gray-100/50 rounded-2xl p-6 lg:col-span-2">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Yearly Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.yearlySalesChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
