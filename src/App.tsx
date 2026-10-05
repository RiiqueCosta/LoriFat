/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Auth } from './components/Auth';
import { Sidebar, Navbar, ViewType } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { RecordsView } from './components/RecordsView';
import { ReportsView } from './components/ReportsView';
import { NotesView } from './components/NotesView';
import { AdminView } from './components/AdminView';
import { RecordForm, RecordPrefill } from './components/RecordForm';
import { ProposalImport } from './components/ProposalImport';
import { Modal } from './components/Modal';
import { useData } from './useData';
import { AppRecord, Client, RecordType } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [formType, setFormType] = useState<RecordType | null>(null);
  const [prefill, setPrefill] = useState<RecordPrefill | undefined>(undefined);
  const [formKey, setFormKey] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  
  const { records, config, setConfig, addRecord, deleteRecord, updateRecord, isLoaded } = useData(user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (config.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [config.theme]);

  if (!isLoaded || authChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400 font-bold text-sm animate-pulse">Iniciando Lori-TI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const closeForm = () => {
    setIsModalOpen(false);
    setFormType(null);
    setPrefill(undefined);
  };

  const openNewForm = () => {
    setFormType(null);
    setPrefill(undefined);
    setFormKey(k => k + 1);
    setIsModalOpen(true);
  };

  const handleAddRecord = (record: AppRecord) => {
    addRecord(record);
    if (record.type === 'invoice' || record.type === 'quote') {
      setCurrentView(record.type === 'invoice' ? 'invoices' : 'quotes');
    }
    closeForm();
  };

  const handleImportConfirm = (type: 'quote' | 'invoice', data: RecordPrefill) => {
    setIsImportOpen(false);
    setFormType(type);
    setPrefill(data);
    setFormKey(k => k + 1);
    setIsModalOpen(true);
  };

  const defaultFormType: RecordType =
    currentView === 'dashboard' || currentView === 'reports' ? 'invoice' : currentView.slice(0, -1) as RecordType;

  const handleThemeToggle = () => {
    setConfig(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light'
    }));
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 transition-colors duration-300">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Navbar 
          onMenuToggle={() => setIsSidebarOpen(true)} 
          companyName={config.companyName}
          theme={config.theme}
          onThemeToggle={handleThemeToggle}
          onViewChange={setCurrentView}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' && <DashboardView records={records} />}
            {['invoices', 'quotes', 'clients', 'expenses'].includes(currentView) && (
              <RecordsView 
                type={currentView.slice(0, -1) as any} 
                records={records} 
                onAdd={openNewForm}
                onImportAI={() => setIsImportOpen(true)}
                onDelete={deleteRecord}
                onUpdate={updateRecord}
                onAddDirectly={addRecord}
                config={config}
              />
            )}
            {currentView === 'reports' && <ReportsView records={records} config={config} />}
            {currentView === 'notes' && (
              <NotesView 
                records={records.filter(r => r.type === 'note') as any} 
                onAdd={(note) => addRecord(note as any)}
                onDelete={deleteRecord}
              />
            )}
            {currentView === 'admin' && <AdminView />}
          </div>
        </main>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeForm}
        title={prefill ? (formType === 'invoice' ? 'Nova Fatura (IA)' : 'Novo Orçamento (IA)') : 'Novo Registro'}
      >
        <div key={formKey}>
        <RecordForm 
          type={formType || defaultFormType}
          clients={records.filter(r => r.type === 'client') as Client[]} 
          initialData={prefill}
          onCreateClient={(client) => addRecord(client)}
          onCancel={closeForm}
          onSubmit={handleAddRecord}
        />
        </div>
      </Modal>

      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Importar proposta com IA"
      >
        <ProposalImport
          onCancel={() => setIsImportOpen(false)}
          onConfirm={handleImportConfirm}
        />
      </Modal>
    </div>
  );
}
