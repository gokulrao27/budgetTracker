import { NextRequest } from 'next/server';
import { actor, json, safe, AppError } from '@/lib/api';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await actor();
    if (!user) throw new AppError('Login required.', 401);
    const { reason } = await req.json();
    return json(await getDb().rejectPayment(user, (await params).id, reason));
  } catch (error) { return safe(error); }
}
