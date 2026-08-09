import Image from 'next/image';
import { redirect } from 'next/navigation';
import { currentSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { CategoryPie, ContributionBar } from '@/components/Charts';

const rupee = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default async function Home() {
  const session = await currentSession();
  if (!session) redirect('/login');
  const db = getDb();
  const me = await db.requireUser(session.userId);
  if (me.must_change_password) redirect('/change-password');
  const [friends, budget, mine, payments, albums] = await Promise.all([
    db.listUsers(120),
    db.budgetSummary(),
    db.contributionFor(me.id),
    db.listPayments(me),
    db.listAlbumsWithPhotos(),
  ]);
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,#881337,#05030a_55%)] p-4 md:p-8">
    <nav className="flex justify-between"><b>Wedding Friends Portal</b><form action="/api/auth/logout" method="post"><button className="btn2">Logout</button></form></nav>
    <section className="py-16"><p className="text-rose-300">Private celebration community</p><h1 className="text-5xl md:text-7xl font-black">A cinematic home for the wedding crew.</h1><p className="mt-4 max-w-2xl text-white/70">Friends, memories, contributions, expenses, approvals, and photo moments in one secure portal.</p></section>
    <section><h2 className="mb-4 text-2xl font-bold">Friends</h2><div className="flex gap-4 overflow-x-auto pb-4">{friends.map((friend) => <div className="card min-w-64 p-4" key={friend.id}>{friend.profile_photo_path ? <Image alt={friend.name} src={`/api/public-image/profile-photos/${friend.profile_photo_path}`} width={320} height={220} className="h-44 w-full rounded-2xl object-cover" loading="lazy" /> : <div className="h-44 rounded-2xl bg-gradient-to-br from-rose-700 to-slate-900" />}<h3 className="mt-3 text-xl font-bold">{friend.name}</h3><p className="text-white/60">{friend.bio || friend.role}</p></div>)}</div></section>
    <section className="my-8 grid gap-4 md:grid-cols-3"><div className="card p-5"><p>Total wedding budget</p><b className="text-3xl">{rupee(budget.totalBudget)}</b></div><div className="card p-5"><p>Total spent</p><b className="text-3xl">{rupee(budget.totalSpent)}</b></div><div className="card p-5"><p>Remaining budget</p><b className="text-3xl">{rupee(budget.remainingBudget)}</b></div></section>
    <section className="grid gap-6 md:grid-cols-2"><div className="card p-5"><h2 className="text-xl font-bold">Expense chart</h2><CategoryPie data={Object.entries(budget.byCategory).map(([name, value]) => ({ name, value }))} /></div><div className="card p-5"><h2 className="text-xl font-bold">My contribution</h2><p>Required {rupee(mine.required)} · Approved {rupee(mine.approvedPaid)} · Pending {rupee(mine.pendingAmount)} · Remaining {rupee(mine.remaining)}</p><ContributionBar paid={mine.approvedPaid} remaining={mine.remaining} /><h3 className="mt-4 font-bold">My payment status</h3>{payments.map((p) => <p key={p.id} className="border-b border-white/10 py-2">{rupee(Number(p.amount))} · {p.status}</p>)}</div></section>
    <section className="mt-8"><h2 className="mb-4 text-2xl font-bold">Memories</h2>{albums.map((album) => <div key={album.id} className="mb-4"><h3 className="font-bold">{album.name}</h3><div className="flex gap-3 overflow-x-auto">{(album.photos ?? []).map((photo: { id: string; path: string; title: string }) => <div key={photo.id} className="card min-w-52 p-3"><div className="h-32 rounded-xl bg-white/10" /><p>{photo.title}</p></div>)}</div></div>)}</section>
    {['ADMIN', 'SUPER_ADMIN'].includes(me.role) && <a className="btn mt-8 inline-block" href="/admin">Open admin dashboard</a>}
  </main>;
}
