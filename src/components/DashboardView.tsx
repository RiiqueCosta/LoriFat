/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrendingUp, TrendingDown, Users, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { AppRecord, Invoice, Expense } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardViewProps {
  records: AppRecord[];
}

export function DashboardView({ records }: DashboardViewProps) {
  const invoices = records.filter(r => r.type === 'invoice') as Invoice[];
  const expenses = records.filter(r => r.type === 'expense') as Expense[];
  const clients = records.filter(r => r.type === 'client');

  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.total, 0);
  const balance = totalPaid - totalExpenses;

  // Chart data
  const monthData: Record<string, { month: string; value: number }> = {};
  invoices.forEach(inv => {
    const d = new Date(inv.dateCreated);
    const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    if (!monthData[key]) monthData[key] = { month: key, value: 0 };
    monthData[key].value += inv.total;
  });
  const chartData = Object.values(monthData).slice(-6);

  const stats = [
    { label: 'Total Faturado', value: formatCurrency(totalInvoiced), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Recebido (Pago)', value: formatCurrency(totalPaid), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Despesas Totais', value: formatCurrency(totalExpenses), icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Clientes Ativos', value: clients.length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl font-bold text-zinc-900 mt-0.5">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-zinc-900">Evolução de Faturamento</h3>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <span className="w-3 h-3 rounded-full bg-brand" />
              Previsão de Receita (Últimos 6 meses)
            </div>
          </div>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(v) => `R$ ${v > 1000 ? (v/1000).toFixed(1) + 'k' : v}`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(v: number) => [formatCurrency(v), 'Total']}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#ff7a00' : '#ff9933'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">
                Crie faturas para visualizar os dados
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-zinc-900 mb-6">Status Financeiro</h3>
          <div className="flex-1 flex flex-col justify-center items-center space-y-6">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-zinc-100" />
                <circle 
                  cx="64" 
                  cy="64" 
                  r="58" 
                  stroke="currentColor" 
                  strokeWidth="12" 
                  fill="transparent" 
                  strokeDasharray={364}
                  strokeDashoffset={364 - (364 * Math.min(totalPaid / (totalInvoiced || 1), 1))}
                  className="text-green-500 transition-all duration-1000 ease-out" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-zinc-900">{totalInvoiced > 0 ? Math.round((totalPaid/totalInvoiced)*100) : 0}%</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Recebido</p>
              </div>
            </div>
            
            <div className="w-full space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Saldo Atual</span>
                <span className={cn("font-bold", balance >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(balance)}
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full", balance >= 0 ? "bg-green-500" : "bg-red-500")} 
                  style={{ width: `${Math.min(Math.abs(balance) / (totalPaid || 1) * 100, 100)}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">Atividades Recentes</h3>
          <button className="text-brand text-xs font-bold hover:underline">Ver tudo</button>
        </div>
        <div className="divide-y divide-zinc-100">
          {invoices.length > 0 ? invoices.slice(-5).reverse().map((inv) => (
            <div key={inv.id} className="p-4 hover:bg-zinc-50 flex items-center justify-between transition-colors">
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-lg", inv.status === 'paid' ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600")}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">{inv.clientName}</p>
                  <p className="text-xs text-zinc-500">{inv.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-zinc-900">{formatCurrency(inv.total)}</p>
                <p className="text-[10px] text-zinc-400 font-medium">{formatDate(inv.dateCreated)}</p>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-zinc-400 text-sm">
              Nenhuma atividade recente encontrada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { cn } from '../lib/utils';
