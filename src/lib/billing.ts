/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Invoice, LineItem, Quote } from '../types';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Retorna os itens do registro, convertendo registros antigos (1 item) para lista. */
export function getItems(rec: Partial<Invoice | Quote>): LineItem[] {
  if (rec.items && rec.items.length > 0) return rec.items;
  if (rec.description || rec.unitPrice) {
    return [{
      description: rec.description || '',
      quantity: Number(rec.quantity) || 1,
      unitPrice: Number(rec.unitPrice) || 0,
    }];
  }
  return [];
}

export function calcTotals(items: LineItem[], taxPercent = 0, discount = 0) {
  const subtotal = round2(items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0));
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const base = subtotal - safeDiscount;
  const tax = round2(base * (Number(taxPercent) || 0) / 100);
  const total = round2(base + tax);
  return { subtotal, discount: safeDiscount, tax, total };
}

/**
 * Monta os campos de valores de um orçamento/fatura a partir dos itens.
 * Mantém description/quantity/unitPrice preenchidos para compatibilidade
 * com telas e relatórios que ainda usam esses campos.
 */
export function buildPricingFields(items: LineItem[], taxPercent = 0, discount = 0) {
  const clean = items
    .map(i => ({
      description: (i.description || '').trim(),
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
    }))
    .filter(i => i.description || i.unitPrice);
  const totals = calcTotals(clean, taxPercent, discount);
  const summary = clean.length === 1
    ? clean[0].description
    : clean.map(i => i.description).filter(Boolean).join('; ');
  return {
    items: clean,
    description: summary.slice(0, 500),
    quantity: clean.length === 1 ? clean[0].quantity : 1,
    unitPrice: clean.length === 1 ? clean[0].unitPrice : totals.subtotal,
    taxPercent: Number(taxPercent) || 0,
    discount: totals.discount,
    total: totals.total,
  };
}
