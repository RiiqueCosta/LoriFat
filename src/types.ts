/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RecordType = 'invoice' | 'quote' | 'client' | 'expense' | 'note';

export interface BaseRecord {
  id: string;
  type: RecordType;
  dateCreated: string;
  ownerId: string;
}

export interface Note extends BaseRecord {
  type: 'note';
  title: string;
}

export interface Client extends BaseRecord {
  type: 'client';
  name: string;
  email: string;
  phone: string;
  company: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice extends BaseRecord {
  type: 'invoice';
  clientId: string;
  clientName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  total: number;
  status: 'pending' | 'paid';
  dueDate: string;
  /** Lista de itens (novo). Registros antigos usam apenas description/quantity/unitPrice. */
  items?: LineItem[];
  /** Desconto em R$ aplicado sobre o subtotal. */
  discount?: number;
  /** Observações / condições exibidas no PDF. */
  notes?: string;
}

export interface Quote extends BaseRecord {
  type: 'quote';
  clientId: string;
  clientName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected';
  /** Lista de itens (novo). Registros antigos usam apenas description/quantity/unitPrice. */
  items?: LineItem[];
  /** Desconto em R$ aplicado sobre o subtotal. */
  discount?: number;
  /** Observações / condições exibidas no PDF. */
  notes?: string;
}

export interface Expense extends BaseRecord {
  type: 'expense';
  description: string;
  total: number;
  category: string;
}

export type AppRecord = Client | Invoice | Quote | Expense | Note;

export interface AppConfig {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyCnpj: string;
  theme: 'light' | 'dark';
}
