/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { CalendarClock, Pause, Pencil, Play, Plus, Repeat, Trash2, Zap } from 'lucide-react';
import { AppRecord, Invoice, Recurring } from '../types';
import { dateKey, formatCurrency, formatDate } from '../lib/utils';
import { useActions } from '../actions';
import { Badge, Button, Card, DropdownMenu, EmptyState, PageHeader, StatCard } from '../components/ui';

export function RecurringView({ records }: { records: AppRecord[] }) {
  const actions = useActions();
  const list = useMemo(() => records.filter((r): r is Recurring => r.type === 'recurring')
    .sort((a, b) => Number(b.active) - Number(a.active) || dateKey(a.nextDate).localeCompare(dateKey(b.nextDate))), [records]);
  const generated = useMemo(() => {
    const m = new Map<string, number>();
    records.forEach(r => { if (r.type === 'invoice' && (r as Invoice).recurringId) m.set((r as Invoice).recurringId!, (m.get((r as Invoice).recurringId!) || 0) + 1); });
    return m;
  }, [records]);
  const active = list.filter(r => r.active);
  const mrr = active.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-5 fade-in">
      <PageHeader
        title="Cobranças recorrentes"
        description="Contratos mensais que geram faturas automaticamente."
        actions={<Button icon={Plus} onClick={() => actions.create('recurring')}>Nova recorrente</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Receita recorrente mensal" value={formatCurrency(mrr)} icon={Repeat} tone="violet" hint={`${active.length} contrato${active.length !== 1 ? 's' : ''} ativo${active.length !== 1 ? 's' : ''}`} />
        <StatCard label="Projeção anual" value={formatCurrency(mrr * 12)} icon={CalendarClock} tone="brand" hint="Se mantidos os contratos" />
        <StatCard label="Próxima emissão" value={active[0] ? formatDate(active[0].nextDate) : '—'} icon={Zap} tone="neutral" hint={active[0]?.clientName} className="col-span-2 lg:col-span-1" />
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={Repeat} title="Nenhuma cobrança recorrente"
            description="Ideal para contratos de suporte mensal: a fatura é criada sozinha todo mês, pronta para cobrar."
            action={<Button icon={Plus} onClick={() => actions.create('recurring')}>Criar a primeira</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map(r => (
            <Card key={r.id} className={'p-4 flex flex-col ' + (r.active ? '' : 'opacity-70')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{r.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{r.clientName}</p>
                </div>
                <DropdownMenu items={[
                  { label: 'Editar', icon: Pencil, onClick: () => actions.edit(r) },
                  { label: 'Gerar fatura agora', icon: Zap, onClick: () => actions.generateRecurringNow(r) },
                  { label: r.active ? 'Pausar' : 'Reativar', icon: r.active ? Pause : Play, onClick: () => actions.toggleRecurring(r) },
                  { label: 'Excluir', icon: Trash2, onClick: () => actions.remove(r), danger: true, divider: true },
                ]} />
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{formatCurrency(r.total)}<span className="text-sm font-medium text-zinc-400">/mês</span></p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.active ? <Badge tone="success" dot>Ativo</Badge> : <Badge>Pausado</Badge>}
                <Badge tone="neutral">Todo dia {r.dayOfMonth}</Badge>
                <Badge tone="neutral">Vence em {r.dueDays}d</Badge>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />Próxima: <b className="text-zinc-700 dark:text-zinc-200">{r.active ? formatDate(r.nextDate) : '—'}</b></span>
                <span>{generated.get(r.id) || 0} gerada{(generated.get(r.id) || 0) !== 1 ? 's' : ''}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
