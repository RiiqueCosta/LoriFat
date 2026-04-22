/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar, Navbar, ViewType } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { RecordsView } from './components/RecordsView';
import { ReportsView } from './components/ReportsView';
import { RecordForm } from './components/RecordForm';
import { Modal } from './components/Modal';
import { useData } from './useData';
import { AppRecord, Client } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { records, config, addRecord, deleteRecord, updateRecord, isLoaded } = useData();

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 font-bold text-sm animate-pulse">Iniciando Lori-TI...</p>
        </div>
      </div>
    );
  }

  const handleAddRecord = (record: AppRecord) => {
    addRecord(record);
    setIsModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 transition-colors duration-300">
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
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' && <DashboardView records={records} />}
            {['invoices', 'quotes', 'clients', 'expenses'].includes(currentView) && (
              <RecordsView 
                type={currentView.slice(0, -1) as any} 
                records={records} 
                onAdd={() => setIsModalOpen(true)}
                onDelete={deleteRecord}
                onUpdate={updateRecord}
                onAddDirectly={addRecord}
                config={config}
              />
            )}
            {currentView === 'reports' && <ReportsView records={records} config={config} />}
          </div>
        </main>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={`Novo Registro`}
      >
        <RecordForm 
          type={currentView === 'dashboard' || currentView === 'reports' ? 'invoice' : currentView.slice(0, -1) as any}
          clients={records.filter(r => r.type === 'client') as Client[]} 
          onCancel={() => setIsModalOpen(false)}
          onSubmit={handleAddRecord}
        />
      </Modal>
    </div>
  );
}
