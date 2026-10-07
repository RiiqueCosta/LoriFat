/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Avisos rápidos (toasts) e diálogo de confirmação.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from './utils';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface FeedbackApi {
  toast: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback precisa estar dentro de <FeedbackProvider>');
  return ctx;
}

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const COLORS = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-sky-500',
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setToasts(ts => ts.filter(t => t.id !== id)), []);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++counter.current;
    setToasts(ts => [...ts.slice(-3), { ...t, id }]);
    setTimeout(() => dismiss(id), t.kind === 'error' ? 7000 : 4000);
  }, [dismiss]);

  const api: FeedbackApi = {
    toast,
    success: (title, description) => toast({ kind: 'success', title, description }),
    error: (title, description) => toast({ kind: 'error', title, description }),
    info: (title, description) => toast({ kind: 'info', title, description }),
    confirm: (opts) => new Promise<boolean>(resolve => setDialog({ ...opts, resolve })),
  };

  const closeDialog = (value: boolean) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDialog(false);
      if (e.key === 'Enter') closeDialog(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}

      {/* Toasts */}
      <div className="fixed z-[100] bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 w-[calc(100%-2rem)] max-w-sm space-y-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map(t => {
            const Icon = ICONS[t.kind];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-900/10"
                role="status"
              >
                <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', COLORS[t.kind])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</p>
                  {t.description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 break-words">{t.description}</p>}
                  {t.action && (
                    <button
                      onClick={() => { t.action!.onClick(); dismiss(t.id); }}
                      className="mt-1.5 text-xs font-bold text-brand hover:underline"
                    >
                      {t.action.label}
                    </button>
                  )}
                </div>
                <button onClick={() => dismiss(t.id)} className="p-1 -m-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" aria-label="Fechar">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confirmação */}
      <AnimatePresence>
        {dialog && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
              onClick={() => closeDialog(false)}
            />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6"
            >
              <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center mb-4',
                dialog.danger ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-orange-50 dark:bg-brand/10 text-brand')}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{dialog.title}</h3>
              {dialog.description && <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{dialog.description}</p>}
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => closeDialog(false)}
                  className="flex-1 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  {dialog.cancelLabel || 'Cancelar'}
                </button>
                <button
                  autoFocus
                  onClick={() => closeDialog(true)}
                  className={cn('flex-1 h-11 rounded-xl text-white text-sm font-semibold transition-colors',
                    dialog.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand hover:bg-brand-dark')}
                >
                  {dialog.confirmLabel || 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FeedbackContext.Provider>
  );
}
