import { NextRequest } from 'next/server';
import { actor, json, safe, AppError } from '@/lib/api';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await actor();
    if (!user) throw new AppError('Login required.', 401);
    const body = await req.json();
    return json(await getDb().createExpense(user, { amount: Number(body.amount), category: body.category, description: body.description, notes: body.notes }));
  } catch (error) { return safe(error); }
}
