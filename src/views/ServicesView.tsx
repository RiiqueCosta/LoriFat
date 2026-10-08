/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { EyeOff, Eye, FileCheck2, FileText, Pencil, Plus, Trash2, TrendingUp, Wrench } from 'lucide-react';
import { AppRecord, Service } from '../types';
import { activeServices, itemFromService, serviceStats, unitShort } from '../lib/services';
import { cn, formatCurrency, formatDate, normalizeText } from '../lib/utils';
import { useActions } from '../actions';
import { Badge, Button, Card, DropdownMenu, EmptyState, PageHeader, SearchInput, Segmented, StatCard } from '../components/ui';

type Sort = 'name' | 'sold' | 'price';

export function ServicesView({ records }: { records: AppRecord[] }) {
  const actions = useActions();
  const services = useMemo(() => activeServices(records), [records]);
  const stats = useMemo(() => serviceStats(services, records), [services, records]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [category, setCategory] = useState('');

  const categories = useMemo(
    () => [...new Set(services.map(s => s.category?.trim()).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [services],
  );

  const rows = useMemo(() => {
    const q = normalizeText(search);
    return services
      .filter(s => !category || s.category === category)
      .filter(s => !q || normalizeText(`${s.name} ${s.description || ''} ${s.category || ''}`).includes(q))
      .sort((a, b) => {
        if (a.active !== b.active) return a.active === false ? 1 : -1;
        if (sort === 'sold') return (stats.get(b.id)?.invoiced || 0) - (stats.get(a.id)?.invoiced || 0);
        if (sort === 'price') return b.price - a.price;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }, [services, stats, search, sort, category]);

  const summary = useMemo(() => {
    let invoiced = 0;
    let top: Service | undefined;
    for (const s of services) {
      const v = stats.get(s.id)?.invoiced || 0;
      invoiced += v;
      if (v > 0 && (!top || v > (stats.get(top.id)?.invoiced || 0))) top = s;
    }
    return { invoiced, top, active: services.filter(s => s.active !== false).length };
  }, [services, stats]);

  const maxInvoiced = Math.max(1, ...services.map(s => stats.get(s.id)?.invoiced || 0));

  return (
    <div className="space-y-5 fade-in">
      <PageHeader
        title="Serviços"
        description="Seu catálogo de serviços e preços. Use na hora de montar faturas e orçamentos."
        actions={<Button icon={Plus} onClick={() => actions.create('service')}>Novo serviço</Button>}
      />

      {services.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Serviços ativos" value={summary.active} hint={`${services.length} no total`} icon={Wrench} tone="info" />
          <StatCard label="Faturado com o catálogo" value={formatCurrency(summary.invoiced)} hint="Soma dos itens ligados a serviços" icon={FileText} tone="success" />
          <StatCard label="Mais vendido" value={<span className="truncate block">{summary.top?.name || '—'}</span>}
            hint={summary.top ? formatCurrency(stats.get(summary.top.id)?.invoiced || 0) : 'Ainda sem vendas'} icon={TrendingUp} tone="brand" />
        </div>
      )}

      {services.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar serviço" className="flex-1 lg:max-w-md" />
          <Segmented size="sm" value={sort} onChange={setSort} options={[
            { value: 'name', label: 'A–Z' },
            { value: 'sold', label: 'Mais vendidos' },
            { value: 'price', label: 'Maior preço' },
          ]} className="self-start lg:self-auto" />
        </div>
      )}

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {['', ...categories].map(c => (
            <button key={c || 'all'} onClick={() => setCategory(c)}
              className={cn('h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors',
                category === c
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700')}>
              {c || 'Todas'}
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Wrench}
            title={services.length ? 'Nenhum serviço encontrado' : 'Monte seu catálogo de serviços'}
            description={services.length
              ? 'Tente outro termo ou categoria.'
              : 'Cadastre o que você vende, com o preço padrão. Depois é só escolher na hora de criar a fatura, sem digitar tudo de novo.'}
            action={!services.length ? <Button icon={Plus} onClick={() => actions.create('service')}>Cadastrar primeiro serviço</Button> : undefined} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map(s => {
            const st = stats.get(s.id)!;
            const inactive = s.active === false;
            return (
              <Card key={s.id} onClick={() => actions.edit(s)}
                className={cn('p-4 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all flex flex-col', inactive && 'opacity-60')}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">{s.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {s.category && <Badge tone="neutral">{s.category}</Badge>}
                      {inactive && <Badge tone="warning">Desativado</Badge>}
                    </div>
                  </div>
                  <DropdownMenu items={[
                    { label: 'Nova fatura com este serviço', icon: FileText, onClick: () => actions.create('invoice', { prefill: { items: [itemFromService(s)] } }), hidden: inactive },
                    { label: 'Novo orçamento com este serviço', icon: FileCheck2, onClick: () => actions.create('quote', { prefill: { items: [itemFromService(s)] } }), hidden: inactive },
                    { label: 'Editar', icon: Pencil, onClick: () => actions.edit(s), divider: true },
                    { label: inactive ? 'Reativar' : 'Desativar', icon: inactive ? Eye : EyeOff, onClick: () => actions.toggleService(s) },
                    { label: 'Excluir', icon: Trash2, onClick: () => actions.remove(s), danger: true, divider: true },
                  ]} />
                </div>

                {s.description && <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{s.description}</p>}

                <p className="mt-3 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(s.price)}
                  <span className="ml-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">/ {unitShort(s.unit)}</span>
                </p>

                <div className="mt-auto pt-3">
                  <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(st.invoiced / maxInvoiced) * 100}%` }} />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">{formatCurrency(st.invoiced)}</span>
                    <span>faturado</span>
                    <span>·</span>
                    <span>{st.invoiceCount} fatura{st.invoiceCount !== 1 ? 's' : ''}</span>
                    {st.lastSold && <span className="ml-auto">{formatDate(st.lastSold)}</span>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
