import { NextRequest } from 'next/server';
import { actor, json, safe, AppError } from '@/lib/api';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await actor();
    if (!user) throw new AppError('Login required.', 401);
    const body = await req.json();
    const result = await getDb().createFriend(user, { name: body.name, requiredContribution: Number(body.requiredContribution || 0), bio: body.bio });
    return json({ user: { id: result.user.id, name: result.user.name }, temporaryPassword: result.temporaryPassword });
  } catch (error) { return safe(error); }
}
