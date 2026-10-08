/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Roteamento simples por hash (#/faturas, #/clientes/abc123).
 * Mantém o botão "voltar" do navegador/celular funcionando.
 */

import { useEffect, useState } from 'react';

export type ViewType =
  | 'dashboard' | 'invoices' | 'quotes' | 'clients' | 'client' | 'services' | 'expenses'
  | 'recurring' | 'reports' | 'assistant' | 'notes' | 'settings' | 'admin';

const SLUGS: Record<ViewType, string> = {
  dashboard: 'inicio',
  invoices: 'faturas',
  quotes: 'orcamentos',
  clients: 'clientes',
  client: 'cliente',
  services: 'servicos',
  expenses: 'despesas',
  recurring: 'recorrentes',
  reports: 'relatorios',
  assistant: 'assistente',
  notes: 'notas',
  settings: 'configuracoes',
  admin: 'admin',
};

const BY_SLUG = Object.fromEntries(Object.entries(SLUGS).map(([k, v]) => [v, k])) as Record<string, ViewType>;

export interface Route { view: ViewType; param?: string }

export function parseHash(hash = window.location.hash): Route {
  const [slug, param] = hash.replace(/^#\/?/, '').split('/');
  const view = BY_SLUG[slug || ''] || 'dashboard';
  return { view, param: param ? decodeURIComponent(param) : undefined };
}

export function routeHref(view: ViewType, param?: string) {
  return `#/${SLUGS[view]}${param ? '/' + encodeURIComponent(param) : ''}`;
}

export function navigate(view: ViewType, param?: string) {
  const href = routeHref(view, param);
  if (window.location.hash !== href) window.location.hash = href;
  window.scrollTo({ top: 0 });
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash());
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
