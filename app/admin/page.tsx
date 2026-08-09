import { redirect } from 'next/navigation';
import { currentSession } from '@/lib/session';
import { getDb } from '@/lib/db';

const rupee = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default async function Admin() {
  const session = await currentSession();
  if (!session) redirect('/login');
  const db = getDb();
  const me = await db.requireUser(session.userId);
  if (!['ADMIN', 'SUPER_ADMIN'].includes(me.role)) redirect('/');
  const [budget, friends, payments, expenses, audits, albums] = await Promise.all([db.budgetSummary(), db.listUsers(100), db.listPayments(me), db.listExpenses(100), db.audits(100), db.listAlbumsWithPhotos()]);
  const approved = payments.filter((p) => p.status === 'APPROVED').reduce((sum, p) => sum + Number(p.amount), 0);
  const pending = payments.filter((p) => p.status === 'PENDING').length;
  return <main className="min-h-screen bg-midnight p-4 md:p-8"><h1 className="text-4xl font-black">Admin Dashboard</h1><p className="text-white/60">Budget, expenses, friend contributions, payments, photos, albums, and audit records are persisted in Supabase PostgreSQL/Storage.</p><div className="my-6 grid gap-4 md:grid-cols-4"><div className="card p-4">Wedding budget <b className="block text-2xl">{rupee(budget.totalBudget)}</b></div><div className="card p-4">Wedding spent <b className="block text-2xl">{rupee(budget.totalSpent)}</b></div><div className="card p-4">Pending payments <b className="block text-2xl">{pending}</b></div><div className="card p-4">Friend contributions received <b className="block text-2xl">{rupee(approved)}</b></div></div><section className="grid gap-6 lg:grid-cols-2"><div className="card p-5"><h2 className="text-2xl font-bold">Friends</h2>{friends.map((u) => <p key={u.id} className="border-b border-white/10 py-2">{u.name} · {u.role} · contribution {rupee(Number(u.required_contribution))}</p>)}</div><div className="card p-5"><h2 className="text-2xl font-bold">Payments</h2>{payments.map((p) => <p key={p.id} className="border-b border-white/10 py-2">{p.app_users?.name ?? p.user_id}: {rupee(Number(p.amount))} · {p.status} · {me.role === 'SUPER_ADMIN' ? 'approval enabled' : 'approval disabled'}</p>)}</div><div className="card p-5"><h2 className="text-2xl font-bold">Expenses</h2>{expenses.map((e) => <p key={e.id} className="border-b border-white/10 py-2">{e.category}: {rupee(Number(e.amount))} · {e.description}</p>)}</div><div className="card p-5"><h2 className="text-2xl font-bold">Albums & Photos</h2>{albums.map((a) => <p key={a.id} className="border-b border-white/10 py-2">{a.name} · {(a.photos ?? []).length} photos</p>)}</div><div className="card p-5 lg:col-span-2"><h2 className="text-2xl font-bold">Audit</h2>{audits.map((a) => <p key={a.id} className="border-b border-white/10 py-2">{a.action} · {a.entity_type} · {new Date(a.created_at).toLocaleString()}</p>)}</div></section></main>;
}
