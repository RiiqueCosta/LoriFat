/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gera o "PIX copia e cola" (BR Code estático) conforme o Manual de
 * Padrões para Iniciação do PIX do Banco Central (EMV QRCPS-MPM).
 */

import { PixKeyType } from '../types';
import { onlyDigits, stripAccents } from './utils';

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF). */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Normaliza a chave PIX no formato exigido pelo BR Code. */
export function normalizePixKey(key: string, type?: PixKeyType): string {
  const k = (key || '').trim();
  const t = type || guessPixKeyType(k);
  switch (t) {
    case 'cpf':
    case 'cnpj':
      return onlyDigits(k);
    case 'phone': {
      const d = onlyDigits(k);
      if (k.startsWith('+')) return '+' + d;
      return '+' + (d.length <= 11 ? '55' + d : d);
    }
    case 'email':
      return k.toLowerCase();
    default:
      return k;
  }
}

export function guessPixKeyType(key: string): PixKeyType {
  const k = (key || '').trim();
  if (/@/.test(k)) return 'email';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return 'random';
  const d = onlyDigits(k);
  if (k.startsWith('+') || k.includes('(')) return 'phone';
  if (d.length === 14) return 'cnpj';
  if (d.length === 11) return 'cpf';
  if (d.length === 10) return 'phone';
  return 'random';
}

const sanitize = (s: string, max: number) =>
  stripAccents(s || '').replace(/[^A-Za-z0-9 .,\-/]/g, '').trim().slice(0, max);

export interface PixParams {
  key: string;
  keyType?: PixKeyType;
  name: string;
  city: string;
  amount?: number;
  /** Identificador da cobrança (até 25 caracteres alfanuméricos). */
  txid?: string;
}

export function buildPixPayload(p: PixParams): string {
  const key = normalizePixKey(p.key, p.keyType);
  const name = sanitize(p.name, 25) || 'RECEBEDOR';
  const city = sanitize(p.city, 15) || 'BRASIL';
  const txid = (p.txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

  let payload =
    field('00', '01') +
    field('26', field('00', 'br.gov.bcb.pix') + field('01', key)) +
    field('52', '0000') +
    field('53', '986');
  if (p.amount && p.amount > 0) payload += field('54', p.amount.toFixed(2));
  payload +=
    field('58', 'BR') +
    field('59', name) +
    field('60', city) +
    field('62', field('05', txid));
  payload += '6304';
  return payload + crc16(payload);
}

/** Valida se o código copia e cola tem CRC correto. */
export function isValidPixPayload(payload: string): boolean {
  if (payload.length < 8) return false;
  const body = payload.slice(0, -4);
  return body.endsWith('6304') && crc16(body) === payload.slice(-4).toUpperCase();
}
