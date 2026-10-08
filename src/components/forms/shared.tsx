/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Trash2, Wrench } from 'lucide-react';
import { Client, LineItem, Service } from '../../types';
import { itemFromService, unitShort, useServices } from '../../lib/services';
import { calcTotals } from '../../lib/billing';
import { cn, formatCurrency, generateId, normalizeText, todayISO } from '../../lib/utils';
import { Button, Field, Input, MoneyInput, Select, inputBase } from '../ui';

// --- Barra de ações fixa no rodapé do formulário ------------------------------

export function FormActions({ onCancel, submitLabel, loading, extra }: {
  onCancel: () => void; submitLabel: string; loading?: boolean; extra?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 -mx-5 sm:-mx-6 -mb-5 mt-6 px-5 sm:px-6 py-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {extra}
      <div className="flex-1" />
      <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
      <Button type="submit" loading={loading}>{submitLabel}</Button>
    </div>
  );
}

// --- Editor de itens -------------------------------------------------------------

export function ItemsEditor({ items, onChange }: { items: LineItem[]; onChange: (items: LineItem[]) => void }) {
  const update = (index: number, patch: Partial<LineItem>) =>
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const remove = (index: number) => onChange(items.length > 1 ? items.filter((_, i) => i !== index) : [{ description: '', quantity: 1, unitPrice: 0 }]);
  const add = () => onChange([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  const addService = (s: Service) => {
    const next = itemFromService(s);
    const last = items[items.length - 1];
    const lastEmpty = last && !last.description.trim() && !last.unitPrice;
    onChange(lastEmpty ? [...items.slice(0, -1), next] : [...items, next]);
  };

  return (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-[1fr_80px_130px_110px_36px] gap-2 px-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
        <span>Descrição</span><span>Qtd.</span><span>Valor unit.</span><span className="text-right">Subtotal</span><span />
      </div>
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-700/80 sm:border-0 p-3 sm:p-0 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_80px_130px_110px_36px] sm:gap-2 sm:items-start">
          <div>
            <textarea
              required
              rows={1}
              value={item.description}
              onChange={e => update(i, { description: e.target.value })}
              placeholder="Ex.: Manutenção de computadores"
              className={cn(inputBase, 'h-auto min-h-[44px] py-2.5 resize-none leading-snug')}
              onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <Field label={<span className="sm:hidden">Qtd.</span>} className="sm:space-y-0">
              <Input
                type="number" inputMode="decimal" min="0" step="any" required
                value={item.quantity}
                onChange={e => update(i, { quantity: parseFloat(e.target.value) || 0 })}
                onFocus={e => e.target.select()}
                className="tabular-nums"
              />
            </Field>
            <Field label={<span className="sm:hidden">Valor unit.</span>} className="sm:space-y-0">
              <MoneyInput value={item.unitPrice} onChange={v => update(i, { unitPrice: v })} required />
            </Field>
          </div>
          <div className="flex items-center justify-between sm:contents">
            <p className="sm:h-11 sm:flex sm:items-center sm:justify-end text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
              <span className="sm:hidden text-xs text-zinc-500 font-medium mr-2">Subtotal</span>
              {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
            </p>
            <button
              type="button"
              onClick={() => remove(i)}
              className="w-9 h-9 sm:h-11 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Remover item"
              aria-label="Remover item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 mt-1">
        <ServicePicker onPick={addService} />
        <Button variant="outline" size="sm" icon={Plus} onClick={add}>Adicionar item</Button>
      </div>
    </div>
  );
}

export function TotalsSummary({ items, taxPercent, discount }: { items: LineItem[]; taxPercent: number; discount: number }) {
  const t = useMemo(() => calcTotals(items, taxPercent, discount), [items, taxPercent, discount]);
  return (
    <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 p-4 space-y-1.5 text-sm">
      <Row label="Subtotal" value={formatCurrency(t.subtotal)} />
      {t.discount > 0 && <Row label="Desconto" value={`- ${formatCurrency(t.discount)}`} />}
      {t.tax > 0 && <Row label={`Impostos (${taxPercent}%)`} value={formatCurrency(t.tax)} />}
      <div className="pt-2 mt-1 border-t border-zinc-200 dark:border-zinc-700 flex items-baseline justify-between">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Total</span>
        <span className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{formatCurrency(t.total)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
      <span>{label}</span><span className="tabular-nums">{value}</span>
    </div>
  );
}

// --- Seletor de cliente com cadastro rápido ------------------------------------------

export const NEW_CLIENT = '__new__';

export interface NewClientData { name: string; company: string; email: string; phone: string }

export function matchClient(clients: Client[], hint?: { name?: string; company?: string; email?: string }): string {
  if (!hint) return '';
  const byEmail = hint.email && clients.find(c => normalizeText(c.email) === normalizeText(hint.email));
  if (byEmail) return byEmail.id;
  const byName = hint.name && clients.find(c => normalizeText(c.name) === normalizeText(hint.name) || (c.company && normalizeText(c.company) === normalizeText(hint.name)));
  if (byName) return byName.id;
  const byCompany = hint.company && clients.find(c => c.company && normalizeText(c.company) === normalizeText(hint.company));
  if (byCompany) return byCompany.id;
  return hint.name || hint.company ? NEW_CLIENT : '';
}

export function buildNewClient(data: NewClientData): Client {
  return {
    id: generateId(),
    type: 'client',
    ownerId: '',
    dateCreated: todayISO(),
    name: data.name.trim(),
    company: data.company.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
  };
}

export function ClientPicker({ clients, value, onChange, newClient, onNewClientChange }: {
  clients: Client[]; value: string; onChange: (id: string) => void;
  newClient: NewClientData; onNewClientChange: (d: NewClientData) => void;
}) {
  const sorted = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [clients]);
  return (
    <div className="space-y-3">
      <Field label="Cliente">
        <Select required value={value} onChange={e => onChange(e.target.value)}>
          <option value="">Selecione um cliente</option>
          {sorted.map(c => <option key={c.id} value={c.id}>{c.name}{c.company && c.company !== c.name ? ` — ${c.company}` : ''}</option>)}
          <option value={NEW_CLIENT}>+ Cadastrar novo cliente</option>
        </Select>
      </Field>
      {value === NEW_CLIENT && (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-800/30">
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Novo cliente</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input required placeholder="Nome *" value={newClient.name} onChange={e => onNewClientChange({ ...newClient, name: e.target.value })} />
            <Input placeholder="Empresa" value={newClient.company} onChange={e => onNewClientChange({ ...newClient, company: e.target.value })} />
            <Input type="email" placeholder="E-mail" value={newClient.email} onChange={e => onNewClientChange({ ...newClient, email: e.target.value })} />
            <Input type="tel" placeholder="WhatsApp / telefone" value={newClient.phone} onChange={e => onNewClientChange({ ...newClient, phone: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Escolher serviço do catálogo ---------------------------------------------------

function ServicePicker({ onPick }: { onPick: (s: Service) => void }) {
  const services = useServices().filter(s => s.active !== false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  if (!services.length) return null;
  const query = normalizeText(q);
  const list = services.filter(s => !query || normalizeText(`${s.name} ${s.category || ''} ${s.description || ''}`).includes(query));

  const pick = (s: Service) => { onPick(s); setOpen(false); setQ(''); };

  return (
    <div className="relative" ref={ref}>
      <Button variant="primary" size="sm" icon={Wrench} onClick={() => setOpen(o => !o)}>Do catálogo</Button>
      {open && (
        <div className="absolute z-50 bottom-full mb-2 left-0 w-[min(22rem,calc(100vw-3rem))] rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-900/10 overflow-hidden">
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-zinc-400 ml-1 shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (list[0]) pick(list[0]); } }}
              placeholder="Buscar serviço"
              className="flex-1 h-8 bg-transparent text-sm outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {list.length === 0 && <p className="px-3 py-4 text-center text-xs text-zinc-500">Nenhum serviço encontrado</p>}
            {list.map(s => (
              <button key={s.id} type="button" onClick={() => pick(s)}
                className="w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{s.name}</span>
                  {s.category && <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{s.category}</span>}
                </span>
                <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                  {formatCurrency(s.price)}<span className="text-[11px] font-normal text-zinc-500"> /{unitShort(s.unit)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
