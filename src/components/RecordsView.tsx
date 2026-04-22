/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Search, FileText, Download, MessageCircle, MoreVertical, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { AppRecord, RecordType, Client, Invoice, Quote, Expense, AppConfig } from '../types';
import { cn, formatCurrency, formatDate, generateId } from '../lib/utils';
import { getInvoiceTemplate, getQuoteTemplate } from '../pdfTemplates';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface RecordsViewProps {
  type: RecordType;
  records: AppRecord[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<AppRecord>) => void;
  onAddDirectly: (record: AppRecord) => void;
  config: AppConfig;
}

export function RecordsView({ type, records, onAdd, onDelete, onUpdate, onAddDirectly, config }: RecordsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredRecords = records.filter(r => {
    const searchLower = searchTerm.toLowerCase();
    if (r.type !== type) return false;
    
    if (r.type === 'client') return r.name.toLowerCase().includes(searchLower) || r.company.toLowerCase().includes(searchLower);
    if (r.type === 'invoice' || r.type === 'quote') return r.clientName.toLowerCase().includes(searchLower) || r.description.toLowerCase().includes(searchLower);
    if (r.type === 'expense') return r.description.toLowerCase().includes(searchLower) || r.category.toLowerCase().includes(searchLower);
    return true;
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      onDelete(id);
    }
  };

  const convertToInvoice = (rec: Quote) => {
    const newInv: Invoice = {
      clientId: rec.clientId,
      clientName: rec.clientName,
      description: rec.description,
      quantity: rec.quantity,
      unitPrice: rec.unitPrice,
      taxPercent: rec.taxPercent,
      total: rec.total,
      id: generateId(),
      type: 'invoice',
      status: 'pending',
      dateCreated: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    onAddDirectly(newInv);
  };

  const toggleInvoiceStatus = (rec: Invoice) => {
    onUpdate(rec.id, { status: rec.status === 'paid' ? 'pending' : 'paid' });
  };

  const cycleQuoteStatus = (rec: Quote) => {
    const next: Record<string, 'pending' | 'approved' | 'rejected'> = {
      pending: 'approved',
      approved: 'rejected',
      rejected: 'pending'
    };
    onUpdate(rec.id, { status: next[rec.status] || 'pending' });
  };

  const downloadPDF = (rec: any) => {
    const template = rec.type === 'invoice' ? getInvoiceTemplate(rec, config) : getQuoteTemplate(rec, config);
    const element = document.createElement('div');
    element.innerHTML = template;
    
    const opt: any = {
      margin: 10,
      filename: `${rec.type}-${rec.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const shareWhatsApp = (rec: any) => {
    const msg = `${config.companyName} - ${rec.type.toUpperCase()}\n` +
      `Cliente: ${rec.clientName}\n` +
      `Serviço: ${rec.description}\n` +
      `Total: ${formatCurrency(rec.total)}\n` +
      `Status: ${rec.status}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 capitalize">{type === 'invoice' ? 'Faturas' : type === 'quote' ? 'Orçamentos' : type === 'client' ? 'Clientes' : 'Despesas'}</h2>
          <p className="text-sm text-zinc-500">Gerencie seus registros de {type} com facilidade.</p>
        </div>
        <button 
          onClick={onAdd}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl font-bold text-sm shadow-md shadow-brand/10 hover:bg-brand-dark transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo {type === 'client' ? 'Cliente' : type === 'invoice' ? 'Fatura' : type === 'quote' ? 'Orçamento' : 'Despesa'}
        </button>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-zinc-400" />
        <input 
          type="text" 
          placeholder="Pesquisar registros..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredRecords.length > 0 ? filteredRecords.map(rec => (
          <div key={rec.id} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:border-brand/40 transition-all group">
            {type === 'client' && (
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center font-bold text-zinc-500 text-lg">
                    {(rec as Client).name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900">{(rec as Client).name}</h4>
                    <p className="text-xs text-zinc-500">{(rec as Client).company || 'Sem empresa'}</p>
                  </div>
                </div>
                <button onClick={() => onDelete(rec.id)} className="p-2 text-zinc-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {(type === 'invoice' || type === 'quote') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                    (rec as any).status === 'paid' || (rec as any).status === 'approved' ? "bg-green-100 text-green-700" : 
                    (rec as any).status === 'rejected' ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  )}>
                    {(rec as any).status}
                  </span>
                  <div className="flex gap-1">
                    {rec.type === 'invoice' && (
                      <button onClick={() => toggleInvoiceStatus(rec as Invoice)} className={cn("p-2 rounded-lg transition-colors", (rec as any).status === 'paid' ? "text-green-600 bg-green-50" : "text-yellow-600 bg-yellow-50")} title="Alterar Status">
                        { (rec as any).status === 'paid' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" /> }
                      </button>
                    )}
                    {rec.type === 'quote' && (
                      <button onClick={() => cycleQuoteStatus(rec as Quote)} className="p-2 text-blue-600 bg-blue-50 rounded-lg transition-colors" title="Ciclar Status">
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => downloadPDF(rec)} className="p-2 text-zinc-400 hover:text-brand transition-colors" title="Download PDF"><Download className="w-4 h-4" /></button>
                    <button onClick={() => shareWhatsApp(rec)} className="p-2 text-zinc-400 hover:text-green-500 transition-colors" title="Compartilhar WhatsApp"><MessageCircle className="w-4 h-4" /></button>
                    {rec.type === 'quote' && (
                      <button onClick={() => convertToInvoice(rec as Quote)} className="p-2 text-zinc-400 hover:text-blue-500 transition-colors" title="Converter em Fatura"><CheckCircle className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => handleDelete(rec.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900">{(rec as any).clientName}</h4>
                  <p className="text-xs text-zinc-500 line-clamp-1">{(rec as any).description}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Total</p>
                    <p className="text-lg font-black text-brand">{formatCurrency((rec as any).total)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Emitido em</p>
                    <p className="text-xs font-semibold text-zinc-700">{formatDate(rec.dateCreated)}</p>
                  </div>
                </div>
              </div>
            )}

            {type === 'expense' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <span className="px-2 py-1 rounded-md bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider">
                    {(rec as Expense).category}
                  </span>
                  <button onClick={() => handleDelete(rec.id)} className="p-2 text-zinc-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900">{(rec as Expense).description}</h4>
                  <p className="text-xs text-zinc-500">{formatDate(rec.dateCreated)}</p>
                </div>
                <div className="pt-4 border-t border-zinc-100">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">Valor Pago</p>
                  <p className="text-lg font-black text-red-500">{formatCurrency((rec as Expense).total)}</p>
                </div>
              </div>
            )}
          </div>
        )) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-400">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 opacity-20" />
            </div>
            <p className="font-medium">Nenhum registro encontrado</p>
            <p className="text-xs opacity-60">Comece criando um novo registro para ver dados aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
}
