/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft, Ban, CheckCircle2, Copy, Download, Eye, FileCheck2, FileDown, FileText, LayoutGrid, List,
  MessageCircle, Pencil, Plus, Repeat, RotateCcw, Send, Sparkles, Trash2,
} from 'lucide-react';
import { AppConfig, AppRecord, Invoice, Quote } from '../types';
import { daysOverdue, displayNumber, getItems, invoiceStatus, InvoiceStatus, quoteValidUntil } from '../lib/billing';
import { cn, dateKey, formatCurrency, formatDate, monthKey, normalizeText, todayISO, addDays, lastMonths } from '../lib/utils';
import { exportInvoices, exportQuotes } from '../lib/export';
import { useLocalState } from '../lib/hooks';
import { useActions } from '../actions';
import {
  Badge, Button, Card, DropdownMenu, EmptyState, IconButton, InvoiceStatusBadge, MenuItem, PageHeader,
  QuoteStatusBadge, SearchInput, Segmented, Select,
} from '../components/ui';

type Kind = 'invoice' | 'quote';
type Period = 'all' | 'month' | 'last-month' | '90d' | 'year';
type Sort = 'recent' | 'oldest' | 'due' | 'value' | 'client';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'Todo o período' },
  { value: 'month', label: 'Este mês' },
  { value: 'last-month', label: 'Mês passado' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'year', label: 'Este ano' },
];

function inPeriod(date: string, p: Period): boolean {
  if (p === 'all') return true;
  const d = dateKey(date);
  const today = todayISO();
  if (p === 'month') return monthKey(d) === today.slice(0, 7);
  if (p === 'last-month') return monthKey(d) === lastMonths(2)[0];
  if (p === '90d') return d >= addDays(today, -90);
  return d.slice(0, 4) === today.slice(0, 4);
}

export function DocumentsView({ kind, records, config, preset }: { kind: Kind; records: AppRecord[]; config: AppConfig; preset?: string }) {
  const actions = useActions();
  const isInvoice = kind === 'invoice';
  const all = useMemo(() => records.filter((r): r is Invoice | Quote => r.type === kind), [records, kind]);

  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [sort, setSort] = useState<Sort>(isInvoice ? 'due' : 'recent');
  const [layout, setLayout] = useLocalState<'list' | 'cards'>('lorifat-docs-layout', 'list');

  useEffect(() => {
    const map: Record<string, string> = { vencidas: 'overdue', abertas: 'open', pagas: 'paid', aguardando: 'pending' };
    setStatus(preset && map[preset] ? map[preset] : 'all');
    setSearch('');
  }, [preset, kind]);

  const statusOf = (r: Invoice | Quote): string => (r.type === 'invoice' ? invoiceStatus(r) : r.status);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length, open: 0, overdue: 0, pending: 0, paid: 0, approved: 0, rejected: 0 };
    all.forEach(r => {
      const s = statusOf(r);
      c[s] = (c[s] || 0) + 1;
      if (r.type === 'invoice' && r.status !== 'paid') c.open++;
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  const filtered = useMemo(() => {
    const q = normalizeText(search);
    let list = all.filter(r => {
      const s = statusOf(r);
      if (status === 'open' && !(r.type === 'invoice' && r.status !== 'paid')) return false;
      if (status !== 'all' && status !== 'open' && s !== status) return false;
      if (!inPeriod(r.dateCreated, period)) return false;
      if (!q) return true;
      return normalizeText(`${r.clientName} ${displayNumber(r)} ${getItems(r).map(i => i.description).join(' ')}`).includes(q);
    });
    const due = (r: Invoice | Quote) => r.type === 'invoice' ? dateKey(r.dueDate) : dateKey(quoteValidUntil(r, config));
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'oldest': return dateKey(a.dateCreated).localeCompare(dateKey(b.dateCreated));
        case 'value': return b.total - a.total;
        case 'client': return a.clientName.localeCompare(b.clientName, 'pt-BR');
        case 'due': {
          // Em aberto primeiro, por vencimento; pagas por último.
          const pa = a.type === 'invoice' && a.status === 'paid' ? 1 : 0;
          const pb = b.type === 'invoice' && b.status === 'paid' ? 1 : 0;
          return pa - pb || (pa ? due(b).localeCompare(due(a)) : due(a).localeCompare(due(b)));
        }
        default: return (dateKey(b.dateCreated) + (b.number || '')).localeCompare(dateKey(a.dateCreated) + (a.number || ''));
      }
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, status, search, period, sort, config]);

  const filteredTotal = filtered.reduce((s, r) => s + r.total, 0);

  const statusOptions = isInvoice
    ? [
      { value: 'all', label: 'Todas', count: counts.all },
      { value: 'open', label: 'Em aberto', count: counts.open },
      { value: 'overdue', label: 'Vencidas', count: counts.overdue },
      { value: 'paid', label: 'Pagas', count: counts.paid },
    ]
    : [
      { value: 'all', label: 'Todos', count: counts.all },
      { value: 'pending', label: 'Aguardando', count: counts.pending },
      { value: 'approved', label: 'Aprovados', count: counts.approved },
      { value: 'rejected', label: 'Recusados', count: counts.rejected },
    ];

  const doExport = () => {
    const name = `${isInvoice ? 'faturas' : 'orcamentos'}-${todayISO()}.csv`;
    if (isInvoice) exportInvoices(filtered as Invoice[], name);
    else exportQuotes(filtered as Quote[], name);
  };

  const title = isInvoice ? 'Faturas' : 'Orçamentos';
  const Icon = isInvoice ? FileText : FileCheck2;

  return (
    <div className="space-y-5 fade-in">
      <PageHeader
        title={title}
        description={isInvoice ? 'Emita, envie e acompanhe o recebimento das suas faturas.' : 'Crie propostas, acompanhe a aprovação e converta em faturas.'}
        actions={<>
          <Button variant="outline" icon={FileDown} onClick={doExport} disabled={!filtered.length} className="hidden sm:inline-flex">Exportar</Button>
          <Button variant="outline" icon={Sparkles} onClick={actions.importProposal}>Importar com IA</Button>
          <Button icon={Plus} onClick={() => actions.create(kind)}>{isInvoice ? 'Nova fatura' : 'Novo orçamento'}</Button>
        </>}
      />

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <Segmented options={statusOptions} value={status} onChange={setStatus} />
        <div className="flex gap-2 flex-1 lg:justify-end">
          <SearchInput value={search} onChange={setSearch} placeholder="Cliente, número ou serviço" className="flex-1 lg:max-w-xs" />
          <Select value={period} onChange={e => setPeriod(e.target.value as Period)} className="w-auto hidden sm:block">
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
          <Select value={sort} onChange={e => setSort(e.target.value as Sort)} className="w-auto hidden md:block">
            <option value="due">{isInvoice ? 'Vencimento' : 'Validade'}</option>
            <option value="recent">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
            <option value="value">Maior valor</option>
            <option value="client">Cliente (A–Z)</option>
          </Select>
          <div className="hidden lg:flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
            {([['list', List], ['cards', LayoutGrid]] as const).map(([v, I]) => (
              <button key={v} onClick={() => setLayout(v)} aria-label={v === 'list' ? 'Lista' : 'Cartões'}
                className={cn('w-8 h-8 rounded-lg flex items-center justify-center', layout === v ? 'bg-white dark:bg-zinc-950 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-400')}>
                <I className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sm:hidden">
        <Select value={period} onChange={e => setPeriod(e.target.value as Period)}>
          {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Icon}
            title={all.length === 0 ? (isInvoice ? 'Nenhuma fatura ainda' : 'Nenhum orçamento ainda') : 'Nada encontrado'}
            description={all.length === 0 ? 'Crie a primeira ou importe uma proposta pronta com a IA.' : 'Tente outro filtro ou termo de busca.'}
            action={all.length === 0 ? <Button icon={Plus} onClick={() => actions.create(kind)}>{isInvoice ? 'Criar fatura' : 'Criar orçamento'}</Button> : undefined}
          />
        </Card>
      ) : layout === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(r => <DocCard key={r.id} rec={r} config={config} />)}
        </div>
      ) : (
        <Card className="overflow-hidden">
          {/* Tabela (desktop) */}
          <table className="hidden md:table w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-5 py-3">Número</th>
                <th className="px-3 py-3">Cliente</th>
                <th className="px-3 py-3">Emissão</th>
                <th className="px-3 py-3">{isInvoice ? 'Vencimento' : 'Validade'}</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Valor</th>
                <th className="px-3 py-3 w-[120px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map(r => <DocRow key={r.id} rec={r} config={config} />)}
            </tbody>
          </table>
          {/* Lista (celular) */}
          <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map(r => <DocListItem key={r.id} rec={r} config={config} />)}
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}</span>
            <span>Total: <b className="text-zinc-900 dark:text-zinc-100 tabular-nums">{formatCurrency(filteredTotal)}</b></span>
          </div>
        </Card>
      )}
    </div>
  );
}

// --- Itens -------------------------------------------------------------------------

function useMenu(rec: Invoice | Quote): MenuItem[] {
  const a = useActions();
  const isInvoice = rec.type === 'invoice';
  const inv = rec as Invoice;
  const q = rec as Quote;
  return [
    { label: 'Ver detalhes', icon: Eye, onClick: () => a.view(rec) },
    { label: 'Editar', icon: Pencil, onClick: () => a.edit(rec) },
    { label: 'Baixar PDF', icon: Download, onClick: () => a.downloadPdf(rec) },
    { label: 'Enviar ao cliente', icon: Send, onClick: () => a.send(rec) },
    { label: 'Cobrar no WhatsApp', icon: MessageCircle, onClick: () => a.charge(inv), hidden: !isInvoice || inv.status === 'paid' },
    { label: 'Marcar como pago', icon: CheckCircle2, onClick: () => a.markPaid(inv), hidden: !isInvoice || inv.status === 'paid', divider: true },
    { label: 'Voltar para pendente', icon: RotateCcw, onClick: () => a.markPending(inv), hidden: !isInvoice || inv.status !== 'paid', divider: true },
    { label: 'Converter em fatura', icon: ArrowRightLeft, onClick: () => a.convertToInvoice(q), hidden: isInvoice, divider: true },
    { label: 'Marcar como aprovado', icon: CheckCircle2, onClick: () => a.setQuoteStatus(q, 'approved'), hidden: isInvoice || q.status === 'approved' },
    { label: 'Marcar como recusado', icon: Ban, onClick: () => a.setQuoteStatus(q, 'rejected'), hidden: isInvoice || q.status === 'rejected' },
    { label: 'Duplicar', icon: Copy, onClick: () => a.duplicate(rec), divider: true },
    { label: 'Excluir', icon: Trash2, onClick: () => a.remove(rec), danger: true },
  ];
}

function StatusCell({ rec }: { rec: Invoice | Quote }) {
  return rec.type === 'invoice' ? <InvoiceStatusBadge status={invoiceStatus(rec)} /> : <QuoteStatusBadge status={rec.status} />;
}

function DueCell({ rec, config }: { rec: Invoice | Quote; config: AppConfig }) {
  if (rec.type === 'quote') return <span>{formatDate(quoteValidUntil(rec, config))}</span>;
  const s: InvoiceStatus = invoiceStatus(rec);
  if (s === 'paid') return <span className="text-zinc-400">{rec.paidAt ? `Pago ${formatDate(rec.paidAt)}` : formatDate(rec.dueDate)}</span>;
  const late = daysOverdue(rec);
  return (
    <span className={cn(s === 'overdue' && 'text-red-600 dark:text-red-400 font-medium')}>
      {formatDate(rec.dueDate)}{late > 0 && <span className="text-[11px] ml-1">({late}d)</span>}
    </span>
  );
}

function QuickActions({ rec }: { rec: Invoice | Quote }) {
  const a = useActions();
  if (rec.type === 'invoice' && rec.status !== 'paid') {
    return (
      <>
        <IconButton icon={MessageCircle} label="Cobrar no WhatsApp" tone="success" size="sm" onClick={e => { e.stopPropagation(); a.charge(rec); }} />
        <IconButton icon={CheckCircle2} label="Marcar como pago" tone="brand" size="sm" onClick={e => { e.stopPropagation(); a.markPaid(rec); }} />
      </>
    );
  }
  if (rec.type === 'quote' && rec.status !== 'rejected') {
    return <IconButton icon={ArrowRightLeft} label="Converter em fatura" tone="brand" size="sm" onClick={e => { e.stopPropagation(); a.convertToInvoice(rec); }} />;
  }
  return <IconButton icon={Download} label="Baixar PDF" size="sm" onClick={e => { e.stopPropagation(); a.downloadPdf(rec); }} />;
}

function DocRow({ rec, config }: { rec: Invoice | Quote; config: AppConfig }) {
  const a = useActions();
  const menu = useMenu(rec);
  const items = getItems(rec);
  return (
    <tr onClick={() => a.view(rec)} className="group cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
      <td className="px-5 py-3.5 font-mono text-[12.5px] text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
        {displayNumber(rec)}
        {rec.type === 'invoice' && rec.recurringId && <Repeat className="inline w-3 h-3 ml-1.5 text-violet-500" />}
      </td>
      <td className="px-3 py-3.5 max-w-[280px]">
        <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{rec.clientName}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{items[0]?.description}{items.length > 1 ? ` +${items.length - 1}` : ''}</p>
      </td>
      <td className="px-3 py-3.5 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">{formatDate(rec.dateCreated)}</td>
      <td className="px-3 py-3.5 text-zinc-600 dark:text-zinc-300 whitespace-nowrap"><DueCell rec={rec} config={config} /></td>
      <td className="px-3 py-3.5"><StatusCell rec={rec} /></td>
      <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatCurrency(rec.total)}</td>
      <td className="px-3 py-3.5">
        <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
          <QuickActions rec={rec} />
          <DropdownMenu items={menu} />
        </div>
      </td>
    </tr>
  );
}

function DocListItem({ rec, config }: { rec: Invoice | Quote; config: AppConfig }) {
  const a = useActions();
  const menu = useMenu(rec);
  return (
    <div onClick={() => a.view(rec)} className="flex items-center gap-3 px-4 py-3.5 active:bg-zinc-50 dark:active:bg-zinc-800/40">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{rec.clientName}</p>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="font-mono">{displayNumber(rec)}</span>·<DueCell rec={rec} config={config} />
        </p>
      </div>
      <div className="text-right shrink-0 space-y-1">
        <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(rec.total)}</p>
        <StatusCell rec={rec} />
      </div>
      <DropdownMenu items={menu} />
    </div>
  );
}

function DocCard({ rec, config }: { rec: Invoice | Quote; config: AppConfig }) {
  const a = useActions();
  const menu = useMenu(rec);
  const items = getItems(rec);
  return (
    <Card onClick={() => a.view(rec)} className="p-4 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <StatusCell rec={rec} />
        <DropdownMenu items={menu} />
      </div>
      <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100 truncate">{rec.clientName}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[2rem]">{items.map(i => i.description).join(' · ')}</p>
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-end justify-between">
        <div>
          <p className="text-[11px] text-zinc-400 font-mono">{displayNumber(rec)}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400"><DueCell rec={rec} config={config} /></p>
        </div>
        <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{formatCurrency(rec.total)}</p>
      </div>
      <div className="mt-3 flex gap-1" onClick={e => e.stopPropagation()}>
        <QuickActions rec={rec} />
        {rec.type === 'invoice' && rec.recurringId && <Badge tone="violet" className="ml-auto self-center"><Repeat className="w-3 h-3" />Recorrente</Badge>}
      </div>
    </Card>
  );
}
