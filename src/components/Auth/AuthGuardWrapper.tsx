"use client";

import useAuthGuard from '@/hooks/useAuthGuard';

export default function AuthGuardWrapper() {
  useAuthGuard();
  return null; // This component doesn't render anything, it just enforces auth
}
