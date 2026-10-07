/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRight, ArrowUpRight, ArrowDownRight, CheckCircle2, Circle, Clock, FileCheck2, FileText,
  MessageCircle, Plus, Repeat, Sparkles, TrendingUp, Wallet, CalendarClock, Send,
} from 'lucide-react';
import { AppConfig, AppRecord, Invoice } from '../types';
import { splitRecords, kpis, cashflow } from '../lib/analytics';
import { daysOverdue, daysUntilDue, displayNumber, invoiceStatus } from '../lib/billing';
import { cn, dateKey, formatCurrency, formatDate, greeting, lastMonths } from '../lib/utils';
import { navigate, routeHref } from '../lib/router';
import { useActions } from '../actions';
import { Badge, Button, Card, CardHeader, EmptyState, IconButton, InvoiceStatusBadge, StatCard } from '../components/ui';
import { CashflowChart, ChartLegend } from '../components/charts';
import { useChartTheme } from '../lib/hooks';

export function DashboardView({ records, config, userName }: { records: AppRecord[]; config: AppConfig; userName: string }) {
  const actions = useActions();
  const t = useChartTheme();
  const split = useMemo(() => splitRecords(records), [records]);
  const k = useMemo(() => kpis(split), [split]);
  const flow = useMemo(() => cashflow(split, lastMonths(6)), [split]);
  const [question, setQuestion] = useState('');

  const toCharge = useMemo(() => [...k.overdue, ...k.dueSoon]
    .sort((a, b) => dateKey(a.dueDate).localeCompare(dateKey(b.dueDate)))
    .slice(0, 6), [k]);

  const recentInvoices = useMemo(() => [...split.invoices]
    .sort((a, b) => (dateKey(b.dateCreated) + b.id).localeCompare(dateKey(a.dateCreated) + a.id))
    .slice(0, 5), [split]);

  const upcomingRecurring = useMemo(() => split.recurring.filter(r => r.active)
    .sort((a, b) => dateKey(a.nextDate).localeCompare(dateKey(b.nextDate)))
    .slice(0, 4), [split]);

  const setup = [
    { done: split.clients.length > 0, label: 'Cadastre seu primeiro cliente', action: () => actions.create('client') },
    { done: !!config.pixKey, label: 'Configure sua chave PIX', action: () => navigate('settings') },
    { done: !!config.logo, label: 'Adicione a logo da empresa', action: () => navigate('settings') },
    { done: split.invoices.length > 0, label: 'Emita sua primeira fatura', action: () => actions.create('invoice') },
  ];
  const setupPending = setup.filter(s => !s.done).length;

  const delta = k.receivedDelta;
  const firstName = (userName || '').split(/[\s@.]/)[0];

  return (
    <div className="space-y-6 fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {greeting()}{firstName ? `, ${firstName.charAt(0).toUpperCase() + firstName.slice(1)}` : ''}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {k.overdue.length > 0
              ? `Você tem ${k.overdue.length} fatura${k.overdue.length > 1 ? 's' : ''} vencida${k.overdue.length > 1 ? 's' : ''} para cobrar.`
              : k.dueSoon.length > 0
                ? `${k.dueSoon.length} fatura${k.dueSoon.length > 1 ? 's vencem' : ' vence'} nos próximos 7 dias.`
                : 'Tudo em dia por aqui.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Sparkles} onClick={actions.importProposal} className="hidden sm:inline-flex">Importar com IA</Button>
          <Button icon={Plus} onClick={() => actions.create('invoice')}>Nova fatura</Button>
        </div>
      </div>

      {/* Alerta de vencidas */}
      {k.overdue.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">{formatCurrency(k.overdueTotal)} em faturas vencidas</p>
              <p className="text-xs text-red-700/80 dark:text-red-300/80">{k.overdue.map(i => i.clientName).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join(', ')}{k.overdue.length > 3 ? '...' : ''}</p>
            </div>
          </div>
          <Button size="sm" variant="danger" icon={ArrowRight} onClick={() => navigate('invoices', 'vencidas')}>Ver vencidas</Button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="A receber" value={formatCurrency(k.openTotal)} hint={`${k.open.length} fatura${k.open.length !== 1 ? 's' : ''} em aberto`} icon={Clock} tone="warning" onClick={() => navigate('invoices', 'abertas')} />
        <StatCard label="Recebido no mês" value={formatCurrency(k.receivedMonth)} icon={TrendingUp} tone="success"
          hint={delta === null ? 'Sem base no mês anterior' : (
            <span className={cn('inline-flex items-center gap-0.5 font-medium', delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
              {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(Math.round(delta * 100))}% vs mês anterior
            </span>
          )} />
        <StatCard label="Despesas do mês" value={formatCurrency(k.expensesMonth)} icon={Wallet} tone="danger" hint="Lançadas neste mês" onClick={() => navigate('expenses')} />
        <StatCard label="Resultado do mês" value={formatCurrency(k.profitMonth)} icon={k.profitMonth >= 0 ? ArrowUpRight : ArrowDownRight} tone={k.profitMonth >= 0 ? 'brand' : 'danger'}
          hint={k.mrr > 0 ? `${formatCurrency(k.mrr)}/mês recorrente` : 'Recebido − despesas'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Fluxo de caixa */}
        <Card className="xl:col-span-2">
          <CardHeader title="Fluxo de caixa" description="Últimos 6 meses" action={
            <ChartLegend items={[{ color: t.revenue, label: 'Recebido' }, { color: t.expense, label: 'Despesas' }]} />
          } />
          <div className="px-3 pb-4">
            {flow.some(f => f.revenue || f.expenses)
              ? <CashflowChart data={flow} />
              : <EmptyState icon={TrendingUp} title="Sem movimentação ainda" description="Os pagamentos recebidos e as despesas aparecem aqui." className="py-16" />}
          </div>
        </Card>

        {/* Cobranças */}
        <Card className="flex flex-col">
          <CardHeader title="Para cobrar" description="Vencidas e próximas de vencer" action={
            <a href={routeHref('invoices', 'abertas')} className="text-xs font-semibold text-brand hover:underline whitespace-nowrap">Ver todas</a>
          } />
          <div className="flex-1 px-2 pb-2">
            {toCharge.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nada para cobrar" description="Nenhuma fatura vencida ou vencendo nos próximos 7 dias." className="py-10" />
            ) : toCharge.map(inv => <ChargeRow key={inv.id} inv={inv} />)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Orçamentos aguardando */}
        <Card>
          <CardHeader title="Orçamentos aguardando" description={k.pendingQuotes.length ? `${formatCurrency(k.pendingQuotesTotal)} em negociação` : undefined} icon={FileCheck2}
            action={<a href={routeHref('quotes')} className="text-xs font-semibold text-brand hover:underline">Ver</a>} />
          <div className="px-2 pb-2">
            {k.pendingQuotes.length === 0 ? (
              <p className="px-3 pb-4 text-sm text-zinc-500 dark:text-zinc-400">Nenhum orçamento aguardando resposta.</p>
            ) : k.pendingQuotes.slice(0, 4).map(q => (
              <button key={q.id} onClick={() => actions.view(q)} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{q.clientName}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{displayNumber(q)}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(q.total)}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* Últimas faturas */}
        <Card>
          <CardHeader title="Últimas faturas" icon={FileText} action={<a href={routeHref('invoices')} className="text-xs font-semibold text-brand hover:underline">Ver</a>} />
          <div className="px-2 pb-2">
            {recentInvoices.length === 0 ? (
              <p className="px-3 pb-4 text-sm text-zinc-500 dark:text-zinc-400">Nenhuma fatura emitida ainda.</p>
            ) : recentInvoices.map(inv => (
              <button key={inv.id} onClick={() => actions.view(inv)} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{inv.clientName}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(inv.dateCreated)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(inv.total)}</p>
                  <InvoiceStatusBadge status={invoiceStatus(inv)} />
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Lateral: setup / recorrentes / IA */}
        <div className="space-y-4 sm:space-y-6">
          {setupPending > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Primeiros passos</p>
                <span className="text-xs text-zinc-500 tabular-nums">{setup.length - setupPending}/{setup.length}</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3 overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${((setup.length - setupPending) / setup.length) * 100}%` }} />
              </div>
              <div className="space-y-1">
                {setup.map(s => (
                  <button key={s.label} onClick={s.action} disabled={s.done}
                    className="w-full flex items-center gap-2.5 py-1.5 text-left text-sm disabled:cursor-default group">
                    {s.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />}
                    <span className={cn(s.done ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-200 group-hover:text-brand')}>{s.label}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5 bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-zinc-950 border-zinc-800 text-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Sparkles className="w-4 h-4 text-orange-300" /></div>
              <p className="text-sm font-semibold">Pergunte à IA</p>
            </div>
            <form onSubmit={e => { e.preventDefault(); navigate('assistant', question.trim() || undefined); }} className="relative">
              <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Quanto recebi este mês?"
                className="w-full h-10 pl-3 pr-10 rounded-xl bg-white/10 border border-white/10 text-sm placeholder:text-white/40 outline-none focus:border-orange-300/60" />
              <button type="submit" className="absolute right-1.5 top-1.5 w-7 h-7 rounded-lg bg-brand flex items-center justify-center" aria-label="Perguntar">
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </Card>

          {upcomingRecurring.length > 0 && (
            <Card>
              <CardHeader title="Próximas recorrentes" icon={Repeat} action={<a href={routeHref('recurring')} className="text-xs font-semibold text-brand hover:underline">Ver</a>} />
              <div className="px-5 pb-4 space-y-2.5">
                {upcomingRecurring.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{r.clientName}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1"><CalendarClock className="w-3 h-3" />{formatDate(r.nextDate)}</p>
                    </div>
                    <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(r.total)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ChargeRow({ inv }: { inv: Invoice }) {
  const actions = useActions();
  const status = invoiceStatus(inv);
  const late = daysOverdue(inv);
  const until = daysUntilDue(inv);
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
      <button onClick={() => actions.view(inv)} className="min-w-0 flex-1 text-left">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{inv.clientName}</p>
        <p className="text-xs">
          {status === 'overdue'
            ? <Badge tone="danger">{late} dia{late > 1 ? 's' : ''} de atraso</Badge>
            : <span className="text-zinc-500 dark:text-zinc-400">{until === 0 ? 'Vence hoje' : `Vence em ${until} dia${until > 1 ? 's' : ''}`}</span>}
        </p>
      </button>
      <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(inv.total)}</p>
      <div className="flex">
        <IconButton icon={MessageCircle} label="Cobrar no WhatsApp" tone="success" size="sm" onClick={() => actions.charge(inv)} />
        <IconButton icon={CheckCircle2} label="Marcar como pago" tone="brand" size="sm" onClick={() => actions.markPaid(inv)} />
      </div>
    </div>
  );
}
