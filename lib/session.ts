import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { Role } from './domain';

const cookieName = 'wfp_session';
function secret() {
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is required in production.');
  return new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-secret-change-me-please-32chars');
}

export type Session = { userId: string; role: Role; mustChangePassword: boolean };
export async function createSession(s: Session) { return new SignJWT(s as unknown as Record<string, unknown>).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(secret()); }
export async function readSessionToken(token?: string): Promise<Session | null> { try { if (!token) return null; const { payload } = await jwtVerify(token, secret()); return { userId: String(payload.userId), role: payload.role as Role, mustChangePassword: Boolean(payload.mustChangePassword) }; } catch { return null; } }
export async function currentSession() { const jar = await cookies(); return readSessionToken(jar.get(cookieName)?.value); }
export async function setSession(s: Session) { const jar = await cookies(); jar.set(cookieName, await createSession(s), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 }); }
export async function clearSession() { const jar = await cookies(); jar.delete(cookieName); }
