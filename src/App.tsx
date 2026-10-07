/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { FeedbackProvider } from './lib/feedback';
import { useRoute, navigate } from './lib/router';
import { invoiceStatus } from './lib/billing';
import { useData, DataApi } from './useData';
import { ActionsProvider, useActions } from './actions';
import { Auth } from './components/Auth';
import { AppShell, QuickAction } from './components/Navigation';
import { DashboardView } from './views/DashboardView';
import { DocumentsView } from './views/DocumentsView';
import { ClientsView } from './views/ClientsView';
import { ClientDetailView } from './views/ClientDetailView';
import { ExpensesView } from './views/ExpensesView';
import { RecurringView } from './views/RecurringView';
import { ReportsView } from './views/ReportsView';
import { AssistantView } from './views/AssistantView';
import { NotesView } from './views/NotesView';
import { SettingsView } from './views/SettingsView';
import { AdminView } from './views/AdminView';

export default function App() {
  return (
    <FeedbackProvider>
      <Root />
    </FeedbackProvider>
  );
}

function Splash() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-400 to-brand shadow-xl shadow-brand/30 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold">L</div>
        </div>
        <div className="w-32 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-brand animate-[loading_1.1s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}

function Root() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const data = useData(user);

  useEffect(() => onAuthStateChanged(auth, (u: User | null) => {
    setUser(u);
    setAuthChecking(false);
  }), []);

  // Tema
  useEffect(() => {
    const dark = data.config.theme === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#09090b' : '#fafafa');
  }, [data.config.theme]);

  if (authChecking || (user && !data.isLoaded)) return <Splash />;
  if (!user) return <Auth />;

  return (
    <ActionsProvider data={data}>
      <Main user={user} data={data} />
    </ActionsProvider>
  );
}

function Main({ user, data }: { user: User; data: DataApi }) {
  const actions = useActions();
  const route = useRoute();
  const { records, config, isAdmin } = data;

  const counts = useMemo(() => ({
    overdue: records.filter(r => r.type === 'invoice' && invoiceStatus(r) === 'overdue').length,
    pendingQuotes: records.filter(r => r.type === 'quote' && r.status === 'pending').length,
  }), [records]);

  useEffect(() => {
    if (route.view === 'admin' && !isAdmin) navigate('dashboard');
  }, [route.view, isAdmin]);

  // Título da aba com o número de vencidas
  useEffect(() => {
    document.title = counts.overdue > 0 ? `(${counts.overdue}) Lori Faturamento` : 'Lori Faturamento';
  }, [counts.overdue]);

  const onQuickAction = (a: QuickAction) => {
    switch (a) {
      case 'import': return actions.importProposal();
      case 'receipt': return actions.scanReceipt();
      default: return actions.create(a);
    }
  };

  const toggleTheme = () => data.setConfig(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));

  let view: React.ReactNode;
  switch (route.view) {
    case 'invoices': view = <DocumentsView kind="invoice" records={records} config={config} preset={route.param} />; break;
    case 'quotes': view = <DocumentsView kind="quote" records={records} config={config} preset={route.param} />; break;
    case 'clients': view = <ClientsView records={records} />; break;
    case 'client': view = <ClientDetailView clientId={route.param} records={records} config={config} />; break;
    case 'expenses': view = <ExpensesView records={records} />; break;
    case 'recurring': view = <RecurringView records={records} />; break;
    case 'reports': view = <ReportsView records={records} config={config} />; break;
    case 'assistant': view = <AssistantView records={records} config={config} initialQuestion={route.param} />; break;
    case 'notes': view = <NotesView records={records} />; break;
    case 'settings': view = <SettingsView config={config} records={records} onSave={c => data.setConfig(c)} />; break;
    case 'admin': view = isAdmin ? <AdminView /> : null; break;
    default: view = <DashboardView records={records} config={config} userName={user.displayName || user.email || ''} />;
  }

  return (
    <AppShell
      view={route.view}
      config={config}
      user={user}
      isAdmin={isAdmin}
      counts={counts}
      onQuickAction={onQuickAction}
      onToggleTheme={toggleTheme}
    >
      {view}
    </AppShell>
  );
}
