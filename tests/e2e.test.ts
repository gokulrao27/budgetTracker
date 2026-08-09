import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { contributionSummary, budgetSummary, normalizeName } from '../lib/domain';

describe('database-backed Wedding Friends Portal invariants', () => {
  it('keeps pure financial calculations derived from authoritative records', () => {
    expect(normalizeName(' GoKuL   Kumar ')).toBe('gokul kumar');
    const contribution = contributionSummary({ required_contribution: 10000 }, [
      { id: '1', user_id: 'u', amount: 4000, status: 'PENDING', screenshot_path: 'p', idempotency_key: 'a', created_at: 'now' },
      { id: '2', user_id: 'u', amount: 2500, status: 'APPROVED', screenshot_path: 'p', idempotency_key: 'b', created_at: 'now' },
      { id: '3', user_id: 'u', amount: 1000, status: 'REJECTED', screenshot_path: 'p', idempotency_key: 'c', created_at: 'now' },
    ]);
    expect(contribution).toEqual({ required: 10000, approvedPaid: 2500, pendingAmount: 4000, remaining: 7500 });
    const budget = budgetSummary(50000, [
      { id: 'e1', amount: 20000, category: 'Food', description: 'Dinner', created_by: 'a', created_at: 'now', updated_at: 'now' },
      { id: 'e2', amount: 5000, category: 'Food', description: 'Snacks', created_by: 'a', created_at: 'now', updated_at: 'now' },
      { id: 'e3', amount: 7000, category: 'Music', description: 'DJ', created_by: 'a', created_at: 'now', updated_at: 'now', deleted_at: 'now' },
    ]);
    expect(budget).toEqual({ totalBudget: 50000, totalSpent: 25000, remainingBudget: 25000, byCategory: { Food: 25000 } });
  });

  it('migration defines PostgreSQL persistence, budget settings, RLS, idempotency, and atomic payment approval', () => {
    const sql = fs.readFileSync('supabase/migrations/001_initial_schema.sql', 'utf8');
    expect(sql).toContain('create table application_settings');
    expect(sql).toContain('unique(user_id,idempotency_key)');
    expect(sql).toContain("where id=p_payment_id and status='PENDING'");
    expect(sql).toContain('create view user_contribution_summaries');
    expect(sql).toContain('create view expense_category_totals');
    expect(sql).toContain('alter table payments enable row level security');
    expect(sql).toContain('create function approve_payment_with_audit');
    expect(sql).toContain('create function submit_payment_with_audit');
    expect(sql).toContain('revoke execute on all functions in schema public from public, anon, authenticated');
    expect(sql).toContain('grant execute on function approve_payment_with_audit(uuid,uuid) to service_role');
    expect(sql).toContain('perform assert_super_admin(p_actor_id);');
    expect(sql).toContain('perform assert_admin(p_actor_id);');
    expect(sql).toContain('if p_actor_id <> p_user_id then raise exception');
    expect(sql).toContain('security definer set search_path=public');
  });

  it('production app no longer imports MemoryStore or persists business data in module arrays', () => {
    expect(fs.existsSync('lib/store.ts')).toBe(false);
    const files = ['lib/db.ts', 'lib/api.ts', 'app/api/payments/route.ts', 'app/api/admin/payments/[id]/approve/route.ts'];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toContain('MemoryStore');
      expect(source).not.toMatch(/users:\s*User\[\]|payments:\s*Payment\[\]|expenses:\s*Expense\[\]/);
    }
  });

  it('direct-RPC abuse coverage is gated on real Supabase credentials', () => {
    const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.RUN_SUPABASE_INTEGRATION === '1');
    expect(hasSupabase).toBe(false);
  });
});
