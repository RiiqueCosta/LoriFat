/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RecordType = 'invoice' | 'quote' | 'client' | 'expense' | 'note';

export interface BaseRecord {
  id: string;
  type: RecordType;
  dateCreated: string;
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
}

export interface Expense extends BaseRecord {
  type: 'expense';
  description: string;
  total: number;
  category: string;
}

export type AppRecord = Client | Invoice | Quote | Expense;

export interface AppConfig {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyCnpj: string;
  theme: 'light' | 'dark';
}
