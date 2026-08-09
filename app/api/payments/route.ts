import { NextRequest } from 'next/server';
import { actor, json, safe, AppError } from '@/lib/api';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await actor();
    if (!user) throw new AppError('Login required.', 401);
    const form = await req.formData();
    const payment = await getDb().submitPayment(user, {
      amount: Number(form.get('amount')),
      screenshot: form.get('screenshot') as File,
      idempotencyKey: String(form.get('idempotencyKey') || ''),
      notes: String(form.get('notes') || ''),
      method: String(form.get('method') || ''),
      referenceId: String(form.get('referenceId') || ''),
    });
    return json(payment);
  } catch (error) { return safe(error); }
}
