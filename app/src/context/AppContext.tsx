import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, getActiveTheme } from '../utils/theme';
import api from '../api';

interface AppContextType {
  theme: Theme;
  token: string | null;
  isLoggedIn: boolean;
  isAgreed: boolean;
  isLoading: boolean;
  apiConnected: boolean;
  setTheme: (theme: Theme) => void;
  setIsLoggedIn: (loggedIn: boolean) => void;
  logout: () => void;
  agreeToPrivacy: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getActiveTheme());
  const [token, setToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(true);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const [storedToken, storedAgreed] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('privacyAgreed'),
      ]);

      if (storedToken) {
        setToken(storedToken);
        api.setToken(storedToken);
        setIsLoggedIn(true);
      }

      if (storedAgreed === 'true') {
        setIsAgreed(true);
      }
    } catch (error) {
      console.error('Init app error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const handleSetIsLoggedIn = (loggedIn: boolean) => {
    setIsLoggedIn(loggedIn);
  };

  const logout = () => {
    setToken(null);
    api.setToken(null);
    setIsLoggedIn(false);
    AsyncStorage.removeItem('token');
  };

  const agreeToPrivacy = async () => {
    await AsyncStorage.setItem('privacyAgreed', 'true');
    setIsAgreed(true);
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        token,
        isLoggedIn,
        isAgreed,
        isLoading,
        apiConnected,
        setTheme,
        setIsLoggedIn: handleSetIsLoggedIn,
        logout,
        agreeToPrivacy,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
