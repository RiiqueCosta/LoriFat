/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  getDocFromServer,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { AppRecord, AppConfig } from './types';

const DEFAULT_CONFIG: AppConfig = {
  companyName: 'Lori-TI Solutions',
  companyPhone: '(11) 98525-8655',
  companyEmail: 'loritisolutions@gmail.com',
  companyCnpj: '59.914.130/0001-82',
  theme: 'light',
};

const ADMIN_EMAIL = 'luizcosta8604@gmail.com';

export function useData(user: User | null) {
  const [records, setRecords] = useState<AppRecord[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dataOwnerId, setDataOwnerId] = useState<string | null>(null);

  useEffect(() => {
    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    if (!user) {
      setRecords([]);
      setConfig(DEFAULT_CONFIG);
      setDataOwnerId(null);
      setIsLoaded(true);
      return;
    }

    const resolveOwner = async () => {
      if (user.email === ADMIN_EMAIL) {
        setDataOwnerId(user.uid);
      } else {
        // Check if collaborator
        try {
          const allowedDoc = await getDoc(doc(db, 'allowed_users', user.email!));
          if (allowedDoc.exists()) {
            setDataOwnerId(allowedDoc.data().ownerUid);
          } else {
            setDataOwnerId(user.uid); // Fallback to own data
          }
        } catch (err) {
          console.error("Error resolving owner:", err);
          setDataOwnerId(user.uid);
        }
      }
    };

    resolveOwner();
  }, [user]);

  useEffect(() => {
    if (!user || !dataOwnerId) {
      if (!user) setIsLoaded(true);
      return;
    }

    setIsLoaded(false);

    const recordsPath = `users/${dataOwnerId}/records`;
    const q = query(collection(db, recordsPath));

    const unsubscribeRecords = onSnapshot(q, (snapshot) => {
      const data: AppRecord[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id } as AppRecord);
      });
      setRecords(data);
      setIsLoaded(true);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, recordsPath);
    });

    const configPath = `users/${dataOwnerId}/settings/config`;
    const unsubscribeConfig = onSnapshot(doc(db, configPath), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data() as AppConfig);
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, configPath);
    });

    return () => {
      unsubscribeRecords();
      unsubscribeConfig();
    };
  }, [user, dataOwnerId]);

  const addRecord = async (record: AppRecord) => {
    if (!user || !dataOwnerId) return;

    const recordWithMeta = {
      ...record,
      ownerId: dataOwnerId,
      createdBy: user.uid,
      dateCreated: record.dateCreated || new Date().toISOString(),
      updatedAt: serverTimestamp()
    };

    const path = `users/${dataOwnerId}/records/${record.id}`;
    try {
      await setDoc(doc(db, path), recordWithMeta);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateRecord = async (id: string, updatedRecord: Partial<AppRecord>) => {
    if (!user || !dataOwnerId) return;

    const path = `users/${dataOwnerId}/records/${id}`;
    try {
      await updateDoc(doc(db, path), {
        ...updatedRecord,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!user || !dataOwnerId) return;

    const path = `users/${dataOwnerId}/records/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const setConfigOnFirestore = async (newConfig: AppConfig | ((prev: AppConfig) => AppConfig)) => {
    if (!user || !dataOwnerId) return;

    const path = `users/${dataOwnerId}/settings/config`;
    const finalConfig = typeof newConfig === 'function' ? newConfig(config) : newConfig;
    
    // Optimistic update
    setConfig(finalConfig);

    try {
      await setDoc(doc(db, path), finalConfig);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      // Rollback on error
      const docSnap = await getDocFromServer(doc(db, path));
      if (docSnap.exists()) {
        setConfig(docSnap.data() as AppConfig);
      }
    }
  };

  return {
    records,
    config,
    setConfig: setConfigOnFirestore,
    addRecord,
    updateRecord,
    deleteRecord,
    isLoaded,
  };
}
