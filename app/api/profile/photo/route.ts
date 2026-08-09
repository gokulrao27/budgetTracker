import { NextRequest } from 'next/server';
import { actor, json, safe, AppError } from '@/lib/api';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await actor();
    if (!user) throw new AppError('Login required.', 401);
    const form = await req.formData();
    const path = await getDb().updateProfilePhoto(user, user.id, form.get('photo') as File);
    return json({ path });
  } catch (error) { return safe(error); }
}
