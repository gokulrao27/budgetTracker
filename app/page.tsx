import { redirect } from 'next/navigation';
import { currentSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import PortalClient from '@/components/PortalClient';

export default async function Home() {
  const session = await currentSession();
  if (!session) redirect('/login');
  const db = getDb();
  const me = await db.requireUser(session.userId);
  if (me.must_change_password) redirect('/change-password');
  const [friends, budget, mine, payments, albums, expenses, allPayments] = await Promise.all([
    db.listUsers(120),
    db.budgetSummary(),
    db.contributionFor(me.id),
    db.listPayments(me),
    db.listAlbumsWithPhotos(),
    db.listExpenses(30),
    ['ADMIN', 'SUPER_ADMIN'].includes(me.role) ? db.listPayments(me) : Promise.resolve([]),
  ]);
  const visiblePayments = ['ADMIN', 'SUPER_ADMIN'].includes(me.role) ? allPayments : payments;
  const totalApprovedContributions = visiblePayments.filter((payment) => payment.status === 'APPROVED').reduce((sum, payment) => sum + Number(payment.amount), 0);
  return <PortalClient data={{ me, isAdmin: ['ADMIN', 'SUPER_ADMIN'].includes(me.role), friends, budget, mine, payments, albums, expenses, totalApprovedContributions }} />;
}
