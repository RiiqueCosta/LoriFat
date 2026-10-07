/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Componentes visuais base (design system do Lori Faturamento).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MoreHorizontal, Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn, initials } from '../lib/utils';
import { INVOICE_STATUS_LABEL, InvoiceStatus, QUOTE_STATUS_LABEL } from '../lib/billing';
import type { Quote } from '../types';

// --- Card -------------------------------------------------------------------

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-[0_1px_2px_rgba(16,24,40,0.04)]', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, icon: Icon, className }: {
  title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; icon?: LucideIcon; className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-5 pb-3', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
            <Icon className="w-[18px] h-[18px] text-zinc-500 dark:text-zinc-400" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{title}</h3>
          {description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// --- Button -----------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg';

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-sm shadow-brand/25',
  secondary: 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  outline: 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800',
  dark: 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200',
};

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-sm gap-2 rounded-xl',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  block?: boolean;
}

export function Button({ variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading, block, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  const iconCls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950',
        BTN_VARIANT[variant], BTN_SIZE[size], block && 'w-full', className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className={cn(iconCls, 'animate-spin')} /> : Icon && <Icon className={iconCls} />}
      {children}
      {IconRight && !loading && <IconRight className={iconCls} />}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className, tone = 'default', size = 'md', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon; label: string; tone?: 'default' | 'danger' | 'success' | 'brand'; size?: 'sm' | 'md';
}) {
  const tones = {
    default: 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800',
    danger: 'text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10',
    success: 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
    brand: 'text-zinc-400 hover:text-brand hover:bg-orange-50 dark:hover:bg-brand/10',
  };
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn('inline-flex items-center justify-center rounded-lg transition-colors shrink-0', size === 'sm' ? 'w-8 h-8' : 'w-9 h-9', tones[tone], className)}
      {...rest}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// --- Badge ------------------------------------------------------------------

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'violet';

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-500/10 dark:text-red-400',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-400',
  brand: 'bg-orange-50 text-orange-700 ring-orange-600/15 dark:bg-brand/10 dark:text-orange-400',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/10 dark:text-violet-400',
};

export function Badge({ tone = 'neutral', dot, className, children }: { tone?: BadgeTone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 ring-inset ring-transparent whitespace-nowrap', BADGE_TONE[tone], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

const INVOICE_TONE: Record<InvoiceStatus, BadgeTone> = { pending: 'warning', paid: 'success', overdue: 'danger' };
const QUOTE_TONE: Record<Quote['status'], BadgeTone> = { pending: 'info', approved: 'success', rejected: 'neutral' };

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge tone={INVOICE_TONE[status]} dot>{INVOICE_STATUS_LABEL[status]}</Badge>;
}

export function QuoteStatusBadge({ status }: { status: Quote['status'] }) {
  return <Badge tone={QUOTE_TONE[status]} dot>{QUOTE_STATUS_LABEL[status]}</Badge>;
}

// --- Form fields --------------------------------------------------------------

export const inputBase =
  'w-full h-11 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition-shadow focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:opacity-60';

export function Field({ label, hint, error, className, children, htmlFor }: {
  label?: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; className?: string; children: React.ReactNode; htmlFor?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <label htmlFor={htmlFor} className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">{label}</label>}
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : hint ? <p className="text-xs text-zinc-400 dark:text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => <input ref={ref} className={cn(inputBase, className)} {...rest} />,
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => <textarea ref={ref} className={cn(inputBase, 'h-auto min-h-[88px] py-2.5 resize-y', className)} {...rest} />,
);
Textarea.displayName = 'Textarea';

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(inputBase, 'appearance-none pr-9 bg-no-repeat bg-[length:16px] bg-[right_0.75rem_center]', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...rest}
    >
      {children}
    </select>
  );
}

export function MoneyInput({ value, onChange, className, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">R$</span>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={Number.isFinite(value) ? value : ''}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        onFocus={e => e.target.select()}
        className={cn(inputBase, 'pl-10 tabular-nums', className)}
        {...rest}
      />
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string }) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer select-none">
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</span>}
          {description && <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative w-10 h-6 rounded-full transition-colors shrink-0', checked ? 'bg-brand' : 'bg-zinc-300 dark:bg-zinc-700')}
      >
        <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </button>
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Pesquisar...', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputBase, 'pl-10 pr-9')}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" aria-label="Limpar busca">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// --- Segmented / chips ----------------------------------------------------------

export function Segmented<T extends string>({ options, value, onChange, className, size = 'md' }: {
  options: { value: T; label: React.ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string; size?: 'sm' | 'md';
}) {
  return (
    <div className={cn('inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 gap-0.5 max-w-full overflow-x-auto no-scrollbar', className)}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all whitespace-nowrap',
            size === 'sm' ? 'px-2.5 h-7 text-xs' : 'px-3 h-8 text-[13px]',
            value === o.value
              ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200',
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cn('text-[10px] tabular-nums px-1.5 rounded-full', value === o.value ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-zinc-200/70 dark:bg-zinc-700/60')}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// --- Page header --------------------------------------------------------------

export function PageHeader({ title, description, actions, back }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; back?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back}
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
        {description && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// --- Empty state --------------------------------------------------------------

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-14 px-6', className)}>
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-zinc-400" />
      </div>
      <p className="font-semibold text-zinc-800 dark:text-zinc-200">{title}</p>
      {description && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// --- Stat card ----------------------------------------------------------------

const STAT_TONE = {
  brand: 'bg-orange-50 text-brand dark:bg-brand/10',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  danger: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  neutral: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'neutral', onClick, className }: {
  label: string; value: React.ReactNode; hint?: React.ReactNode; icon: LucideIcon; tone?: keyof typeof STAT_TONE; onClick?: () => void; className?: string;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Card className={cn('p-4 sm:p-5 text-left', onClick && 'hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all', className)}>
      <Comp {...(onClick ? { onClick, type: 'button' as const } : {})} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', STAT_TONE[tone])}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums truncate">{value}</p>
        {hint && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 truncate">{hint}</p>}
      </Comp>
    </Card>
  );
}

// --- Avatar -------------------------------------------------------------------

const AVATAR_COLORS = [
  'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
];

export function Avatar({ name, size = 'md', className }: { name?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const n = name || '?';
  let hash = 0;
  for (let i = 0; i < n.length; i++) hash = (hash * 31 + n.charCodeAt(i)) >>> 0;
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold shrink-0', AVATAR_COLORS[hash % AVATAR_COLORS.length], sizes[size], className)}>
      {initials(n)}
    </div>
  );
}

// --- Dropdown menu ------------------------------------------------------------

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
  divider?: boolean;
}

export function DropdownMenu({ items, trigger, align = 'right', label = 'Mais ações' }: {
  items: MenuItem[]; trigger?: React.ReactNode; align?: 'left' | 'right'; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setUp(window.innerHeight - rect.bottom < 320 && rect.top > 320);
    }
    setOpen(o => !o);
  };

  const visible = items.filter(i => !i.hidden);
  return (
    <div className="relative" ref={ref} onClick={e => e.stopPropagation()}>
      {trigger ? <div onClick={toggle}>{trigger}</div> : <IconButton icon={MoreHorizontal} label={label} onClick={toggle} />}
      {open && (
        <div className={cn(
          'absolute z-50 min-w-[210px] py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-900/10',
          align === 'right' ? 'right-0' : 'left-0', up ? 'bottom-full mb-1' : 'top-full mt-1',
        )}>
          {visible.map((item, i) => (
            <React.Fragment key={i}>
              {item.divider && i > 0 && <div className="my-1.5 h-px bg-zinc-100 dark:bg-zinc-800" />}
              <button
                type="button"
                onClick={() => { setOpen(false); item.onClick(); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors',
                  item.danger
                    ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
                    : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800',
                )}
              >
                {item.icon && <item.icon className="w-4 h-4 opacity-70" />}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Misc ---------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-zinc-200/70 dark:bg-zinc-800', className)} />;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px bg-zinc-100 dark:bg-zinc-800', className)} />;
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{children}</h2>
      {action}
    </div>
  );
}
