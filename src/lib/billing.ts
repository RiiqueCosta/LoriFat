/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppConfig, AppRecord, Invoice, LineItem, Quote, Recurring } from '../types';
import { addDays, addMonths, dateKey, diffDays, formatCurrency, formatDate, todayISO } from './utils';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Retorna os itens do registro, convertendo registros antigos (1 item) para lista. */
export function getItems(rec: Partial<Invoice | Quote | Recurring>): LineItem[] {
  if (rec.items && rec.items.length > 0) return rec.items;
  const r = rec as Partial<Invoice>;
  if (r.description || r.unitPrice) {
    return [{
      description: r.description || '',
      quantity: Number(r.quantity) || 1,
      unitPrice: Number(r.unitPrice) || 0,
    }];
  }
  return [];
}

export function calcTotals(items: LineItem[], taxPercent = 0, discount = 0) {
  const subtotal = round2(items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0));
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const base = subtotal - safeDiscount;
  const tax = round2(base * (Number(taxPercent) || 0) / 100);
  const total = round2(base + tax);
  return { subtotal, discount: safeDiscount, tax, total };
}

export function cleanItems(items: LineItem[]): LineItem[] {
  return items
    .map(i => ({
      description: (i.description || '').trim(),
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
    }))
    .filter(i => i.description || i.unitPrice);
}

/**
 * Monta os campos de valores de um orçamento/fatura a partir dos itens.
 * Mantém description/quantity/unitPrice preenchidos para compatibilidade.
 */
export function buildPricingFields(items: LineItem[], taxPercent = 0, discount = 0) {
  const clean = cleanItems(items);
  const totals = calcTotals(clean, taxPercent, discount);
  const summary = clean.length === 1
    ? clean[0].description
    : clean.map(i => i.description).filter(Boolean).join('; ');
  return {
    items: clean,
    description: summary.slice(0, 500),
    quantity: clean.length === 1 ? clean[0].quantity : 1,
    unitPrice: clean.length === 1 ? clean[0].unitPrice : totals.subtotal,
    taxPercent: Number(taxPercent) || 0,
    discount: totals.discount,
    total: totals.total,
  };
}

// ---------------------------------------------------------------------------
// Numeração sequencial: FAT-2026-0001 / ORC-2026-0001
// ---------------------------------------------------------------------------

export const NUMBER_PREFIX = { invoice: 'FAT', quote: 'ORC' } as const;

export function nextNumber(records: AppRecord[], type: 'invoice' | 'quote', date = todayISO(), extraTaken: string[] = []): string {
  const prefix = NUMBER_PREFIX[type];
  const year = (dateKey(date) || todayISO()).slice(0, 4);
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  const check = (n?: string) => {
    const m = n ? re.exec(n) : null;
    if (m) max = Math.max(max, Number(m[1]));
  };
  records.forEach(r => { if (r.type === type) check((r as Invoice | Quote).number); });
  extraTaken.forEach(check);
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`;
}

/** Número para exibição (registros antigos usam parte do ID). */
export function displayNumber(rec: Invoice | Quote): string {
  return rec.number || `#${rec.id.slice(0, 6).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type InvoiceStatus = 'pending' | 'paid' | 'overdue';

export function invoiceStatus(inv: Invoice, today = todayISO()): InvoiceStatus {
  if (inv.status === 'paid') return 'paid';
  const due = dateKey(inv.dueDate);
  if (due && due < today) return 'overdue';
  return 'pending';
}

export function daysOverdue(inv: Invoice, today = todayISO()): number {
  const due = dateKey(inv.dueDate);
  return due ? Math.max(0, diffDays(due, today)) : 0;
}

export function daysUntilDue(inv: Invoice, today = todayISO()): number {
  const due = dateKey(inv.dueDate);
  return due ? diffDays(today, due) : 0;
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencida',
};

export const QUOTE_STATUS_LABEL: Record<Quote['status'], string> = {
  pending: 'Aguardando',
  approved: 'Aprovado',
  rejected: 'Recusado',
};

export function quoteValidUntil(q: Quote, config: AppConfig): string {
  return q.validUntil || addDays(dateKey(q.dateCreated) || todayISO(), config.quoteValidityDays || 30);
}

/** Data em que a receita conta (pagamento > vencimento > emissão). */
export function revenueDate(inv: Invoice): string {
  return dateKey(inv.paidAt) || dateKey(inv.dueDate) || dateKey(inv.dateCreated);
}

// ---------------------------------------------------------------------------
// Mensagens de WhatsApp
// ---------------------------------------------------------------------------

export const DEFAULT_CHARGE_MESSAGE =
  'Olá, {cliente}! Tudo bem?\n\nPassando para lembrar da fatura {numero} no valor de {valor}, com vencimento em {vencimento}.\n\n{pix}Qualquer dúvida, estou à disposição.\n{empresa}';

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

export function chargeMessage(inv: Invoice, config: AppConfig, pixCode?: string): string {
  const firstName = (inv.clientName || '').split(' ')[0] || 'tudo bem';
  const status = invoiceStatus(inv);
  let tpl = config.chargeMessage?.trim() || DEFAULT_CHARGE_MESSAGE;
  if (!config.chargeMessage && status === 'overdue') {
    tpl = tpl.replace('com vencimento em {vencimento}', 'que venceu em {vencimento}');
  }
  const pixText = pixCode
    ? `Para facilitar, segue o PIX copia e cola:\n${pixCode}\n\n`
    : config.pixKey ? `Chave PIX: ${config.pixKey}\n\n` : '';
  return fillTemplate(tpl, {
    cliente: firstName,
    numero: displayNumber(inv),
    valor: formatCurrency(inv.total),
    vencimento: formatDate(inv.dueDate),
    empresa: config.companyName,
    pix: pixText,
  }).replace(/\n{3,}/g, '\n\n');
}

export function documentMessage(rec: Invoice | Quote, config: AppConfig, pixCode?: string): string {
  const isInvoice = rec.type === 'invoice';
  const items = getItems(rec)
    .map(i => `• ${i.description}${i.quantity !== 1 ? ` (${i.quantity} x ${formatCurrency(i.unitPrice)})` : ''} — ${formatCurrency(i.quantity * i.unitPrice)}`)
    .join('\n');
  const lines = [
    `*${config.companyName}*`,
    `${isInvoice ? 'Fatura' : 'Orçamento'} ${displayNumber(rec)}`,
    '',
    `Cliente: ${rec.clientName}`,
    '',
    items,
    '',
    `*Total: ${formatCurrency(rec.total)}*`,
  ];
  if (isInvoice) {
    lines.push(`Vencimento: ${formatDate((rec as Invoice).dueDate)}`);
    if (pixCode) lines.push('', 'PIX copia e cola:', pixCode);
    else if (config.pixKey) lines.push('', `Chave PIX: ${config.pixKey}`);
  } else {
    lines.push(`Válido até: ${formatDate(quoteValidUntil(rec as Quote, config))}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Recorrência
// ---------------------------------------------------------------------------

/** Próxima emissão depois de `from`, no dia `dayOfMonth`. */
export function nextRecurringDate(from: string, dayOfMonth: number): string {
  return addMonths(from, 1, dayOfMonth);
}

/** Primeira emissão a partir de hoje para um dia do mês. */
export function firstRecurringDate(dayOfMonth: number, today = todayISO()): string {
  const [y, m] = today.split('-').map(Number);
  const candidate = addMonths(`${y}-${String(m).padStart(2, '0')}-01`, 0, dayOfMonth);
  return candidate >= today ? candidate : addMonths(candidate, 1, dayOfMonth);
}

/**
 * Calcula as faturas que um contrato recorrente deve gerar até hoje.
 * Retorna as datas de emissão pendentes (no máximo `limit`) e a próxima data.
 */
export function pendingRecurringDates(rec: Recurring, today = todayISO(), limit = 12) {
  const dates: string[] = [];
  let next = dateKey(rec.nextDate);
  while (next && next <= today && dates.length < limit) {
    dates.push(next);
    next = nextRecurringDate(next, rec.dayOfMonth);
  }
  return { dates, nextDate: next };
}

/** ID determinístico para a fatura de um contrato num mês (evita duplicar). */
export const recurringInvoiceId = (recurringId: string, issueDate: string) =>
  `rec_${recurringId}_${issueDate.slice(0, 7).replace('-', '')}`.slice(0, 120);
