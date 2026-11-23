import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, DEFAULT_SETTINGS, initializeDatabase } from '../db/db';
import type { BusinessSettings } from '../types';

interface SettingsContextValue {
  settings: BusinessSettings;
  updateSettings: (newSettings: Partial<BusinessSettings>) => Promise<void>;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const current = await initializeDatabase();
      setSettings(current);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<BusinessSettings>) => {
    try {
      const updated: BusinessSettings = {
        ...settings,
        ...newSettings,
        id: 'default',
      };
      await db.settings.put(updated);
      setSettings(updated);
    } catch (err) {
      console.error('Failed to save settings:', err);
      throw err;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
