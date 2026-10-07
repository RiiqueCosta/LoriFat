/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, FileCheck2, FileText, Sparkles } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { calcTotals } from '../../lib/billing';
import { extractProposal, ExtractedProposal } from '../../lib/ai';
import type { RecordPrefill } from '../forms/DocumentForm';
import { AiInputPicker } from './AiInputPicker';
import { Button } from '../ui';

export function ProposalImport({ onCancel, onConfirm }: {
  onCancel: () => void;
  onConfirm: (type: 'quote' | 'invoice', prefill: RecordPrefill) => void;
}) {
  const [result, setResult] = useState<ExtractedProposal | null>(null);
  const [showTranscription, setShowTranscription] = useState(false);

  if (!result) {
    return (
      <AiInputPicker
        intro="Envie uma proposta pronta e a IA transcreve e preenche cliente, itens e valores para você revisar."
        textPlaceholder="Cole aqui o texto da proposta (e-mail, WhatsApp, documento...)"
        loadingLabel="Lendo a proposta..."
        onCancel={onCancel}
        onAnalyze={async input => setResult(await extractProposal(input))}
      />
    );
  }

  const totals = calcTotals(result.items, result.taxPercent, result.discount);
  const confirm = (type: 'quote' | 'invoice') => onConfirm(type, {
    clientName: result.clientName,
    clientCompany: result.clientCompany,
    clientEmail: result.clientEmail,
    clientPhone: result.clientPhone,
    items: result.items,
    taxPercent: result.taxPercent,
    discount: result.discount,
    notes: result.notes,
    dueDate: result.dueDate || undefined,
    fromAI: true,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
        <Sparkles className="w-4 h-4" /> Proposta lida com sucesso
      </div>

      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Cliente</p>
        <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{result.clientName || result.clientCompany || 'Não identificado'}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {[result.clientCompany !== result.clientName ? result.clientCompany : '', result.clientEmail, result.clientPhone].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
        {result.items.length === 0 && <p className="p-4 text-sm text-zinc-500">Nenhum item com valor encontrado. Você poderá adicioná-los no próximo passo.</p>}
        {result.items.map((it, i) => (
          <div key={i} className="p-3 flex justify-between gap-3 text-sm">
            <div>
              <p className="text-zinc-800 dark:text-zinc-200">{it.description}</p>
              <p className="text-xs text-zinc-400">{it.quantity} × {formatCurrency(it.unitPrice)}</p>
            </div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap tabular-nums">{formatCurrency(it.quantity * it.unitPrice)}</p>
          </div>
        ))}
        <div className="p-3 flex justify-between text-sm font-bold">
          <span className="text-zinc-900 dark:text-zinc-100">Total</span>
          <span className="text-brand tabular-nums">{formatCurrency(totals.total)}</span>
        </div>
      </div>

      {result.transcription && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <button type="button" onClick={() => setShowTranscription(v => !v)} className="w-full p-3 flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Transcrição completa
            <ChevronDown className={cn('w-4 h-4 transition-transform', showTranscription && 'rotate-180')} />
          </button>
          {showTranscription && <p className="px-3 pb-3 text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto">{result.transcription}</p>}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-2">Criar como</p>
        <div className="grid grid-cols-2 gap-2">
          {(['quote', 'invoice'] as const).map(t => {
            const suggested = result.suggestedType === t;
            const Icon = t === 'quote' ? FileCheck2 : FileText;
            return (
              <button
                key={t}
                type="button"
                onClick={() => confirm(t)}
                className={cn('p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98]',
                  suggested ? 'border-brand bg-orange-50/60 dark:bg-brand/10' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300')}
              >
                <Icon className={cn('w-5 h-5 mb-2', suggested ? 'text-brand' : 'text-zinc-400')} />
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t === 'quote' ? 'Orçamento' : 'Fatura'}</p>
                {suggested && <p className="text-[11px] text-brand font-medium">Sugerido pela IA</p>}
              </button>
            );
          })}
        </div>
      </div>

      <Button variant="ghost" size="sm" block onClick={() => setResult(null)}>Ler outra proposta</Button>
    </div>
  );
}
