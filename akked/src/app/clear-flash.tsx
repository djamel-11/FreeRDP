'use client';
import { useEffect } from 'react';
/** Removes the one-time secret cookie after the page that displays it has loaded (no re-render, so the secret stays visible). */
export default function ClearFlash() { useEffect(() => { fetch('/api/clear-flash', { method: 'POST' }); }, []); return null; }
