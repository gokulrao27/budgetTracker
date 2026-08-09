import { NextRequest } from 'next/server';
import { safe, json } from '@/lib/api';
import { setSession } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { name, password } = await req.json();
    const user = await getDb().login(name, password, req.headers.get('x-forwarded-for') || 'local');
    await setSession({ userId: user.id, role: user.role, mustChangePassword: user.must_change_password });
    return json({ mustChangePassword: user.must_change_password });
  } catch (error) { return safe(error); }
}
