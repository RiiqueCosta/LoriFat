/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, FileText, FileCheck2, Users, Wallet, BarChart3, Sun, Moon, StickyNote, LogOut,
  ShieldCheck, Plus, Repeat, Sparkles, Settings, UserPlus, MessageCircle, Grid2x2, X, ChevronDown,
  ScanLine, Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { navigate, routeHref, ViewType } from '../lib/router';
import { AppConfig } from '../types';
import { Avatar, DropdownMenu } from './ui';

export type QuickAction = 'invoice' | 'quote' | 'import' | 'expense' | 'receipt' | 'client' | 'service' | 'recurring';

export interface NavCounts {
  overdue: number;
  pendingQuotes: number;
}

interface NavItem { id: ViewType; label: string; icon: LucideIcon; badge?: number; badgeTone?: 'danger' | 'info' }

function useNavGroups(counts: NavCounts, isAdmin: boolean) {
  const main: NavItem[] = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'invoices', label: 'Faturas', icon: FileText, badge: counts.overdue, badgeTone: 'danger' },
    { id: 'quotes', label: 'Orçamentos', icon: FileCheck2, badge: counts.pendingQuotes, badgeTone: 'info' },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'services', label: 'Serviços', icon: Wrench },
    { id: 'expenses', label: 'Despesas', icon: Wallet },
    { id: 'recurring', label: 'Recorrentes', icon: Repeat },
  ];
  const insights: NavItem[] = [
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'assistant', label: 'Assistente IA', icon: Sparkles },
  ];
  const other: NavItem[] = [
    { id: 'notes', label: 'Notas', icon: StickyNote },
    { id: 'settings', label: 'Configurações', icon: Settings },
    ...(isAdmin ? [{ id: 'admin' as ViewType, label: 'Administração', icon: ShieldCheck }] : []),
  ];
  return [
    { title: 'Gestão', items: main },
    { title: 'Análise', items: insights },
    { title: 'Outros', items: other },
  ];
}

export const QUICK_ACTIONS: { id: QuickAction; label: string; description: string; icon: LucideIcon; tone: string }[] = [
  { id: 'invoice', label: 'Nova fatura', description: 'Cobrar um cliente', icon: FileText, tone: 'bg-orange-50 text-brand dark:bg-brand/10' },
  { id: 'quote', label: 'Novo orçamento', description: 'Enviar uma proposta', icon: FileCheck2, tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' },
  { id: 'import', label: 'Importar proposta com IA', description: 'PDF, foto, texto ou áudio', icon: Sparkles, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400' },
  { id: 'expense', label: 'Nova despesa', description: 'Lançar um gasto', icon: Wallet, tone: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' },
  { id: 'receipt', label: 'Ler cupom com IA', description: 'Foto do comprovante', icon: ScanLine, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  { id: 'client', label: 'Novo cliente', description: 'Cadastrar contato', icon: UserPlus, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  { id: 'service', label: 'Novo serviço', description: 'Cadastrar no catálogo', icon: Wrench, tone: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' },
  { id: 'recurring', label: 'Nova cobrança recorrente', description: 'Contrato mensal', icon: Repeat, tone: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' },
];

function Brand({ config, compact }: { config: AppConfig; compact?: boolean }) {
  return (
    <a href={routeHref('dashboard')} className="flex items-center gap-3 min-w-0">
      {config.logo ? (
        <img src={config.logo} alt="" className="w-9 h-9 rounded-xl object-contain bg-white ring-1 ring-zinc-200 dark:ring-zinc-700 shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-brand flex items-center justify-center text-white font-bold shadow-sm shadow-brand/30 shrink-0">
          {(config.companyName || 'L').charAt(0).toUpperCase()}
        </div>
      )}
      {!compact && (
        <div className="min-w-0">
          <p className="font-bold text-[15px] leading-tight text-zinc-900 dark:text-zinc-50 truncate">{config.companyName || 'Lori Faturamento'}</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Faturamento</p>
        </div>
      )}
    </a>
  );
}

function NewButton({ onQuickAction }: { onQuickAction: (a: QuickAction) => void }) {
  return (
    <DropdownMenu
      align="left"
      items={QUICK_ACTIONS.map(a => ({ label: a.label, icon: a.icon, onClick: () => onQuickAction(a.id), divider: a.id === 'expense' || a.id === 'client' }))}
      trigger={
        <button className="w-full h-10 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-brand/30 transition-colors">
          <Plus className="w-4 h-4" /> Novo
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>
      }
    />
  );
}

interface ShellProps {
  view: ViewType;
  config: AppConfig;
  user: User;
  isAdmin: boolean;
  counts: NavCounts;
  onQuickAction: (a: QuickAction) => void;
  onToggleTheme: () => void;
}

export function Sidebar({ view, config, user, isAdmin, counts, onQuickAction }: ShellProps) {
  const groups = useNavGroups(counts, isAdmin);
  const active = view === 'client' ? 'clients' : view;
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[248px] flex-col border-r border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
      <div className="px-5 h-16 flex items-center">
        <Brand config={config} />
      </div>
      <div className="px-4 pb-2">
        <NewButton onQuickAction={onQuickAction} />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {groups.map(g => (
          <div key={g.title}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{g.title}</p>
            <div className="space-y-0.5">
              {g.items.map(item => {
                const isActive = active === item.id;
                return (
                  <a
                    key={item.id}
                    href={routeHref(item.id)}
                    className={cn(
                      'group flex items-center gap-3 h-9 px-3 rounded-lg text-[13.5px] font-medium transition-colors',
                      isActive
                        ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-50'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100',
                    )}
                  >
                    <item.icon className={cn('w-[18px] h-[18px]', isActive ? 'text-brand' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300')} />
                    <span className="flex-1">{item.label}</span>
                    {!!item.badge && (
                      <span className={cn('min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center',
                        item.badgeTone === 'danger' ? 'bg-red-500 text-white' : 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300')}>
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800">
        <UserMenu user={user} align="left" full />
      </div>
    </aside>
  );
}

function UserMenu({ user, align = 'right', full }: { user: User; align?: 'left' | 'right'; full?: boolean }) {
  const name = user.displayName || user.email || 'Usuário';
  return (
    <DropdownMenu
      align={align}
      items={[
        { label: 'Configurações', icon: Settings, onClick: () => navigate('settings') },
        { label: 'Falar com o suporte', icon: MessageCircle, onClick: () => window.open('https://wa.me/5511985258655', '_blank', 'noopener') },
        { label: 'Sair do sistema', icon: LogOut, onClick: () => signOut(auth), danger: true, divider: true },
      ]}
      trigger={
        <button className={cn('flex items-center gap-2.5 rounded-xl transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800', full ? 'w-full p-2 text-left' : 'p-1')}>
          <Avatar name={name} size="sm" />
          {full && (
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-zinc-800 dark:text-zinc-100 truncate">{user.displayName || name.split('@')[0]}</span>
              <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{user.email}</span>
            </span>
          )}
        </button>
      }
    />
  );
}

const VIEW_TITLES: Partial<Record<ViewType, string>> = {
  dashboard: 'Início', invoices: 'Faturas', quotes: 'Orçamentos', clients: 'Clientes', client: 'Cliente', services: 'Serviços',
  expenses: 'Despesas', recurring: 'Recorrentes', reports: 'Relatórios', assistant: 'Assistente IA',
  notes: 'Notas', settings: 'Configurações', admin: 'Administração',
};

export function Topbar({ view, config, user, onToggleTheme }: ShellProps) {
  return (
    <header className="sticky top-0 z-30 h-14 lg:h-16 border-b border-zinc-200/70 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl pt-[env(safe-area-inset-top)] box-content">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        <div className="lg:hidden min-w-0"><Brand config={config} /></div>
        <p className="hidden lg:block text-sm text-zinc-500 dark:text-zinc-400">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          <span className="mx-2 text-zinc-300 dark:text-zinc-700">/</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{VIEW_TITLES[view]}</span>
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={config.theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            aria-label="Alternar tema"
          >
            {config.theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
          </button>
          <div className="lg:hidden"><UserMenu user={user} /></div>
        </div>
      </div>
    </header>
  );
}

/** Barra inferior + botão central de criação (celular). */
export function MobileNav({ view, counts, isAdmin, onQuickAction }: ShellProps) {
  const [sheet, setSheet] = useState<'new' | 'more' | null>(null);
  const groups = useNavGroups(counts, isAdmin);
  const active = view === 'client' ? 'clients' : view;

  useEffect(() => { setSheet(null); }, [view]);

  const tab = (id: ViewType, label: string, Icon: LucideIcon, badge?: number) => (
    <a
      href={routeHref(id)}
      className={cn('relative flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors',
        active === id ? 'text-brand' : 'text-zinc-500 dark:text-zinc-400')}
    >
      <Icon className="w-[22px] h-[22px]" strokeWidth={active === id ? 2.3 : 1.9} />
      {label}
      {!!badge && <span className="absolute top-1.5 left-1/2 ml-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{badge}</span>}
    </a>
  );

  const moreIds: ViewType[] = ['quotes', 'services', 'expenses', 'recurring', 'reports', 'assistant', 'notes', 'settings', 'admin'];
  const moreItems = groups.flatMap(g => g.items).filter(i => moreIds.includes(i.id));

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="h-16 flex items-stretch px-2">
          {tab('dashboard', 'Início', LayoutDashboard)}
          {tab('invoices', 'Faturas', FileText, counts.overdue)}
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={() => setSheet('new')}
              className="w-14 h-14 -mt-6 rounded-2xl bg-brand text-white shadow-lg shadow-brand/40 flex items-center justify-center active:scale-95 transition-transform ring-4 ring-white dark:ring-zinc-950"
              aria-label="Criar novo"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>
          {tab('clients', 'Clientes', Users)}
          <button
            onClick={() => setSheet('more')}
            className={cn('flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold',
              moreIds.includes(active) ? 'text-brand' : 'text-zinc-500 dark:text-zinc-400')}
          >
            <Grid2x2 className="w-[22px] h-[22px]" strokeWidth={1.9} />
            Mais
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {sheet && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm" onClick={() => setSheet(null)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 380 }}
              className="relative w-full rounded-t-3xl bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="font-bold text-zinc-900 dark:text-zinc-100">{sheet === 'new' ? 'Criar' : 'Menu'}</p>
                <button onClick={() => setSheet(null)} className="p-2 -m-2 text-zinc-400" aria-label="Fechar"><X className="w-5 h-5" /></button>
              </div>
              {sheet === 'new' ? (
                <div className="grid grid-cols-1 gap-1">
                  {QUICK_ACTIONS.map(a => (
                    <button key={a.id} onClick={() => { setSheet(null); onQuickAction(a.id); }}
                      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 active:bg-zinc-100 dark:active:bg-zinc-800 text-left transition-colors">
                      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', a.tone)}><a.icon className="w-5 h-5" /></div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{a.label}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{a.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {moreItems.map(item => (
                    <a key={item.id} href={routeHref(item.id)} onClick={() => setSheet(null)}
                      className={cn('relative flex flex-col items-center gap-2 py-4 rounded-2xl text-xs font-semibold transition-colors',
                        active === item.id ? 'bg-orange-50 text-brand dark:bg-brand/10' : 'bg-zinc-50 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200')}>
                      <item.icon className="w-6 h-6" />
                      {item.label}
                      {!!item.badge && <span className="absolute top-2 right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">{item.badge}</span>}
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export function AppShell(props: ShellProps & { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <Sidebar {...props} />
      <div className="lg:pl-[248px]">
        <Topbar {...props} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-28 lg:pb-12">
          {props.children}
        </main>
      </div>
      <MobileNav {...props} />
    </div>
  );
}

