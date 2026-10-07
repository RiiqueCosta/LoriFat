/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Calculator, Download, FileDown, FileSpreadsheet, PieChart, TrendingUp, Users, Wallet } from 'lucide-react';
// @ts-ignore - html2pdf não tem tipos
import html2pdf from 'html2pdf.js';
import { AppConfig, AppRecord } from '../types';
import { cashflow, splitRecords } from '../lib/analytics';
import { revenueDate } from '../lib/billing';
import { exportBackup, exportCashbook } from '../lib/export';
import { addDays, addMonths, escapeHtml, formatCurrency, lastMonths, monthKey, monthLabel, todayISO } from '../lib/utils';
import { useChartTheme } from '../lib/hooks';
import { useFeedback } from '../lib/feedback';
import { Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, Segmented, Select, StatCard } from '../components/ui';
import { CashflowChart, ChartLegend, ShareBar } from '../components/charts';

type Range = '6' | '12' | 'year';

export function ReportsView({ records, config }: { records: AppRecord[]; config: AppConfig }) {
  const feedback = useFeedback();
  const t = useChartTheme();
  const split = useMemo(() => splitRecords(records), [records]);
  const [range, setRange] = useState<Range>('6');

  const months = useMemo(() => {
    if (range === 'year') {
      const y = new Date().getFullYear();
      return Array.from({ length: new Date().getMonth() + 1 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
    }
    return lastMonths(Number(range));
  }, [range]);
  const flow = useMemo(() => cashflow(split, months), [split, months]);
  const totals = flow.reduce((s, m) => ({ revenue: s.revenue + m.revenue, expenses: s.expenses + m.expenses, invoiced: s.invoiced + m.invoiced }), { revenue: 0, expenses: 0, invoiced: 0 });
  const profit = totals.revenue - totals.expenses;
  const margin = totals.revenue > 0 ? profit / totals.revenue : null;

  const inRange = (d: string) => months.includes(monthKey(d));
  const topClients = useMemo(() => {
    const m = new Map<string, number>();
    split.invoices.filter(i => i.status === 'paid' && inRange(revenueDate(i))).forEach(i => m.set(i.clientName, (m.get(i.clientName) || 0) + i.total));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [split, months]);
  const topCategories = useMemo(() => {
    const m = new Map<string, number>();
    split.expenses.filter(e => inRange(e.dateCreated)).forEach(e => m.set(e.category, (m.get(e.category) || 0) + e.total));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [split, months]);
  const paidCount = split.invoices.filter(i => i.status === 'paid' && inRange(revenueDate(i))).length;
  const ticket = paidCount ? totals.revenue / paidCount : 0;

  // --- Exportação para o contador ---
  const lastMonth = addMonths(todayISO().slice(0, 7) + '-01', -1).slice(0, 7);
  const [exportMonth, setExportMonth] = useState(lastMonth);
  const [customFrom, setCustomFrom] = useState(lastMonth + '-01');
  const [customTo, setCustomTo] = useState(todayISO());
  const [exportMode, setExportMode] = useState<'month' | 'custom'>('month');
  const monthOptions = lastMonths(24).reverse();

  const doExportCashbook = () => {
    let from: string, to: string, name: string;
    if (exportMode === 'month') {
      from = exportMonth + '-01';
      to = addDays(addMonths(from, 1), -1);
      name = `livro-caixa-${exportMonth}.csv`;
    } else {
      from = customFrom; to = customTo; name = `livro-caixa-${customFrom}_a_${customTo}.csv`;
    }
    const n = exportCashbook(records, { from, to }, name);
    if (n === 0) feedback.info('Nenhum lançamento no período', 'O arquivo foi gerado vazio.');
    else feedback.success('Planilha gerada', `${n} lançamento${n > 1 ? 's' : ''} (receitas recebidas e despesas).`);
  };

  const downloadPdf = () => {
    const rows = flow.map(d => `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px; text-transform:capitalize;">${escapeHtml(monthLabel(d.key, true))}</td>
        <td style="padding:8px; text-align:right;">${formatCurrency(d.invoiced)}</td>
        <td style="padding:8px; text-align:right;">${formatCurrency(d.revenue)}</td>
        <td style="padding:8px; text-align:right;">${formatCurrency(d.expenses)}</td>
        <td style="padding:8px; text-align:right; font-weight:bold; color:${d.revenue - d.expenses >= 0 ? '#16a34a' : '#dc2626'};">${formatCurrency(d.revenue - d.expenses)}</td>
      </tr>`).join('');
    const box = (label: string, value: string, color: string) => `
      <div style="flex:1; background:#f8f8f8; padding:14px; border-radius:10px;">
        <p style="margin:0; font-size:11px; color:#666;">${label}</p>
        <p style="margin:6px 0 0; font-size:18px; font-weight:bold; color:${color};">${value}</p>
      </div>`;
    const html = `
      <div style="font-family:Arial, sans-serif; padding:36px; color:#18181b;">
        <h1 style="margin:0; color:#ff7a00; font-size:22px;">Relatório financeiro — ${escapeHtml(config.companyName)}</h1>
        <p style="margin:6px 0 24px; font-size:12px; color:#666;">Período: ${escapeHtml(monthLabel(months[0], true))} a ${escapeHtml(monthLabel(months[months.length - 1], true))} · gerado em ${new Date().toLocaleString('pt-BR')}</p>
        <div style="display:flex; gap:10px; margin-bottom:10px;">
          ${box('Faturado', formatCurrency(totals.invoiced), '#2563eb')}
          ${box('Recebido', formatCurrency(totals.revenue), '#16a34a')}
          ${box('Despesas', formatCurrency(totals.expenses), '#dc2626')}
          ${box('Resultado', formatCurrency(profit), profit >= 0 ? '#16a34a' : '#dc2626')}
        </div>
        <h3 style="margin:28px 0 8px;">Por mês</h3>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <tr style="background:#ff7a00; color:white;">
            <th style="padding:8px; text-align:left;">Mês</th><th style="padding:8px; text-align:right;">Faturado</th>
            <th style="padding:8px; text-align:right;">Recebido</th><th style="padding:8px; text-align:right;">Despesas</th><th style="padding:8px; text-align:right;">Resultado</th>
          </tr>${rows}
        </table>
        <div style="display:flex; gap:24px; margin-top:28px;">
          <div style="flex:1;"><h3 style="margin:0 0 8px;">Principais clientes</h3>
            ${topClients.map(([n, v]) => `<p style="margin:4px 0; font-size:12px; display:flex; justify-content:space-between;"><span>${escapeHtml(n)}</span><b>${formatCurrency(v)}</b></p>`).join('') || '<p style="font-size:12px;color:#999;">Sem dados</p>'}
          </div>
          <div style="flex:1;"><h3 style="margin:0 0 8px;">Despesas por categoria</h3>
            ${topCategories.map(([n, v]) => `<p style="margin:4px 0; font-size:12px; display:flex; justify-content:space-between;"><span>${escapeHtml(n)}</span><b>${formatCurrency(v)}</b></p>`).join('') || '<p style="font-size:12px;color:#999;">Sem dados</p>'}
          </div>
        </div>
      </div>`;
    const el = document.createElement('div');
    el.innerHTML = html;
    html2pdf().set({ margin: 8, filename: `relatorio-${todayISO()}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } }).from(el).save();
  };

  const maxClient = topClients[0]?.[1] || 0;
  const maxCat = topCategories[0]?.[1] || 0;

  return (
    <div className="space-y-6 fade-in">
      <PageHeader
        title="Relatórios"
        description="Entenda seus números e gere arquivos para o contador."
        actions={<>
          <Segmented size="sm" value={range} onChange={setRange} options={[{ value: '6', label: '6 meses' }, { value: '12', label: '12 meses' }, { value: 'year', label: 'Este ano' }]} />
          <Button variant="dark" icon={Download} onClick={downloadPdf}>PDF</Button>
        </>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Recebido" value={formatCurrency(totals.revenue)} icon={TrendingUp} tone="success" hint={`Faturado: ${formatCurrency(totals.invoiced)}`} />
        <StatCard label="Despesas" value={formatCurrency(totals.expenses)} icon={Wallet} tone="danger" />
        <StatCard label="Resultado" value={formatCurrency(profit)} icon={Calculator} tone={profit >= 0 ? 'brand' : 'danger'} hint={margin !== null ? `Margem de ${Math.round(margin * 100)}%` : undefined} />
        <StatCard label="Ticket médio" value={formatCurrency(ticket)} icon={PieChart} tone="info" hint={`${paidCount} fatura${paidCount !== 1 ? 's' : ''} paga${paidCount !== 1 ? 's' : ''}`} />
      </div>

      <Card>
        <CardHeader title="Faturado, recebido e despesas" description="Recebido conta pela data de pagamento" action={
          <ChartLegend items={[{ color: t.revenueSoft, label: 'Faturado' }, { color: t.revenue, label: 'Recebido' }, { color: t.expense, label: 'Despesas' }]} />
        } />
        <div className="px-3 pb-4">
          {flow.some(f => f.revenue || f.expenses || f.invoiced)
            ? <CashflowChart data={flow} height={300} showInvoiced />
            : <EmptyState icon={TrendingUp} title="Sem dados no período" className="py-16" />}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader title="Principais clientes" description="Por valor recebido no período" icon={Users} />
          <div className="px-5 pb-5 space-y-3.5">
            {topClients.length === 0 ? <p className="text-sm text-zinc-500">Sem pagamentos no período.</p> : topClients.map(([name, v]) => (
              <div key={name} className="space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-zinc-700 dark:text-zinc-300 truncate pr-2">{name}</span><span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(v)}</span></div>
                <ShareBar value={v} max={maxClient} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Despesas por categoria" description="No período selecionado" icon={Wallet} />
          <div className="px-5 pb-5 space-y-3.5">
            {topCategories.length === 0 ? <p className="text-sm text-zinc-500">Sem despesas no período.</p> : topCategories.map(([name, v]) => (
              <div key={name} className="space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-zinc-700 dark:text-zinc-300">{name}</span><span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(v)}</span></div>
                <ShareBar value={v} max={maxCat} color={t.dark ? '#71717a' : '#a1a1aa'} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Exportar para o contador" description="Planilha (CSV) com receitas recebidas e despesas — abre no Excel e Google Planilhas." icon={FileSpreadsheet} />
        <div className="px-5 pb-5 space-y-4">
          <Segmented size="sm" value={exportMode} onChange={setExportMode} options={[{ value: 'month', label: 'Mês' }, { value: 'custom', label: 'Período personalizado' }]} />
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            {exportMode === 'month' ? (
              <Field label="Mês" className="sm:w-60">
                <Select value={exportMonth} onChange={e => setExportMonth(e.target.value)}>
                  {monthOptions.map(m => <option key={m} value={m}>{monthLabel(m, true)}</option>)}
                </Select>
              </Field>
            ) : (
              <>
                <Field label="De" className="sm:w-44"><Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} /></Field>
                <Field label="Até" className="sm:w-44"><Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} /></Field>
              </>
            )}
            <Button icon={FileDown} onClick={doExportCashbook}>Baixar planilha</Button>
          </div>
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Backup completo de todos os dados (clientes, faturas, orçamentos, despesas) em JSON.</p>
            <Button size="sm" variant="outline" icon={Download} onClick={() => exportBackup(records, config)}>Baixar backup</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
