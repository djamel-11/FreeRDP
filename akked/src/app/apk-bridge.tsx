'use client';
import { useEffect, useState } from 'react';

/** Visible only inside the Android app (it injects `window.AkkedApp`): lets the user change the server address. */
export default function ApkBridge({ label }: { label: string }) {
  const [inApp, setInApp] = useState(false);
  useEffect(() => { setInApp(!!(window as any).AkkedApp); }, []);
  if (!inApp) return null;
  return <p><button type="button" className="sec" onClick={() => (window as any).AkkedApp.changeServer()}>📱 {label}</button></p>;
}
