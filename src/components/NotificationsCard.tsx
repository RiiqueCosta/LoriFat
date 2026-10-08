/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Send } from 'lucide-react';
import {
  DEFAULT_PREFS, disablePush, enablePush, getPushStatus, NotifyPrefs, PushState, savePrefs, sendTestPush,
} from '../lib/notifications';
import { useFeedback } from '../lib/feedback';
import { Button, Card, CardHeader, Skeleton, Toggle } from './ui';

const OPTIONS: { key: keyof NotifyPrefs; label: string; description: string }[] = [
  { key: 'daily', label: 'Resumo da manhã', description: 'Quanto vence hoje e quanto está vencido.' },
  { key: 'overdue', label: 'Fatura vencida', description: 'No dia seguinte ao vencimento, com atalho para cobrar.' },
  { key: 'recurring', label: 'Cobrança recorrente', description: 'Quando chega o dia de emitir uma fatura mensal.' },
  { key: 'quotes', label: 'Orçamento perto de vencer', description: '2 dias antes e no último dia da validade.' },
];

export function NotificationsCard({ ownerId }: { ownerId: string | null }) {
  const feedback = useFeedback();
  const [state, setState] = useState<PushState>('loading');
  const [prefs, setPrefs] = useState<NotifyPrefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState<'' | 'enable' | 'disable' | 'test'>('');

  useEffect(() => {
    if (!ownerId) return;
    let alive = true;
    getPushStatus(ownerId).then(r => { if (alive) { setState(r.state); setPrefs(r.prefs); } });
    return () => { alive = false; };
  }, [ownerId]);

  const run = async (kind: typeof busy, fn: () => Promise<void>) => {
    setBusy(kind);
    try { await fn(); } catch (err) {
      feedback.error('Não deu certo', (err as Error).message);
    } finally { setBusy(''); }
  };

  const enable = () => run('enable', async () => {
    await enablePush(ownerId!, prefs);
    setState('on');
    feedback.success('Notificações ativadas neste aparelho');
  });

  const disable = () => run('disable', async () => {
    await disablePush(ownerId!);
    setState('off');
    feedback.info('Notificações desativadas neste aparelho');
  });

  const test = () => run('test', async () => {
    await sendTestPush(ownerId!);
    feedback.success('Teste enviado', 'A notificação deve chegar em alguns segundos.');
  });

  const toggle = async (key: keyof NotifyPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (state !== 'on') return;
    try { await savePrefs(ownerId!, next); } catch (err) {
      setPrefs(prefs);
      feedback.error('Não foi possível salvar', (err as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader title="Notificações" description="Avisos neste aparelho todo dia de manhã, por volta das 8h." icon={Bell} />
      <div className="px-5 pb-5 space-y-4">
        {state === 'loading' && <Skeleton className="h-11 w-full" />}

        {state === 'not-configured' && (
          <Message tone="neutral">As notificações ainda não foram ligadas no servidor. Assim que a configuração for concluída, o botão para ativar aparece aqui.</Message>
        )}
        {state === 'ios-install' && (
          <Message tone="info">
            No iPhone, as notificações só funcionam com o app instalado. No Safari, toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>, abra o LoriFat pelo ícone e volte aqui para ativar.
          </Message>
        )}
        {state === 'unsupported' && (
          <Message tone="neutral">Este navegador não aceita notificações. Use Chrome ou Edge no computador, ou instale o app no celular.</Message>
        )}
        {state === 'denied' && (
          <Message tone="warning">
            As notificações estão bloqueadas para este site. Clique no cadeado ao lado do endereço, permita <b>Notificações</b> e recarregue a página.
          </Message>
        )}

        {(state === 'off' || state === 'on') && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {state === 'on' ? (
                <>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <BellRing className="w-4 h-4" /> Ativadas neste aparelho
                  </span>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" icon={Send} loading={busy === 'test'} onClick={test}>Enviar teste</Button>
                  <Button size="sm" variant="ghost" icon={BellOff} loading={busy === 'disable'} onClick={disable}>Desativar</Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 flex-1 min-w-[200px]">Ative em cada aparelho onde quer receber: computador, celular, tablet.</p>
                  <Button icon={BellRing} loading={busy === 'enable'} onClick={enable}>Ativar neste aparelho</Button>
                </>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              {OPTIONS.map(o => (
                <Toggle key={o.key} checked={prefs[o.key]} onChange={v => toggle(o.key, v)} label={o.label} description={o.description} />
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function Message({ tone, children }: { tone: 'neutral' | 'info' | 'warning'; children: React.ReactNode }) {
  const tones = {
    neutral: 'bg-zinc-50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300',
    info: 'bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-300',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
  };
  return <p className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${tones[tone]}`}>{children}</p>;
}
