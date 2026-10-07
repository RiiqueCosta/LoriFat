/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppConfig, AppRecord, Client, Expense, Invoice, Quote, Recurring } from '../types';
import { displayNumber, getItems, invoiceStatus, quoteValidUntil, revenueDate } from './billing';
import { dateKey, formatDate, lastMonths, monthKey, monthLabel, todayISO, addDays } from './utils';

export interface Split {
  invoices: Invoice[];
  quotes: Quote[];
  clients: Client[];
  expenses: Expense[];
  recurring: Recurring[];
}

export function splitRecords(records: AppRecord[]): Split {
  const s: Split = { invoices: [], quotes: [], clients: [], expenses: [], recurring: [] };
  records.forEach(r => {
    if (r.type === 'invoice') s.invoices.push(r);
    else if (r.type === 'quote') s.quotes.push(r);
    else if (r.type === 'client') s.clients.push(r);
    else if (r.type === 'expense') s.expenses.push(r);
    else if (r.type === 'recurring') s.recurring.push(r);
  });
  return s;
}

const sum = (xs: { total: number }[]) => xs.reduce((s, x) => s + (Number(x.total) || 0), 0);

export function cashflow(split: Split, months: string[]) {
  const map = new Map(months.map(m => [m, { revenue: 0, expenses: 0, invoiced: 0 }]));
  split.invoices.forEach(i => {
    const inv = map.get(monthKey(i.dateCreated));
    if (inv) inv.invoiced += i.total;
    if (i.status === 'paid') {
      const rev = map.get(monthKey(revenueDate(i)));
      if (rev) rev.revenue += i.total;
    }
  });
  split.expenses.forEach(e => {
    const m = map.get(monthKey(e.dateCreated));
    if (m) m.expenses += e.total;
  });
  return months.map(m => ({ key: m, label: monthLabel(m), ...map.get(m)! }));
}

export function kpis(split: Split, today = todayISO()) {
  const thisMonth = today.slice(0, 7);
  const [lm] = lastMonths(2).slice(0, 1);
  const open = split.invoices.filter(i => i.status !== 'paid');
  const overdue = open.filter(i => invoiceStatus(i, today) === 'overdue');
  const dueSoon = open.filter(i => {
    const d = dateKey(i.dueDate);
    return d >= today && d <= addDays(today, 7);
  });
  const paidThisMonth = split.invoices.filter(i => i.status === 'paid' && monthKey(revenueDate(i)) === thisMonth);
  const paidLastMonth = split.invoices.filter(i => i.status === 'paid' && monthKey(revenueDate(i)) === lm);
  const expensesThisMonth = split.expenses.filter(e => monthKey(e.dateCreated) === thisMonth);
  const pendingQuotes = split.quotes.filter(q => q.status === 'pending');
  const received = sum(paidThisMonth);
  const receivedLast = sum(paidLastMonth);
  const expenses = sum(expensesThisMonth);
  return {
    open, overdue, dueSoon, pendingQuotes,
    openTotal: sum(open),
    overdueTotal: sum(overdue),
    dueSoonTotal: sum(dueSoon),
    receivedMonth: received,
    receivedLastMonth: receivedLast,
    receivedDelta: receivedLast > 0 ? (received - receivedLast) / receivedLast : null,
    expensesMonth: expenses,
    profitMonth: received - expenses,
    pendingQuotesTotal: sum(pendingQuotes),
    mrr: split.recurring.filter(r => r.active).reduce((s, r) => s + r.total, 0),
  };
}

export interface ClientStats {
  invoiced: number;
  paid: number;
  open: number;
  overdue: number;
  invoiceCount: number;
  quoteCount: number;
  lastActivity: string;
  avgDaysToPay: number | null;
}

export function clientStats(clientId: string, split: Split): ClientStats {
  const inv = split.invoices.filter(i => i.clientId === clientId);
  const qs = split.quotes.filter(q => q.clientId === clientId);
  const paid = inv.filter(i => i.status === 'paid');
  const open = inv.filter(i => i.status !== 'paid');
  const delays = paid
    .filter(i => i.paidAt)
    .map(i => (new Date(dateKey(i.paidAt)).getTime() - new Date(dateKey(i.dateCreated)).getTime()) / 86400000);
  const dates = [...inv, ...qs].map(r => dateKey(r.dateCreated)).sort();
  return {
    invoiced: sum(inv),
    paid: sum(paid),
    open: sum(open),
    overdue: sum(open.filter(i => invoiceStatus(i) === 'overdue')),
    invoiceCount: inv.length,
    quoteCount: qs.length,
    lastActivity: dates[dates.length - 1] || '',
    avgDaysToPay: delays.length ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : null,
  };
}

/** Resumo compacto dos dados para o assistente de IA. */
export function assistantContext(records: AppRecord[], config: AppConfig) {
  const split = splitRecords(records);
  const today = todayISO();
  const months = lastMonths(12);
  const k = kpis(split, today);
  const byClient = new Map<string, { faturado: number; recebido: number; emAberto: number }>();
  split.invoices.forEach(i => {
    const c = byClient.get(i.clientName) || { faturado: 0, recebido: 0, emAberto: 0 };
    c.faturado += i.total;
    if (i.status === 'paid') c.recebido += i.total; else c.emAberto += i.total;
    byClient.set(i.clientName, c);
  });
  const expByCat = new Map<string, Record<string, number>>();
  split.expenses.forEach(e => {
    const m = monthKey(e.dateCreated);
    if (!months.includes(m)) return;
    const row = expByCat.get(e.category) || {};
    row[m] = (row[m] || 0) + e.total;
    expByCat.set(e.category, row);
  });
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    hoje: formatDate(today),
    empresa: config.companyName,
    resumo: {
      aReceberTotal: r2(k.openTotal),
      vencidasTotal: r2(k.overdueTotal),
      vencidasQuantidade: k.overdue.length,
      recebidoEsteMes: r2(k.receivedMonth),
      recebidoMesPassado: r2(k.receivedLastMonth),
      despesasEsteMes: r2(k.expensesMonth),
      lucroEsteMes: r2(k.profitMonth),
      orcamentosAguardando: k.pendingQuotes.length,
      orcamentosAguardandoTotal: r2(k.pendingQuotesTotal),
      receitaRecorrenteMensal: r2(k.mrr),
      totalClientes: split.clients.length,
    },
    porMes: cashflow(split, months).map(m => ({ mes: m.key, recebido: r2(m.revenue), faturado: r2(m.invoiced), despesas: r2(m.expenses) })),
    faturasEmAberto: k.open
      .sort((a, b) => dateKey(a.dueDate).localeCompare(dateKey(b.dueDate)))
      .slice(0, 60)
      .map(i => ({ numero: displayNumber(i), cliente: i.clientName, valor: r2(i.total), vencimento: formatDate(i.dueDate), status: invoiceStatus(i, today) === 'overdue' ? 'vencida' : 'pendente' })),
    ultimasFaturasPagas: split.invoices
      .filter(i => i.status === 'paid')
      .sort((a, b) => revenueDate(b).localeCompare(revenueDate(a)))
      .slice(0, 30)
      .map(i => ({ numero: displayNumber(i), cliente: i.clientName, valor: r2(i.total), pagoEm: formatDate(revenueDate(i)) })),
    orcamentos: split.quotes
      .sort((a, b) => dateKey(b.dateCreated).localeCompare(dateKey(a.dateCreated)))
      .slice(0, 30)
      .map(q => ({ numero: displayNumber(q), cliente: q.clientName, valor: r2(q.total), status: q.status, emissao: formatDate(q.dateCreated), validade: formatDate(quoteValidUntil(q, config)), itens: getItems(q).map(i => i.description).join('; ').slice(0, 120) })),
    clientes: Array.from(byClient.entries())
      .sort((a, b) => b[1].faturado - a[1].faturado)
      .slice(0, 40)
      .map(([nome, v]) => ({ nome, faturado: r2(v.faturado), recebido: r2(v.recebido), emAberto: r2(v.emAberto) })),
    despesasPorCategoriaEMes: Object.fromEntries(Array.from(expByCat.entries()).map(([cat, row]) => [cat, Object.fromEntries(Object.entries(row).map(([m, v]) => [m, r2(v)]))])),
    contratosRecorrentes: split.recurring.map(r => ({ contrato: r.title, cliente: r.clientName, valorMensal: r2(r.total), ativo: r.active, proximaEmissao: formatDate(r.nextDate) })),
  };
}
