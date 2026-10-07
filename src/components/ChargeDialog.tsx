/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, MessageCircle, Share2, Settings } from 'lucide-react';
import { AppConfig, Client, Invoice, Quote } from '../types';
import { chargeMessage, daysOverdue, displayNumber, documentMessage, invoiceStatus } from '../lib/billing';
import { pixCodeFor, shareDocumentPdf } from '../lib/documents';
import { qrToSvg } from '../lib/qr';
import { copyText, formatCurrency, formatDate, openWhatsApp } from '../lib/utils';
import { navigate } from '../lib/router';
import { useFeedback } from '../lib/feedback';
import { Button, Field, InvoiceStatusBadge, Textarea } from './ui';

/** Cobrança (fatura) ou envio (fatura/orçamento) pelo WhatsApp. */
export function SendDialog({ record, mode, config, client, onDone }: {
  record: Invoice | Quote; mode: 'charge' | 'send'; config: AppConfig; client?: Client; onDone: () => void;
}) {
  const feedback = useFeedback();
  const isInvoice = record.type === 'invoice';
  const pixCode = useMemo(
    () => (isInvoice && record.status !== 'paid' ? pixCodeFor(record as Invoice, config) : undefined),
    [record, config, isInvoice],
  );
  const qrSvg = useMemo(() => (pixCode ? qrToSvg(pixCode, { border: 2 }) : ''), [pixCode]);
  const [message, setMessage] = useState(() =>
    mode === 'charge' && isInvoice ? chargeMessage(record as Invoice, config, pixCode) : documentMessage(record, config, pixCode));
  const [copied, setCopied] = useState<'pix' | 'msg' | null>(null);
  const [sharing, setSharing] = useState(false);
  const phone = client?.phone;

  const copy = async (what: 'pix' | 'msg') => {
    const ok = await copyText(what === 'pix' ? pixCode || '' : message);
    if (ok) {
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } else feedback.error('Não foi possível copiar');
  };

  const share = async () => {
    setSharing(true);
    try {
      const ok = await shareDocumentPdf(record, config, client, message);
      if (!ok) feedback.info('Compartilhamento indisponível', 'Use "Enviar no WhatsApp" e anexe o PDF baixado.');
    } catch (err) {
      feedback.error('Não foi possível compartilhar', (err as Error).message);
    } finally {
      setSharing(false);
    }
  };

  const overdue = isInvoice ? daysOverdue(record as Invoice) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{displayNumber(record)}</p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{record.clientName}</p>
          {isInvoice && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Vencimento {formatDate((record as Invoice).dueDate)}{overdue > 0 && <span className="text-red-500 font-semibold"> · {overdue} dia{overdue > 1 ? 's' : ''} em atraso</span>}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{formatCurrency(record.total)}</p>
          {isInvoice && <InvoiceStatusBadge status={invoiceStatus(record as Invoice)} />}
        </div>
      </div>

      {isInvoice && record.status !== 'paid' && (
        pixCode ? (
          <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="w-36 h-36 mx-auto sm:mx-0 shrink-0 rounded-xl overflow-hidden bg-white p-1" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">PIX com valor de {formatCurrency(record.total)}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">O cliente pode escanear o QR Code ou colar o código no app do banco.</p>
              <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 break-all line-clamp-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-2">{pixCode}</p>
              <Button size="sm" variant="outline" icon={copied === 'pix' ? Check : Copy} onClick={() => copy('pix')}>
                {copied === 'pix' ? 'Copiado!' : 'Copiar PIX copia e cola'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              Cadastre sua chave PIX para enviar o QR Code e o copia e cola junto com a cobrança.
              <button onClick={() => { onDone(); navigate('settings'); }} className="ml-1 font-semibold underline inline-flex items-center gap-1">
                <Settings className="w-3 h-3" /> Configurar PIX
              </button>
            </div>
          </div>
        )
      )}

      <Field label="Mensagem" hint={!phone ? 'Este cliente não tem WhatsApp cadastrado. Você escolherá o contato no WhatsApp.' : `Será enviada para ${phone}`}>
        <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={9} className="text-[13px] leading-relaxed" />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Button icon={MessageCircle} className="sm:col-span-3 bg-[#25D366] hover:bg-[#1ebe5a] shadow-[#25D366]/30" size="lg"
          onClick={() => { openWhatsApp(message, phone); onDone(); }}>
          {mode === 'charge' ? 'Cobrar no WhatsApp' : 'Enviar no WhatsApp'}
        </Button>
        <Button variant="outline" icon={copied === 'msg' ? Check : Copy} onClick={() => copy('msg')}>
          {copied === 'msg' ? 'Copiada!' : 'Copiar mensagem'}
        </Button>
        <Button variant="outline" icon={Share2} loading={sharing} onClick={share} className="sm:col-span-2">
          Compartilhar PDF
        </Button>
      </div>
    </div>
  );
}
