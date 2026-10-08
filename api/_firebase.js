// Acesso de servidor ao Firebase (Admin SDK).
// Variável de ambiente no Vercel: FIREBASE_SERVICE_ACCOUNT = conteúdo inteiro do JSON da conta de serviço.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export function firebase() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('A variável FIREBASE_SERVICE_ACCOUNT não está configurada no Vercel.');
    const account = JSON.parse(raw);
    initializeApp({ credential: cert(account), projectId: account.project_id });
  }
  return { db: getFirestore(), messaging: getMessaging(), auth: getAuth() };
}

const DEAD_TOKEN = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/** Envia uma notificação. Devolve 'sent', 'dead' (token inválido) ou 'error'. */
export async function sendPush(messaging, token, msg) {
  try {
    await messaging.send({
      token,
      data: { title: msg.title, body: msg.body, url: msg.url || '/', tag: msg.tag || '' },
      webpush: { headers: { Urgency: 'high', TTL: '86400' } },
    });
    return 'sent';
  } catch (err) {
    if (DEAD_TOKEN.has(err?.code)) return 'dead';
    console.error('Falha ao enviar push:', err?.code, err?.message);
    return 'error';
  }
}
