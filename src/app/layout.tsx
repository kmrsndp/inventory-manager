"use client";

import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import { AuthContextProvider } from "@/context/AuthContext";
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <AuthContextProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthContextProvider>
      </body>
    </html>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noNav = pathname === '/login' || pathname === '/signup';

  return (
    <div className="flex min-h-screen">
      {!noNav && <Sidebar />}
      <div className="flex flex-col flex-grow">
        {!noNav && <Header />}
        <main className="flex-grow p-6">
          {children}
        </main>
        {!noNav && <Footer />}
      </div>
    </div>
  );
}
