/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RecordType = 'invoice' | 'quote' | 'client' | 'expense' | 'note' | 'recurring';

export interface BaseRecord {
  id: string;
  type: RecordType;
  /** Data de emissão/lançamento (AAAA-MM-DD) ou ISO completo em registros antigos. */
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
  /** CPF ou CNPJ */
  document?: string;
  address?: string;
  notes?: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface BillingFields {
  /** Número sequencial, ex.: FAT-2026-0001 */
  number?: string;
  clientId: string;
  clientName: string;
  /** Resumo dos itens (mantido para compatibilidade). */
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  total: number;
  /** Lista de itens. Registros antigos usam apenas description/quantity/unitPrice. */
  items?: LineItem[];
  /** Desconto em R$ aplicado sobre o subtotal. */
  discount?: number;
  /** Observações / condições exibidas no PDF. */
  notes?: string;
}

export interface Invoice extends BaseRecord, BillingFields {
  type: 'invoice';
  status: 'pending' | 'paid';
  dueDate: string;
  /** Data em que foi marcada como paga (AAAA-MM-DD). */
  paidAt?: string;
  /** Contrato recorrente que gerou esta fatura. */
  recurringId?: string;
}

export interface Quote extends BaseRecord, BillingFields {
  type: 'quote';
  status: 'pending' | 'approved' | 'rejected';
  /** Validade (AAAA-MM-DD). */
  validUntil?: string;
}

export interface Expense extends BaseRecord {
  type: 'expense';
  description: string;
  total: number;
  category: string;
}

/** Contrato de cobrança mensal que gera faturas automaticamente. */
export interface Recurring extends BaseRecord {
  type: 'recurring';
  clientId: string;
  clientName: string;
  title: string;
  items: LineItem[];
  taxPercent: number;
  discount: number;
  notes?: string;
  total: number;
  /** Dia do mês em que a fatura é emitida (1–28). */
  dayOfMonth: number;
  /** Dias até o vencimento após a emissão. */
  dueDays: number;
  /** Próxima data de emissão (AAAA-MM-DD). */
  nextDate: string;
  active: boolean;
  lastGenerated?: string;
}

export type AppRecord = Client | Invoice | Quote | Expense | Note | Recurring;

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

export interface AppConfig {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyCnpj: string;
  companyAddress?: string;
  theme: 'light' | 'dark';
  /** Logo em data URL (PNG reduzido). */
  logo?: string;
  pixKey?: string;
  pixKeyType?: PixKeyType;
  /** Nome do recebedor do PIX (até 25 caracteres, sem acentos). */
  pixName?: string;
  pixCity?: string;
  defaultDueDays?: number;
  quoteValidityDays?: number;
  invoiceTerms?: string;
  quoteTerms?: string;
  /** Mensagem de cobrança com variáveis {cliente}, {numero}, {valor}, {vencimento}, {empresa}. */
  chargeMessage?: string;
}

export const EXPENSE_CATEGORIES = [
  'Assinaturas',
  'Hardware',
  'Software',
  'Marketing',
  'Infraestrutura',
  'Transporte',
  'Alimentação',
  'Impostos',
  'Serviços',
  'Outros',
] as const;
