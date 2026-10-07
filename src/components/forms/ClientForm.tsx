/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Client } from '../../types';
import { generateId, todayISO } from '../../lib/utils';
import { Field, Input, Textarea } from '../ui';
import { FormActions } from './shared';

export function ClientForm({ initial, onCancel, onSubmit }: {
  initial?: Client; onCancel: () => void; onSubmit: (c: Client) => Promise<void> | void;
}) {
  const [data, setData] = useState({
    name: initial?.name || '',
    company: initial?.company || '',
    document: initial?.document || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    address: initial?.address || '',
    notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setData(d => ({ ...d, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const trimmed = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.trim()])) as typeof data;
      await onSubmit({
        ...(initial || {}),
        id: initial?.id || generateId(),
        type: 'client',
        ownerId: initial?.ownerId || '',
        dateCreated: initial?.dateCreated || todayISO(),
        ...trimmed,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nome *" className="sm:col-span-2">
          <Input required autoFocus value={data.name} onChange={set('name')} placeholder="Ex.: João Silva" />
        </Field>
        <Field label="Empresa">
          <Input value={data.company} onChange={set('company')} placeholder="Ex.: Tech Solutions" />
        </Field>
        <Field label="CPF / CNPJ">
          <Input value={data.document} onChange={set('document')} placeholder="00.000.000/0000-00" inputMode="numeric" />
        </Field>
        <Field label="E-mail">
          <Input type="email" value={data.email} onChange={set('email')} placeholder="joao@email.com" />
        </Field>
        <Field label="WhatsApp / telefone" hint="Usado no botão de cobrança">
          <Input type="tel" value={data.phone} onChange={set('phone')} placeholder="(11) 99999-9999" />
        </Field>
        <Field label="Endereço" className="sm:col-span-2">
          <Input value={data.address} onChange={set('address')} placeholder="Rua, número, bairro, cidade" />
        </Field>
        <Field label="Anotações" className="sm:col-span-2">
          <Textarea value={data.notes} onChange={set('notes')} rows={3} placeholder="Equipamentos, senhas de Wi-Fi, preferências..." />
        </Field>
      </div>
      <FormActions onCancel={onCancel} loading={saving} submitLabel={initial ? 'Salvar alterações' : 'Cadastrar cliente'} />
    </form>
  );
}
