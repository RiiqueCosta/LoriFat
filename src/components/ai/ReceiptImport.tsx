/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { extractExpense } from '../../lib/ai';
import type { ExpensePrefill } from '../forms/ExpenseForm';
import { AiInputPicker } from './AiInputPicker';

/** Lê um cupom/nota/recibo com IA e devolve os dados da despesa. */
export function ReceiptImport({ onCancel, onResult }: { onCancel: () => void; onResult: (p: ExpensePrefill) => void }) {
  return (
    <AiInputPicker
      intro="Tire uma foto do cupom fiscal, nota ou recibo. A IA identifica o valor, a data e a categoria."
      allowAudio={false}
      fileHint="Foto (JPG/PNG) ou PDF do comprovante · até 15 MB"
      textPlaceholder="Cole o texto do comprovante ou do e-mail de cobrança"
      analyzeLabel="Ler comprovante"
      loadingLabel="Lendo comprovante..."
      onCancel={onCancel}
      onAnalyze={async input => {
        const r = await extractExpense(input);
        onResult({ description: r.description, total: r.total, category: r.category, date: r.date || undefined, fromAI: true });
      }}
    />
  );
}
