/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowRightLeft, Ban, CalendarCheck2, CalendarClock, CheckCircle2, Copy, Download, FilePlus2, MessageCircle,
  Pencil, Repeat, RotateCcw, Send, Trash2, User,
} from 'lucide-react';
import { AppConfig, Client, Invoice, Quote } from '../types';
import { calcTotals, daysOverdue, daysUntilDue, displayNumber, getItems, invoiceStatus, quoteValidUntil } from '../lib/billing';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { navigate } from '../lib/router';
import { Badge, Button, DropdownMenu, InvoiceStatusBadge, QuoteStatusBadge } from './ui';
import type { DocActions } from '../actions';

export function DocumentDetail({ record, config, client, actions, onClose }: {
  record: Invoice | Quote; config: AppConfig; client?: Client; actions: DocActions; onClose: () => void;
}) {
  const isInvoice = record.type === 'invoice';
  const inv = record as Invoice;
  const quote = record as Quote;
  const status = isInvoice ? invoiceStatus(inv) : null;
  const items = getItems(record);
  const totals = calcTotals(items, record.taxPercent, record.discount);
  const run = (fn: () => void) => () => { onClose(); fn(); };

  const timeline: { icon: typeof CalendarClock; label: string; date: string; tone?: string }[] = [
    { icon: FilePlus2, label: 'Emitido', date: formatDate(record.dateCreated) },
  ];
  if (isInvoice) {
    timeline.push({
      icon: CalendarClock,
      label: status === 'overdue' ? `Venceu (${daysOverdue(inv)} dia${daysOverdue(inv) > 1 ? 's' : ''} atrás)` : status === 'pending' ? `Vence ${daysUntilDue(inv) === 0 ? 'hoje' : `em ${daysUntilDue(inv)} dia${daysUntilDue(inv) > 1 ? 's' : ''}`}` : 'Vencimento',
      date: formatDate(inv.dueDate),
      tone: status === 'overdue' ? 'text-red-500' : undefined,
    });
    if (inv.status === 'paid') timeline.push({ icon: CalendarCheck2, label: 'Pago', date: formatDate(inv.paidAt || inv.dueDate), tone: 'text-emerald-500' });
  } else {
    timeline.push({ icon: CalendarClock, label: 'Válido até', date: formatDate(quoteValidUntil(quote, config)) });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {isInvoice ? <InvoiceStatusBadge status={status!} /> : <QuoteStatusBadge status={quote.status} />}
            {inv.recurringId && <Badge tone="violet"><Repeat className="w-3 h-3" /> Recorrente</Badge>}
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">{formatCurrency(record.total)}</p>
        </div>
        <DropdownMenu items={[
          { label: 'Editar', icon: Pencil, onClick: run(() => actions.edit(record)) },
          { label: 'Duplicar', icon: Copy, onClick: run(() => actions.duplicate(record)) },
          { label: 'Converter em fatura', icon: ArrowRightLeft, onClick: run(() => actions.convertToInvoice(quote)), hidden: isInvoice },
          { label: 'Marcar como aprovado', icon: CheckCircle2, onClick: run(() => actions.setQuoteStatus(quote, 'approved')), hidden: isInvoice || quote.status === 'approved' },
          { label: 'Marcar como recusado', icon: Ban, onClick: run(() => actions.setQuoteStatus(quote, 'rejected')), hidden: isInvoice || quote.status === 'rejected' },
          { label: 'Voltar para pendente', icon: RotateCcw, onClick: run(() => isInvoice ? actions.markPending(inv) : actions.setQuoteStatus(quote, 'pending')), hidden: isInvoice ? inv.status !== 'paid' : quote.status === 'pending' },
          { label: 'Excluir', icon: Trash2, onClick: run(() => actions.remove(record)), danger: true, divider: true },
        ]} />
      </div>

      <button
        onClick={run(() => client && navigate('client', client.id))}
        disabled={!client}
        className="w-full flex items-center gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-left enabled:hover:bg-zinc-50 dark:enabled:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"><User className="w-4 h-4 text-zinc-500" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{record.clientName}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{[client?.company, client?.phone || client?.email].filter(Boolean).join(' · ') || 'Ver ficha do cliente'}</p>
        </div>
      </button>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {timeline.map((t, i) => (
          <div key={i} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <t.icon className={cn('w-4 h-4 mb-1.5 text-zinc-400', t.tone)} />
            <p className={cn('text-[11px] text-zinc-500 dark:text-zinc-400', t.tone)}>{t.label}</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.date}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((it, i) => (
            <div key={i} className="px-4 py-3 flex justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{it.description}</p>
                <p className="text-xs text-zinc-400 tabular-nums">{it.quantity} × {formatCurrency(it.unitPrice)}</p>
              </div>
              <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatCurrency(it.quantity * it.unitPrice)}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/40 space-y-1 text-sm">
          {(totals.discount > 0 || totals.tax > 0) && (
            <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span className="tabular-nums">{formatCurrency(totals.subtotal)}</span></div>
          )}
          {totals.discount > 0 && <div className="flex justify-between text-zinc-500"><span>Desconto</span><span className="tabular-nums">- {formatCurrency(totals.discount)}</span></div>}
          {totals.tax > 0 && <div className="flex justify-between text-zinc-500"><span>Impostos ({record.taxPercent}%)</span><span className="tabular-nums">{formatCurrency(totals.tax)}</span></div>}
          <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100"><span>Total</span><span className="tabular-nums">{formatCurrency(record.total)}</span></div>
        </div>
      </div>

      {record.notes && (
        <div className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
          <p className="text-[11px] font-semibold text-zinc-400 mb-1">Observações</p>
          {record.notes}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        {isInvoice && inv.status !== 'paid' && (
          <>
            <Button icon={CheckCircle2} className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20" onClick={run(() => actions.markPaid(inv))}>Marcar como pago</Button>
            <Button variant="dark" icon={MessageCircle} onClick={run(() => actions.charge(inv))}>Cobrar</Button>
          </>
        )}
        {!isInvoice && quote.status !== 'rejected' && (
          <Button icon={ArrowRightLeft} className="col-span-2" onClick={run(() => actions.convertToInvoice(quote))}>Converter em fatura</Button>
        )}
        <Button variant="outline" icon={Download} onClick={() => actions.downloadPdf(record)}>Baixar PDF</Button>
        <Button variant="outline" icon={Send} onClick={run(() => actions.send(record))}>Enviar</Button>
        <Button variant="secondary" icon={Pencil} className="col-span-2" onClick={run(() => actions.edit(record))}>Editar {isInvoice ? 'fatura' : 'orçamento'}</Button>
      </div>
      <p className="text-center text-[11px] text-zinc-400 font-mono">{displayNumber(record)}</p>
    </div>
  );
}
