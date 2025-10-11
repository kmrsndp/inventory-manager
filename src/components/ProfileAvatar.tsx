"use client";

import { useAuth } from '@/context/AuthContext';
import { LogOut, User, Settings, Upload, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function ProfileAvatar() {
  const { user, logOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logOut();
    setDropdownOpen(false);
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    const parts = email.split('@')[0];
    return parts[0].toUpperCase();
  };

  return (
    <div className="relative">
      {user ? (
        <>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 focus:outline-none"
          >
            <div className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full" />
              ) : (
                <span className="text-lg font-semibold">{getInitials(user.email)}</span>
              )}
            </div>
            <ChevronDown size={16} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className={`absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-20 ring-1 ring-black ring-opacity-5 transition-all duration-200 ease-in-out transform ${dropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                 style={{ transformOrigin: 'top right' }}
            >
              <div className="px-4 py-3">
                <p className="text-sm text-gray-900">Signed in as</p>
                <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
              </div>
              <div className="border-t border-gray-100"></div>
              <a href="#" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <User size={16} className="mr-2" />
                My Profile
              </a>
              <a href="#" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <Settings size={16} className="mr-2" />
                Settings
              </a>
              <a href="#" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <Upload size={16} className="mr-2" />
                Upload Data
              </a>
              <div className="border-t border-gray-100"></div>
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
          <User size={24} />
          <span className="hidden md:inline">Login</span>
        </a>
      )}
    </div>
  );
}
