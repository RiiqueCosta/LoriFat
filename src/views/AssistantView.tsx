/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, RotateCcw, Sparkles } from 'lucide-react';
import { AppConfig, AppRecord } from '../types';
import { askAssistant, ChatMessage } from '../lib/ai';
import { assistantContext } from '../lib/analytics';
import { cn } from '../lib/utils';
import { navigate } from '../lib/router';
import { Card, PageHeader } from '../components/ui';

const SUGGESTIONS = [
  'Quanto recebi este mês e como foi em relação ao mês passado?',
  'Quem está me devendo e quanto?',
  'Quais foram meus maiores gastos nos últimos 3 meses?',
  'Qual cliente mais faturou este ano?',
  'Quantos orçamentos estão aguardando e qual o valor total?',
  'Qual a minha previsão de recebimento para os próximos 30 dias?',
];

/** Converte **negrito** e listas simples em elementos. */
function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const bullet = /^\s*[-•*]\s+/.test(line);
        const content = line.replace(/^\s*[-•*]\s+/, '');
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith('**') && p.endsWith('**') ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong> : <React.Fragment key={j}>{p}</React.Fragment>);
        return bullet
          ? <div key={i} className="flex gap-2 pl-1"><span className="text-brand">•</span><span>{parts}</span></div>
          : <p key={i}>{parts}</p>;
      })}
    </div>
  );
}

export function AssistantView({ records, config, initialQuestion }: { records: AppRecord[]; config: AppConfig; initialQuestion?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const askedInitial = useRef(false);
  const context = useMemo(() => assistantContext(records, config), [records, config]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, loading]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || loading) return;
    setError('');
    setInput('');
    const history = messages;
    setMessages(m => [...m, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const answer = await askAssistant(question, context, history);
      setMessages(m => [...m, { role: 'model', text: answer }]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuestion && !askedInitial.current) {
      askedInitial.current = true;
      ask(initialQuestion);
      navigate('assistant');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  return (
    <div className="space-y-5 fade-in">
      <PageHeader
        title="Assistente IA"
        description="Pergunte sobre faturamento, clientes, despesas e cobranças. A IA responde com base nos seus dados."
        actions={messages.length > 0 ? (
          <button onClick={() => { setMessages([]); setError(''); }} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            <RotateCcw className="w-4 h-4" /> Nova conversa
          </button>
        ) : undefined}
      />

      <Card className="flex flex-col min-h-[60dvh]">
        <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-brand flex items-center justify-center shadow-lg shadow-brand/30 mb-4">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">Como posso ajudar?</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-md">Experimente uma destas perguntas:</p>
              <div className="mt-5 grid sm:grid-cols-2 gap-2 w-full max-w-2xl">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => ask(s)}
                    className="text-left text-sm p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-brand/50 hover:bg-orange-50/50 dark:hover:bg-brand/5 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'model' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-brand flex items-center justify-center shrink-0 mr-2.5 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={cn('max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-br-md'
                  : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 rounded-bl-md')}>
                {m.role === 'model' ? <RichText text={m.text} /> : m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-brand flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
              <div className="flex gap-1 px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
              </div>
            </div>
          )}
          {error && <p className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-sm text-red-600 dark:text-red-400 whitespace-pre-line">{error}</p>}
          <div ref={endRef} />
        </div>

        <form onSubmit={e => { e.preventDefault(); ask(input); }} className="p-3 sm:p-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
              rows={1}
              placeholder="Pergunte sobre seus números..."
              className="w-full resize-none rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-4 pr-14 py-3.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
            />
            <button type="submit" disabled={!input.trim() || loading}
              className="absolute right-2 bottom-2.5 w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center disabled:opacity-40 transition-opacity" aria-label="Enviar">
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-zinc-400 text-center">A IA pode errar. Confira valores importantes nos relatórios.</p>
        </form>
      </Card>
    </div>
  );
}
