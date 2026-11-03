'use client';
import { useRouter } from 'next/navigation';
import { markSent } from '../actions';

/** Opens WhatsApp in a new tab and, for new orders, marks the order as "message sent" so the queue moves on. */
export default function WaButton({ id, url, label, markAsSent, secondary }: { id: number; url: string; label: string; markAsSent: boolean; secondary?: boolean }) {
  const router = useRouter();
  return (
    <a className={`btn big ${secondary ? 'sec' : ''}`} href={url} target="_blank" rel="noopener noreferrer"
      onClick={() => { if (markAsSent) markSent(id).then(() => router.refresh()); }}>💬 {label}</a>
  );
}
