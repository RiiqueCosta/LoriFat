/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { formatCurrency, formatDate, escapeHtml as e } from './lib/utils';
import { getItems, calcTotals, displayNumber, quoteValidUntil, invoiceStatus } from './lib/billing';
import { Invoice, Quote, AppConfig, Client } from './types';

const nl2br = (text: string) => e(text).replace(/\n/g, '<br/>');
const BRAND = '#ff7a00';
const SYSTEM_NAME = 'Lori Faturamento';

const header = (config: AppConfig, title: string, number: string) => `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:24px; padding-bottom:22px; border-bottom:3px solid ${BRAND}; margin-bottom:28px;">
      <div style="display:flex; gap:16px; align-items:flex-start;">
        ${config.logo ? `<img src="${config.logo}" style="width:64px; height:64px; object-fit:contain; border-radius:10px;" />` : ''}
        <div>
          <h1 style="margin:0; font-size:24px; font-weight:bold; color:#18181b;">${e(config.companyName)}</h1>
          ${config.companyCnpj ? `<p style="margin:6px 0 0; font-size:12px; color:#555;">CNPJ: ${e(config.companyCnpj)}</p>` : ''}
          <p style="margin:3px 0 0; font-size:12px; color:#555;">${[config.companyEmail, config.companyPhone].filter(Boolean).map(e).join(' · ')}</p>
          ${config.companyAddress ? `<p style="margin:3px 0 0; font-size:12px; color:#777;">${e(config.companyAddress)}</p>` : ''}
        </div>
      </div>
      <div style="text-align:right; white-space:nowrap;">
        <p style="margin:0; font-size:11px; font-weight:bold; letter-spacing:2px; color:${BRAND};">${title}</p>
        <p style="margin:6px 0 0; font-size:20px; font-weight:bold; color:#18181b;">${e(number)}</p>
      </div>
    </div>`;

const clientBlock = (label: string, rec: Invoice | Quote, client?: Client) => `
      <div>
        <p style="margin:0 0 8px; font-size:10px; font-weight:bold; color:#888; text-transform:uppercase; letter-spacing:1px;">${label}</p>
        <p style="margin:0; font-weight:bold; font-size:15px; color:#18181b;">${e(rec.clientName)}</p>
        ${client?.company && client.company !== rec.clientName ? `<p style="margin:3px 0 0; font-size:12px; color:#555;">${e(client.company)}</p>` : ''}
        ${client?.document ? `<p style="margin:3px 0 0; font-size:12px; color:#555;">CPF/CNPJ: ${e(client.document)}</p>` : ''}
        ${client?.email || client?.phone ? `<p style="margin:3px 0 0; font-size:12px; color:#555;">${[client.email, client.phone].filter(Boolean).map(x => e(x)).join(' · ')}</p>` : ''}
        ${client?.address ? `<p style="margin:3px 0 0; font-size:12px; color:#777;">${e(client.address)}</p>` : ''}
      </div>`;

const infoTable = (rows: [string, string][]) => `
      <table style="border-collapse:collapse; margin-left:auto;">
        ${rows.map(([k, v]) => `
          <tr>
            <td style="padding:4px 14px 4px 0; font-size:12px; color:#888;">${k}</td>
            <td style="padding:4px 0; font-size:12px; color:#18181b; font-weight:bold; text-align:right;">${v}</td>
          </tr>`).join('')}
      </table>`;

const itemsTable = (rec: Invoice | Quote) => {
  const th = 'padding:12px 10px; font-size:10px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; color:#555;';
  const td = 'padding:12px 10px; font-size:13px; color:#27272a; vertical-align:top;';
  const rows = getItems(rec).map((item, i) => `
        <tr style="border-bottom:1px solid #eee; page-break-inside:avoid; ${i % 2 ? 'background:#fafafa;' : ''}">
          <td style="${td}">${nl2br(item.description)}</td>
          <td style="${td} text-align:center;">${item.quantity}</td>
          <td style="${td} text-align:right;">${formatCurrency(item.unitPrice)}</td>
          <td style="${td} text-align:right; font-weight:bold;">${formatCurrency(item.quantity * item.unitPrice)}</td>
        </tr>`).join('');
  return `
    <table style="width:100%; border-collapse:collapse; margin:26px 0;">
      <thead>
        <tr style="background:#f4f4f5;">
          <th style="${th} text-align:left; border-radius:8px 0 0 8px;">Descrição</th>
          <th style="${th} text-align:center; width:60px;">Qtd.</th>
          <th style="${th} text-align:right; width:110px;">Valor unit.</th>
          <th style="${th} text-align:right; width:110px; border-radius:0 8px 8px 0;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
};

const totalsBlock = (rec: Invoice | Quote, totalLabel: string, left = '') => {
  const t = calcTotals(getItems(rec), rec.taxPercent, rec.discount);
  const line = (label: string, value: string) => `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee; font-size:13px;">
          <span style="color:#666;">${label}</span><span style="color:#27272a; font-weight:bold;">${value}</span>
        </div>`;
  return `
    <div style="display:flex; justify-content:space-between; gap:30px; margin-bottom:30px; page-break-inside:avoid;">
      <div style="flex:1;">${left}</div>
      <div style="width:280px;">
        ${line('Subtotal', formatCurrency(t.subtotal))}
        ${t.discount > 0 ? line('Desconto', '- ' + formatCurrency(t.discount)) : ''}
        ${rec.taxPercent > 0 ? line(`Impostos (${rec.taxPercent}%)`, formatCurrency(t.tax)) : ''}
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding:14px 16px; background:${BRAND}; border-radius:10px; color:white;">
          <span style="font-size:12px; font-weight:bold; letter-spacing:0.5px;">${totalLabel}</span>
          <span style="font-size:20px; font-weight:bold;">${formatCurrency(rec.total)}</span>
        </div>
      </div>
    </div>`;
};

const pixBlock = (qrDataUrl: string, pixCode: string, config: AppConfig) => `
      <div style="display:flex; gap:14px; align-items:flex-start; padding:14px; border:1px solid #eee; border-radius:12px;">
        <img src="${qrDataUrl}" style="width:120px; height:120px;" />
        <div style="flex:1; min-width:0;">
          <p style="margin:0 0 4px; font-size:12px; font-weight:bold; color:#18181b;">Pague com PIX</p>
          <p style="margin:0 0 8px; font-size:11px; color:#666;">Aponte a câmera do app do banco para o QR Code ou use o código abaixo.</p>
          ${config.pixKey ? `<p style="margin:0 0 6px; font-size:11px; color:#444;">Chave: <b>${e(config.pixKey)}</b></p>` : ''}
          <p style="margin:0; font-size:8px; color:#777; word-break:break-all; line-height:1.4;">${e(pixCode)}</p>
        </div>
      </div>`;

const footer = (title: string, text: string) => `
    <div style="border-top:1px solid #eee; padding-top:18px; color:#555; font-size:12px; line-height:1.6; page-break-inside:avoid;">
      <p style="margin:0 0 6px; font-weight:bold; color:#18181b;">${title}</p>
      <p style="margin:0;">${nl2br(text)}</p>
    </div>
    <p style="margin-top:28px; text-align:center; font-size:10px; color:#aaa;">Documento gerado por ${SYSTEM_NAME}</p>`;

export interface PdfExtras {
  client?: Client;
  pixCode?: string;
  pixQr?: string;
}

export const getInvoiceTemplate = (rec: Invoice, config: AppConfig, extras: PdfExtras = {}) => {
  const status = invoiceStatus(rec);
  const statusLabel = status === 'paid' ? '<span style="color:#16a34a;">PAGO</span>' : status === 'overdue' ? '<span style="color:#dc2626;">VENCIDA</span>' : 'EM ABERTO';
  const terms = rec.notes?.trim() || config.invoiceTerms?.trim() || 'Favor realizar o pagamento até a data de vencimento. Em caso de dúvidas, entre em contato conosco.';
  const pix = status !== 'paid' && extras.pixQr && extras.pixCode ? pixBlock(extras.pixQr, extras.pixCode, config) : '';
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; padding: 36px 40px; background: white; color: #18181b;">
    ${header(config, 'FATURA', displayNumber(rec))}
    <div style="display:flex; justify-content:space-between; gap:30px;">
      ${clientBlock('Faturar para', rec, extras.client)}
      ${infoTable([
        ['Emissão', formatDate(rec.dateCreated)],
        ['Vencimento', formatDate(rec.dueDate)],
        ['Status', statusLabel],
        ...(rec.paidAt ? [['Pago em', formatDate(rec.paidAt)] as [string, string]] : []),
      ])}
    </div>
    ${itemsTable(rec)}
    ${totalsBlock(rec, 'TOTAL A PAGAR', pix)}
    ${footer('Termos e condições', terms)}
  </div>`;
};

export const getQuoteTemplate = (rec: Quote, config: AppConfig, extras: PdfExtras = {}) => {
  const terms = rec.notes?.trim() || config.quoteTerms?.trim() || 'Valores sujeitos a alteração caso o escopo do projeto mude.';
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; padding: 36px 40px; background: white; color: #18181b;">
    ${header(config, 'ORÇAMENTO', displayNumber(rec))}
    <div style="display:flex; justify-content:space-between; gap:30px;">
      ${clientBlock('Cliente', rec, extras.client)}
      ${infoTable([
        ['Emissão', formatDate(rec.dateCreated)],
        ['Válido até', formatDate(quoteValidUntil(rec, config))],
      ])}
    </div>
    ${itemsTable(rec)}
    ${totalsBlock(rec, 'TOTAL ESTIMADO')}
    ${footer('Observações', terms)}
  </div>`;
};
