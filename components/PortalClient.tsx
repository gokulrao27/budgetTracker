'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export type PortalUser = {
  id: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'FRIEND' | string;
  bio?: string | null;
  profile_photo_path?: string | null;
  required_contribution: number | string;
  must_change_password?: boolean;
};

export type PortalPayment = {
  id: string;
  amount: number | string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  method?: string | null;
  reference_id?: string | null;
  rejection_reason?: string | null;
  created_at: string;
};

export type PortalExpense = {
  id: string;
  amount: number | string;
  category: string;
  description: string;
  notes?: string | null;
  created_at: string;
};

export type PortalPhoto = { id: string; path: string; title: string };
export type PortalAlbum = { id: string; name: string; photos?: PortalPhoto[] | null };
export type BudgetData = { totalBudget: number; totalSpent: number; remainingBudget: number; byCategory: Record<string, number> };
export type ContributionData = { required: number; approvedPaid: number; pendingAmount: number; remaining: number };

export type PortalData = {
  me: PortalUser;
  isAdmin: boolean;
  friends: PortalUser[];
  budget: BudgetData;
  mine: ContributionData;
  payments: PortalPayment[];
  albums: PortalAlbum[];
  expenses: PortalExpense[];
  totalApprovedContributions: number;
};

type PaymentDraft = {
  amount: string;
  method: string;
  referenceId: string;
  notes: string;
  screenshot: File | null;
};

const paymentMethods = ['UPI', 'Bank transfer', 'Cash', 'Other'];
const rupee = (value: number | string) => `₹${Number(value ?? 0).toLocaleString('en-IN')}`;
const photoUrl = (bucket: 'profile-photos' | 'memory-photos', path: string) => `/api/public-image/${bucket}/${path}`;
const profileSrc = (friend: PortalUser) => friend.profile_photo_path ? photoUrl('profile-photos', friend.profile_photo_path) : null;

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const className = normalized === 'APPROVED'
    ? 'bg-emerald-400/15 text-emerald-200'
    : normalized === 'PENDING'
      ? 'bg-amber-300/15 text-amber-100'
      : 'bg-rose-400/15 text-rose-100';
  const label = normalized === 'APPROVED'
    ? 'Payment approved'
    : normalized === 'PENDING'
      ? 'Payment under review'
      : 'Payment rejected';

  return <span className={`pill ${className}`}>{label}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[.07] p-3">
      <p className="text-xs text-white/55">{label}</p>
      <b className="text-lg">{value}</b>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/[.04] p-8 text-white/55">
      {text}
    </div>
  );
}

function PortalNav({ me, isAdmin }: { me: PortalUser; isAdmin: boolean }) {
  const avatar = profileSrc(me);

  return (
    <nav className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-white/5 bg-black/35 px-4 py-3 backdrop-blur-xl md:px-8">
      <a href="#top" className="font-black tracking-tight">Wedding<span className="text-rose-300">Flix</span></a>
      <div className="hidden gap-5 text-sm text-white/70 sm:flex">
        <a href="#people">Our people</a>
        <a href="#budget">Budget</a>
        <a href="#memories">Memories</a>
        {isAdmin && <Link href="/admin">Admin</Link>}
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-right text-sm sm:block">
          <b>{me.name}</b><br />
          <span className="text-white/50">{me.role.replace('_', ' ')}</span>
        </span>
        <div className="relative h-11 w-11 overflow-hidden rounded-full bg-rose-900">
          {avatar && <Image src={avatar} alt={`${me.name} profile`} fill sizes="44px" className="object-cover" />}
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="btn2 tap">Logout</button>
        </form>
      </div>
    </nav>
  );
}

function HeroSection({ isAdmin, latestPayment, onPay }: { isAdmin: boolean; latestPayment?: PortalPayment; onPay: () => void }) {
  const cta = latestPayment?.status === 'PENDING'
    ? 'Payment under review'
    : latestPayment?.status === 'APPROVED'
      ? 'Payment approved'
      : 'Make payment';

  return (
    <section id="top" className="relative px-4 pb-10 pt-10 md:px-8 lg:pb-20 lg:pt-20">
      <div className="absolute inset-x-0 top-0 h-96 bg-[linear-gradient(180deg,rgba(244,63,94,.2),transparent)]" />
      <div className="relative max-w-5xl">
        <p className="eyebrow">Private celebration community</p>
        <h1 className="max-w-4xl text-5xl font-black leading-[.9] tracking-tight sm:text-6xl lg:text-8xl">
          A cinematic home for the wedding crew.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-white/70">
          Friends, memories, contributions, expenses, approvals, and photo moments in one secure premium portal.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={onPay} className="btn tap">{cta}</button>
          {isAdmin && <Link className="btn2 tap" href="/admin">Open admin dashboard</Link>}
        </div>
      </div>
    </section>
  );
}

function FriendsCarousel({ friends }: { friends: PortalUser[] }) {
  return (
    <section id="people" className="section">
      <div className="section-head">
        <p className="eyebrow">Friends / Our people</p>
        <h2>Tonight&apos;s cast</h2>
      </div>
      <div className="carousel" aria-label="Friend profile carousel">
        {friends.map((friend) => {
          const src = profileSrc(friend);
          return (
            <article className="profile-card group" key={friend.id}>
              {src ? (
                <Image src={src} alt={friend.name} fill sizes="(max-width: 767px) 74vw, 288px" className="object-cover transition duration-500 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-rose-700 via-fuchsia-950 to-slate-950" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
              <div className="absolute bottom-0 p-4">
                <h3 className="text-2xl font-black">{friend.name}</h3>
                <p className="line-clamp-2 text-sm text-white/70">{friend.bio || friend.role.replace('_', ' ')}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BudgetCard({ budget, totalApprovedContributions }: { budget: BudgetData; totalApprovedContributions: number }) {
  const progress = clampPercent(budget.totalBudget ? (budget.totalSpent / budget.totalBudget) * 100 : 0);

  return (
    <div className="hero-card p-5 sm:p-7">
      <p className="eyebrow">Wedding budget</p>
      <h2 className="text-3xl font-black sm:text-5xl">{rupee(budget.totalBudget)}</h2>
      <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10" aria-label={`Budget progress ${Math.round(progress)} percent`}>
        <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-300" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Approved contributions" value={rupee(totalApprovedContributions)} />
        <Metric label="Total expenses" value={rupee(budget.totalSpent)} />
        <Metric label="Remaining" value={rupee(budget.remainingBudget)} />
        <Metric label="Progress" value={`${Math.round(progress)}%`} />
      </div>
    </div>
  );
}

function ContributionCard({ contribution, latestPayment, onPay }: { contribution: ContributionData; latestPayment?: PortalPayment; onPay: () => void }) {
  const progress = clampPercent(contribution.required ? (contribution.approvedPaid / contribution.required) * 100 : 0);

  return (
    <div className="hero-card p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Your contribution</p>
          <h2 className="text-3xl font-black">{rupee(contribution.approvedPaid)}</h2>
          <p className="text-white/60">approved of {rupee(contribution.required)}</p>
        </div>
        {latestPayment ? <StatusPill status={latestPayment.status} /> : <span className="pill bg-white/10">Make payment</span>}
      </div>
      <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10" aria-label={`Contribution progress ${Math.round(progress)} percent`}>
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-rose-300" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Metric label="Pending" value={rupee(contribution.pendingAmount)} />
        <Metric label="Remaining" value={rupee(contribution.remaining)} />
        <Metric label="Progress" value={`${Math.round(progress)}%`} />
      </div>
      <button onClick={onPay} className="btn mt-5 w-full tap">Make payment</button>
    </div>
  );
}

function ExpenseSection({ budget, expenses }: { budget: BudgetData; expenses: PortalExpense[] }) {
  return (
    <section className="section grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <div className="hero-card p-5">
        <h2 className="text-2xl font-black">Expense distribution</h2>
        <ExpenseBars data={budget.byCategory} />
      </div>
      <div className="hero-card p-5">
        <h2 className="text-2xl font-black">Recent expenses</h2>
        <div className="mt-3 space-y-3">
          {expenses.length ? expenses.slice(0, 6).map((expense) => (
            <div className="list-card" key={expense.id}>
              <div>
                <b>{expense.category}</b>
                <p className="text-sm text-white/55">{expense.description}{expense.notes ? ` · ${expense.notes}` : ''}</p>
                <p className="text-xs text-white/40">{new Date(expense.created_at).toLocaleString()}</p>
              </div>
              <b>{rupee(expense.amount)}</b>
            </div>
          )) : <EmptyState text="No expenses recorded yet." />}
        </div>
      </div>
    </section>
  );
}

function ExpenseBars({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <div className="mt-3 space-y-3">
      {entries.length ? entries.map(([category, value]) => (
        <div key={category}>
          <div className="flex justify-between text-sm">
            <span>{category}</span>
            <b>{rupee(value)}</b>
          </div>
          <div className="mt-1 h-2 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-rose-300" style={{ width: `${Math.max(6, (value / max) * 100)}%` }} />
          </div>
        </div>
      )) : <EmptyState text="No expense categories yet." />}
    </div>
  );
}

function MemoryCarousel({ albums, onOpen }: { albums: PortalAlbum[]; onOpen: (src: string) => void }) {
  return (
    <section id="memories" className="section">
      <div className="section-head">
        <p className="eyebrow">Memories</p>
        <h2>Photo stories</h2>
      </div>
      {albums.length ? albums.map((album) => (
        <div key={album.id} className="mb-8">
          <h3 className="mb-3 text-xl font-bold">{album.name}</h3>
          <div className="carousel" aria-label={`${album.name} memories`}>
            {(album.photos ?? []).length ? (album.photos ?? []).map((photo) => {
              const src = photoUrl('memory-photos', photo.path);
              return (
                <button key={photo.id} onClick={() => onOpen(src)} className="memory-card" aria-label={`Open ${photo.title}`}>
                  <Image src={src} alt={photo.title} fill sizes="(max-width: 767px) 82vw, 384px" className="object-cover" />
                  <span>{photo.title}</span>
                </button>
              );
            }) : <EmptyState text="Photos will appear here soon." />}
          </div>
        </div>
      )) : <EmptyState text="Memory albums will appear here soon." />}
    </section>
  );
}

function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!src) return;
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Photo viewer">
      <button ref={closeButtonRef} className="absolute right-4 top-4 btn2" onClick={onClose}>Close</button>
      <Image src={src} alt="Selected memory" width={1400} height={1000} className="max-h-[86vh] w-auto rounded-3xl object-contain" />
    </div>
  );
}

function PaymentStepIndicator({ step }: { step: number }) {
  return (
    <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Payment steps">
      {['Amount', 'Method', 'Proof'].map((label, index) => {
        const active = index + 1 <= step;
        return (
          <li key={label} className={`rounded-full px-3 py-2 text-center text-xs font-black ${active ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/50'}`}>
            {index + 1}. {label}
          </li>
        );
      })}
    </ol>
  );
}

function PaymentStep({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 min-h-[18rem] space-y-4 sm:min-h-[20rem]">{children}</div>;
}

export function PaymentModal({ open, onClose, remaining }: { open: boolean; onClose: () => void; remaining: number }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<PaymentDraft>({
    amount: Math.max(remaining, 0) ? String(Math.max(remaining, 0)) : '',
    method: 'UPI',
    referenceId: '',
    notes: '',
    screenshot: null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const previewUrlRef = useRef('');

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLInputElement>('input, button, select, textarea')?.focus());
  }, [open]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function updateScreenshot(file: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreview = file ? URL.createObjectURL(file) : '';
    previewUrlRef.current = nextPreview;
    setPreviewUrl(nextPreview);
    setDraft((current) => ({ ...current, screenshot: file }));
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose, open]);

  const validateStep = useCallback(() => {
    setError('');
    if (step === 1 && (!Number.isFinite(Number(draft.amount)) || Number(draft.amount) <= 0)) {
      setError('Enter a payment amount greater than zero.');
      return false;
    }
    if (step === 2 && !draft.method) {
      setError('Choose a payment method.');
      return false;
    }
    if (step === 3 && !draft.screenshot) {
      setError('Add a screenshot before submitting.');
      return false;
    }
    return true;
  }, [draft.amount, draft.method, draft.screenshot, step]);

  async function submitPayment() {
    if (!validateStep()) return;
    setBusy(true);
    setError('');
    setSuccess(false);

    const form = new FormData();
    form.set('amount', draft.amount);
    form.set('method', draft.method);
    form.set('referenceId', draft.referenceId);
    form.set('notes', draft.notes);
    form.set('idempotencyKey', crypto.randomUUID());
    if (draft.screenshot) form.set('screenshot', draft.screenshot);

    const response = await fetch('/api/payments', { method: 'POST', body: form });
    const payload = await response.json().catch(() => ({} as { error?: string }));
    setBusy(false);

    if (!response.ok) {
      setError(payload.error || 'Payment could not be submitted.');
      return;
    }

    setSuccess(true);
    router.refresh();
    window.setTimeout(onClose, 1400);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" role="presentation">
      <form ref={dialogRef} className="w-full rounded-t-[2rem] border border-white/10 bg-[#100911] p-5 shadow-2xl sm:max-w-xl sm:rounded-[2rem] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="payment-title" onSubmit={(event) => event.preventDefault()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Payment review flow</p>
            <h2 id="payment-title" className="text-2xl font-black">Make payment</h2>
            <p className="text-white/60">Gokul approves every contribution before totals update.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="btn2 tap">Close</button>
        </div>

        <PaymentStepIndicator step={step} />

        <PaymentStep>
          {step === 1 && (
            <>
              <div className="rounded-3xl bg-white/[.06] p-4">
                <p className="text-sm text-white/55">Remaining contribution</p>
                <b className="text-3xl">{rupee(Math.max(remaining, 0))}</b>
              </div>
              <label className="field">
                <span>Amount</span>
                <input className="input text-lg" name="amount" type="number" min="1" max="1000000" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} required />
              </label>
            </>
          )}

          {step === 2 && (
            <fieldset className="space-y-3">
              <legend className="sr-only">Payment method</legend>
              {paymentMethods.map((method) => (
                <label key={method} className={`flex min-h-14 cursor-pointer items-center justify-between rounded-3xl border p-4 ${draft.method === method ? 'border-rose-300 bg-rose-500/15' : 'border-white/10 bg-white/[.05]'}`}>
                  <span className="font-bold">{method}</span>
                  <input type="radio" name="method" value={method} checked={draft.method === method} onChange={(event) => setDraft({ ...draft, method: event.target.value })} />
                </label>
              ))}
            </fieldset>
          )}

          {step === 3 && (
            <>
              <label className="field">
                <span>Reference or transaction ID</span>
                <input className="input" name="referenceId" value={draft.referenceId} onChange={(event) => setDraft({ ...draft, referenceId: event.target.value })} placeholder="Optional but helpful" />
              </label>
              <label className="field">
                <span>Notes for Gokul</span>
                <textarea className="input min-h-20" name="notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Optional message" />
              </label>
              <input ref={fileInputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => updateScreenshot(event.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="upload-box">
                {previewUrl ? (
                  <Image src={previewUrl} alt="Payment proof preview" width={640} height={420} className="h-48 w-full rounded-2xl object-cover" unoptimized />
                ) : (
                  <span>Tap to use camera or upload payment proof</span>
                )}
              </button>
              {draft.screenshot && (
                <button type="button" className="btn2 w-full" onClick={() => updateScreenshot(null)}>Remove / replace image</button>
              )}
            </>
          )}
        </PaymentStep>

        {error && <p role="alert" className="rounded-2xl bg-rose-500/15 p-3 text-rose-100">{error}</p>}
        {success && <p role="status" className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-100">Payment submitted. Status is now pending review by Gokul.</p>}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" className="btn2 tap" disabled={busy || step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))}>Back</button>
          {step < 3 ? (
            <button type="button" className="btn tap" onClick={() => validateStep() && setStep((current) => current + 1)}>Continue</button>
          ) : (
            <button type="button" className="btn tap" disabled={busy} onClick={submitPayment}>{busy ? 'Uploading proof...' : 'Submit'}</button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function PortalClient({ data }: { data: PortalData }) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const latestPayment = data.payments[0];
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#7f1d1d_0,#170717_35%,#040205_72%)]">
      <PortalNav me={data.me} isAdmin={data.isAdmin} />
      <HeroSection isAdmin={data.isAdmin} latestPayment={latestPayment} onPay={() => setPaymentOpen(true)} />
      <FriendsCarousel friends={data.friends} />
      <section id="budget" className="section grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <BudgetCard budget={data.budget} totalApprovedContributions={data.totalApprovedContributions} />
        <ContributionCard contribution={data.mine} latestPayment={latestPayment} onPay={() => setPaymentOpen(true)} />
      </section>
      <ExpenseSection budget={data.budget} expenses={data.expenses} />
      <MemoryCarousel albums={data.albums} onOpen={setLightboxSrc} />
      <Lightbox src={lightboxSrc} onClose={closeLightbox} />
      {paymentOpen && <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} remaining={data.mine.remaining} />}
    </main>
  );
}
