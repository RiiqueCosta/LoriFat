/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { formatCurrency, formatDate } from './lib/utils';
import { Invoice, Quote, AppConfig } from './types';

export const getInvoiceTemplate = (rec: Invoice, config: AppConfig) => `
  <div style="font-family: 'Arial', sans-serif; padding: 40px; background: white; color: #1a1a1a;">
    <div style="border-bottom: 3px solid #ff7a00; padding-bottom: 20px; margin-bottom: 30px;">
      <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #ff7a00;">${config.companyName}</h1>
          <p style="margin: 8px 0 0; font-size: 13px; color: #555;">${config.companyEmail}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #555;">Tel: ${config.companyPhone}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #777;">CNPJ: ${config.companyCnpj}</p>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 28px; font-weight: bold; color: #333;">FATURA</h2>
          <p style="margin: 8px 0 0; font-size: 13px; color: #666;">Nº ${rec.id.toUpperCase()}</p>
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #ddd;">
      <div>
        <h3 style="margin: 0 0 12px; font-size: 11px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Faturar Para:</h3>
        <p style="margin: 0 0 6px; font-weight: bold; font-size: 15px; color: #1a1a1a;">${rec.clientName}</p>
      </div>
      <div style="text-align: right;">
        <table style="width: 100%; border-collapse: collapse; margin-left: auto;">
          <tr>
            <td style="padding: 6px 12px 6px 0; font-size: 12px; color: #666;"><strong>Data de Emissão:</strong></td>
            <td style="padding: 6px 0; font-size: 12px; color: #1a1a1a;">${formatDate(rec.dateCreated)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; font-size: 12px; color: #666;"><strong>Data de Vencimento:</strong></td>
            <td style="padding: 6px 0; font-size: 12px; color: #1a1a1a;">${formatDate(rec.dueDate)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; font-size: 12px; color: #666;"><strong>Status:</strong></td>
            <td style="padding: 6px 0; font-size: 12px; color: #1a1a1a; font-weight: bold;">${rec.status === 'paid' ? '✓ PAGO' : 'PENDENTE'}</td>
          </tr>
        </table>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
      <thead>
        <tr style="background: #f8f8f8; border-bottom: 2px solid #ff7a00;">
          <th style="padding: 14px 12px; text-align: left; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #333;">Descrição do Serviço</th>
          <th style="padding: 14px 12px; text-align: center; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #333; width: 80px;">Quantidade</th>
          <th style="padding: 14px 12px; text-align: right; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #333; width: 100px;">Valor Unit.</th>
          <th style="padding: 14px 12px; text-align: right; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #333; width: 100px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 16px 12px; font-size: 13px; color: #333;">${rec.description}</td>
          <td style="padding: 16px 12px; text-align: center; font-size: 13px; color: #333;">${rec.quantity}</td>
          <td style="padding: 16px 12px; text-align: right; font-size: 13px; color: #333;">${formatCurrency(rec.unitPrice)}</td>
          <td style="padding: 16px 12px; text-align: right; font-size: 13px; color: #333; font-weight: bold;">${formatCurrency(rec.quantity * rec.unitPrice)}</td>
        </tr>
      </tbody>
    </table>

    <div style="display: grid; grid-template-columns: 1fr 280px; gap: 30px; margin-bottom: 40px;">
      <div></div>
      <div>
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 12px 0; border-bottom: 1px solid #ddd;">
          <span style="font-size: 13px; color: #666;">Subtotal:</span>
          <span style="font-size: 13px; color: #333; font-weight: bold;">${formatCurrency(rec.quantity * rec.unitPrice)}</span>
        </div>
        ${rec.taxPercent > 0 ? `
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 12px 0; border-bottom: 1px solid #ddd;">
          <span style="font-size: 13px; color: #666;">Imposto (${rec.taxPercent}%):</span>
          <span style="font-size: 13px; color: #333; font-weight: bold;">${formatCurrency(rec.quantity * rec.unitPrice * rec.taxPercent / 100)}</span>
        </div>
        ` : ''}
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 16px 0; border-top: 3px solid #ff7a00;">
          <span style="font-size: 14px; font-weight: bold; color: #1a1a1a;">TOTAL A PAGAR:</span>
          <span style="font-size: 18px; font-weight: bold; color: #ff7a00;">${formatCurrency(rec.total)}</span>
        </div>
      </div>
    </div>

    <div style="border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 12px; line-height: 1.6;">
      <p style="margin: 0 0 8px; font-weight: bold; color: #1a1a1a;">Termos e Condições:</p>
      <p style="margin: 0;">Favor realizar o pagamento até a data de vencimento indicada acima. Em caso de dúvidas, entre em contato conosco.</p>
    </div>
  </div>
`;

export const getQuoteTemplate = (rec: Quote, config: AppConfig) => `
  <div style="font-family: 'Arial', sans-serif; padding: 40px; background: white; color: #1a1a1a;">
    <div style="border-bottom: 3px solid #ff7a00; padding-bottom: 20px; margin-bottom: 30px;">
      <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #ff7a00;">${config.companyName}</h1>
          <p style="margin: 8px 0 0; font-size: 13px; color: #555;">${config.companyEmail}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #555;">Tel: ${config.companyPhone}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #777;">CNPJ: ${config.companyCnpj}</p>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 28px; font-weight: bold; color: #333;">ORÇAMENTO</h2>
          <p style="margin: 8px 0 0; font-size: 13px; color: #666;">Nº ${rec.id.toUpperCase()}</p>
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #ddd;">
      <div>
        <h3 style="margin: 0 0 12px; font-size: 11px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Cliente:</h3>
        <p style="margin: 0 0 6px; font-weight: bold; font-size: 15px; color: #1a1a1a;">${rec.clientName}</p>
      </div>
      <div style="text-align: right;">
        <table style="width: 100%; border-collapse: collapse; margin-left: auto;">
          <tr>
            <td style="padding: 6px 12px 6px 0; font-size: 12px; color: #666;"><strong>Data de Emissão:</strong></td>
            <td style="padding: 6px 0; font-size: 12px; color: #1a1a1a;">${formatDate(rec.dateCreated)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; font-size: 12px; color: #666;"><strong>Validade:</strong></td>
            <td style="padding: 6px 0; font-size: 12px; color: #1a1a1a;">30 dias</td>
          </tr>
        </table>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
      <thead>
        <tr style="background: #f8f8f8; border-bottom: 2px solid #ff7a00;">
          <th style="padding: 14px 12px; text-align: left; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #333;">Descrição do Serviço</th>
          <th style="padding: 14px 12px; text-align: center; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #333; width: 80px;">Quantidade</th>
          <th style="padding: 14px 12px; text-align: right; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #333; width: 100px;">Valor Unit.</th>
          <th style="padding: 14px 12px; text-align: right; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #333; width: 100px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 16px 12px; font-size: 13px; color: #333;">${rec.description}</td>
          <td style="padding: 16px 12px; text-align: center; font-size: 13px; color: #333;">${rec.quantity}</td>
          <td style="padding: 16px 12px; text-align: right; font-size: 13px; color: #333;">${formatCurrency(rec.unitPrice)}</td>
          <td style="padding: 16px 12px; text-align: right; font-size: 13px; color: #333; font-weight: bold;">${formatCurrency(rec.quantity * rec.unitPrice)}</td>
        </tr>
      </tbody>
    </table>

    <div style="display: grid; grid-template-columns: 1fr 280px; gap: 30px; margin-bottom: 40px;">
      <div></div>
      <div>
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 12px 0; border-bottom: 1px solid #ddd;">
          <span style="font-size: 13px; color: #666;">Subtotal:</span>
          <span style="font-size: 13px; color: #333; font-weight: bold;">${formatCurrency(rec.quantity * rec.unitPrice)}</span>
        </div>
        ${rec.taxPercent > 0 ? `
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 12px 0; border-bottom: 1px solid #ddd;">
          <span style="font-size: 13px; color: #666;">Imposto (${rec.taxPercent}%):</span>
          <span style="font-size: 13px; color: #333; font-weight: bold;">${formatCurrency(rec.quantity * rec.unitPrice * rec.taxPercent / 100)}</span>
        </div>
        ` : ''}
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 16px 0; border-top: 3px solid #ff7a00;">
          <span style="font-size: 14px; font-weight: bold; color: #1a1a1a;">TOTAL ESTIMADO:</span>
          <span style="font-size: 18px; font-weight: bold; color: #ff7a00;">${formatCurrency(rec.total)}</span>
        </div>
      </div>
    </div>

    <div style="border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 12px; line-height: 1.6;">
      <p style="margin: 0 0 8px; font-weight: bold; color: #1a1a1a;">Observações:</p>
      <p style="margin: 0;">Este orçamento é válido por 30 dias. Valores podem sofrer alterações caso os requisitos do projeto mudem.</p>
    </div>
  </div>
`;
