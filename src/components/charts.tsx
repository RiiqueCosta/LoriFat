/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartTheme } from '../lib/hooks';
import { formatCompactCurrency, formatCurrency } from '../lib/utils';

export interface CashflowPoint { label: string; revenue: number; expenses: number; invoiced?: number }

function CashTooltip({ active, payload, label, theme }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as CashflowPoint;
  const profit = p.revenue - p.expenses;
  return (
    <div className="rounded-xl border px-3 py-2.5 shadow-xl text-xs min-w-[170px]" style={{ background: theme.tooltipBg, borderColor: theme.tooltipBorder, color: theme.text }}>
      <p className="font-semibold mb-1.5 capitalize">{label}</p>
      <Row color={theme.revenue} label="Recebido" value={p.revenue} />
      <Row color={theme.expense} label="Despesas" value={p.expenses} />
      {p.invoiced !== undefined && <Row color={theme.revenueSoft} label="Faturado" value={p.invoiced} />}
      <div className="mt-1.5 pt-1.5 border-t flex justify-between gap-4 font-semibold" style={{ borderColor: theme.tooltipBorder }}>
        <span>Resultado</span>
        <span style={{ color: profit >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(profit)}</span>
      </div>
    </div>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="flex items-center gap-1.5 opacity-80"><span className="w-2 h-2 rounded-sm" style={{ background: color }} />{label}</span>
      <span className="tabular-nums font-medium">{formatCurrency(value)}</span>
    </div>
  );
}

export function CashflowChart({ data, height = 260, showInvoiced }: { data: CashflowPoint[]; height?: number; showInvoiced?: boolean }) {
  const t = useChartTheme();
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="0" vertical={false} stroke={t.grid} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: t.axis, fontSize: 11 }} dy={6} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: t.axis, fontSize: 11 }} tickFormatter={(v: number) => (v === 0 ? '0' : formatCompactCurrency(v))} width={64} />
          <Tooltip cursor={{ fill: t.cursor }} content={<CashTooltip theme={t} />} />
          {showInvoiced && <Bar dataKey="invoiced" name="Faturado" fill={t.revenueSoft} radius={[5, 5, 0, 0]} maxBarSize={22} />}
          <Bar dataKey="revenue" name="Recebido" fill={t.revenue} radius={[5, 5, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expenses" name="Despesas" fill={t.expense} radius={[5, 5, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
      {items.map(i => (
        <span key={i.label} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />{i.label}</span>
      ))}
    </div>
  );
}

/** Barra horizontal de proporção (ranking). */
export function ShareBar({ value, max, color = '#ff7a00' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
