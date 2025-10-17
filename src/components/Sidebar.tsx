"use client";

import Link from 'next/link';
import { Package, LineChart, LayoutDashboard, PlusSquare, Zap } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Sales', href: '/sales', icon: LineChart },
    { name: 'Add Sale', href: '/add-sale', icon: PlusSquare },
    { name: 'Burn & Blast', href: '/burn-blast', icon: Zap },
  ];

  return (
    <aside className="w-20 md:w-64 bg-gray-800 text-white p-4 flex flex-col items-center md:items-start min-h-screen">
      <nav className="w-full">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center justify-center md:justify-start space-x-2 py-2 px-2 md:px-4 rounded-lg transition-colors duration-200
                  ${pathname === item.href ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-gray-700 text-gray-300 hover:text-white'}`}
              >
                <item.icon size={20} />
                <span className="hidden md:inline">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
