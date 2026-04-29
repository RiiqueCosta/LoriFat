/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Mail, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';

interface AllowedUser {
  email: string;
  role: 'collaborator' | 'admin';
  addedAt: string;
}

export function AdminView() {
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'allowed_users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: AllowedUser[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as AllowedUser);
      });
      setAllowedUsers(users.sort((a, b) => b.addedAt.localeCompare(a.addedAt)));
    }, (error) => {
      console.error("Error fetching allowed users:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    const email = newEmail.toLowerCase().trim();
    const path = `allowed_users/${email}`;
    const user = auth.currentUser;

    if (!user) return;

    try {
      await setDoc(doc(db, 'allowed_users', email), {
        email,
        role: 'collaborator',
        addedAt: new Date().toISOString(),
        ownerUid: user.uid // The admin who added this user becomes the data owner
      });
      setNewEmail('');
      setMessage({ type: 'success', text: `Colaborador ${email} autorizado com sucesso!` });
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      setMessage({ type: 'error', text: 'Erro ao autorizar colaborador.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveUser = async (email: string) => {
    if (!window.confirm(`Deseja remover o acesso de ${email}?`)) return;

    const path = `allowed_users/${email}`;
    try {
      await deleteDoc(doc(db, 'allowed_users', email));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Painel de Administração</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Gerencie quem pode acessar o sistema de faturamento.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add User Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-brand/10 rounded-xl">
                <UserPlus className="w-5 h-5 text-brand" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Autorizar Novo</h3>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 ml-1">E-mail do Colaborador</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-brand/50 outline-none text-sm transition-all dark:text-zinc-100"
                  />
                </div>
              </div>

              {message && (
                <div className={cn(
                  "flex items-center gap-2 p-4 rounded-2xl text-xs font-bold animate-in fade-in slide-in-from-top-1",
                  message.type === 'success' ? "bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400"
                )}>
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-brand hover:bg-brand-dark text-white rounded-2xl font-black text-sm shadow-xl shadow-brand/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Autorizar Acesso'}
              </button>
            </form>

            <div className="mt-8 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed italic">
                Nota: Ao autorizar um e-mail, o colaborador poderá realizar o primeiro acesso ao sistema usando este e-mail.
              </p>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-zinc-400" />
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Colaboradores Autorizados</h3>
              </div>
              <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase">
                {allowedUsers.length} Total
              </span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {allowedUsers.length > 0 ? (
                allowedUsers.map((user) => (
                  <div key={user.email} className="p-6 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{user.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                            user.email === 'luizcosta8604@gmail.com' ? "bg-brand/10 text-brand" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                          )}>
                            {user.email === 'luizcosta8604@gmail.com' ? 'Proprietário' : 'Colaborador'}
                          </span>
                          <span className="text-[10px] text-zinc-400">Adicionado em {new Date(user.addedAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    {user.email !== 'luizcosta8604@gmail.com' && (
                      <button
                        onClick={() => handleRemoveUser(user.email)}
                        className="p-2 text-zinc-300 dark:text-zinc-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-20 text-center text-zinc-400 dark:text-zinc-600">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium text-sm">Nenhum colaborador autorizado ainda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
