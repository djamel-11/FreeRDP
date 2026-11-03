import { cookies } from 'next/headers';

/** Deletes the one-time secret cookies WITHOUT triggering a page refresh (a server action would re-render and hide the secret). */
export async function POST() {
  const c = await cookies(); c.delete('akked_flash'); c.delete('akked_tmp');
  return new Response(null, { status: 204 });
}
