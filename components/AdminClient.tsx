'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryPie } from './Charts';
import type { BudgetData, PortalAlbum, PortalExpense, PortalPayment, PortalUser } from './PortalClient';

type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  created_at: string;
};

type AdminPayment = PortalPayment & {
  user_id: string;
  app_users?: { name?: string | null } | null;
};

type AdminProps = {
  me: PortalUser;
  budget: BudgetData;
  friends: PortalUser[];
  payments: AdminPayment[];
  expenses: PortalExpense[];
  audits: AuditLog[];
  albums: PortalAlbum[];
};

type AdminSection = 'approvals' | 'summary' | 'actions' | 'friends' | 'expenses' | 'memories';
type JsonResponse = { error?: string; temporaryPassword?: string };

const rupee = (value: number | string) => `₹${Number(value ?? 0).toLocaleString('en-IN')}`;
const adminSections: { id: AdminSection; label: string }[] = [
  { id: 'approvals', label: 'Approvals' },
  { id: 'summary', label: 'Summary' },
  { id: 'actions', label: 'Actions' },
  { id: 'friends', label: 'Friends' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'memories', label: 'Memories' },
];

function profilePhoto(friend: PortalUser) {
  return friend.profile_photo_path ? `/api/public-image/profile-photos/${friend.profile_photo_path}` : null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hero-card p-4">
      <p className="text-sm text-white/55">{label}</p>
      <b className="text-2xl">{value}</b>
    </div>
  );
}

function Panel({ title, children, eyebrow }: { title: string; children: React.ReactNode; eyebrow?: string }) {
  return (
    <section className="hero-card p-5">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mb-4 text-2xl font-black">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-3xl border border-dashed border-white/15 bg-white/[.04] p-8 text-white/55">{text}</p>;
}

function AdminNav({ activeSection, onSectionChange }: { activeSection: AdminSection; onSectionChange: (section: AdminSection) => void }) {
  return (
    <>
      <nav className="flex min-h-16 flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Admin command center</p>
          <h1 className="text-4xl font-black sm:text-6xl">Wedding operations</h1>
        </div>
        <div className="flex gap-2">
          <Link className="btn2 tap" href="/">Portal</Link>
          <form action="/api/auth/logout" method="post">
            <button className="btn2 tap">Logout</button>
          </form>
        </div>
      </nav>
      <div className="sticky top-0 z-30 -mx-4 mt-4 overflow-x-auto border-y border-white/10 bg-[#090408]/85 px-4 py-3 backdrop-blur-xl md:mx-0 md:rounded-full md:border md:bg-white/[.06]" aria-label="Admin sections">
        <div className="flex min-w-max gap-2">
          {adminSections.map((section) => (
            <button key={section.id} className={`min-h-11 rounded-full px-4 text-sm font-black ${activeSection === section.id ? 'bg-rose-600 text-white' : 'bg-white/10 text-white/65'}`} onClick={() => onSectionChange(section.id)}>
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function AdminStats({ budget, approved, pendingCount, friendCount }: { budget: BudgetData; approved: number; pendingCount: number; friendCount: number }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <Stat label="Total budget" value={rupee(budget.totalBudget)} />
      <Stat label="Contributions" value={rupee(approved)} />
      <Stat label="Expenses" value={rupee(budget.totalSpent)} />
      <Stat label="Remaining" value={rupee(budget.remainingBudget)} />
      <Stat label="Pending payments" value={String(pendingCount)} />
      <Stat label="Friend count" value={String(friendCount)} />
    </section>
  );
}

function PaymentApprovalCard({ payment, canApprove, busy, onApprove, onReject }: {
  payment: AdminPayment;
  canApprove: boolean;
  busy: boolean;
  onApprove: (paymentId: string) => void;
  onReject: (paymentId: string, reason: string) => void;
}) {
  const friendName = payment.app_users?.name ?? 'Friend';

  return (
    <article className="rounded-3xl bg-white/[.06] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-black">{friendName} · {rupee(payment.amount)}</h3>
          <p className="text-sm text-white/55">
            Submitted {new Date(payment.created_at).toLocaleString()} · {payment.method || 'method not set'} {payment.reference_id ? `· ${payment.reference_id}` : ''}
          </p>
        </div>
        <a className="btn2 text-center" href={`/api/files/payment-proofs?paymentId=${payment.id}`} target="_blank" rel="noreferrer">
          Screenshot preview
        </a>
      </div>
      {canApprove ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button disabled={busy} className="btn bg-emerald-500 hover:bg-emerald-400" onClick={() => onApprove(payment.id)}>Approve</button>
          <button
            disabled={busy}
            className="btn bg-rose-600"
            onClick={() => onReject(payment.id, window.prompt('Optional rejection reason') || 'Not approved')}
          >
            Reject
          </button>
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-amber-300/10 p-3 text-amber-100">Only Gokul can approve or reject payments.</p>
      )}
    </article>
  );
}

function PendingPayments({ payments, canApprove, busyAction, onApprove, onReject }: {
  payments: AdminPayment[];
  canApprove: boolean;
  busyAction: string;
  onApprove: (paymentId: string) => void;
  onReject: (paymentId: string, reason: string) => void;
}) {
  return (
    <Panel title="Pending payment approvals" eyebrow="Priority queue">
      <div className="space-y-4">
        {payments.length ? payments.map((payment) => (
          <PaymentApprovalCard
            key={payment.id}
            payment={payment}
            canApprove={canApprove}
            busy={Boolean(busyAction)}
            onApprove={onApprove}
            onReject={onReject}
          />
        )) : <EmptyState text="No payments are waiting for approval." />}
      </div>
    </Panel>
  );
}

function QuickActions({ onCreateFriend, onCreateExpense, busy }: {
  busy: boolean;
  onCreateFriend: (payload: { name: string; requiredContribution: string; bio: string }) => void;
  onCreateExpense: (payload: { amount: string; category: string; description: string; notes: string }) => void;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <Panel title="Create friend" eyebrow="Quick action">
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onCreateFriend({
            name: String(form.get('name') || ''),
            requiredContribution: String(form.get('requiredContribution') || '0'),
            bio: String(form.get('bio') || ''),
          });
        }}>
          <label className="field"><span>Name</span><input className="input" name="name" required /></label>
          <label className="field"><span>Required contribution</span><input className="input" type="number" name="requiredContribution" min="0" required /></label>
          <label className="field"><span>Bio</span><textarea className="input" name="bio" /></label>
          <button disabled={busy} className="btn">Create and generate temporary password</button>
        </form>
      </Panel>
      <Panel title="Add expense" eyebrow="Quick action">
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onCreateExpense({
            amount: String(form.get('amount') || ''),
            category: String(form.get('category') || ''),
            description: String(form.get('description') || ''),
            notes: String(form.get('notes') || ''),
          });
        }}>
          <label className="field"><span>Amount</span><input className="input" name="amount" type="number" min="1" required /></label>
          <label className="field"><span>Category</span><input className="input" name="category" required /></label>
          <label className="field"><span>Description</span><input className="input" name="description" required /></label>
          <label className="field"><span>Notes</span><textarea className="input" name="notes" /></label>
          <button disabled={busy} className="btn">Add expense</button>
        </form>
      </Panel>
    </section>
  );
}

function FriendManagement({ friends, busy, onResetPassword }: { friends: PortalUser[]; busy: boolean; onResetPassword: (userId: string) => void }) {
  return (
    <Panel title="Friend management" eyebrow="People">
      <div className="space-y-3">
        {friends.map((friend) => {
          const src = profilePhoto(friend);
          return (
            <div className="list-card flex-col items-stretch sm:flex-row sm:items-center" key={friend.id}>
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-rose-900">
                  {src && <Image alt={friend.name} src={src} fill sizes="48px" className="object-cover" />}
                </div>
                <div>
                  <b>{friend.name}</b>
                  <p className="text-sm text-white/55">
                    {friend.role.replace('_', ' ')} · contribution {rupee(friend.required_contribution)} {friend.must_change_password ? '· must change password' : ''}
                  </p>
                </div>
              </div>
              <button className="btn2 w-full sm:w-auto" disabled={busy} onClick={() => onResetPassword(friend.id)}>Reset password</button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function ExpenseManagement({ budget, expenses }: { budget: BudgetData; expenses: PortalExpense[] }) {
  return (
    <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <Panel title="Expense distribution" eyebrow="Spending">
        <CategoryPie data={Object.entries(budget.byCategory).map(([name, value]) => ({ name, value: Number(value) }))} />
      </Panel>
      <Panel title="Recent expenses" eyebrow="Ledger">
        <div className="space-y-3">
          {expenses.length ? expenses.map((expense) => (
            <div className="list-card" key={expense.id}>
              <div>
                <b>{expense.category}</b>
                <p className="text-sm text-white/55">{expense.description}</p>
                <p className="text-xs text-white/40">{new Date(expense.created_at).toLocaleString()}</p>
              </div>
              <b>{rupee(expense.amount)}</b>
            </div>
          )) : <EmptyState text="No expenses recorded yet." />}
        </div>
      </Panel>
    </section>
  );
}

function MemoryManagement({ albums }: { albums: PortalAlbum[] }) {
  return (
    <Panel title="Memories" eyebrow="Albums">
      <div className="space-y-3">
        {albums.length ? albums.map((album) => (
          <div className="list-card" key={album.id}>
            <b>{album.name}</b>
            <span>{(album.photos ?? []).length} photos</span>
          </div>
        )) : <EmptyState text="Albums will appear here soon." />}
      </div>
    </Panel>
  );
}

function AuditSection({ audits }: { audits: AuditLog[] }) {
  return (
    <Panel title="Recent audit activity" eyebrow="Security trail">
      <div className="space-y-3">
        {audits.length ? audits.slice(0, 12).map((audit) => (
          <div className="list-card" key={audit.id}>
            <span>{audit.action} · {audit.entity_type}</span>
            <span className="text-xs text-white/45">{new Date(audit.created_at).toLocaleString()}</span>
          </div>
        )) : <EmptyState text="No audit entries yet." />}
      </div>
    </Panel>
  );
}

export default function AdminClient({ me, budget, friends, payments, expenses, audits, albums }: AdminProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSection>('approvals');
  const [busyAction, setBusyAction] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [error, setError] = useState('');

  const approvedContributions = useMemo(
    () => payments.filter((payment) => payment.status === 'APPROVED').reduce((sum, payment) => sum + Number(payment.amount), 0),
    [payments],
  );
  const pendingPayments = useMemo(() => payments.filter((payment) => payment.status === 'PENDING'), [payments]);
  const canApprove = me.role === 'SUPER_ADMIN';

  async function postJson(url: string, body: Record<string, unknown> = {}) {
    setBusyAction(url);
    setError('');
    const response = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({} as JsonResponse));
    setBusyAction('');

    if (!response.ok) {
      setError(payload.error || 'Action failed.');
      return null;
    }

    router.refresh();
    return payload;
  }

  async function handleCreateFriend(payload: { name: string; requiredContribution: string; bio: string }) {
    const result = await postJson('/api/admin/friends', payload);
    if (result?.temporaryPassword) setTemporaryPassword(result.temporaryPassword);
  }

  async function handleResetPassword(userId: string) {
    const result = await postJson('/api/admin/password', { userId });
    if (result?.temporaryPassword) setTemporaryPassword(result.temporaryPassword);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,#3b0717,#050205_65%)] px-4 py-5 md:px-8">
      <AdminNav activeSection={activeSection} onSectionChange={setActiveSection} />

      {error && <p role="alert" className="my-4 rounded-2xl bg-rose-500/15 p-3 text-rose-100">{error}</p>}
      {temporaryPassword && (
        <div role="status" className="my-4 rounded-3xl bg-emerald-400/15 p-4">
          <p className="font-bold">Temporary password — copy now, it is shown once.</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <code className="flex-1 rounded-xl bg-black/35 p-3 text-lg">{temporaryPassword}</code>
            <button className="btn2" onClick={() => navigator.clipboard?.writeText(temporaryPassword)}>Copy</button>
          </div>
        </div>
      )}

      <div className="my-6 space-y-5">
        {activeSection === 'approvals' && (
          <PendingPayments
            payments={pendingPayments}
            canApprove={canApprove}
            busyAction={busyAction}
            onApprove={(paymentId) => postJson(`/api/admin/payments/${paymentId}/approve`)}
            onReject={(paymentId, reason) => postJson(`/api/admin/payments/${paymentId}/reject`, { reason })}
          />
        )}
        {activeSection === 'summary' && <AdminStats budget={budget} approved={approvedContributions} pendingCount={pendingPayments.length} friendCount={friends.length} />}
        {activeSection === 'actions' && <QuickActions busy={Boolean(busyAction)} onCreateFriend={handleCreateFriend} onCreateExpense={(payload) => postJson('/api/admin/expenses', payload)} />}
        {activeSection === 'friends' && <FriendManagement friends={friends} busy={Boolean(busyAction)} onResetPassword={handleResetPassword} />}
        {activeSection === 'expenses' && <ExpenseManagement budget={budget} expenses={expenses} />}
        {activeSection === 'memories' && (
          <section className="grid gap-5 lg:grid-cols-2">
            <MemoryManagement albums={albums} />
            <AuditSection audits={audits} />
          </section>
        )}
      </div>
    </main>
  );
}
