/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Service, SERVICE_UNITS, ServiceUnit } from '../../types';
import { generateId, todayISO } from '../../lib/utils';
import { Field, Input, MoneyInput, Select, Textarea, Toggle } from '../ui';
import { FormActions } from './shared';

export function ServiceForm({ initial, categories, onCancel, onSubmit }: {
  initial?: Service; categories: string[]; onCancel: () => void; onSubmit: (s: Service) => Promise<void> | void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [price, setPrice] = useState(initial?.price || 0);
  const [unit, setUnit] = useState<ServiceUnit>(initial?.unit || 'servico');
  const [category, setCategory] = useState(initial?.category || '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...(initial || {}),
        id: initial?.id || generateId(),
        type: 'service',
        ownerId: initial?.ownerId || '',
        dateCreated: initial?.dateCreated || todayISO(),
        name: name.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        unit,
        category: category.trim(),
        active,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nome do serviço *" className="sm:col-span-2">
          <Input required autoFocus maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Formatação de computador" />
        </Field>
        <Field label="Preço padrão" hint="Pode ser alterado em cada fatura">
          <MoneyInput value={price} onChange={setPrice} />
        </Field>
        <Field label="Cobrança">
          <Select value={unit} onChange={e => setUnit(e.target.value as ServiceUnit)}>
            {SERVICE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </Select>
        </Field>
        <Field label="Categoria" className="sm:col-span-2">
          <Input list="service-categories" maxLength={60} value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex.: Suporte, Redes, Manutenção" />
          <datalist id="service-categories">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Descrição" hint="Vai junto no item da fatura" className="sm:col-span-2">
          <Textarea rows={3} maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} placeholder="O que está incluso, prazo, garantia..." />
        </Field>
      </div>
      <Toggle checked={active} onChange={setActive} label="Disponível para novas faturas" description="Desative para esconder do catálogo sem perder o histórico." />
      <FormActions onCancel={onCancel} loading={saving} submitLabel={initial ? 'Salvar alterações' : 'Cadastrar serviço'} />
    </form>
  );
}
