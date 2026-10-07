/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Clock, FileCheck2, FileText, MapPin, MessageCircle, Pencil, Repeat, StickyNote, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { AppConfig, AppRecord, Invoice, Quote } from '../types';
import { clientStats, splitRecords } from '../lib/analytics';
import { displayNumber, invoiceStatus } from '../lib/billing';
import { dateKey, formatCurrency, formatDate, openWhatsApp } from '../lib/utils';
import { routeHref } from '../lib/router';
import { useActions } from '../actions';
import {
  Avatar, Badge, Button, Card, CardHeader, DropdownMenu, EmptyState, InvoiceStatusBadge, QuoteStatusBadge, Segmented, StatCard,
} from '../components/ui';
import { ContactChips } from './ClientsView';

export function ClientDetailView({ clientId, records, config }: { clientId?: string; records: AppRecord[]; config: AppConfig }) {
  const actions = useActions();
  const split = useMemo(() => splitRecords(records), [records]);
  const client = split.clients.find(c => c.id === clientId);
  const [tab, setTab] = useState<'all' | 'invoice' | 'quote'>('all');

  if (!client) {
    return (
      <Card>
        <EmptyState icon={FileText} title="Cliente não encontrado" description="Ele pode ter sido excluído."
          action={<a href={routeHref('clients')}><Button variant="outline" icon={ArrowLeft}>Voltar para clientes</Button></a>} />
      </Card>
    );
  }

  const stats = clientStats(client.id, split);
  const docs = [...split.invoices, ...split.quotes]
    .filter(r => r.clientId === client.id && (tab === 'all' || r.type === tab))
    .sort((a, b) => dateKey(b.dateCreated).localeCompare(dateKey(a.dateCreated)));
  const contracts = split.recurring.filter(r => r.clientId === client.id);
  const openInvoices = split.invoices.filter(i => i.clientId === client.id && i.status !== 'paid');

  const chargeAll = () => {
    if (openInvoices.length === 1) return actions.charge(openInvoices[0]);
    const lines = openInvoices
      .sort((a, b) => dateKey(a.dueDate).localeCompare(dateKey(b.dueDate)))
      .map(i => `• ${displayNumber(i)} — ${formatCurrency(i.total)} (venc. ${formatDate(i.dueDate)})`).join('\n');
    const first = client.name.split(' ')[0];
    const msg = `Olá, ${first}! Tudo bem?\n\nSegue o resumo das faturas em aberto:\n${lines}\n\nTotal: ${formatCurrency(stats.open)}${config.pixKey ? `\n\nChave PIX: ${config.pixKey}` : ''}\n\nQualquer dúvida, estou à disposição.\n${config.companyName}`;
    openWhatsApp(msg, client.phone);
  };

  return (
    <div className="space-y-6 fade-in">
      <a href={routeHref('clients')} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        <ArrowLeft className="w-4 h-4" /> Clientes
      </a>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Avatar name={client.name} size="lg" />
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{client.name}</h1>
              {client.company && <p className="text-sm text-zinc-500 dark:text-zinc-400">{client.company}</p>}
              {client.address && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{client.address}</p>}
            </div>
            <ContactChips client={client} />
          </div>
          <div className="flex gap-2 sm:flex-col lg:flex-row">
            <Button icon={FileText} onClick={() => actions.create('invoice', { clientId: client.id })}>Nova fatura</Button>
            <DropdownMenu items={[
              { label: 'Novo orçamento', icon: FileCheck2, onClick: () => actions.create('quote', { clientId: client.id }) },
              { label: 'Cobrança recorrente', icon: Repeat, onClick: () => actions.create('recurring', { clientId: client.id }) },
              { label: 'Editar cliente', icon: Pencil, onClick: () => actions.edit(client), divider: true },
              { label: 'Excluir cliente', icon: Trash2, onClick: () => actions.remove(client), danger: true },
            ]} />
          </div>
        </div>
        {client.notes && (
          <div className="mt-5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap flex gap-2">
            <StickyNote className="w-4 h-4 shrink-0 mt-0.5" />{client.notes}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total faturado" value={formatCurrency(stats.invoiced)} icon={TrendingUp} tone="brand" hint={`${stats.invoiceCount} fatura${stats.invoiceCount !== 1 ? 's' : ''}`} />
        <StatCard label="Recebido" value={formatCurrency(stats.paid)} icon={Wallet} tone="success" />
        <StatCard label="Em aberto" value={formatCurrency(stats.open)} icon={Clock} tone={stats.overdue > 0 ? 'danger' : 'warning'}
          hint={stats.overdue > 0 ? `${formatCurrency(stats.overdue)} vencido` : undefined} />
        <StatCard label="Prazo médio de pagamento" value={stats.avgDaysToPay === null ? '—' : `${stats.avgDaysToPay} dias`} icon={Clock} tone="neutral" hint="Da emissão ao pagamento" />
      </div>

      {openInvoices.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-orange-50 dark:bg-brand/10 border border-orange-100 dark:border-brand/20">
          <p className="flex-1 text-sm text-orange-900 dark:text-orange-200">
            <b>{openInvoices.length} fatura{openInvoices.length > 1 ? 's' : ''} em aberto</b> somando {formatCurrency(stats.open)}.
          </p>
          <Button size="sm" icon={MessageCircle} className="bg-[#25D366] hover:bg-[#1ebe5a] shadow-[#25D366]/30" onClick={chargeAll}>
            {openInvoices.length > 1 ? 'Cobrar tudo no WhatsApp' : 'Cobrar no WhatsApp'}
          </Button>
        </div>
      )}

      {contracts.length > 0 && (
        <Card>
          <CardHeader title="Cobranças recorrentes" icon={Repeat} />
          <div className="px-5 pb-4 space-y-2">
            {contracts.map(r => (
              <button key={r.id} onClick={() => actions.edit(r)} className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-left">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{r.title}</p>
                  <p className="text-xs text-zinc-500">Todo dia {r.dayOfMonth} · próxima {formatDate(r.nextDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(r.total)}<span className="text-xs text-zinc-400">/mês</span></p>
                  {!r.active && <Badge>Pausado</Badge>}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Histórico" action={
          <Segmented size="sm" value={tab} onChange={setTab} options={[
            { value: 'all', label: 'Tudo' }, { value: 'invoice', label: 'Faturas' }, { value: 'quote', label: 'Orçamentos' },
          ]} />
        } />
        {docs.length === 0 ? (
          <EmptyState icon={FileText} title="Nada por aqui ainda" description="Faturas e orçamentos deste cliente aparecem aqui." className="py-10" />
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
            {docs.map(r => (
              <button key={r.id} onClick={() => actions.view(r)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  {r.type === 'invoice' ? <FileText className="w-4 h-4 text-zinc-500" /> : <FileCheck2 className="w-4 h-4 text-zinc-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{r.type === 'invoice' ? 'Fatura' : 'Orçamento'} <span className="font-mono text-xs text-zinc-500">{displayNumber(r)}</span></p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(r.dateCreated)}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(r.total)}</p>
                  {r.type === 'invoice' ? <InvoiceStatusBadge status={invoiceStatus(r as Invoice)} /> : <QuoteStatusBadge status={(r as Quote).status} />}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

