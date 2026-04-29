/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  AuthError
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const emailLower = email.toLowerCase().trim();
    const ADMIN_EMAIL = 'luizcosta8604@gmail.com';

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, emailLower, password);
      } else {
        // Check if allowed
        if (emailLower !== ADMIN_EMAIL) {
          const allowedDoc = await getDoc(doc(db, 'allowed_users', emailLower));
          if (!allowedDoc.exists()) {
            setError('Este e-mail não está autorizado para cadastro como colaborador. Entre em contato com o administrador.');
            setLoading(false);
            return;
          }
        }
        await createUserWithEmailAndPassword(auth, emailLower, password);
      }
    } catch (err) {
      const firebaseError = err as AuthError;
      console.error(firebaseError);
      
      switch (firebaseError.code) {
        case 'auth/user-not-found':
          setError('Usuário não encontrado.');
          break;
        case 'auth/wrong-password':
          setError('Senha incorreta.');
          break;
        case 'auth/email-already-in-use':
          setError('Este e-mail já está em uso. Tente fazer login ou use outro e-mail.');
          break;
        case 'auth/operation-not-allowed':
          setError('O provedor de autenticação (E-mail/Senha) não está habilitado no Firebase Console.');
          break;
        case 'auth/weak-password':
          setError('A senha deve ter pelo menos 6 caracteres.');
          break;
        case 'auth/invalid-email':
          setError('E-mail inválido.');
          break;
        default:
          setError('Erro ao autenticar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden transition-all duration-300">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-brand/20 mb-4 animate-in fade-in zoom-in duration-500">
              L
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Lori Faturamento</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {isLogin ? 'Bem-vindo de volta!' : 'Cadastro exclusivo para colaboradores'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-brand/50 outline-none text-sm transition-all dark:text-zinc-100"
                  placeholder="exemplo@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:ring-2 focus:ring-brand/50 outline-none text-sm transition-all dark:text-zinc-100"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold animate-in fade-in slide-in-from-top-1">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <p className="flex-1">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand hover:bg-brand-dark text-white rounded-2xl font-black text-sm shadow-xl shadow-brand/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isLogin ? 'Entrar' : 'Cadastrar Registro'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center px-4">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-xs font-bold text-zinc-400 hover:text-brand transition-colors uppercase tracking-widest"
            >
              {isLogin ? 'Sou um novo colaborador' : 'Já possuo login'}
            </button>
          </div>
        </div>
        
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center uppercase tracking-widest font-bold">
            Portal Seguro Lori Faturamento
          </p>
        </div>
      </div>
    </div>
  );
}
