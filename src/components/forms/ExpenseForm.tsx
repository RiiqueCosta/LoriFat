/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Expense, EXPENSE_CATEGORIES } from '../../types';
import { dateKey, generateId, todayISO } from '../../lib/utils';
import { Field, Input, MoneyInput } from '../ui';
import { FormActions } from './shared';

export interface ExpensePrefill { description?: string; total?: number; category?: string; date?: string; fromAI?: boolean }

export function ExpenseForm({ initial, prefill, onCancel, onSubmit }: {
  initial?: Expense; prefill?: ExpensePrefill; onCancel: () => void; onSubmit: (e: Expense) => Promise<void> | void;
}) {
  const [description, setDescription] = useState(initial?.description || prefill?.description || '');
  const [total, setTotal] = useState<number>(initial?.total ?? prefill?.total ?? 0);
  const [category, setCategory] = useState(initial?.category || prefill?.category || '');
  const [date, setDate] = useState(dateKey(initial?.dateCreated) || prefill?.date || todayISO());
  const [saving, setSaving] = useState(false);

  const categories: string[] = [...EXPENSE_CATEGORIES];
  if (category && !categories.includes(category)) categories.unshift(category);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...(initial || {}),
        id: initial?.id || generateId(),
        type: 'expense',
        ownerId: initial?.ownerId || '',
        dateCreated: date,
        description: description.trim(),
        total: Math.abs(total),
        category: category || 'Outros',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {prefill?.fromAI && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-xs text-violet-800 dark:text-violet-300">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Lido pela IA a partir do comprovante. Confira antes de salvar.</span>
        </div>
      )}
      <Field label="Descrição">
        <Input required autoFocus={!prefill} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex.: Assinatura Microsoft 365" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor">
          <MoneyInput required value={total} onChange={setTotal} />
        </Field>
        <Field label="Data">
          <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Categoria" hint={!category ? 'Sem categoria, será lançada como "Outros".' : undefined}>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={
                'h-8 px-3 rounded-full text-xs font-semibold border transition-colors ' +
                (category === c
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300')
              }
            >
              {c}
            </button>
          ))}
        </div>
      </Field>
      <FormActions onCancel={onCancel} loading={saving} submitLabel={initial ? 'Salvar alterações' : 'Lançar despesa'} />
    </form>
  );
}
