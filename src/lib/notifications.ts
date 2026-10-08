/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Notificações push (Firebase Cloud Messaging).
 * Cada aparelho fica salvo em users/{dono}/devices/{id} com o token e os avisos escolhidos.
 * O envio é feito pela rotina diária do Vercel (api/notify.js).
 */

import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import app, { auth, db } from './firebase';
import { generateId } from './utils';

export interface NotifyPrefs {
  /** Resumo diário de manhã. */
  daily: boolean;
  /** Fatura que venceu ontem. */
  overdue: boolean;
  /** Cobrança recorrente para emitir. */
  recurring: boolean;
  /** Orçamento perto de perder a validade. */
  quotes: boolean;
}

export const DEFAULT_PREFS: NotifyPrefs = { daily: true, overdue: true, recurring: true, quotes: true };

export type PushState = 'loading' | 'not-configured' | 'ios-install' | 'unsupported' | 'denied' | 'off' | 'on';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
const VAPID_KEY = env.VITE_FIREBASE_VAPID_KEY;
const DEVICE_KEY = 'lorifat-device-id';

function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `d_${generateId()}`.replace(/[^a-zA-Z0-9_-]/g, '');
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'd_sem_armazenamento';
  }
}

const devicePath = (ownerId: string) => `users/${ownerId}/devices/${deviceId()}`;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

function describeDevice(): string {
  const ua = navigator.userAgent;
  const os = /android/i.test(ua) ? 'Android' : isIOS() ? 'iPhone/iPad' : /windows/i.test(ua) ? 'Windows' : /mac/i.test(ua) ? 'Mac' : /linux/i.test(ua) ? 'Linux' : 'Aparelho';
  const browser = /edg\//i.test(ua) ? 'Edge' : /chrome|crios/i.test(ua) ? 'Chrome' : /firefox|fxios/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Navegador';
  return `${os} · ${isStandalone() ? 'app instalado' : browser}`;
}

async function swRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

export async function getPushStatus(ownerId: string): Promise<{ state: PushState; prefs: NotifyPrefs }> {
  const prefs = { ...DEFAULT_PREFS };
  if (!VAPID_KEY) return { state: 'not-configured', prefs };
  if (isIOS() && !isStandalone()) return { state: 'ios-install', prefs };
  const supported = 'Notification' in window && 'serviceWorker' in navigator && (await isSupported().catch(() => false));
  if (!supported) return { state: 'unsupported', prefs };
  if (Notification.permission === 'denied') return { state: 'denied', prefs };
  if (Notification.permission !== 'granted') return { state: 'off', prefs };
  try {
    const snap = await getDoc(doc(db, devicePath(ownerId)));
    if (!snap.exists()) return { state: 'off', prefs };
    return { state: 'on', prefs: { ...prefs, ...(snap.data().prefs || {}) } };
  } catch {
    return { state: 'off', prefs };
  }
}

export async function enablePush(ownerId: string, prefs: NotifyPrefs) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Você não permitiu as notificações. Libere nas configurações do site (cadeado ao lado do endereço) e tente de novo.');
  }
  const registration = await swRegistration();
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) throw new Error('Não foi possível registrar este aparelho. Tente de novo.');
  await setDoc(doc(db, devicePath(ownerId)), {
    token,
    prefs,
    uid: auth.currentUser?.uid || '',
    email: auth.currentUser?.email || '',
    device: describeDevice(),
    updatedAt: serverTimestamp(),
  });
}

export async function savePrefs(ownerId: string, prefs: NotifyPrefs) {
  await setDoc(doc(db, devicePath(ownerId)), { prefs, uid: auth.currentUser?.uid || '', updatedAt: serverTimestamp() }, { merge: true });
}

export async function disablePush(ownerId: string) {
  try { await deleteToken(getMessaging(app)); } catch { /* token já inválido */ }
  await deleteDoc(doc(db, devicePath(ownerId)));
}

export async function sendTestPush(ownerId: string) {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Faça login de novo e tente outra vez.');
  const res = await fetch('/api/notify-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ ownerId, deviceId: deviceId() }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as { error?: string }));
    throw new Error(body.error || `O servidor respondeu ${res.status}.`);
  }
}
