"use client";

import { useAuth } from '@/context/AuthContext';
import { LogOut, UserCircle } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const { user, logOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logOut();
    setDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-100 p-4 flex items-center justify-between">
      <div className="flex flex-col">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-800">Inventory Dashboard</h1>
        <p className="text-sm text-gray-500">Track sales, manage stock, and upload data seamlessly.</p>
      </div>

      <div className="relative">
        {user ? (
          <>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 focus:outline-none"
            >
              <UserCircle size={24} />
              <span className="hidden md:inline">{user.email || 'User'}</span>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut size={16} className="mr-2" />
                  Logout
                </button>
              </div>
            )}
          </>
        ) : (
          <a href="/login" className="flex items-center space-x-2 text-gray-600 hover:text-gray-800">
            <UserCircle size={24} />
            <span className="hidden md:inline">Login</span>
          </a>
        )}
      </div>
    </header>
  );
}
