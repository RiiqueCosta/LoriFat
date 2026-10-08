/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Check, Copy, Download, FileText, ImagePlus, MessageSquareText, Moon, QrCode, Smartphone, Sun, Trash2 } from 'lucide-react';
import { AppConfig, AppRecord, PixKeyType } from '../types';
import { buildPixPayload, guessPixKeyType } from '../lib/pix';
import { qrToSvg } from '../lib/qr';
import { DEFAULT_CHARGE_MESSAGE } from '../lib/billing';
import { copyText, cn, stripAccents } from '../lib/utils';
import { exportBackup } from '../lib/export';
import { useFeedback } from '../lib/feedback';
import { Button, Card, CardHeader, Field, Input, PageHeader, Select, Textarea } from '../components/ui';
import { NotificationsCard } from '../components/NotificationsCard';

/** Reduz a imagem para no máx. 256px e devolve PNG em data URL. */
function resizeImage(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas indisponível'));
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
    img.src = url;
  });
}

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function SettingsView({ config, records, ownerId, onSave }: { config: AppConfig; records: AppRecord[]; ownerId: string | null; onSave: (c: AppConfig) => Promise<boolean> }) {
  const feedback = useFeedback();
  const [draft, setDraft] = useState<AppConfig>(config);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const isStandalone = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;

  useEffect(() => { setDraft(config); }, [config]);
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallEvent(e as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    const existing = (window as unknown as { __lorifatInstall?: BeforeInstallPromptEvent }).__lorifatInstall;
    if (existing) setInstallEvent(existing);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const set = <K extends keyof AppConfig>(k: K, v: AppConfig[K]) => setDraft(d => ({ ...d, [k]: v }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);

  const save = async () => {
    setSaving(true);
    const ok = await onSave({
      ...draft,
      pixName: draft.pixName ? stripAccents(draft.pixName).slice(0, 25) : draft.pixName,
      pixCity: draft.pixCity ? stripAccents(draft.pixCity).slice(0, 15) : draft.pixCity,
    });
    setSaving(false);
    if (ok) feedback.success('Configurações salvas');
  };

  const onLogo = async (file?: File) => {
    if (!file) return;
    try {
      set('logo', await resizeImage(file));
    } catch (err) {
      feedback.error('Não foi possível usar esta imagem', (err as Error).message);
    }
  };

  const pixPreview = useMemo(() => {
    if (!draft.pixKey?.trim()) return null;
    try {
      const code = buildPixPayload({
        key: draft.pixKey, keyType: draft.pixKeyType, name: draft.pixName || draft.companyName,
        city: draft.pixCity || 'SAO PAULO', amount: 1, txid: 'TESTE',
      });
      return { code, svg: qrToSvg(code, { border: 2 }) };
    } catch {
      return null;
    }
  }, [draft.pixKey, draft.pixKeyType, draft.pixName, draft.pixCity, draft.companyName]);

  return (
    <div className="space-y-6 fade-in pb-20">
      <PageHeader title="Configurações" description="Dados da empresa, PIX e textos usados nos documentos." />

      <Card>
        <CardHeader title="Empresa" description="Aparece no topo das faturas e orçamentos." icon={Building2} />
        <div className="px-5 pb-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden bg-white">
              {draft.logo ? <img src={draft.logo} alt="Logo" className="w-full h-full object-contain" /> : <ImagePlus className="w-6 h-6 text-zinc-300" />}
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                <ImagePlus className="w-4 h-4" /> {draft.logo ? 'Trocar logo' : 'Enviar logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e => onLogo(e.target.files?.[0])} />
              </label>
              {draft.logo && (
                <button onClick={() => set('logo', undefined)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-500"><Trash2 className="w-3 h-3" /> Remover</button>
              )}
              <p className="text-[11px] text-zinc-400">PNG ou JPG, de preferência quadrado.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome da empresa" className="sm:col-span-2"><Input value={draft.companyName} maxLength={100} onChange={e => set('companyName', e.target.value)} /></Field>
            <Field label="CNPJ"><Input value={draft.companyCnpj} onChange={e => set('companyCnpj', e.target.value)} /></Field>
            <Field label="Telefone"><Input value={draft.companyPhone} onChange={e => set('companyPhone', e.target.value)} /></Field>
            <Field label="E-mail"><Input type="email" value={draft.companyEmail} onChange={e => set('companyEmail', e.target.value)} /></Field>
            <Field label="Endereço"><Input value={draft.companyAddress || ''} onChange={e => set('companyAddress', e.target.value)} placeholder="Cidade / UF" /></Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="PIX" description="Gera QR Code e copia e cola com o valor exato em cada fatura." icon={QrCode} />
        <div className="px-5 pb-5 grid lg:grid-cols-[1fr_220px] gap-5">
          <div className="grid sm:grid-cols-2 gap-3 content-start">
            <Field label="Tipo de chave">
              <Select value={draft.pixKeyType || (draft.pixKey ? guessPixKeyType(draft.pixKey) : 'cnpj')} onChange={e => set('pixKeyType', e.target.value as PixKeyType)}>
                <option value="cnpj">CNPJ</option>
                <option value="cpf">CPF</option>
                <option value="email">E-mail</option>
                <option value="phone">Celular</option>
                <option value="random">Chave aleatória</option>
              </Select>
            </Field>
            <Field label="Chave PIX"><Input value={draft.pixKey || ''} onChange={e => set('pixKey', e.target.value)} placeholder="Sua chave" /></Field>
            <Field label="Nome do recebedor" hint="Como aparece no banco (até 25 letras, sem acento)">
              <Input value={draft.pixName || ''} maxLength={25} onChange={e => set('pixName', e.target.value)} placeholder={stripAccents(draft.companyName).slice(0, 25)} />
            </Field>
            <Field label="Cidade" hint="Até 15 letras">
              <Input value={draft.pixCity || ''} maxLength={15} onChange={e => set('pixCity', e.target.value)} placeholder="SAO PAULO" />
            </Field>
          </div>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 text-center">
            {pixPreview ? (
              <>
                <div className="w-36 h-36 mx-auto bg-white rounded-xl p-1" dangerouslySetInnerHTML={{ __html: pixPreview.svg }} />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Teste: escaneie no app do banco. Deve aparecer <b>R$ 1,00</b> para {draft.pixName || draft.companyName}.</p>
                <Button size="sm" variant="ghost" icon={copied ? Check : Copy} className="mt-1"
                  onClick={async () => { if (await copyText(pixPreview.code)) { setCopied(true); setTimeout(() => setCopied(false), 1500); } }}>
                  {copied ? 'Copiado' : 'Copiar código'}
                </Button>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-6 text-zinc-400">
                <QrCode className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-xs">Informe a chave para ver o QR Code de teste.</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <NotificationsCard ownerId={ownerId} />

      <Card>
        <CardHeader title="Documentos" description="Prazos e textos padrão." icon={FileText} />
        <div className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <Field label="Vencimento padrão (dias)"><Input type="number" min={0} max={120} value={draft.defaultDueDays ?? 15} onChange={e => set('defaultDueDays', parseInt(e.target.value, 10) || 0)} /></Field>
            <Field label="Validade do orçamento (dias)"><Input type="number" min={1} max={365} value={draft.quoteValidityDays ?? 30} onChange={e => set('quoteValidityDays', parseInt(e.target.value, 10) || 30)} /></Field>
          </div>
          <Field label="Termos da fatura"><Textarea rows={3} value={draft.invoiceTerms || ''} maxLength={2000} onChange={e => set('invoiceTerms', e.target.value)} placeholder="Favor realizar o pagamento até a data de vencimento..." /></Field>
          <Field label="Observações do orçamento"><Textarea rows={3} value={draft.quoteTerms || ''} maxLength={2000} onChange={e => set('quoteTerms', e.target.value)} placeholder="Valores sujeitos a alteração caso o escopo mude..." /></Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Mensagem de cobrança" description="Variáveis: {cliente}, {numero}, {valor}, {vencimento}, {pix}, {empresa}" icon={MessageSquareText} />
        <div className="px-5 pb-5 space-y-2">
          <Textarea rows={7} value={draft.chargeMessage || ''} maxLength={2000} onChange={e => set('chargeMessage', e.target.value)} placeholder={DEFAULT_CHARGE_MESSAGE} className="text-[13px]" />
          {draft.chargeMessage && <button onClick={() => set('chargeMessage', '')} className="text-xs text-zinc-500 hover:text-brand">Restaurar mensagem padrão</button>}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            {draft.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} Aparência
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['light', 'dark'] as const).map(t => (
              <button key={t} onClick={() => set('theme', t)}
                className={cn('p-3 rounded-xl border-2 text-left text-sm font-medium transition-colors',
                  draft.theme === t ? 'border-brand' : 'border-zinc-200 dark:border-zinc-700')}>
                <div className={cn('h-10 rounded-lg mb-2 border', t === 'light' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-700')} />
                <span className="text-zinc-800 dark:text-zinc-200">{t === 'light' ? 'Claro' : 'Escuro'}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100"><Smartphone className="w-4 h-4" /> App no celular e computador</div>
          {isStandalone ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">O app já está instalado neste dispositivo. ✓</p>
          ) : installEvent ? (
            <>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Instale para abrir com um toque, em tela cheia, como um aplicativo.</p>
              <Button icon={Download} onClick={async () => { await installEvent.prompt(); setInstallEvent(null); }}>Instalar app</Button>
            </>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              <b>iPhone:</b> no Safari, toque em Compartilhar → "Adicionar à Tela de Início".<br />
              <b>Android/Chrome:</b> menu ⋮ → "Instalar app" ou "Adicionar à tela inicial".
            </p>
          )}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button size="sm" variant="outline" icon={Download} onClick={() => exportBackup(records, config)}>Baixar backup dos dados</Button>
          </div>
        </Card>
      </div>

      {/* Barra de salvar */}
      <div className={cn('fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 lg:left-[calc(50%+124px)] z-30 transition-all',
        dirty ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none')}>
        <div className="flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xl">
          <span className="text-sm font-medium whitespace-nowrap">Alterações não salvas</span>
          <Button size="sm" variant="ghost" className="text-zinc-300 dark:text-zinc-600 hover:bg-white/10 dark:hover:bg-zinc-100" onClick={() => setDraft(config)}>Descartar</Button>
          <Button size="sm" loading={saving} onClick={save}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}
