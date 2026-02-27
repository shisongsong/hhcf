import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, getActiveTheme } from '../utils/theme';
import api from '../api';
import { useVibeDebugStore } from '../utils/vibeDebug';

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
  const [theme] = useState<Theme>(getActiveTheme());
  const [token, setToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiConnected] = useState(true);

  useEffect(() => {
    // 调试SDK - 通过扫码连接，不需要手动connect
  }, []);

  useEffect(() => {
    // 异步加载存储的数据，不阻塞 UI
    const loadStoredData = async () => {
      try {
        console.log('AppContext: 开始加载存储数据...');
        const [storedToken, storedAgreed] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('privacyAgreed'),
        ]);

        console.log('AppContext: token =', storedToken ? '存在' : '不存在');
        console.log('AppContext: privacyAgreed =', storedAgreed);

        if (storedToken) {
          setToken(storedToken);
          api.setToken(storedToken);
          setIsLoggedIn(true);
          console.log('AppContext: 已设置登录状态');
        }

        if (storedAgreed === 'true') {
          setIsAgreed(true);
        }
      } catch (error) {
        console.error('AppContext: 加载存储数据失败:', error);
      } finally {
        // 无论成功失败，都结束 loading 状态
        setIsLoading(false);
        console.log('AppContext: 加载完成, isLoading = false');
      }
    };

    loadStoredData();
  }, []);

  const setTheme = (newTheme: Theme) => {
    // 可以在这里保存主题偏好
  };

  const handleSetIsLoggedIn = (loggedIn: boolean) => {
    setIsLoggedIn(loggedIn);
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
    } catch (e) {}
    setToken(null);
    api.setToken(null);
    setIsLoggedIn(false);
  };

  const agreeToPrivacy = async () => {
    try {
      await AsyncStorage.setItem('privacyAgreed', 'true');
    } catch (e) {}
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
