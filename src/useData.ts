/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, ADMIN_EMAIL } from './lib/firebase';
import { useFeedback } from './lib/feedback';
import { AppConfig, AppRecord, Invoice, Recurring } from './types';
import {
  buildPricingFields, nextNumber, pendingRecurringDates, recurringInvoiceId,
} from './lib/billing';
import { addDays, dateKey, todayISO } from './lib/utils';

export const DEFAULT_CONFIG: AppConfig = {
  companyName: 'Lori-TI Solutions',
  companyPhone: '(11) 98525-8655',
  companyEmail: 'loritisolutions@gmail.com',
  companyCnpj: '59.914.130/0001-82',
  theme: 'light',
  defaultDueDays: 15,
  quoteValidityDays: 30,
};

const THEME_KEY = 'lorifat-theme';

function readStoredTheme(): AppConfig['theme'] {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'dark' || t === 'light') return t;
  } catch { /* ignore */ }
  return 'light';
}

/** Remove campos undefined (o Firestore não aceita). */
function clean<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined) return;
    out[k] = Array.isArray(v)
      ? v.map(x => (x && typeof x === 'object' ? clean(x as object) : x))
      : v;
  });
  return out as T;
}

function friendlyFirestoreError(error: unknown): string {
  const code = String((error as { code?: string })?.code || '');
  if (code.includes('permission-denied')) return 'Sem permissão. Verifique se as regras do Firestore foram publicadas.';
  if (code.includes('unavailable')) return 'Sem conexão. A alteração será enviada quando a internet voltar.';
  if (code.includes('resource-exhausted')) return 'Limite do Firebase atingido. Tente novamente mais tarde.';
  return (error as Error)?.message || String(error);
}

export function useData(user: User | null) {
  const feedback = useFeedback();
  const [records, setRecords] = useState<AppRecord[]>([]);
  const [config, setConfig] = useState<AppConfig>({ ...DEFAULT_CONFIG, theme: readStoredTheme() });
  const [isLoaded, setIsLoaded] = useState(false);
  const [dataOwnerId, setDataOwnerId] = useState<string | null>(null);
  const recordsRef = useRef<AppRecord[]>([]);
  const configRef = useRef<AppConfig>(config);
  const generatingRef = useRef(false);

  recordsRef.current = records;
  configRef.current = config;

  const isAdmin = !!user && user.email === ADMIN_EMAIL;

  // Descobre de quem são os dados (dono ou colaborador convidado).
  useEffect(() => {
    if (!user) {
      setRecords([]);
      setDataOwnerId(null);
      setIsLoaded(true);
      return;
    }
    setIsLoaded(false);
    (async () => {
      if (user.email === ADMIN_EMAIL) {
        setDataOwnerId(user.uid);
        return;
      }
      try {
        const allowedDoc = await getDoc(doc(db, 'allowed_users', (user.email || '').toLowerCase()));
        setDataOwnerId(allowedDoc.exists() ? allowedDoc.data().ownerUid : user.uid);
      } catch (err) {
        console.error('Erro ao identificar o dono dos dados:', err);
        setDataOwnerId(user.uid);
      }
    })();
  }, [user]);

  // Assina registros e configurações em tempo real.
  useEffect(() => {
    if (!user || !dataOwnerId) return;
    setIsLoaded(false);

    const recordsPath = `users/${dataOwnerId}/records`;
    const unsubRecords = onSnapshot(query(collection(db, recordsPath)), (snapshot: any) => {
      const data: AppRecord[] = [];
      snapshot.forEach((d: any) => { data.push({ ...d.data(), id: d.id } as AppRecord); });
      setRecords(data);
      setIsLoaded(true);
    }, (error: unknown) => {
      console.error('Erro ao carregar registros:', error);
      feedback.error('Não foi possível carregar os dados', friendlyFirestoreError(error));
      setIsLoaded(true);
    });

    const configPath = `users/${dataOwnerId}/settings/config`;
    const unsubConfig = onSnapshot(doc(db, configPath), (snap: any) => {
      const next = snap.exists() ? { ...DEFAULT_CONFIG, ...snap.data() } as AppConfig : { ...DEFAULT_CONFIG, theme: readStoredTheme() };
      setConfig(next);
      try { localStorage.setItem(THEME_KEY, next.theme); } catch { /* ignore */ }
    }, (error: unknown) => {
      console.error('Erro ao carregar configurações:', error);
    });

    return () => { unsubRecords(); unsubConfig(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dataOwnerId]);

  const recordPath = (id: string) => `users/${dataOwnerId}/records/${id}`;

  /** Cria um registro. Faturas/orçamentos recebem número sequencial automaticamente. */
  const addRecord = useCallback(async (record: AppRecord, opts: { silent?: boolean } = {}): Promise<AppRecord | null> => {
    if (!user || !dataOwnerId) return null;
    let rec: AppRecord = { ...record, ownerId: dataOwnerId };
    if ((rec.type === 'invoice' || rec.type === 'quote') && !rec.number) {
      rec = { ...rec, number: nextNumber(recordsRef.current, rec.type, rec.dateCreated) };
    }
    const payload = clean({
      ...rec,
      createdBy: user.uid,
      dateCreated: rec.dateCreated || todayISO(),
      updatedAt: serverTimestamp(),
    });
    try {
      await setDoc(doc(db, recordPath(rec.id)), payload);
      return rec;
    } catch (error) {
      console.error('Erro ao salvar:', error);
      if (!opts.silent) feedback.error('Não foi possível salvar', friendlyFirestoreError(error));
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dataOwnerId]);

  const updateRecord = useCallback(async (id: string, data: Partial<AppRecord>): Promise<boolean> => {
    if (!user || !dataOwnerId) return false;
    const { id: _id, type: _type, ownerId: _owner, ...rest } = data as Record<string, unknown>;
    void _id; void _type; void _owner;
    delete (rest as Record<string, unknown>).createdBy;
    try {
      await updateDoc(doc(db, recordPath(id)), clean({
        ...rest,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: user.uid,
      }));
      return true;
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      feedback.error('Não foi possível atualizar', friendlyFirestoreError(error));
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dataOwnerId]);

  const deleteRecord = useCallback(async (id: string): Promise<boolean> => {
    if (!user || !dataOwnerId) return false;
    try {
      await deleteDoc(doc(db, recordPath(id)));
      return true;
    } catch (error) {
      console.error('Erro ao excluir:', error);
      feedback.error('Não foi possível excluir', friendlyFirestoreError(error));
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dataOwnerId]);

  const saveConfig = useCallback(async (newConfig: AppConfig | ((prev: AppConfig) => AppConfig)): Promise<boolean> => {
    const finalConfig = typeof newConfig === 'function' ? newConfig(configRef.current) : newConfig;
    const previous = configRef.current;
    setConfig(finalConfig);
    try { localStorage.setItem(THEME_KEY, finalConfig.theme); } catch { /* ignore */ }
    if (!user || !dataOwnerId) return false;
    try {
      await setDoc(doc(db, `users/${dataOwnerId}/settings/config`), clean(finalConfig));
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setConfig(previous);
      feedback.error('Não foi possível salvar as configurações', friendlyFirestoreError(error));
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dataOwnerId]);

  // Gera automaticamente as faturas dos contratos recorrentes vencidos.
  useEffect(() => {
    if (!isLoaded || !user || !dataOwnerId || generatingRef.current) return;
    const today = todayISO();
    const due = records.filter((r): r is Recurring =>
      r.type === 'recurring' && r.active && !!r.nextDate && dateKey(r.nextDate) <= today);
    if (due.length === 0) return;

    generatingRef.current = true;
    (async () => {
      let created = 0;
      const taken: string[] = [];
      try {
        for (const rec of due) {
          const { dates, nextDate } = pendingRecurringDates(rec, today);
          for (const issue of dates) {
            const id = recurringInvoiceId(rec.id, issue);
            if (recordsRef.current.some(r => r.id === id)) continue;
            const number = nextNumber(recordsRef.current, 'invoice', issue, taken);
            taken.push(number);
            const invoice: Invoice = {
              id,
              type: 'invoice',
              ownerId: dataOwnerId,
              dateCreated: issue,
              dueDate: addDays(issue, rec.dueDays || configRef.current.defaultDueDays || 15),
              status: 'pending',
              number,
              clientId: rec.clientId,
              clientName: rec.clientName,
              notes: rec.notes || '',
              recurringId: rec.id,
              ...buildPricingFields(rec.items, rec.taxPercent, rec.discount),
            };
            const ok = await addRecord(invoice, { silent: true });
            if (ok) created++;
          }
          await updateRecord(rec.id, { nextDate, lastGenerated: today } as Partial<Recurring>);
        }
        if (created > 0) {
          feedback.info(
            created === 1 ? '1 fatura recorrente foi gerada' : `${created} faturas recorrentes foram geradas`,
            'Confira em Faturas.',
          );
        }
      } finally {
        generatingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user, dataOwnerId, records]);

  return {
    records,
    config,
    setConfig: saveConfig,
    addRecord,
    updateRecord,
    deleteRecord,
    isLoaded,
    isAdmin,
    dataOwnerId,
  };
}

export type DataApi = ReturnType<typeof useData>;
