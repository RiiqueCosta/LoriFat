import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// --- Firebase App Check ---------------------------------------------------
// Protege a IA (e o resto do Firebase) contra uso fora do seu app.
// VITE_RECAPTCHA_SITE_KEY: chave de site do reCAPTCHA Enterprise registrada no App Check.
// Em desenvolvimento (localhost) usa um "debug token": na 1ª execução ele aparece
// no console do navegador (F12) e deve ser cadastrado em App Check → Gerenciar tokens de depuração.
const env = (import.meta as any).env || {};
const recaptchaSiteKey: string | undefined = env.VITE_RECAPTCHA_SITE_KEY;
if (typeof window !== 'undefined') {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocalhost) {
    // true = gera um token novo e mostra no console; ou use um token fixo via .env
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = env.VITE_APPCHECK_DEBUG_TOKEN || true;
  }
  if (recaptchaSiteKey || isLocalhost) {
    initializeAppCheck(app, {
      // Em localhost o debug token tem prioridade; a chave só é usada fora dele.
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey || 'debug-only'),
      isTokenAutoRefreshEnabled: true,
    });
  }
}
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default app;
