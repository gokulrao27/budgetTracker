'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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

type AdminSection = 'overview' | 'payments' | 'friends' | 'expenses' | 'memories' | 'audit';
type JsonResponse = { error?: string; temporaryPassword?: string };

const rupee = (value: number | string) => `₹${Number(value ?? 0).toLocaleString('en-IN')}`;
const adminSections: { id: AdminSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'payments', label: 'Payments' },
  { id: 'friends', label: 'Friends' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'memories', label: 'Memories' },
  { id: 'audit', label: 'Audit' },
];

function profilePhoto(friend: PortalUser) {
  return friend.profile_photo_path ? `/api/public-image/profile-photos/${friend.profile_photo_path}` : null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface rounded-[1.5rem] p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <b className="text-2xl">{value}</b>
    </div>
  );
}

function Panel({ title, children, eyebrow }: { title: string; children: React.ReactNode; eyebrow?: string }) {
  return (
    <section className="surface rounded-[1.75rem] p-5">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mb-4 text-2xl font-black">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="soft rounded-[1.5rem] border border-dashed border-[var(--line)] p-8 text-[var(--muted)]">{text}</p>;
}

function AdminNav({ activeSection, onSectionChange }: { activeSection: AdminSection; onSectionChange: (section: AdminSection) => void }) {
  return (
    <>
      <nav className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <p className="eyebrow">Wedding Admin</p>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Event management</h1>
        </div>
        <div className="flex gap-2">
          <Link className="btn2 tap" href="/">Portal</Link>
          <form action="/api/auth/logout" method="post">
            <button className="btn2 tap">Logout</button>
          </form>
        </div>
      </nav>
      <div className="sticky top-0 z-30 mt-2 overflow-x-auto border-y border-[var(--line)] bg-[rgba(251,246,238,.92)] px-4 py-3 backdrop-blur-xl md:container md:rounded-full md:border" aria-label="Admin sections">
        <div className="flex min-w-max gap-2">
          {adminSections.map((section) => (
            <button key={section.id} className={`min-h-11 rounded-full px-4 text-sm font-black ${activeSection === section.id ? 'bg-[var(--wine)] text-white' : 'bg-[#fffaf3] text-[var(--muted)]'}`} onClick={() => onSectionChange(section.id)}>
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
    <article className="soft rounded-[1.5rem] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-black">{friendName} · {rupee(payment.amount)}</h3>
          <p className="text-sm text-[var(--muted)]">
            Submitted {new Date(payment.created_at).toLocaleString()} · {payment.method || 'method not set'} {payment.reference_id ? `· ${payment.reference_id}` : ''}
          </p>
        </div>
        <a className="btn2 text-center" href={`/api/files/payment-proofs?paymentId=${payment.id}`} target="_blank" rel="noreferrer">
          Screenshot preview
        </a>
      </div>
      {canApprove ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button disabled={busy} className="btn !bg-[#315d36] hover:!bg-[#427848]" onClick={() => onApprove(payment.id)}>Approve</button>
          <button
            disabled={busy}
            className="btn"
            onClick={() => onReject(payment.id, window.prompt('Optional rejection reason') || 'Not approved')}
          >
            Reject
          </button>
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-[#fff2d8] p-3 text-[#805600]">Only Gokul can approve or reject payments.</p>
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
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-[#ead8c7]">
                  {src && <Image alt={friend.name} src={src} fill sizes="48px" className="object-cover" />}
                </div>
                <div>
                  <b>{friend.name}</b>
                  <p className="text-sm text-[var(--muted)]">
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
  const entries = Object.entries(budget.byCategory);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  return (
    <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <Panel title="Expense distribution" eyebrow="Spending">
        <div className="space-y-3">
          {entries.length ? entries.map(([category, value]) => (
            <div key={category}>
              <div className="flex justify-between text-sm"><span>{category}</span><b>{rupee(value)}</b></div>
              <div className="mt-1 h-2 rounded-full bg-[#eadfd2]"><span className="block h-full rounded-full bg-[var(--gold)]" style={{ width: `${Math.max(7, (value / max) * 100)}%` }} /></div>
            </div>
          )) : <EmptyState text="No expense categories yet." />}
        </div>
      </Panel>
      <Panel title="Recent expenses" eyebrow="Ledger">
        <div className="space-y-3">
          {expenses.length ? expenses.map((expense) => (
            <div className="list-card" key={expense.id}>
              <div>
                <b>{expense.category}</b>
                <p className="text-sm text-[var(--muted)]">{expense.description}</p>
                <p className="text-xs text-[var(--muted)]">{new Date(expense.created_at).toLocaleString()}</p>
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
            <span className="text-xs text-[var(--muted)]">{new Date(audit.created_at).toLocaleString()}</span>
          </div>
        )) : <EmptyState text="No audit entries yet." />}
      </div>
    </Panel>
  );
}

export default function AdminClient({ me, budget, friends, payments, expenses, audits, albums }: AdminProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
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
    <main className="page-shell min-h-screen overflow-x-hidden">
      <AdminNav activeSection={activeSection} onSectionChange={setActiveSection} />

      {error && <p role="alert" className="container my-4 rounded-2xl bg-[#fde8e8] p-3 text-[#9b1c1c]">{error}</p>}
      {temporaryPassword && (
        <div role="status" className="container my-4 rounded-[1.5rem] bg-[#e8f2e7] p-4">
          <p className="font-bold">Temporary password — copy now, it is shown once.</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <code className="flex-1 rounded-xl bg-white p-3 text-lg">{temporaryPassword}</code>
            <button className="btn2" onClick={() => navigator.clipboard?.writeText(temporaryPassword)}>Copy</button>
          </div>
        </div>
      )}

      <div className="container my-6 space-y-5 pb-10">
        {activeSection === 'payments' && (
          <PendingPayments
            payments={pendingPayments}
            canApprove={canApprove}
            busyAction={busyAction}
            onApprove={(paymentId) => postJson(`/api/admin/payments/${paymentId}/approve`)}
            onReject={(paymentId, reason) => postJson(`/api/admin/payments/${paymentId}/reject`, { reason })}
          />
        )}
        {activeSection === 'overview' && <> <AdminStats budget={budget} approved={approvedContributions} pendingCount={pendingPayments.length} friendCount={friends.length} /> <div className="mt-5"><PendingPayments payments={pendingPayments} canApprove={canApprove} busyAction={busyAction} onApprove={(paymentId) => postJson(`/api/admin/payments/${paymentId}/approve`)} onReject={(paymentId, reason) => postJson(`/api/admin/payments/${paymentId}/reject`, { reason })} /></div></>}

        {activeSection === 'friends' && <section className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><QuickActions busy={Boolean(busyAction)} onCreateFriend={handleCreateFriend} onCreateExpense={(payload) => postJson('/api/admin/expenses', payload)} /><FriendManagement friends={friends} busy={Boolean(busyAction)} onResetPassword={handleResetPassword} /></section>}
        {activeSection === 'expenses' && <ExpenseManagement budget={budget} expenses={expenses} />}
        {activeSection === 'memories' && <MemoryManagement albums={albums} />}
        {activeSection === 'audit' && <AuditSection audits={audits} />}
      </div>
    </main>
  );
}
