/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { formatCurrency, formatDate, escapeHtml as e } from './lib/utils';
import { getItems, calcTotals } from './lib/billing';
import { Invoice, Quote, AppConfig } from './types';

const nl2br = (text: string) => e(text).replace(/\n/g, '<br/>');

const header = (config: AppConfig, title: string, id: string) => `
    <div style="border-bottom: 3px solid #ff7a00; padding-bottom: 20px; margin-bottom: 30px;">
      <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #ff7a00;">${e(config.companyName)}</h1>
          <p style="margin: 8px 0 0; font-size: 13px; color: #555;">${e(config.companyEmail)}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #555;">Tel: ${e(config.companyPhone)}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #777;">CNPJ: ${e(config.companyCnpj)}</p>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 28px; font-weight: bold; color: #333;">${title}</h2>
          <p style="margin: 8px 0 0; font-size: 13px; color: #666;">Nº ${e(id.toUpperCase())}</p>
        </div>
      </div>
    </div>`;

const infoRow = (label: string, value: string) => `
          <tr>
            <td style="padding: 6px 12px 6px 0; font-size: 12px; color: #666;"><strong>${label}</strong></td>
            <td style="padding: 6px 0; font-size: 12px; color: #1a1a1a;">${value}</td>
          </tr>`;

const itemsTable = (rec: Invoice | Quote) => {
  const th = 'padding: 14px 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #333;';
  const td = 'padding: 12px; font-size: 13px; color: #333; vertical-align: top;';
  const rows = getItems(rec).map(item => `
        <tr style="border-bottom: 1px solid #ddd; page-break-inside: avoid;">
          <td style="${td}">${nl2br(item.description)}</td>
          <td style="${td} text-align: center;">${item.quantity}</td>
          <td style="${td} text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="${td} text-align: right; font-weight: bold;">${formatCurrency(item.quantity * item.unitPrice)}</td>
        </tr>`).join('');
  return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
      <thead>
        <tr style="background: #f8f8f8; border-bottom: 2px solid #ff7a00;">
          <th style="${th} text-align: left;">Descrição do Serviço</th>
          <th style="${th} text-align: center; width: 80px;">Qtd.</th>
          <th style="${th} text-align: right; width: 110px;">Valor Unit.</th>
          <th style="${th} text-align: right; width: 110px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}
      </tbody>
    </table>`;
};

const totalsBlock = (rec: Invoice | Quote, totalLabel: string) => {
  const t = calcTotals(getItems(rec), rec.taxPercent, rec.discount);
  const line = (label: string, value: string) => `
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 12px 0; border-bottom: 1px solid #ddd;">
          <span style="font-size: 13px; color: #666;">${label}</span>
          <span style="font-size: 13px; color: #333; font-weight: bold;">${value}</span>
        </div>`;
  return `
    <div style="display: grid; grid-template-columns: 1fr 280px; gap: 30px; margin-bottom: 40px; page-break-inside: avoid;">
      <div></div>
      <div>
        ${line('Subtotal:', formatCurrency(t.subtotal))}
        ${t.discount > 0 ? line('Desconto:', '- ' + formatCurrency(t.discount)) : ''}
        ${rec.taxPercent > 0 ? line(`Imposto (${rec.taxPercent}%):`, formatCurrency(t.tax)) : ''}
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 16px 0; border-top: 3px solid #ff7a00;">
          <span style="font-size: 14px; font-weight: bold; color: #1a1a1a;">${totalLabel}</span>
          <span style="font-size: 18px; font-weight: bold; color: #ff7a00;">${formatCurrency(rec.total)}</span>
        </div>
      </div>
    </div>`;
};

const footer = (title: string, defaultText: string, notes?: string) => `
    <div style="border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 12px; line-height: 1.6; page-break-inside: avoid;">
      <p style="margin: 0 0 8px; font-weight: bold; color: #1a1a1a;">${title}</p>
      <p style="margin: 0;">${notes && notes.trim() ? nl2br(notes) : defaultText}</p>
    </div>`;

export const getInvoiceTemplate = (rec: Invoice, config: AppConfig) => `
  <div style="font-family: 'Arial', sans-serif; padding: 40px; background: white; color: #1a1a1a;">
    ${header(config, 'FATURA', rec.id)}
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #ddd;">
      <div>
        <h3 style="margin: 0 0 12px; font-size: 11px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Faturar Para:</h3>
        <p style="margin: 0 0 6px; font-weight: bold; font-size: 15px; color: #1a1a1a;">${e(rec.clientName)}</p>
      </div>
      <div style="text-align: right;">
        <table style="width: 100%; border-collapse: collapse; margin-left: auto;">
          ${infoRow('Data de Emissão:', formatDate(rec.dateCreated))}
          ${infoRow('Data de Vencimento:', formatDate(rec.dueDate))}
          ${infoRow('Status:', `<b>${rec.status === 'paid' ? '✓ PAGO' : 'PENDENTE'}</b>`)}
        </table>
      </div>
    </div>
    ${itemsTable(rec)}
    ${totalsBlock(rec, 'TOTAL A PAGAR:')}
    ${footer('Termos e Condições:', 'Favor realizar o pagamento até a data de vencimento indicada acima. Em caso de dúvidas, entre em contato conosco.', rec.notes)}
  </div>
`;

export const getQuoteTemplate = (rec: Quote, config: AppConfig) => `
  <div style="font-family: 'Arial', sans-serif; padding: 40px; background: white; color: #1a1a1a;">
    ${header(config, 'ORÇAMENTO', rec.id)}
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #ddd;">
      <div>
        <h3 style="margin: 0 0 12px; font-size: 11px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Cliente:</h3>
        <p style="margin: 0 0 6px; font-weight: bold; font-size: 15px; color: #1a1a1a;">${e(rec.clientName)}</p>
      </div>
      <div style="text-align: right;">
        <table style="width: 100%; border-collapse: collapse; margin-left: auto;">
          ${infoRow('Data de Emissão:', formatDate(rec.dateCreated))}
          ${infoRow('Validade:', '30 dias')}
        </table>
      </div>
    </div>
    ${itemsTable(rec)}
    ${totalsBlock(rec, 'TOTAL ESTIMADO:')}
    ${footer('Observações:', 'Este orçamento é válido por 30 dias. Valores podem sofrer alterações caso os requisitos do projeto mudem.', rec.notes)}
  </div>
`;
