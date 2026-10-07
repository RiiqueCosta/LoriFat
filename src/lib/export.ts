/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Exportação em CSV (abre direto no Excel / Google Planilhas em português).
 */

import { AppRecord, Client, Expense, Invoice, Quote } from '../types';
import { displayNumber, getItems, invoiceStatus, INVOICE_STATUS_LABEL, QUOTE_STATUS_LABEL, revenueDate } from './billing';
import { dateKey, downloadBlob, formatDate } from './utils';

const SEP = ';';

const cell = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v.toFixed(2).replace('.', ',');
  const s = String(v).replace(/\r?\n/g, ' ');
  return /[";\n]/.test(s) || s.startsWith('=') || s.startsWith('+') || s.startsWith('-') || s.startsWith('@')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

export function toCsv(header: string[], rows: unknown[][]): string {
  return '﻿' + [header, ...rows].map(r => r.map(cell).join(SEP)).join('\r\n');
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  downloadBlob(toCsv(header, rows), filename, 'text/csv;charset=utf-8');
}

export interface PeriodFilter { from: string; to: string }

const inPeriod = (d: string, p: PeriodFilter) => !!d && d >= p.from && d <= p.to;

/**
 * Livro-caixa do período: receitas recebidas (pela data de pagamento)
 * e despesas (pela data de lançamento).
 */
export function exportCashbook(records: AppRecord[], period: PeriodFilter, filename: string) {
  const clients = new Map(records.filter((r): r is Client => r.type === 'client').map(c => [c.id, c]));
  const rows: unknown[][] = [];
  records.forEach(r => {
    if (r.type === 'invoice' && r.status === 'paid') {
      const d = revenueDate(r);
      if (!inPeriod(d, period)) return;
      const c = clients.get(r.clientId);
      rows.push([formatDate(d), 'Receita', displayNumber(r), r.clientName, c?.document || '', getItems(r).map(i => i.description).join(' | '), '', r.total]);
    }
    if (r.type === 'expense') {
      const d = dateKey(r.dateCreated);
      if (!inPeriod(d, period)) return;
      rows.push([formatDate(d), 'Despesa', '', '', '', r.description, r.category, -Math.abs(r.total)]);
    }
  });
  rows.sort((a, b) => String(a[0]).split('/').reverse().join('').localeCompare(String(b[0]).split('/').reverse().join('')));
  downloadCsv(filename, ['Data', 'Tipo', 'Documento', 'Cliente', 'CPF/CNPJ', 'Descrição', 'Categoria', 'Valor (R$)'], rows);
  return rows.length;
}

export function exportInvoices(invoices: Invoice[], filename: string) {
  const rows = invoices.map(i => [
    displayNumber(i), formatDate(i.dateCreated), formatDate(i.dueDate), i.clientName,
    getItems(i).map(x => x.description).join(' | '), i.total,
    INVOICE_STATUS_LABEL[invoiceStatus(i)], i.paidAt ? formatDate(i.paidAt) : '',
  ]);
  downloadCsv(filename, ['Número', 'Emissão', 'Vencimento', 'Cliente', 'Itens', 'Total (R$)', 'Status', 'Pago em'], rows);
}

export function exportQuotes(quotes: Quote[], filename: string) {
  const rows = quotes.map(q => [
    displayNumber(q), formatDate(q.dateCreated), q.clientName,
    getItems(q).map(x => x.description).join(' | '), q.total, QUOTE_STATUS_LABEL[q.status],
  ]);
  downloadCsv(filename, ['Número', 'Emissão', 'Cliente', 'Itens', 'Total (R$)', 'Status'], rows);
}

export function exportExpenses(expenses: Expense[], filename: string) {
  const rows = expenses.map(e => [formatDate(e.dateCreated), e.description, e.category, e.total]);
  downloadCsv(filename, ['Data', 'Descrição', 'Categoria', 'Valor (R$)'], rows);
}

export function exportClients(clients: Client[], filename: string) {
  const rows = clients.map(c => [c.name, c.company, c.document || '', c.email, c.phone, c.address || '']);
  downloadCsv(filename, ['Nome', 'Empresa', 'CPF/CNPJ', 'E-mail', 'Telefone', 'Endereço'], rows);
}

/** Backup completo em JSON. */
export function exportBackup(records: AppRecord[], config: unknown) {
  const data = JSON.stringify({ exportedAt: new Date().toISOString(), config, records }, null, 2);
  downloadBlob(data, `lorifat-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
}
