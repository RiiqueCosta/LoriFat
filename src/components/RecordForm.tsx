/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppRecord, RecordType, Client } from '../types';
import { generateId } from '../lib/utils';

interface RecordFormProps {
  type: RecordType;
  onSubmit: (record: AppRecord) => void;
  onCancel: () => void;
  clients: Client[];
}

export function RecordForm({ type, onSubmit, onCancel, clients }: RecordFormProps) {
  const [formData, setFormData] = useState<any>({
    dateCreated: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    quantity: 1,
    taxPercent: 0,
    status: 'pending'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type: inputType } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: inputType === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let record: any = {
      id: generateId(),
      type,
      ...formData
    };

    if (type === 'invoice' || type === 'quote') {
      const subtotal = (formData.quantity || 0) * (formData.unitPrice || 0);
      record.total = subtotal + (subtotal * (formData.taxPercent || 0) / 100);
      
      const client = clients.find(c => c.id === formData.clientId);
      if (client) {
        record.clientName = client.name;
      }
    }

    onSubmit(record);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {type === 'client' && (
        <>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nome Completo</label>
            <input required name="name" onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all" placeholder="Ex: João Silva" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Empresa</label>
            <input name="company" onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all" placeholder="Ex: Tech Solutions" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
              <input type="email" name="email" onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all" placeholder="joao@email.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Telefone</label>
              <input name="phone" onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all" placeholder="(11) 99999-9999" />
            </div>
          </div>
        </>
      )}

      {(type === 'invoice' || type === 'quote') && (
        <>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cliente</label>
            <select required name="clientId" onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all">
              <option value="">Selecione um cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descrição do Serviço</label>
            <textarea required name="description" onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all h-20" placeholder="Descreva os serviços prestados..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Quantidade</label>
              <input type="number" required name="quantity" defaultValue="1" onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Valor Unitário</label>
              <input type="number" required step="0.01" name="unitPrice" onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all" placeholder="0,00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Imposto (%)</label>
              <input type="number" name="taxPercent" defaultValue="0" onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all" />
            </div>
            {type === 'invoice' && (
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Vencimento</label>
                <input type="date" name="dueDate" defaultValue={formData.dueDate} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all" />
              </div>
            )}
          </div>
        </>
      )}

      {type === 'expense' && (
        <>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descrição</label>
            <input required name="description" onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all" placeholder="Ex: Assinatura Adobe" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Valor</label>
              <input type="number" required step="0.01" name="total" onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Categoria</label>
              <select required name="category" onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all">
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
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Data</label>
            <input type="date" name="dateCreated" defaultValue={formData.dateCreated} onChange={handleChange} className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all" />
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
