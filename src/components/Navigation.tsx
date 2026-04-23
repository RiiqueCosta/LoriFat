/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LayoutDashboard, FileText, CheckSquare, Users, Wallet, BarChart3, Menu, X, Sun, Moon, StickyNote } from 'lucide-react';
import { cn } from '../lib/utils';

export type ViewType = 'dashboard' | 'invoices' | 'quotes' | 'clients' | 'expenses' | 'reports' | 'notes';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'invoices', label: 'Faturas', icon: FileText },
  { id: 'quotes', label: 'Orçamentos', icon: CheckSquare },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'expenses', label: 'Despesas', icon: Wallet },
  { id: 'notes', label: 'Notas', icon: StickyNote },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
];

export function Sidebar({ currentView, onViewChange, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-200 transition-transform duration-300 lg:translate-x-0 lg:static",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand/20">
                L
              </div>
              <div>
                <h1 className="font-bold text-zinc-900 leading-tight">Lori-TI</h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Soluções Tech</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id as ViewType);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                    isActive 
                      ? "bg-brand text-white shadow-md shadow-brand/20" 
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-900")} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-zinc-100">
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100/50">
              <p className="text-xs font-bold text-brand-dark uppercase tracking-tight mb-1">Suporte VIP</p>
              <p className="text-[11px] text-zinc-600 mb-3 leading-relaxed">Precisa de ajuda com o sistema?</p>
              <button className="w-full py-2 bg-white text-brand border border-brand/20 rounded-lg text-xs font-bold hover:bg-brand hover:text-white transition-all">
                Falar com Suporte
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export function Navbar({ onMenuToggle, companyName }: { onMenuToggle: () => void; companyName: string }) {
  return (
    <header className="h-16 bg-white border-b border-zinc-200 px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuToggle}
          className="p-2 hover:bg-zinc-100 rounded-lg lg:hidden"
        >
          <Menu className="w-6 h-6 text-zinc-600" />
        </button>
        <h2 className="font-semibold text-zinc-900 hidden sm:block">{companyName}</h2>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg">
          <Moon className="w-5 h-5" />
        </button>
        <div className="h-4 w-[1px] bg-zinc-200 mx-2" />
        <div className="flex items-center gap-2 px-2 py-1 hover:bg-zinc-100 rounded-lg cursor-pointer transition-all">
          <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500 font-bold overflow-hidden border border-white">
            <img src="https://ui-avatars.com/api/?name=Lori+TI&background=random" alt="User" />
          </div>
          <p className="text-sm font-medium text-zinc-700 hidden sm:block">Painel Gestão</p>
        </div>
      </div>
    </header>
  );
}
