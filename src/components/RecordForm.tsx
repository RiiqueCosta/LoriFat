/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { AppRecord, RecordType, Client, LineItem } from '../types';
import { generateId, formatCurrency } from '../lib/utils';
import { buildPricingFields, calcTotals } from '../lib/billing';

/** Dados para pré-preencher o formulário (ex.: vindos da IA). */
export interface RecordPrefill {
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
}

interface RecordFormProps {
  type: RecordType;
  onSubmit: (record: AppRecord) => void;
  onCancel: () => void;
  clients: Client[];
  initialData?: RecordPrefill;
  /** Chamado quando o usuário opta por cadastrar um novo cliente junto. */
  onCreateClient?: (client: Client) => void;
}

const NEW_CLIENT = '__new__';
const inputCls = 'w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all';
const labelCls = 'block text-xs font-bold text-zinc-500 uppercase mb-1';

const today = () => new Date().toISOString().split('T')[0];
const in15Days = () => new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const norm = (s?: string) => (s || '').trim().toLowerCase();

function matchClient(clients: Client[], p?: RecordPrefill): string {
  if (!p) return '';
  const byEmail = p.clientEmail && clients.find(c => norm(c.email) === norm(p.clientEmail));
  if (byEmail) return byEmail.id;
  const byName = p.clientName && clients.find(c => norm(c.name) === norm(p.clientName) || (c.company && norm(c.company) === norm(p.clientName)));
  if (byName) return byName.id;
  const byCompany = p.clientCompany && clients.find(c => c.company && norm(c.company) === norm(p.clientCompany));
  if (byCompany) return byCompany.id;
  return p.clientName || p.clientCompany ? NEW_CLIENT : '';
}

export function RecordForm({ type, onSubmit, onCancel, clients, initialData, onCreateClient }: RecordFormProps) {
  const isBilling = type === 'invoice' || type === 'quote';

  const [formData, setFormData] = useState<any>({
    dateCreated: initialData?.dateCreated || today(),
    dueDate: initialData?.dueDate || in15Days(),
    status: 'pending',
  });
  const [clientId, setClientId] = useState<string>(() => matchClient(clients, initialData));
  const [newClient, setNewClient] = useState({
    name: initialData?.clientName || initialData?.clientCompany || '',
    company: initialData?.clientCompany || '',
    email: initialData?.clientEmail || '',
    phone: initialData?.clientPhone || '',
  });
  const [items, setItems] = useState<LineItem[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items
      : [{ description: '', quantity: 1, unitPrice: 0 }]
  );
  const [taxPercent, setTaxPercent] = useState<number>(initialData?.taxPercent || 0);
  const [discount, setDiscount] = useState<number>(initialData?.discount || 0);
  const [notes, setNotes] = useState<string>(initialData?.notes || '');

  const totals = useMemo(() => calcTotals(items, taxPercent, discount), [items, taxPercent, discount]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type: inputType } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: inputType === 'number' ? parseFloat(value) : value
    }));
  };

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems(prev => prev.map((it, i) => i === index
      ? { ...it, [field]: field === 'description' ? value : (parseFloat(value) || 0) }
      : it));
  };
  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (index: number) => setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let record: any = {
      id: generateId(),
      type,
      ownerId: '', // Will be set by useData hook
      ...formData
    };

    if (isBilling) {
      if (type === 'quote') delete record.dueDate;
      let finalClientId = clientId;
      let finalClientName = clients.find(c => c.id === clientId)?.name || '';

      if (clientId === NEW_CLIENT) {
        if (!newClient.name.trim()) return;
        const created: Client = {
          id: generateId(),
          type: 'client',
          ownerId: '',
          dateCreated: today(),
          name: newClient.name.trim(),
          company: newClient.company.trim(),
          email: newClient.email.trim(),
          phone: newClient.phone.trim(),
        };
        onCreateClient?.(created);
        finalClientId = created.id;
        finalClientName = created.name;
      }

      record = {
        ...record,
        clientId: finalClientId,
        clientName: finalClientName,
        notes: notes.trim(),
        ...buildPricingFields(items, taxPercent, discount),
      };
    }

    onSubmit(record);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {initialData && isBilling && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-50 border border-orange-100 text-xs text-zinc-600">
          <Sparkles className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <span>Preenchido pela IA a partir da proposta. Confira os dados antes de salvar.</span>
        </div>
      )}

      {type === 'client' && (
        <>
          <div>
            <label className={labelCls}>Nome Completo</label>
            <input required name="name" onChange={handleChange} className={inputCls} placeholder="Ex: João Silva" />
          </div>
          <div>
            <label className={labelCls}>Empresa</label>
            <input name="company" onChange={handleChange} className={inputCls} placeholder="Ex: Tech Solutions" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" name="email" onChange={handleChange} className={inputCls} placeholder="joao@email.com" />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input name="phone" onChange={handleChange} className={inputCls} placeholder="(11) 99999-9999" />
            </div>
          </div>
        </>
      )}

      {isBilling && (
        <>
          <div>
            <label className={labelCls}>Cliente</label>
            <select required value={clientId} onChange={e => setClientId(e.target.value)} className={inputCls}>
              <option value="">Selecione um cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
              <option value={NEW_CLIENT}>+ Cadastrar novo cliente</option>
            </select>
          </div>

          {clientId === NEW_CLIENT && (
            <div className="p-4 rounded-2xl border border-dashed border-zinc-300 space-y-3">
              <p className="text-xs font-bold text-zinc-500 uppercase">Novo cliente</p>
              <input required value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} className={inputCls} placeholder="Nome do cliente" />
              <input value={newClient.company} onChange={e => setNewClient({ ...newClient, company: e.target.value })} className={inputCls} placeholder="Empresa" />
              <div className="grid grid-cols-2 gap-3">
                <input type="email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} className={inputCls} placeholder="Email" />
                <input value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} className={inputCls} placeholder="Telefone" />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className={labelCls}>Itens / Serviços</label>
            {items.map((item, i) => (
              <div key={i} className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <div className="flex gap-2">
                  <textarea
                    required
                    value={item.description}
                    onChange={e => updateItem(i, 'description', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-white border border-zinc-200 focus:ring-2 focus:ring-brand outline-none text-sm h-16"
                    placeholder="Descrição do serviço"
                  />
                  <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1} className="p-2 text-zinc-400 hover:text-red-500 disabled:opacity-30 self-start" title="Remover item">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <input type="number" min="0" step="any" required value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="px-3 py-2 rounded-lg bg-white border border-zinc-200 text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="Qtd." title="Quantidade" />
                  <input type="number" min="0" step="0.01" required value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} className="px-3 py-2 rounded-lg bg-white border border-zinc-200 text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="Valor unit." title="Valor unitário" />
                  <p className="text-right text-sm font-bold text-zinc-700">{formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}</p>
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem} className="w-full py-2.5 rounded-xl border-2 border-dashed border-zinc-200 text-zinc-500 text-sm font-bold hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Adicionar item
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Desconto (R$)</label>
              <input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Imposto (%)</label>
              <input type="number" min="0" step="0.01" value={taxPercent} onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)} className={inputCls} />
            </div>
          </div>

          {type === 'invoice' && (
            <div>
              <label className={labelCls}>Vencimento</label>
              <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className={inputCls} />
            </div>
          )}

          <div>
            <label className={labelCls}>Observações / Condições</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inputCls} h-20`} placeholder="Prazo de entrega, forma de pagamento... (aparece no PDF)" />
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900 text-white space-y-1 text-sm">
            <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            {totals.discount > 0 && <div className="flex justify-between text-zinc-400"><span>Desconto</span><span>- {formatCurrency(totals.discount)}</span></div>}
            {totals.tax > 0 && <div className="flex justify-between text-zinc-400"><span>Imposto ({taxPercent}%)</span><span>{formatCurrency(totals.tax)}</span></div>}
            <div className="flex justify-between font-black text-lg pt-1"><span>Total</span><span className="text-brand">{formatCurrency(totals.total)}</span></div>
          </div>
        </>
      )}

      {type === 'expense' && (
        <>
          <div>
            <label className={labelCls}>Descrição</label>
            <input required name="description" onChange={handleChange} className={inputCls} placeholder="Ex: Assinatura Adobe" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Valor</label>
              <input type="number" required step="0.01" name="total" onChange={handleChange} className={inputCls} placeholder="0,00" />
            </div>
            <div>
              <label className={labelCls}>Categoria</label>
              <select required name="category" onChange={handleChange} className={inputCls}>
                <option value="">Selecione</option>
                <option>Assinaturas</option>
                <option>Hardware</option>
                <option>Marketing</option>
                <option>Infraestrutura</option>
                <option>Outros</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Data</label>
            <input type="date" name="dateCreated" defaultValue={formData.dateCreated} onChange={handleChange} className={inputCls} />
          </div>
        </>
      )}

      <div className="pt-4 flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 py-3.5 rounded-2xl bg-zinc-100 text-zinc-600 font-bold text-sm hover:bg-zinc-200 transition-colors">
          Cancelar
        </button>
        <button type="submit" className="flex-[2] py-3.5 rounded-2xl bg-brand text-white font-bold text-sm shadow-lg shadow-brand/20 hover:bg-brand-dark transition-colors">
          Salvar {type === 'client' ? 'Cliente' : type === 'invoice' ? 'Fatura' : type === 'quote' ? 'Orçamento' : 'Despesa'}
        </button>
      </div>
    </form>
  );
}
