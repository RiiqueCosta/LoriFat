/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

/** true quando o tema escuro está ativo (classe "dark" no <html>). */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/** Cores dos gráficos conforme o tema. */
export function useChartTheme() {
  const dark = useIsDark();
  return {
    dark,
    grid: dark ? '#27272a' : '#f1f1f4',
    axis: dark ? '#71717a' : '#a1a1aa',
    cursor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(24,24,27,0.04)',
    tooltipBg: dark ? '#18181b' : '#ffffff',
    tooltipBorder: dark ? '#27272a' : '#e4e4e7',
    text: dark ? '#f4f4f5' : '#18181b',
    revenue: '#ff7a00',
    revenueSoft: dark ? '#7c3d0a' : '#fed7aa',
    expense: dark ? '#52525b' : '#d4d4d8',
    profit: '#10b981',
  };
}

/** Persistência simples em localStorage (preferências do usuário). */
export function useLocalState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = (v: T) => {
    setValue(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
  };
  return [value, set];
}
