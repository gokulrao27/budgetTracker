import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { assertImage, hashPassword, normalizeName, paymentStatuses, Role, roles, temporaryPassword, User, verifyPassword } from './domain';

export class AppError extends Error { constructor(message: string, public status = 400) { super(message); } }

type PaymentInput = { amount: number; screenshot: File; idempotencyKey: string; notes?: string; method?: string; referenceId?: string };
type ExpenseInput = { amount: number; category: string; description: string; notes?: string };
type PhotoInput = { albumId?: string | null; file: File; title: string };

type SummaryRow = { user_id: string; approved_paid: number | string | null; pending_amount: number | string | null };
type CategoryRow = { category: string; total: number | string | null };

function serverSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AppError('Supabase server environment variables are missing.', 500);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function toNumber(value: number | string | null | undefined) { return Number(value ?? 0); }
function cleanText(value: unknown, max = 500) { return String(value ?? '').trim().slice(0, max); }
function requireRole(role: string): asserts role is Role { if (!roles.includes(role as Role)) throw new AppError('Invalid role.', 400); }
function requirePaymentStatus(status: string) { if (!paymentStatuses.includes(status as never)) throw new AppError('Invalid payment status.', 400); }
function sanitizeName(name: string) { return name.trim().replace(/\s+/g, ' '); }
function storageName(name: string) { return name.replace(/[^a-z0-9._-]/gi, '').slice(0, 80) || 'upload'; }
async function fileBuffer(file: File) { return Buffer.from(await file.arrayBuffer()); }

export class WeddingDb {
  private supabase: SupabaseClient;
  constructor(client = serverSupabase()) { this.supabase = client; }

  requireAdmin(actor: User) { if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) throw new AppError('Admin access required.', 403); }
  requireSuper(actor: User) { if (actor.role !== 'SUPER_ADMIN') throw new AppError('Only Gokul can approve or reject payments.', 403); }

  async getUser(id: string) {
    const { data, error } = await this.supabase.from('app_users').select('*').eq('id', id).maybeSingle();
    if (error) throw new AppError('Unable to load user.', 500);
    return data as User | null;
  }

  async requireUser(id: string) { const user = await this.getUser(id); if (!user) throw new AppError('User not found.', 404); return user; }

  async listUsers(limit = 100) {
    const { data, error } = await this.supabase.from('app_users').select('id,name,name_normalized,role,must_change_password,required_contribution,bio,profile_photo_path,created_at,updated_at').order('name').limit(limit);
    if (error) throw new AppError('Unable to load friends.', 500);
    return data ?? [];
  }

  async login(name: string, password: string, ip: string) {
    const normalized = normalizeName(name);
    if (!normalized) throw new AppError('Invalid name or password.', 401);
    const attemptKey = `${normalized}:${ip}`;
    const { data: blocked } = await this.supabase.from('login_attempts').select('*').eq('attempt_key', attemptKey).gt('reset_at', new Date().toISOString()).gte('attempt_count', 8).maybeSingle();
    if (blocked) throw new AppError('Too many login attempts. Try again later.', 429);
    const { data: user, error } = await this.supabase.from('app_users').select('*').eq('name_normalized', normalized).maybeSingle();
    if (error) throw new AppError('Unable to authenticate.', 500);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      await this.supabase.rpc('record_login_failure', { p_attempt_key: attemptKey });
      throw new AppError('Invalid name or password.', 401);
    }
    await this.supabase.from('login_attempts').delete().eq('attempt_key', attemptKey);
    return user as User;
  }

  async createFriend(actor: User, data: { name: string; requiredContribution: number; bio?: string }) {
    this.requireAdmin(actor);
    const normalized = normalizeName(data.name);
    const required = Number(data.requiredContribution);
    if (!normalized || normalized.length > 80) throw new AppError('Enter a valid name.', 400);
    if (!Number.isFinite(required) || required < 0) throw new AppError('Contribution cannot be negative.', 400);
    const temp = temporaryPassword();
    const { data: inserted, error } = await this.supabase.rpc('create_friend_with_audit', {
      p_actor_id: actor.id,
      p_name: sanitizeName(data.name),
      p_name_normalized: normalized,
      p_password_hash: await hashPassword(temp),
      p_required_contribution: required,
      p_bio: cleanText(data.bio, 1000) || null,
    });
    if (error) {
      if (error.message.includes('duplicate')) throw new AppError('A profile with this name already exists.', 409);
      throw new AppError('Unable to create friend.', 500);
    }
    return { user: inserted as User, temporaryPassword: temp };
  }

  async resetPassword(actor: User, userId: string) {
    this.requireAdmin(actor);
    const temp = temporaryPassword();
    const { error } = await this.supabase.rpc('reset_password_with_audit', { p_actor_id: actor.id, p_user_id: userId, p_password_hash: await hashPassword(temp) });
    if (error) throw new AppError('Unable to reset password.', 500);
    return temp;
  }

  async changePassword(user: User, newPassword: string) {
    if (newPassword.length < 8 || newPassword.length > 128) throw new AppError('Password must be 8 to 128 characters.', 400);
    const { error } = await this.supabase.rpc('change_password_with_audit', { p_user_id: user.id, p_password_hash: await hashPassword(newPassword) });
    if (error) throw new AppError('Unable to change password.', 500);
  }

  async updateProfilePhoto(actor: User, userId: string, file: File) {
    if (actor.id !== userId && !['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) throw new AppError('Cannot update another profile.', 403);
    assertImage(file);
    const path = `${userId}/${crypto.randomUUID()}-${storageName(file.name)}`;
    const upload = await this.supabase.storage.from('profile-photos').upload(path, await fileBuffer(file), { contentType: file.type, upsert: false });
    if (upload.error) throw new AppError('Unable to upload profile photo.', 500);
    const { error } = await this.supabase.rpc('update_profile_photo_with_audit', { p_actor_id: actor.id, p_user_id: userId, p_path: path });
    if (error) throw new AppError('Unable to save profile photo.', 500);
    return path;
  }

  async submitPayment(actor: User, input: PaymentInput) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) throw new AppError('Enter a valid payment amount.', 400);
    if (!input.idempotencyKey || input.idempotencyKey.length > 120) throw new AppError('Missing idempotency key.', 400);
    assertImage(input.screenshot);
    const existing = await this.paymentByIdempotency(actor.id, input.idempotencyKey);
    if (existing) return existing;
    const path = `${actor.id}/${crypto.randomUUID()}-${storageName(input.screenshot.name)}`;
    const upload = await this.supabase.storage.from('payment-proofs').upload(path, await fileBuffer(input.screenshot), { contentType: input.screenshot.type, upsert: false });
    if (upload.error) throw new AppError('Unable to upload payment screenshot.', 500);
    const { data, error } = await this.supabase.rpc('submit_payment_with_audit', { p_user_id: actor.id, p_amount: amount, p_screenshot_path: path, p_notes: cleanText(input.notes, 1000) || null, p_method: cleanText(input.method, 80) || null, p_reference_id: cleanText(input.referenceId, 120) || null, p_idempotency_key: input.idempotencyKey });
    if (error) {
      const duplicate = await this.paymentByIdempotency(actor.id, input.idempotencyKey);
      if (duplicate) return duplicate;
      throw new AppError('Unable to submit payment.', 500);
    }
    return data;
  }

  async paymentByIdempotency(userId: string, key: string) {
    const { data, error } = await this.supabase.from('payments').select('*').eq('user_id', userId).eq('idempotency_key', key).maybeSingle();
    if (error) throw new AppError('Unable to load payment.', 500);
    return data;
  }

  async listPayments(actor: User, userId?: string) {
    let query = this.supabase.from('payments').select('*, app_users(name)').order('created_at', { ascending: false }).limit(100);
    if (actor.role === 'FRIEND') query = query.eq('user_id', actor.id); else if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw new AppError('Unable to load payments.', 500);
    return data ?? [];
  }

  async getPayment(actor: User, id: string) {
    const { data, error } = await this.supabase.from('payments').select('*').eq('id', id).maybeSingle();
    if (error) throw new AppError('Unable to load payment.', 500);
    if (!data) throw new AppError('Payment not found.', 404);
    if (actor.role === 'FRIEND' && data.user_id !== actor.id) throw new AppError('Cannot access another friend\'s payment.', 403);
    return data;
  }

  async signedPaymentProofUrl(actor: User, paymentId: string) {
    const payment = await this.getPayment(actor, paymentId);
    const { data, error } = await this.supabase.storage.from('payment-proofs').createSignedUrl(payment.screenshot_path, 60);
    if (error || !data) throw new AppError('Unable to open payment proof.', 500);
    return data.signedUrl;
  }

  async approvePayment(actor: User, id: string) {
    this.requireSuper(actor);
    const { data, error } = await this.supabase.rpc('approve_payment_with_audit', { p_actor_id: actor.id, p_payment_id: id });
    if (error) throw new AppError(error.message.includes('invalid_state') ? 'Only pending payments can be approved.' : 'Unable to approve payment.', error.message.includes('invalid_state') ? 409 : 500);
    return data;
  }

  async rejectPayment(actor: User, id: string, reason: string) {
    this.requireSuper(actor);
    const { data, error } = await this.supabase.rpc('reject_payment_with_audit', { p_actor_id: actor.id, p_payment_id: id, p_reason: cleanText(reason, 500) || 'Not approved' });
    if (error) throw new AppError(error.message.includes('invalid_state') ? 'Approved payments are immutable.' : 'Unable to reject payment.', error.message.includes('invalid_state') ? 409 : 500);
    return data;
  }

  async contributionFor(userId: string) {
    const user = await this.requireUser(userId);
    const { data, error } = await this.supabase.from('user_contribution_summaries').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw new AppError('Unable to load contribution.', 500);
    const row = data as SummaryRow | null;
    const approvedPaid = toNumber(row?.approved_paid);
    const pendingAmount = toNumber(row?.pending_amount);
    return { required: toNumber(user.required_contribution), approvedPaid, pendingAmount, remaining: toNumber(user.required_contribution) - approvedPaid };
  }

  async createExpense(actor: User, input: ExpenseInput) {
    this.requireAdmin(actor);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new AppError('Expense amount must be positive.', 400);
    const { data, error } = await this.supabase.rpc('create_expense_with_audit', { p_actor_id: actor.id, p_amount: amount, p_category: cleanText(input.category, 80), p_description: cleanText(input.description, 300), p_notes: cleanText(input.notes, 1000) || null });
    if (error) throw new AppError('Unable to create expense.', 500);
    return data;
  }

  async updateBudget(actor: User, totalBudget: number) {
    this.requireSuper(actor);
    if (!Number.isFinite(totalBudget) || totalBudget < 0) throw new AppError('Budget must be zero or greater.', 400);
    const { error } = await this.supabase.rpc('update_budget_with_audit', { p_actor_id: actor.id, p_total_budget: totalBudget });
    if (error) throw new AppError('Unable to update budget.', 500);
  }

  async budgetSummary() {
    const [{ data: settings, error: settingsError }, { data: categoryRows, error: categoryError }] = await Promise.all([
      this.supabase.from('application_settings').select('total_budget').eq('id', 1).single(),
      this.supabase.from('expense_category_totals').select('*'),
    ]);
    if (settingsError || categoryError) throw new AppError('Unable to load budget.', 500);
    const byCategory = Object.fromEntries(((categoryRows ?? []) as CategoryRow[]).map((row) => [row.category, toNumber(row.total)]));
    const totalSpent = Object.values(byCategory).reduce((sum, value) => sum + value, 0);
    const totalBudget = toNumber(settings?.total_budget);
    return { totalBudget, totalSpent, remainingBudget: totalBudget - totalSpent, byCategory };
  }

  async listExpenses(limit = 100) {
    const { data, error } = await this.supabase.from('expenses').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(limit);
    if (error) throw new AppError('Unable to load expenses.', 500);
    return data ?? [];
  }

  async listAlbumsWithPhotos() {
    const { data, error } = await this.supabase.from('albums').select('*, photos(*)').order('created_at', { ascending: false }).limit(25);
    if (error) throw new AppError('Unable to load albums.', 500);
    return data ?? [];
  }

  async uploadMemoryPhoto(actor: User, input: PhotoInput) {
    this.requireAdmin(actor);
    assertImage(input.file);
    const path = `${input.albumId ?? 'uncategorized'}/${crypto.randomUUID()}-${storageName(input.file.name)}`;
    const upload = await this.supabase.storage.from('memory-photos').upload(path, await fileBuffer(input.file), { contentType: input.file.type, upsert: false });
    if (upload.error) throw new AppError('Unable to upload photo.', 500);
    const { data, error } = await this.supabase.rpc('create_photo_with_audit', { p_actor_id: actor.id, p_album_id: input.albumId ?? null, p_path: path, p_title: cleanText(input.title, 120) || 'Wedding memory' });
    if (error) throw new AppError('Unable to save photo.', 500);
    return data;
  }

  async audits(limit = 100) {
    const { data, error } = await this.supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw new AppError('Unable to load audit logs.', 500);
    return data ?? [];
  }
}

export function getDb() { return new WeddingDb(); }
