'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

const palette = ['#fb7185', '#f59e0b', '#38bdf8', '#a78bfa', '#34d399', '#f472b6', '#fde047'];
const money = (value: number) => `₹${Number(value ?? 0).toLocaleString('en-IN')}`;

export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  const chartData = data.length ? data : [{ name: 'No expenses yet', value: 1 }];
  return (
    <div className="h-72 min-h-72 w-full sm:h-80" aria-label="Expense distribution chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie dataKey="value" data={chartData} innerRadius="55%" outerRadius="82%" paddingAngle={3} stroke="rgba(255,255,255,.12)" strokeWidth={1} labelLine={false}>
            {chartData.map((_, i) => <Cell key={i} fill={data.length ? palette[i % palette.length] : 'rgba(255,255,255,.14)'} />)}
          </Pie>
          <Tooltip formatter={(value) => data.length ? money(Number(value)) : 'No spending recorded'} contentStyle={{ background: '#120914', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16, color: 'white' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ContributionBar({ paid, remaining }: { paid: number; remaining: number }) {
  return (
    <div className="h-56 w-full" aria-label="Contribution progress chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[{ name: 'You', Approved: paid, Remaining: Math.max(remaining, 0) }]} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,.68)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ background: '#120914', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16, color: 'white' }} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
          <Bar dataKey="Approved" stackId="a" fill="#34d399" radius={[16, 16, 16, 16]} />
          <Bar dataKey="Remaining" stackId="a" fill="#fb7185" radius={[16, 16, 16, 16]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InlineProgress({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className="space-y-2"><div className="flex items-center justify-between text-sm text-white/70"><span>{label}</span><span>{Math.round(safe)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-rose-400 to-amber-300 transition-[width] duration-700" style={{ width: `${safe}%` }} /></div></div>;
}
