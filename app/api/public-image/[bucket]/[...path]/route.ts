import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(_: Request, { params }: { params: Promise<{ bucket: string; path: string[] }> }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new NextResponse('Storage is not configured.', { status: 500 });
  const { bucket, path } = await params;
  if (!['profile-photos', 'memory-photos'].includes(bucket)) return new NextResponse('Not found.', { status: 404 });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path.join('/'), 60 * 5);
  if (error || !data) return new NextResponse('Image not found.', { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
