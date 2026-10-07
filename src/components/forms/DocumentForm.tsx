/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AppConfig, AppRecord, Client, Invoice, LineItem, Quote } from '../../types';
import { buildPricingFields, getItems, nextNumber, quoteValidUntil } from '../../lib/billing';
import { addDays, dateKey, generateId, todayISO } from '../../lib/utils';
import { Field, Input, MoneyInput, Select, Textarea } from '../ui';
import { buildNewClient, ClientPicker, FormActions, ItemsEditor, matchClient, NEW_CLIENT, NewClientData, TotalsSummary } from './shared';

/** Dados para pré-preencher o formulário (ex.: vindos da IA). */
export interface RecordPrefill {
  clientId?: string;
  clientName?: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  items?: LineItem[];
  taxPercent?: number;
  discount?: number;
  notes?: string;
  dueDate?: string;
  dateCreated?: string;
  fromAI?: boolean;
}

interface DocumentFormProps {
  type: 'invoice' | 'quote';
  /** Registro existente (edição). */
  initial?: Invoice | Quote;
  prefill?: RecordPrefill;
  clients: Client[];
  records: AppRecord[];
  config: AppConfig;
  onCancel: () => void;
  onSubmit: (record: Invoice | Quote, newClient?: Client) => Promise<void> | void;
}

export function DocumentForm({ type, initial, prefill, clients, records, config, onCancel, onSubmit }: DocumentFormProps) {
  const isEdit = !!initial;
  const isInvoice = type === 'invoice';
  const dueDays = config.defaultDueDays || 15;

  const [dateCreated, setDateCreated] = useState(dateKey(initial?.dateCreated) || prefill?.dateCreated || todayISO());
  const [dueDate, setDueDate] = useState(
    (initial as Invoice | undefined)?.dueDate ? dateKey((initial as Invoice).dueDate) : prefill?.dueDate || addDays(todayISO(), dueDays),
  );
  const [validUntil, setValidUntil] = useState(
    initial && initial.type === 'quote' ? dateKey(quoteValidUntil(initial, config)) : addDays(todayISO(), config.quoteValidityDays || 30),
  );
  const [number, setNumber] = useState(initial?.number || '');
  const [clientId, setClientId] = useState<string>(() =>
    initial?.clientId || prefill?.clientId || matchClient(clients, { name: prefill?.clientName, company: prefill?.clientCompany, email: prefill?.clientEmail }));
  const [newClient, setNewClient] = useState<NewClientData>({
    name: prefill?.clientName || prefill?.clientCompany || '',
    company: prefill?.clientCompany || '',
    email: prefill?.clientEmail || '',
    phone: prefill?.clientPhone || '',
  });
  const [items, setItems] = useState<LineItem[]>(() => {
    const base = initial ? getItems(initial) : prefill?.items || [];
    return base.length ? base.map(i => ({ ...i })) : [{ description: '', quantity: 1, unitPrice: 0 }];
  });
  const [taxPercent, setTaxPercent] = useState<number>(initial?.taxPercent ?? prefill?.taxPercent ?? 0);
  const [discount, setDiscount] = useState<number>(initial?.discount ?? prefill?.discount ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? prefill?.notes ?? '');
  const [status, setStatus] = useState<string>(initial?.status || 'pending');
  const [paidAt, setPaidAt] = useState((initial as Invoice | undefined)?.paidAt || todayISO());
  const [saving, setSaving] = useState(false);

  const numberPreview = number || nextNumber(records, type, dateCreated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let created: Client | undefined;
      let finalClientId = clientId;
      let finalClientName = clients.find(c => c.id === clientId)?.name || initial?.clientName || '';
      if (clientId === NEW_CLIENT) {
        if (!newClient.name.trim()) return;
        created = buildNewClient(newClient);
        finalClientId = created.id;
        finalClientName = created.name;
      }

      const pricing = buildPricingFields(items, taxPercent, discount);
      const common = {
        id: initial?.id || generateId(),
        ownerId: initial?.ownerId || '',
        dateCreated,
        number: number.trim() || (isEdit ? initial?.number : undefined),
        clientId: finalClientId,
        clientName: finalClientName,
        notes: notes.trim(),
        ...pricing,
      };

      let record: Invoice | Quote;
      if (isInvoice) {
        const inv: Invoice = {
          ...(initial as Invoice | undefined),
          ...common,
          type: 'invoice',
          dueDate,
          status: status === 'paid' ? 'paid' : 'pending',
        };
        if (inv.status === 'paid') inv.paidAt = paidAt || todayISO();
        else delete inv.paidAt;
        record = inv;
      } else {
        record = {
          ...(initial as Quote | undefined),
          ...common,
          type: 'quote',
          status: (status as Quote['status']) || 'pending',
          validUntil,
        };
      }
      await onSubmit(record, created);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {prefill?.fromAI && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-xs text-violet-800 dark:text-violet-300">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Preenchido pela IA a partir da proposta. Confira os dados antes de salvar.</span>
        </div>
      )}

      <ClientPicker clients={clients} value={clientId} onChange={setClientId} newClient={newClient} onNewClientChange={setNewClient} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Número" hint={!number && !isEdit ? 'Automático' : undefined} className="col-span-2 sm:col-span-1">
          <Input value={number} onChange={e => setNumber(e.target.value.toUpperCase())} placeholder={numberPreview} className="font-mono text-[13px]" />
        </Field>
        <Field label="Emissão">
          <Input type="date" required value={dateCreated} onChange={e => setDateCreated(e.target.value)} />
        </Field>
        {isInvoice ? (
          <Field label="Vencimento">
            <Input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </Field>
        ) : (
          <Field label="Válido até">
            <Input type="date" required value={validUntil} onChange={e => setValidUntil(e.target.value)} />
          </Field>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-2">Itens / serviços</p>
        <ItemsEditor items={items} onChange={setItems} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Desconto">
          <MoneyInput value={discount} onChange={setDiscount} />
        </Field>
        <Field label="Impostos (%)">
          <Input type="number" inputMode="decimal" min="0" step="0.01" value={taxPercent} onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} />
        </Field>
      </div>

      {isEdit && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)}>
              {isInvoice ? (
                <>
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                </>
              ) : (
                <>
                  <option value="pending">Aguardando resposta</option>
                  <option value="approved">Aprovado</option>
                  <option value="rejected">Recusado</option>
                </>
              )}
            </Select>
          </Field>
          {isInvoice && status === 'paid' && (
            <Field label="Pago em">
              <Input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} />
            </Field>
          )}
        </div>
      )}

      <Field label="Observações / condições" hint="Aparece no PDF. Em branco, usa o texto padrão das Configurações.">
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          placeholder={(isInvoice ? config.invoiceTerms : config.quoteTerms) || 'Prazo de entrega, forma de pagamento, garantia...'} />
      </Field>

      <TotalsSummary items={items} taxPercent={taxPercent} discount={discount} />

      <FormActions
        onCancel={onCancel}
        loading={saving}
        submitLabel={isEdit ? 'Salvar alterações' : isInvoice ? 'Criar fatura' : 'Criar orçamento'}
      />
    </form>
  );
}
