'use client';
import { useRouter } from 'next/navigation';
import { markSent } from '../actions';

/**
 * Opens WhatsApp with the message ready. On desktop it reuses ONE WhatsApp Web tab/window (so it can sit next to Akked),
 * on phones it uses the normal wa.me link. For new orders it also marks them "message sent" so the queue moves on.
 */
export default function WaButton({ id, url, label, markAsSent, secondary }: { id: number; url: string; label: string; markAsSent: boolean; secondary?: boolean }) {
  const router = useRouter();
  const onClick = (e: React.MouseEvent) => {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!mobile) {
      const u = new URL(url);
      const web = `https://web.whatsapp.com/send?phone=${u.pathname.replace('/', '')}&text=${encodeURIComponent(u.searchParams.get('text') ?? '')}`;
      e.preventDefault();
      window.open(web, 'akked_whatsapp');
    }
    if (markAsSent) markSent(id).then(() => router.refresh());
  };
  return <a className={`btn big ${secondary ? 'sec' : ''}`} href={url} target="_blank" rel="noopener noreferrer" onClick={onClick}>💬 {label}</a>;
}
