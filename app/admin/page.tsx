import { redirect } from 'next/navigation';
import { currentSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import AdminClient from '@/components/AdminClient';

export default async function Admin() {
  const session = await currentSession();
  if (!session) redirect('/login');
  const db = getDb();
  const me = await db.requireUser(session.userId);
  if (!['ADMIN', 'SUPER_ADMIN'].includes(me.role)) redirect('/');
  const [budget, friends, payments, expenses, audits, albums] = await Promise.all([
    db.budgetSummary(), db.listUsers(100), db.listPayments(me), db.listExpenses(100), db.audits(100), db.listAlbumsWithPhotos(),
  ]);
  return <AdminClient me={me} budget={budget} friends={friends} payments={payments} expenses={expenses} audits={audits} albums={albums} />;
}
