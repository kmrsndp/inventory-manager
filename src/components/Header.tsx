"use client";

import ProfileAvatar from './ProfileAvatar';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, BarChart, PlusCircle } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();

  const getTitle = () => {
    switch (pathname) {
      case '/dashboard':
        return { title: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5 text-muted-foreground mr-2" /> };
      case '/inventory':
        return { title: 'Inventory', icon: <Package className="w-5 h-5 text-muted-foreground mr-2" /> };
      case '/sales':
        return { title: 'Sales', icon: <BarChart className="w-5 h-5 text-muted-foreground mr-2" /> };
      case '/add-sale':
        return { title: 'Add New Sale', icon: <PlusCircle className="w-5 h-5 text-muted-foreground mr-2" /> };
      default:
        return { title: 'Inventory Dashboard', icon: null };
    }
  };

  const { title, icon } = getTitle();

  return (
    <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md shadow-md border-b border-gray-100 p-4 flex items-center justify-between">
      <div className="flex items-center">
        {icon}
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-800 dark:text-white">{title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track sales, manage stock, and upload data seamlessly.</p>
        </div>
      </div>

      <ProfileAvatar />
    </header>
  );
}
