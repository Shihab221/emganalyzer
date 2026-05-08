'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Old route — doctors now use `/doctor`. */
export default function HistoryLegacyRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/doctor');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500 text-sm">Redirecting…</p>
    </div>
  );
}
