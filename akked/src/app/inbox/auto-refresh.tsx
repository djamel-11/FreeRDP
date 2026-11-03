'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
/** Poll the server every few seconds so new customer replies appear without reloading. */
export default function AutoRefresh({ seconds = 6 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => { const i = setInterval(() => { if (!document.hidden) router.refresh(); }, seconds * 1000); return () => clearInterval(i); }, [router, seconds]);
  return null;
}
