/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppRecord, Invoice, Expense, AppConfig } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FileText, Download } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ReportsViewProps {
  records: AppRecord[];
  config: AppConfig;
}

export function ReportsView({ records, config }: ReportsViewProps) {
  const invoices = records.filter(r => r.type === 'invoice') as Invoice[];
  const expenses = records.filter(r => r.type === 'expense') as Expense[];

  // Group by month
  const monthlyData: Record<string, { month: string; invoiced: number; paid: number; expenses: number }> = {};
  
  const getMonthKey = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  };

  invoices.forEach(i => {
    const key = getMonthKey(i.dateCreated);
    if (!monthlyData[key]) monthlyData[key] = { month: key, invoiced: 0, paid: 0, expenses: 0 };
    monthlyData[key].invoiced += i.total;
    if (i.status === 'paid') monthlyData[key].paid += i.total;
  });

  expenses.forEach(e => {
    const key = getMonthKey(e.dateCreated);
    if (!monthlyData[key]) monthlyData[key] = { month: key, invoiced: 0, paid: 0, expenses: 0 };
    monthlyData[key].expenses += e.total;
  });

  const quotes = records.filter(r => r.type === 'quote');

  const chartData = Object.values(monthlyData).sort((a, b) => {
    const [ma, ya] = a.month.split('/');
    const [mb, yb] = b.month.split('/');
    return parseInt(ya) - parseInt(yb) || ma.localeCompare(mb);
  });

  const downloadFullReport = () => {
    const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.total, 0);

    const template = `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
        <h1 style="color: #ff7a00; border-bottom: 2px solid #ff7a00; padding-bottom: 10px;">Relatório Financeiro Lori-TI</h1>
        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px;">
          <div style="background: #f8f8f8; padding: 15px; border-radius: 8px;">
            <h3 style="margin-top: 0;">Total Faturado</h3>
            <p style="font-size: 20px; font-weight: bold; color: #2563eb;">${formatCurrency(totalInvoiced)}</p>
          </div>
          <div style="background: #f8f8f8; padding: 15px; border-radius: 8px;">
            <h3 style="margin-top: 0;">Total Recebido</h3>
            <p style="font-size: 20px; font-weight: bold; color: #16a34a;">${formatCurrency(totalPaid)}</p>
          </div>
          <div style="background: #f8f8f8; padding: 15px; border-radius: 8px;">
            <h3 style="margin-top: 0;">Despesas</h3>
            <p style="font-size: 20px; font-weight: bold; color: #dc2626;">${formatCurrency(totalExpenses)}</p>
          </div>
          <div style="background: #f8f8f8; padding: 15px; border-radius: 8px;">
            <h3 style="margin-top: 0;">Orçamentos Ativos</h3>
            <p style="font-size: 20px; font-weight: bold; color: #7c3aed;">${quotes.length}</p>
          </div>
        </div>

        <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center;">
          <h3 style="margin-top: 0;">Saldo Líquido (Recebido - Despesas)</h3>
          <p style="font-size: 24px; font-weight: bold; color: ${totalPaid - totalExpenses >= 0 ? '#16a34a' : '#dc2626'}">${formatCurrency(totalPaid - totalExpenses)}</p>
        </div>

        <h3 style="margin-top: 40px;">Detalhamento por Mês</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr style="background: #ff7a00; color: white;">
            <th style="padding: 10px; text-align: left;">Mês</th>
            <th style="padding: 10px; text-align: right;">Faturado</th>
            <th style="padding: 10px; text-align: right;">Despesas</th>
            <th style="padding: 10px; text-align: right;">Saldo</th>
          </tr>
          ${chartData.map(d => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px;">${d.month}</td>
              <td style="padding: 10px; text-align: right;">${formatCurrency(d.invoiced)}</td>
              <td style="padding: 10px; text-align: right;">${formatCurrency(d.expenses)}</td>
              <td style="padding: 10px; text-align: right;">${formatCurrency(d.paid - d.expenses)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = template;
    const opt = { margin: 10, filename: `relatorio-loriti-${new Date().toISOString().split('T')[0]}.pdf` };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Análise Financeira</h2>
          <p className="text-sm text-zinc-500">Visão detalhada do seu desempenho financeiro.</p>
        </div>
        <button 
          onClick={downloadFullReport}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-zinc-800 transition-all"
        >
          <Download className="w-4 h-4" />
          Exportar Relatório PDF
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
        <h3 className="font-bold text-zinc-900 mb-6">Comparativo: Faturado vs Despesas</h3>
        <div className="h-80 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar name="Faturado" dataKey="invoiced" fill="#ff7a00" radius={[4, 4, 0, 0]} />
                <Bar name="Despesas" dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-400 italic">Sem dados suficientes para gerar o gráfico</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-bold text-zinc-900">Top Clientes</h3>
            <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full uppercase">Por Valor</span>
          </div>
          <div className="p-4 space-y-4">
            {invoices.length > 0 ? Array.from(invoices.reduce((acc, curr) => {
              const val = acc.get(curr.clientName) || 0;
              acc.set(curr.clientName, val + curr.total);
              return acc;
            }, new Map<string, number>()).entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, total], i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-brand font-bold text-xs">{i+1}</div>
                   <p className="text-sm font-semibold text-zinc-700">{name}</p>
                </div>
                <p className="text-sm font-bold text-zinc-900">{formatCurrency(total)}</p>
              </div>
            )) : <p className="text-center py-10 text-sm text-zinc-400 italic">Sem faturas registradas</p>}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-bold text-zinc-900">Categorias de Despesas</h3>
            <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full uppercase">Por Gastos</span>
          </div>
          <div className="p-4 space-y-4">
            {expenses.length > 0 ? Array.from(expenses.reduce((acc, curr) => {
              const val = acc.get(curr.category) || 0;
              acc.set(curr.category, val + curr.total);
              return acc;
            }, new Map<string, number>()).entries())
            .sort((a, b) => b[1] - a[1])
            .map(([cat, total], i) => (
              <div key={i} className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-700">{cat}</p>
                <p className="text-sm font-bold text-red-500">{formatCurrency(total)}</p>
              </div>
            )) : <p className="text-center py-10 text-sm text-zinc-400 italic">Sem despesas registradas</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
