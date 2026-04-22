/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AppRecord, AppConfig } from './types';

const STORAGE_KEY = 'loriti_gestao_data';
const CONFIG_KEY = 'loriti_gestao_config';

const DEFAULT_CONFIG: AppConfig = {
  companyName: 'Lori-TI Solutions',
  companyPhone: '(11) 98525-8655',
  companyEmail: 'loritisolutions@gmail.com',
  companyCnpj: '59.914.130/0001-82',
  theme: 'light',
};

export function useData() {
  const [records, setRecords] = useState<AppRecord[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const savedConfig = localStorage.getItem(CONFIG_KEY);

    if (savedData) {
      try {
        setRecords(JSON.parse(savedData));
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    }

    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Failed to parse saved config', e);
      }
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  }, [records, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }
  }, [config, isLoaded]);

  const addRecord = (record: AppRecord) => {
    setRecords((prev) => [...prev, record]);
  };

  const updateRecord = (id: string, updatedRecord: Partial<AppRecord>) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? ({ ...r, ...updatedRecord } as AppRecord) : r))
    );
  };

  const deleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  return {
    records,
    config,
    setConfig,
    addRecord,
    updateRecord,
    deleteRecord,
    isLoaded,
  };
}
