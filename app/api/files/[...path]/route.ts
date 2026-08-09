import { NextRequest, NextResponse } from 'next/server';
import { actor, safe, AppError } from '@/lib/api';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const user = await actor();
    if (!user) throw new AppError('Login required.', 401);
    const parts = (await params).path;
    if (parts[0] !== 'payment-proofs') throw new AppError('Unsupported private file.', 404);
    const paymentId = req.nextUrl.searchParams.get('paymentId');
    if (!paymentId) throw new AppError('Payment ID is required.', 400);
    const signedUrl = await getDb().signedPaymentProofUrl(user, paymentId);
    return NextResponse.redirect(signedUrl);
  } catch (error) { return safe(error); }
}
