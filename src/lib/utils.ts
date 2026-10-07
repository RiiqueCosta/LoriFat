/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatCurrency = (value: number) => currencyFmt.format(Number(value) || 0);

/** Valor compacto para gráficos: R$ 1,2 mil */
export const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);

// ---------------------------------------------------------------------------
// Datas — sempre no fuso local. "AAAA-MM-DD" é tratado como data local
// (new Date('2026-10-07') seria meia-noite UTC = dia anterior no Brasil).
// ---------------------------------------------------------------------------

/** Converte "AAAA-MM-DD" ou ISO completo em Date local. */
export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Date → "AAAA-MM-DD" (local). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Normaliza qualquer data salva para "AAAA-MM-DD". */
export function dateKey(value?: string | null): string {
  const d = parseDate(value);
  return d ? toISODate(d) : '';
}

export const todayISO = () => toISODate(new Date());

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso) || new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Soma meses mantendo o dia (limitado ao último dia do mês). */
export function addMonths(iso: string, months: number, day?: number): string {
  const d = parseDate(iso) || new Date();
  const targetDay = day ?? d.getDate();
  const first = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(targetDay, last));
  return toISODate(first);
}

/** Diferença em dias (b - a). */
export function diffDays(a: string, b: string): number {
  const da = parseDate(a), db = parseDate(b);
  if (!da || !db) return 0;
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export const formatDate = (date?: string | null) => {
  const d = parseDate(date);
  return d ? d.toLocaleDateString('pt-BR') : '-';
};

export const formatDateLong = (date?: string | null) => {
  const d = parseDate(date);
  return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
};

/** "2026-10" */
export const monthKey = (date?: string | null) => dateKey(date).slice(0, 7);

/** "out/26" */
export function monthLabel(key: string, long = false): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  const d = new Date(y, m - 1, 1);
  return long
    ? d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').replace(' de ', '/');
}

/** Últimos N meses (chaves "AAAA-MM"), do mais antigo ao atual. */
export function lastMonths(n: number, from = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Diversos
// ---------------------------------------------------------------------------

export const generateId = () => {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '')
    : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return rand.slice(0, 20);
};

export const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const onlyDigits = (s?: string) => (s || '').replace(/\D/g, '');

/** Número para wa.me: adiciona 55 quando for número brasileiro sem DDI. */
export function whatsappNumber(phone?: string): string {
  const d = onlyDigits(phone);
  if (!d) return '';
  if (d.length === 10 || d.length === 11) return '55' + d;
  return d;
}

export function openWhatsApp(text: string, phone?: string) {
  const num = whatsappNumber(phone);
  const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener');
}

export function initials(name?: string | null): string {
  const parts = (name || '').trim().split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

/** Remove acentos e caracteres especiais. */
export const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export const normalizeText = (s?: string) => stripAccents((s || '').toLowerCase()).trim();

export function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copia texto para a área de transferência. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Saudação conforme o horário. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
