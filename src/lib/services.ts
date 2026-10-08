/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo de serviços: busca, ligação de itens e estatísticas de vendas.
 */

import { createContext, useContext } from 'react';
import { AppRecord, Invoice, LineItem, Service, SERVICE_UNITS, ServiceUnit } from '../types';
import { getItems, invoiceStatus } from './billing';
import { normalizeText } from './utils';

export const ServicesContext = createContext<Service[]>([]);
export const useServices = () => useContext(ServicesContext);

export function activeServices(records: AppRecord[]): Service[] {
  return records
    .filter((r): r is Service => r.type === 'service')
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function unitShort(unit?: ServiceUnit) {
  return SERVICE_UNITS.find(u => u.value === unit)?.short || 'serviço';
}

/** Texto do item quando um serviço do catálogo é escolhido. */
export function serviceItemText(s: Service) {
  return s.description?.trim() ? `${s.name} — ${s.description.trim()}` : s.name;
}

export function itemFromService(s: Service, quantity = 1): LineItem {
  return { description: serviceItemText(s), quantity, unitPrice: Number(s.price) || 0, serviceId: s.id };
}

const words = (t: string) => normalizeText(t).split(/[^a-z0-9]+/).filter(w => w.length > 2);

/**
 * Encontra o serviço do catálogo que corresponde à descrição de um item.
 * Nome exato ou contido na descrição vence; senão, a maior sobreposição de palavras (mín. 60%).
 */
export function matchService(services: Service[], description: string): Service | undefined {
  const d = normalizeText(description);
  if (!d) return undefined;
  const pool = services.filter(s => s.active !== false);
  const exact = pool.find(s => normalizeText(s.name) === d || normalizeText(serviceItemText(s)) === d);
  if (exact) return exact;
  const contained = pool
    .filter(s => normalizeText(s.name).length >= 4 && d.includes(normalizeText(s.name)))
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (contained) return contained;
  const dw = new Set(words(description));
  let best: { s: Service; score: number } | undefined;
  for (const s of pool) {
    const sw = words(s.name);
    if (!sw.length) continue;
    const score = sw.filter(w => dw.has(w)).length / sw.length;
    if (score >= 0.6 && (!best || score > best.score)) best = { s, score };
  }
  return best?.s;
}

/** Liga itens (ex.: vindos da IA) aos serviços do catálogo; preenche o preço se veio zerado. */
export function linkItemsToServices(items: LineItem[], services: Service[]): { items: LineItem[]; linked: number } {
  let linked = 0;
  const out = items.map(it => {
    if (it.serviceId) return it;
    const s = matchService(services, it.description);
    if (!s) return it;
    linked++;
    return { ...it, serviceId: s.id, unitPrice: it.unitPrice || Number(s.price) || 0 };
  });
  return { items: out, linked };
}

export interface ServiceStats {
  /** Valor faturado (todas as faturas). */
  invoiced: number;
  /** Valor já recebido. */
  received: number;
  quantity: number;
  invoiceCount: number;
  quoteCount: number;
  lastSold: string;
}

const emptyStats = (): ServiceStats => ({ invoiced: 0, received: 0, quantity: 0, invoiceCount: 0, quoteCount: 0, lastSold: '' });

/** Estatísticas de vendas por serviço, a partir dos itens das faturas e orçamentos. */
export function serviceStats(services: Service[], records: AppRecord[]): Map<string, ServiceStats> {
  const map = new Map(services.map(s => [s.id, emptyStats()]));
  const byId = new Set(services.map(s => s.id));
  const resolve = (it: LineItem) => (it.serviceId && byId.has(it.serviceId) ? it.serviceId : matchService(services, it.description)?.id);

  for (const r of records) {
    if (r.type !== 'invoice' && r.type !== 'quote') continue;
    const seen = new Set<string>();
    for (const it of getItems(r)) {
      const id = resolve(it);
      if (!id) continue;
      const st = map.get(id)!;
      if (r.type === 'quote') {
        if (!seen.has(id)) st.quoteCount++;
      } else {
        const value = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
        st.invoiced += value;
        if (invoiceStatus(r as Invoice) === 'paid') st.received += value;
        st.quantity += Number(it.quantity) || 0;
        if (!seen.has(id)) st.invoiceCount++;
        const d = String(r.dateCreated).slice(0, 10);
        if (d > st.lastSold) st.lastSold = d;
      }
      seen.add(id);
    }
  }
  return map;
}
