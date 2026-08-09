import { actor, json, safe, AppError } from '@/lib/api';
import { getDb } from '@/lib/db';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await actor();
    if (!user) throw new AppError('Login required.', 401);
    return json(await getDb().approvePayment(user, (await params).id));
  } catch (error) { return safe(error); }
}
