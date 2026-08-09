import { NextResponse } from 'next/server';
import { currentSession } from './session';
import { AppError, getDb } from './db';

export async function actor() {
  const session = await currentSession();
  if (!session) return null;
  return getDb().getUser(session.userId);
}

export function json(data: unknown, status = 200) { return NextResponse.json(data, { status }); }
export function safe(error: unknown) {
  const err = error as { message?: string; status?: number };
  console.error(error);
  return json({ error: err.message || 'Something went wrong.' }, err.status || 500);
}
export { AppError };
