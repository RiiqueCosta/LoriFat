/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileDown, Pencil, Plus, ScanLine, Trash2, Wallet } from 'lucide-react';
import { AppRecord, Expense } from '../types';
import { cn, dateKey, formatCurrency, formatDate, monthKey, monthLabel, normalizeText, todayISO, addMonths } from '../lib/utils';
import { exportExpenses } from '../lib/export';
import { useActions } from '../actions';
import { Badge, Button, Card, DropdownMenu, EmptyState, PageHeader, SearchInput } from '../components/ui';

const CATEGORY_COLORS = ['#ff7a00', '#0ea5e9', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b', '#14b8a6', '#6366f1', '#84cc16', '#71717a'];

export function ExpensesView({ records }: { records: AppRecord[] }) {
  const actions = useActions();
  const expenses = useMemo(() => records.filter((r): r is Expense => r.type === 'expense'), [records]);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const monthExpenses = useMemo(() => expenses.filter(e => monthKey(e.dateCreated) === month), [expenses, month]);
  const prevMonth = addMonths(month + '-01', -1).slice(0, 7);
  const prevTotal = expenses.filter(e => monthKey(e.dateCreated) === prevMonth).reduce((s, e) => s + e.total, 0);
  const total = monthExpenses.reduce((s, e) => s + e.total, 0);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    monthExpenses.forEach(e => m.set(e.category, (m.get(e.category) || 0) + e.total));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);
  const colorOf = (cat: string) => CATEGORY_COLORS[Math.max(0, byCategory.findIndex(([c]) => c === cat)) % CATEGORY_COLORS.length];

  const list = useMemo(() => {
    const q = normalizeText(search);
    return monthExpenses
      .filter(e => (!category || e.category === category) && (!q || normalizeText(`${e.description} ${e.category}`).includes(q)))
      .sort((a, b) => dateKey(b.dateCreated).localeCompare(dateKey(a.dateCreated)));
  }, [monthExpenses, search, category]);

  const shift = (n: number) => { setMonth(addMonths(month + '-01', n).slice(0, 7)); setCategory(null); };
  const isCurrent = month === todayISO().slice(0, 7);
  const delta = prevTotal > 0 ? (total - prevTotal) / prevTotal : null;

  return (
    <div className="space-y-5 fade-in">
      <PageHeader
        title="Despesas"
        description="Controle seus gastos e saiba quanto sobra no fim do mês."
        actions={<>
          <Button variant="outline" icon={FileDown} disabled={!list.length} onClick={() => exportExpenses(list, `despesas-${month}.csv`)} className="hidden sm:inline-flex">Exportar</Button>
          <Button variant="outline" icon={ScanLine} onClick={actions.scanReceipt}>Ler cupom com IA</Button>
          <Button icon={Plus} onClick={() => actions.create('expense')}>Nova despesa</Button>
        </>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-center justify-between">
            <button onClick={() => shift(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Mês anterior"><ChevronLeft className="w-4 h-4" /></button>
            <p className="text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-200">{monthLabel(month, true)}</p>
            <button onClick={() => shift(1)} disabled={isCurrent} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30" aria-label="Próximo mês"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">{formatCurrency(total)}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {monthExpenses.length} lançamento{monthExpenses.length !== 1 ? 's' : ''}
            {delta !== null && <span className={cn('ml-2 font-medium', delta > 0 ? 'text-red-500' : 'text-emerald-600')}>{delta > 0 ? '+' : ''}{Math.round(delta * 100)}% vs mês anterior</span>}
          </p>
          {byCategory.length > 0 && (
            <>
              <div className="mt-5 h-2.5 rounded-full overflow-hidden flex bg-zinc-100 dark:bg-zinc-800">
                {byCategory.map(([cat, v]) => (
                  <div key={cat} style={{ width: `${(v / total) * 100}%`, background: colorOf(cat) }} title={`${cat}: ${formatCurrency(v)}`} />
                ))}
              </div>
              <div className="mt-4 space-y-1">
                {byCategory.map(([cat, v]) => (
                  <button key={cat} onClick={() => setCategory(category === cat ? null : cat)}
                    className={cn('w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors',
                      category === cat ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50')}>
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: colorOf(cat) }} />
                    <span className="flex-1 text-left text-zinc-700 dark:text-zinc-300">{cat}</span>
                    <span className="text-xs text-zinc-400 tabular-nums">{Math.round((v / total) * 100)}%</span>
                    <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 w-24 text-right">{formatCurrency(v)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-4 flex flex-col sm:flex-row gap-2 sm:items-center border-b border-zinc-100 dark:border-zinc-800">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar despesa" className="flex-1" />
            {category && (
              <button onClick={() => setCategory(null)} className="self-start sm:self-auto">
                <Badge tone="brand">{category} ✕</Badge>
              </button>
            )}
          </div>
          {list.length === 0 ? (
            <EmptyState icon={Wallet} title={monthExpenses.length ? 'Nada encontrado' : 'Nenhuma despesa neste mês'}
              description={monthExpenses.length ? 'Tente outro termo.' : 'Lance manualmente ou tire uma foto do cupom.'}
              action={!monthExpenses.length ? (
                <div className="flex gap-2">
                  <Button variant="outline" icon={ScanLine} onClick={actions.scanReceipt}>Ler cupom</Button>
                  <Button icon={Plus} onClick={() => actions.create('expense')}>Lançar</Button>
                </div>
              ) : undefined} />
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {list.map(e => (
                <div key={e.id} onClick={() => actions.edit(e)} className="flex items-center gap-3 px-4 sm:px-5 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: colorOf(e.category) + '1f' }}>
                    <Wallet className="w-4 h-4" style={{ color: colorOf(e.category) }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{e.description}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{e.category} · {formatDate(e.dateCreated)}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(e.total)}</p>
                  <DropdownMenu items={[
                    { label: 'Editar', icon: Pencil, onClick: () => actions.edit(e) },
                    { label: 'Excluir', icon: Trash2, onClick: () => actions.remove(e), danger: true },
                  ]} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
