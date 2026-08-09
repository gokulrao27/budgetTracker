import { NextRequest } from 'next/server';
import { actor, json, safe, AppError } from '@/lib/api';
import { setSession } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await actor();
    if (!user) throw new AppError('Login required.', 401);
    const { password } = await req.json();
    await getDb().changePassword(user, password);
    await setSession({ userId: user.id, role: user.role, mustChangePassword: false });
    return json({ ok: true });
  } catch (error) { return safe(error); }
}
