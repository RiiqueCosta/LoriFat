/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { AppConfig, Client, LineItem, Recurring } from '../../types';
import { buildPricingFields, firstRecurringDate } from '../../lib/billing';
import { dateKey, formatDateLong, generateId, todayISO } from '../../lib/utils';
import { Field, Input, MoneyInput, Textarea, Toggle } from '../ui';
import { buildNewClient, ClientPicker, FormActions, ItemsEditor, NEW_CLIENT, NewClientData, TotalsSummary } from './shared';

export function RecurringForm({ initial, clients, config, presetClientId, onCancel, onSubmit }: {
  initial?: Recurring; clients: Client[]; config: AppConfig; presetClientId?: string;
  onCancel: () => void; onSubmit: (r: Recurring, newClient?: Client) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [clientId, setClientId] = useState(initial?.clientId || presetClientId || '');
  const [newClient, setNewClient] = useState<NewClientData>({ name: '', company: '', email: '', phone: '' });
  const [items, setItems] = useState<LineItem[]>(initial?.items?.length ? initial.items.map(i => ({ ...i })) : [{ description: 'Suporte técnico mensal', quantity: 1, unitPrice: 0 }]);
  const [taxPercent, setTaxPercent] = useState(initial?.taxPercent ?? 0);
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [dayOfMonth, setDayOfMonth] = useState(initial?.dayOfMonth || Math.min(new Date().getDate(), 28));
  const [dueDays, setDueDays] = useState(initial?.dueDays ?? (config.defaultDueDays || 10));
  const [nextDate, setNextDate] = useState(dateKey(initial?.nextDate) || firstRecurringDate(Math.min(new Date().getDate(), 28)));
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);

  const changeDay = (d: number) => {
    const day = Math.min(Math.max(d || 1, 1), 28);
    setDayOfMonth(day);
    if (!initial) setNextDate(firstRecurringDate(day));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let created: Client | undefined;
      let cid = clientId;
      let cname = clients.find(c => c.id === clientId)?.name || initial?.clientName || '';
      if (clientId === NEW_CLIENT) {
        if (!newClient.name.trim()) return;
        created = buildNewClient(newClient);
        cid = created.id; cname = created.name;
      }
      const pricing = buildPricingFields(items, taxPercent, discount);
      await onSubmit({
        ...(initial || {}),
        id: initial?.id || generateId(),
        type: 'recurring',
        ownerId: initial?.ownerId || '',
        dateCreated: initial?.dateCreated || todayISO(),
        title: title.trim() || pricing.description.slice(0, 80) || 'Cobrança mensal',
        clientId: cid,
        clientName: cname,
        items: pricing.items,
        taxPercent: pricing.taxPercent,
        discount: pricing.discount,
        total: pricing.total,
        notes: notes.trim(),
        dayOfMonth,
        dueDays: Math.max(0, dueDays),
        nextDate,
        active,
      }, created);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Field label="Nome do contrato" hint="Ex.: Suporte mensal — Escritório Silva">
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Suporte mensal" />
      </Field>

      <ClientPicker clients={clients} value={clientId} onChange={setClientId} newClient={newClient} onNewClientChange={setNewClient} />

      <div>
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-2">Itens cobrados todo mês</p>
        <ItemsEditor items={items} onChange={setItems} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Desconto"><MoneyInput value={discount} onChange={setDiscount} /></Field>
        <Field label="Impostos (%)">
          <Input type="number" min="0" step="0.01" value={taxPercent} onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)} />
        </Field>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          <CalendarClock className="w-4 h-4 text-brand" /> Agenda de cobrança
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Emitir todo dia">
            <Input type="number" min={1} max={28} required value={dayOfMonth} onChange={e => changeDay(parseInt(e.target.value, 10))} />
          </Field>
          <Field label="Vence em (dias)">
            <Input type="number" min={0} max={90} required value={dueDays} onChange={e => setDueDays(parseInt(e.target.value, 10) || 0)} />
          </Field>
          <Field label="Próxima emissão" className="col-span-2 sm:col-span-1">
            <Input type="date" required value={nextDate} onChange={e => setNextDate(e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          A próxima fatura será criada automaticamente em <b className="text-zinc-700 dark:text-zinc-200">{formatDateLong(nextDate)}</b> quando o sistema for aberto nesse dia ou depois.
        </p>
        <Toggle checked={active} onChange={setActive} label="Contrato ativo" description="Desative para pausar a geração automática." />
      </div>

      <Field label="Observações da fatura">
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Ex.: Referente ao suporte do mês." />
      </Field>

      <TotalsSummary items={items} taxPercent={taxPercent} discount={discount} />

      <FormActions onCancel={onCancel} loading={saving} submitLabel={initial ? 'Salvar contrato' : 'Criar cobrança recorrente'} />
    </form>
  );
}
