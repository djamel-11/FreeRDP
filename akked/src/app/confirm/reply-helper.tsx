'use client';
import { useEffect, useState } from 'react';
import { classifyReply } from '@/lib/reply';

type Act = (fd: FormData) => void | Promise<void>;
/** Paste the customer's reply → we suggest confirm/cancel in one tap. Also keyboard shortcuts: C confirm · X cancel · N no answer. */
export default function ReplyHelper({ confirmAction, cancelAction, labels }: { confirmAction: Act; cancelAction: Act; labels: Record<string, string> }) {
  const [text, setText] = useState('');
  const guess = classifyReply(text);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      const map: Record<string, string> = { c: 'confirmed', x: 'cancelled', n: 'no_answer' };
      const act = map[e.key.toLowerCase()];
      if (act) (document.querySelector(`[data-act="${act}"]`) as HTMLButtonElement | null)?.click();
    };
    document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h);
  }, []);
  return (
    <div className="card">
      <label>{labels.pasteReply}</label>
      <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="نعم / oui / ok / لا / annuler…" />
      {guess && (
        <form action={guess === 'confirm' ? confirmAction : cancelAction} style={{ marginTop: 8 }}>
          <button className={`big ${guess === 'confirm' ? 'ok' : 'danger'}`}>{guess === 'confirm' ? labels.suggestConfirm : labels.suggestCancel}</button>
        </form>)}
      <p className="muted" style={{ marginBottom: 0 }}>{labels.shortcuts}</p>
    </div>
  );
}
