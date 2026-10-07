/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-ignore - html2pdf não tem tipos
import html2pdf from 'html2pdf.js';
import { AppConfig, Client, Invoice, Quote } from '../types';
import { getInvoiceTemplate, getQuoteTemplate } from '../pdfTemplates';
import { buildPixPayload } from './pix';
import { qrToDataUrl } from './qr';
import { displayNumber } from './billing';
import { stripAccents } from './utils';

export const hasPix = (config: AppConfig) => !!config.pixKey?.trim();

/** Código PIX copia e cola com o valor da fatura. */
export function pixCodeFor(inv: Invoice, config: AppConfig): string | undefined {
  if (!hasPix(config)) return undefined;
  try {
    return buildPixPayload({
      key: config.pixKey!,
      keyType: config.pixKeyType,
      name: config.pixName || config.companyName,
      city: config.pixCity || 'SAO PAULO',
      amount: inv.total,
      txid: (inv.number || inv.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 25),
    });
  } catch (err) {
    console.error('Erro ao gerar PIX:', err);
    return undefined;
  }
}

function fileName(rec: Invoice | Quote) {
  const kind = rec.type === 'invoice' ? 'fatura' : 'orcamento';
  const client = stripAccents(rec.clientName || '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 30);
  return `${kind}-${displayNumber(rec).replace('#', '')}${client ? '-' + client : ''}.pdf`;
}

function buildHtml(rec: Invoice | Quote, config: AppConfig, client?: Client): string {
  if (rec.type === 'invoice') {
    const pixCode = rec.status !== 'paid' ? pixCodeFor(rec, config) : undefined;
    const pixQr = pixCode ? qrToDataUrl(pixCode, 6) : undefined;
    return getInvoiceTemplate(rec, config, { client, pixCode, pixQr });
  }
  return getQuoteTemplate(rec, config, { client });
}

const PDF_OPTIONS = {
  margin: [8, 8, 10, 8],
  image: { type: 'jpeg', quality: 0.96 },
  html2canvas: { scale: 2, useCORS: true },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  pagebreak: { mode: ['css', 'legacy'] },
};

export async function downloadDocumentPdf(rec: Invoice | Quote, config: AppConfig, client?: Client) {
  const element = document.createElement('div');
  element.innerHTML = buildHtml(rec, config, client);
  await html2pdf().set({ ...PDF_OPTIONS, filename: fileName(rec) }).from(element).save();
}

/** Gera o PDF como arquivo (para compartilhar no celular). */
export async function documentPdfFile(rec: Invoice | Quote, config: AppConfig, client?: Client): Promise<File> {
  const element = document.createElement('div');
  element.innerHTML = buildHtml(rec, config, client);
  const blob: Blob = await html2pdf().set({ ...PDF_OPTIONS, filename: fileName(rec) }).from(element).outputPdf('blob');
  return new File([blob], fileName(rec), { type: 'application/pdf' });
}

/** Compartilha o PDF pelo menu nativo do celular (WhatsApp, e-mail...). Retorna false se não suportado. */
export async function shareDocumentPdf(rec: Invoice | Quote, config: AppConfig, client?: Client, text?: string): Promise<boolean> {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (!nav.share || !nav.canShare) return false;
  const file = await documentPdfFile(rec, config, client);
  const data: ShareData = { files: [file], title: file.name, text };
  if (!nav.canShare(data)) return false;
  try {
    await nav.share(data);
  } catch (err) {
    if ((err as Error).name !== 'AbortError') throw err;
  }
  return true;
}
