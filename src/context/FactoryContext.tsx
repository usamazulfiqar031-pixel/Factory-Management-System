import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Settings } from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface FactoryContextType {
  settings: Settings | null;
  currency: string;
  formatMoney: (amount: number | null | undefined) => string;
  refreshSettings: () => Promise<void>;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  dataVersion: number;
  triggerRefresh: () => void;
}

const FactoryContext = createContext<FactoryContextType | undefined>(undefined);

export const FactoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dataVersion, setDataVersion] = useState<number>(1);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      if (data && data.factory_name) {
        setSettings(data);
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshSettings();
    }
  }, [user, refreshSettings]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const triggerRefresh = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  // This factory is PKR-only; never fall back to or display USD/$ from legacy data.
  const currency = 'PKR';

  const formatMoney = useCallback(
    (amount: number | null | undefined): string => {
      const val = Number(amount) || 0;
      return `${currency} ${val.toLocaleString('en-PK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [currency]
  );

  return (
    <FactoryContext.Provider
      value={{
        settings,
        currency,
        formatMoney,
        refreshSettings,
        toasts,
        showToast,
        removeToast,
        dataVersion,
        triggerRefresh,
      }}
    >
      {children}
    </FactoryContext.Provider>
  );
};

export const useFactory = () => {
  const context = useContext(FactoryContext);
  if (!context) throw new Error('useFactory must be used within a FactoryProvider');
  return context;
};
