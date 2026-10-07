/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { FileDown, FileText, Mail, MessageCircle, Pencil, Phone, Plus, Trash2, Users } from 'lucide-react';
import { AppRecord, Client } from '../types';
import { clientStats, splitRecords } from '../lib/analytics';
import { cn, formatCurrency, formatDate, normalizeText, openWhatsApp, todayISO } from '../lib/utils';
import { exportClients } from '../lib/export';
import { navigate } from '../lib/router';
import { useActions } from '../actions';
import { Avatar, Badge, Button, Card, DropdownMenu, EmptyState, PageHeader, SearchInput, Segmented } from '../components/ui';

type Sort = 'name' | 'invoiced' | 'open' | 'recent';

export function ClientsView({ records }: { records: AppRecord[] }) {
  const actions = useActions();
  const split = useMemo(() => splitRecords(records), [records]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('name');

  const rows = useMemo(() => {
    const q = normalizeText(search);
    return split.clients
      .filter(c => !q || normalizeText(`${c.name} ${c.company} ${c.email} ${c.phone} ${c.document || ''}`).includes(q))
      .map(c => ({ client: c, stats: clientStats(c.id, split) }))
      .sort((a, b) => {
        if (sort === 'invoiced') return b.stats.invoiced - a.stats.invoiced;
        if (sort === 'open') return b.stats.open - a.stats.open;
        if (sort === 'recent') return b.stats.lastActivity.localeCompare(a.stats.lastActivity);
        return a.client.name.localeCompare(b.client.name, 'pt-BR');
      });
  }, [split, search, sort]);

  return (
    <div className="space-y-5 fade-in">
      <PageHeader
        title="Clientes"
        description={`${split.clients.length} cliente${split.clients.length !== 1 ? 's' : ''} cadastrado${split.clients.length !== 1 ? 's' : ''}`}
        actions={<>
          <Button variant="outline" icon={FileDown} disabled={!split.clients.length} onClick={() => exportClients(split.clients, `clientes-${todayISO()}.csv`)} className="hidden sm:inline-flex">Exportar</Button>
          <Button icon={Plus} onClick={() => actions.create('client')}>Novo cliente</Button>
        </>}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Nome, empresa, telefone ou CPF/CNPJ" className="flex-1 sm:max-w-md" />
        <Segmented size="sm" value={sort} onChange={setSort} options={[
          { value: 'name', label: 'A–Z' },
          { value: 'invoiced', label: 'Maior faturamento' },
          { value: 'open', label: 'Em aberto' },
          { value: 'recent', label: 'Recentes' },
        ]} className="self-start sm:self-auto" />
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title={split.clients.length ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            description={split.clients.length ? 'Tente outro termo de busca.' : 'Cadastre seus clientes para emitir faturas e acompanhar o histórico.'}
            action={!split.clients.length ? <Button icon={Plus} onClick={() => actions.create('client')}>Cadastrar cliente</Button> : undefined} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map(({ client: c, stats }) => (
            <Card key={c.id} onClick={() => navigate('client', c.id)} className="p-4 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{c.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{c.company || c.email || c.phone || 'Sem dados de contato'}</p>
                </div>
                <DropdownMenu items={[
                  { label: 'Nova fatura', icon: FileText, onClick: () => actions.create('invoice', { clientId: c.id }) },
                  { label: 'WhatsApp', icon: MessageCircle, onClick: () => openWhatsApp('', c.phone), hidden: !c.phone },
                  { label: 'Editar', icon: Pencil, onClick: () => actions.edit(c) },
                  { label: 'Excluir', icon: Trash2, onClick: () => actions.remove(c), danger: true, divider: true },
                ]} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Faturado</p>
                  <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(stats.invoiced)}</p>
                </div>
                <div className={cn('rounded-xl px-3 py-2', stats.overdue > 0 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-zinc-50 dark:bg-zinc-800/50')}>
                  <p className={cn('text-[11px]', stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400')}>{stats.overdue > 0 ? 'Vencido' : 'Em aberto'}</p>
                  <p className={cn('text-sm font-semibold tabular-nums', stats.overdue > 0 ? 'text-red-700 dark:text-red-300' : 'text-zinc-900 dark:text-zinc-100')}>
                    {formatCurrency(stats.overdue > 0 ? stats.overdue : stats.open)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>{stats.invoiceCount} fatura{stats.invoiceCount !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{stats.quoteCount} orçamento{stats.quoteCount !== 1 ? 's' : ''}</span>
                {stats.lastActivity && <span className="ml-auto">{formatDate(stats.lastActivity)}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContactChips({ client }: { client: Client }) {
  return (
    <div className="flex flex-wrap gap-2">
      {client.phone && (
        <Button size="sm" variant="outline" icon={MessageCircle} onClick={() => openWhatsApp('', client.phone)}>{client.phone}</Button>
      )}
      {client.phone && (
        <a href={`tel:${client.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          <Phone className="w-3.5 h-3.5" /> Ligar
        </a>
      )}
      {client.email && (
        <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 max-w-full">
          <Mail className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{client.email}</span>
        </a>
      )}
      {client.document && <Badge tone="neutral">CPF/CNPJ {client.document}</Badge>}
    </div>
  );
}
