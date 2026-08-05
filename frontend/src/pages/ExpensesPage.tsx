import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { MonthlyExpense } from '../types';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, ChevronDown, ChevronUp,
  Award, BarChart2, PieChart, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { TYPE_LABELS, TYPE_COLORS } from '../lib/constants';
import { TaskType } from '../types';

interface ExpenseResponse {
  year: number;
  months: MonthlyExpense[];
  availableYears: number[];
}

// ─── Colour palette for charts ────────────────────────────────────────────────
const BAR_COLOURS = [
  '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd',
];

const PIE_COLOURS: Record<string, string> = {
  ESSAY:         '#0ea5e9',
  POWERPOINT:    '#f43f5e',
  SPSS:          '#8b5cf6',
  QUESTIONNAIRE: '#14b8a6',
  LONG_TERM:     '#f59e0b',
  MIXED:         '#6b7280',
};

const PROVIDER_COLOURS = [
  '#7c3aed','#0ea5e9','#f59e0b','#14b8a6','#f43f5e','#8b5cf6','#10b981',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'USD') {
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(a: number, b: number) {
  if (b === 0) return null;
  return ((a - b) / b) * 100;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, colour = 'text-brand-600' }: {
  label: string; value: string; sub?: string; colour?: string;
}) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${colour}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function MomBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-400">—</span>;
  const up = value > 0;
  const zero = value === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold
      ${zero ? 'text-gray-500' : up ? 'text-rose-600' : 'text-emerald-600'}`}>
      {zero ? <Minus size={11} /> : up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {zero ? 'flat' : `${Math.abs(value).toFixed(1)}%`}
    </span>
  );
}

// ─── SVG donut chart ─────────────────────────────────────────────────────────

interface Slice { label: string; value: number; colour: string }

function Donut({ slices, size = 140 }: { slices: Slice[]; size?: number }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return <p className="text-xs text-gray-400 text-center py-4">No data</p>;

  const cx = size / 2, cy = size / 2, r = size * 0.38, inner = size * 0.22;
  let angle = -Math.PI / 2;
  const paths = slices.map((sl) => {
    const sweep = (sl.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const xi1 = cx + inner * Math.cos(angle - sweep);
    const yi1 = cy + inner * Math.sin(angle - sweep);
    const xi2 = cx + inner * Math.cos(angle);
    const yi2 = cy + inner * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return {
      d: `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${inner},${inner} 0 ${large},0 ${xi1},${yi1} Z`,
      colour: sl.colour,
      label: sl.label,
      value: sl.value,
      pct: ((sl.value / total) * 100).toFixed(1),
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.colour} opacity={0.9}>
          <title>{p.label}: {p.pct}%</title>
        </path>
      ))}
      {/* Centre hole */}
      <circle cx={cx} cy={cy} r={inner} fill="white" />
    </svg>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading } = useQuery<ExpenseResponse>({
    queryKey: ['expenses', year],
    queryFn: async () => {
      const { data } = await api.get(`/expenses?year=${year}`);
      return data;
    },
  });

  const months = data?.months ?? [];
  const currency = months[0]?.currency ?? 'USD';

  // Full 12-slot array
  const allMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const found = months.find((m) => m.month === i + 1);
    return found ?? {
      year, month: i + 1,
      label: new Date(year, i, 1).toLocaleString('en', { month: 'long', year: 'numeric' }),
      total: 0, currency, count: 0, entries: [],
    };
  }), [months, year, currency]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const grandTotal   = months.reduce((s, m) => s + m.total, 0);
  const totalTasks   = months.reduce((s, m) => s + m.count, 0);
  const activeMonths = months.filter((m) => m.total > 0).length;
  const avgPerMonth  = activeMonths > 0 ? grandTotal / activeMonths : 0;
  const busiest      = months.reduce<MonthlyExpense | null>(
    (best, m) => (!best || m.total > best.total ? m : best), null
  );

  // ── Month-over-month ────────────────────────────────────────────────────────
  const momChanges = allMonths.map((m, i) => {
    if (i === 0) return null;
    return pct(m.total, allMonths[i - 1].total);
  });

  // ── Spend by task type ──────────────────────────────────────────────────────
  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    months.forEach((m) => m.entries.forEach((e) => {
      map[e.taskType] = (map[e.taskType] ?? 0) + e.amount;
    }));
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([type, total]) => ({
        type, total,
        label: TYPE_LABELS[type as TaskType] ?? type,
        colour: PIE_COLOURS[type] ?? '#6b7280',
        pct: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      }));
  }, [months, grandTotal]);

  // ── Provider leaderboard ────────────────────────────────────────────────────
  const byProvider = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    months.forEach((m) => m.entries.forEach((e) => {
      if (!map[e.providerName]) map[e.providerName] = { total: 0, count: 0 };
      map[e.providerName].total += e.amount;
      map[e.providerName].count += 1;
    }));
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, d], i) => ({
        name, ...d, colour: PROVIDER_COLOURS[i % PROVIDER_COLOURS.length],
        share: grandTotal > 0 ? (d.total / grandTotal) * 100 : 0,
      }));
  }, [months, grandTotal]);

  const maxBar = Math.max(...allMonths.map((m) => m.total), 1);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="btn-secondary !px-2.5 !py-2"><ArrowLeft size={16} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Spending from accepted quotes · {year}</p>
        </div>
        <div className="ml-auto">
          <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {(data?.availableYears ?? [currentYear]).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Loading analytics…</div>
      ) : grandTotal === 0 ? (
        <div className="text-center py-20 text-gray-400">No accepted quotes recorded for {year} yet.</div>
      ) : (
        <>
          {/* ── KPI strip ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              label="Total Spend"
              value={fmt(grandTotal, currency)}
              sub={`${totalTasks} task${totalTasks !== 1 ? 's' : ''}`}
              colour="text-brand-600"
            />
            <KpiCard
              label="Avg / Active Month"
              value={fmt(avgPerMonth, currency)}
              sub={`${activeMonths} active month${activeMonths !== 1 ? 's' : ''}`}
              colour="text-sky-600"
            />
            <KpiCard
              label="Busiest Month"
              value={busiest ? new Date(year, busiest.month - 1).toLocaleString('en', { month: 'short' }) : '—'}
              sub={busiest ? fmt(busiest.total, currency) : undefined}
              colour="text-amber-600"
            />
            <KpiCard
              label="Top Provider"
              value={byProvider[0]?.name ?? '—'}
              sub={byProvider[0] ? fmt(byProvider[0].total, currency) : undefined}
              colour="text-emerald-600"
            />
          </div>

          {/* ── Monthly bar chart ─────────────────────────────────────────── */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-500" />
              Monthly Spend
            </h2>
            <p className="text-xs text-gray-400 mb-4">Bar height = spend · badge = month-on-month change</p>

            {/* Bars */}
            <div className="flex items-end gap-1 h-44 mb-1">
              {allMonths.map((m, i) => {
                const heightPct = Math.max((m.total / maxBar) * 100, m.total > 0 ? 4 : 1);
                const change = momChanges[i];
                return (
                  <div key={m.month} className="flex flex-col items-center flex-1 gap-0.5">
                    {/* MoM badge */}
                    <div className="h-5 flex items-center">
                      {m.total > 0 && <MomBadge value={change} />}
                    </div>
                    {/* Value */}
                    <span className="text-[10px] text-gray-500 font-medium leading-none">
                      {m.total > 0 ? m.total.toFixed(0) : ''}
                    </span>
                    {/* Bar */}
                    <div
                      className="w-full rounded-t-md transition-all cursor-default"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: m.total > 0 ? BAR_COLOURS[i] : '#f3f4f6',
                        minHeight: '4px',
                      }}
                      title={`${m.label}: ${fmt(m.total, currency)}`}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex gap-1">
              {allMonths.map((m) => (
                <div key={m.month} className="flex-1 text-center">
                  <span className="text-[10px] text-gray-400">
                    {new Date(year, m.month - 1).toLocaleString('en', { month: 'short' })}
                  </span>
                </div>
              ))}
            </div>

            {/* Avg line annotation */}
            {avgPerMonth > 0 && (
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <span className="inline-block w-6 h-0.5 bg-brand-300 rounded" />
                Average active month: <span className="font-semibold text-gray-600">{fmt(avgPerMonth, currency)}</span>
              </p>
            )}
          </div>

          {/* ── Type breakdown + Provider leaderboard ──────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Spend by task type */}
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart size={15} className="text-sky-500" />
                Spend by Task Type
              </h2>
              <div className="flex items-center gap-6">
                <Donut
                  slices={byType.map((t) => ({ label: t.label, value: t.total, colour: t.colour }))}
                  size={130}
                />
                <div className="flex-1 space-y-2 min-w-0">
                  {byType.map((t) => (
                    <div key={t.type} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: t.colour }} />
                      <span className="text-xs text-gray-700 truncate flex-1">{t.label}</span>
                      <span className="text-xs font-semibold text-gray-900 shrink-0">{t.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Type bar breakdown */}
              <div className="mt-4 space-y-1.5">
                {byType.map((t) => (
                  <div key={t.type}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className={`badge ${TYPE_COLORS[t.type as TaskType]}`}>{t.label}</span>
                      <span className="text-gray-600 font-medium">{fmt(t.total, currency)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${t.pct}%`, backgroundColor: t.colour }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Provider leaderboard */}
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award size={15} className="text-amber-500" />
                Provider Leaderboard
              </h2>
              <div className="space-y-3">
                {byProvider.map((p, i) => (
                  <div key={p.name}>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                        style={{ backgroundColor: p.colour }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-800 flex-1 truncate">{p.name}</span>
                      <span className="text-xs text-gray-500 shrink-0">{p.count} task{p.count !== 1 ? 's' : ''}</span>
                      <span className="text-sm font-bold text-gray-900 shrink-0">{fmt(p.total, currency)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${p.share}%`, backgroundColor: p.colour }}
                      />
                    </div>
                    <p className="text-right text-[10px] text-gray-400 mt-0.5">{p.share.toFixed(1)}% of total</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Monthly detail accordion ───────────────────────────────────── */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BarChart2 size={15} className="text-brand-500" />
              Monthly Detail
            </h2>
            <div className="space-y-3">
              {allMonths.filter((m) => m.count > 0).map((m, _) => {
                const idx = allMonths.findIndex((x) => x.month === m.month);
                const change = momChanges[idx];
                const shareOfYear = grandTotal > 0 ? (m.total / grandTotal) * 100 : 0;
                return (
                  <div key={m.month} className="card overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      onClick={() => setExpanded(expanded === m.month ? null : m.month)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white shrink-0"
                          style={{ backgroundColor: BAR_COLOURS[m.month - 1] }}>
                          {new Date(year, m.month - 1).toLocaleString('en', { month: 'short' })}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">{m.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-gray-500">{m.count} task{m.count !== 1 ? 's' : ''}</p>
                            <MomBadge value={change} />
                            <span className="text-xs text-gray-400">{shareOfYear.toFixed(1)}% of year</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">{fmt(m.total, m.currency)}</span>
                        {expanded === m.month
                          ? <ChevronUp size={16} className="text-gray-400" />
                          : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </button>

                    {expanded === m.month && (
                      <div className="border-t border-gray-100">
                        {m.entries.map((e, idx2) => (
                          <Link
                            key={idx2}
                            to={`/tasks/${e.taskId}`}
                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`badge text-xs shrink-0 ${TYPE_COLORS[e.taskType as TaskType]}`}>
                                {TYPE_LABELS[e.taskType as TaskType] ?? e.taskType}
                              </span>
                              <span className="text-sm text-gray-800 truncate">{e.taskTitle}</span>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <p className="text-sm font-semibold text-gray-900">{fmt(e.amount, e.currency)}</p>
                              <p className="text-xs text-gray-400">{e.providerName}</p>
                            </div>
                          </Link>
                        ))}
                        {/* Month sub-total bar */}
                        <div className="px-4 py-3 bg-gray-50 flex items-center justify-between border-t border-gray-100">
                          <span className="text-xs text-gray-500 font-medium">Month total</span>
                          <span className="text-sm font-bold text-gray-900">{fmt(m.total, m.currency)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
