import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';

export interface LogEntry {
  id: string;
  ts: number;
  level: 'info' | 'warn' | 'error' | 'fatal';
  type: 'console' | 'network' | 'crash';
  message: string;
  stack?: string;
  meta?: Record<string, unknown>;
}

interface VibeDebugState {
  isConnected: boolean;
  sessionId: string | null;
  logs: LogEntry[];
  socket: Socket | null;
  serverUrl: string;
  connect: (sessionId: string, token: string) => void;
  disconnect: () => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
}

const DEFAULT_SERVER = 'https://debug.openanthropic.com';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function sanitizeMeta(meta: any): any {
  if (!meta) return undefined;
  if (typeof meta !== 'object') return meta;
  const sanitized: any = {};
  for (const key of Object.keys(meta)) {
    if (key.toLowerCase().includes('authorization') || key.toLowerCase().includes('token')) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = meta[key];
    }
  }
  return sanitized;
}

let initialized = false;

export const useVibeDebugStore = create<VibeDebugState>((set, get) => ({
  isConnected: false,
  sessionId: null,
  logs: [],
  socket: null,
  serverUrl: DEFAULT_SERVER,

  connect: (sessionId: string, token: string) => {
    const { serverUrl } = get();
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[VibeDebug] Connected to server');
      socket.emit('auth', { token });
    });

    socket.on('authenticated', () => {
      set({ isConnected: true, sessionId });
      console.log('[VibeDebug] Authenticated');
    });

    socket.on('disconnect', (reason) => {
      set({ isConnected: false });
      console.log('[VibeDebug] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[VibeDebug] Connection error:', error.message);
    });

    socket.on('error', (data: { message: string }) => {
      console.error('[VibeDebug] Error:', data.message);
    });

    set({ socket, sessionId });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ socket: null, isConnected: false, sessionId: null });
  },

  addLog: (log: LogEntry) => {
    set((state) => {
      const newLogs = [log, ...state.logs].slice(0, 100);
      return { logs: newLogs };
    });

    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.emit('log:push', log);
    }
  },

  clearLogs: () => set({ logs: [] }),
}));

function initInterceptor() {
  if (initialized) return;
  initialized = true;

  const addLog = useVibeDebugStore.getState().addLog;
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  console.log = (...args: any[]) => {
    originalConsole.log.apply(console, args);
    addLog({
      id: generateId(),
      ts: Date.now(),
      level: 'info',
      type: 'console',
      message: args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
      meta: sanitizeMeta(args[0]),
    });
  };

  console.warn = (...args: any[]) => {
    originalConsole.warn.apply(console, args);
    addLog({
      id: generateId(),
      ts: Date.now(),
      level: 'warn',
      type: 'console',
      message: args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
      meta: sanitizeMeta(args[0]),
    });
  };

  console.error = (...args: any[]) => {
    originalConsole.error.apply(console, args);
    const message = args.map((a) => (typeof a === 'object' ? a.message || JSON.stringify(a) : String(a))).join(' ');
    const stack = args[0]?.stack;
    addLog({
      id: generateId(),
      ts: Date.now(),
      level: 'error',
      type: 'console',
      message,
      stack,
      meta: sanitizeMeta(args[0]),
    });
  };

  const originalFetch = globalThis.fetch;
  if (originalFetch) {
    globalThis.fetch = async (...args: any[]) => {
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
      const method = args[1]?.method || 'GET';

      try {
        const response = await originalFetch.apply(globalThis, args);
        const duration = Date.now() - startTime;
        addLog({
          id: generateId(),
          ts: Date.now(),
          level: response.ok ? 'info' : 'error',
          type: 'network',
          message: `${method} ${url} ${response.status} (${duration}ms)`,
          meta: {
            status: response.status,
            statusText: response.statusText,
            duration,
            url,
            method,
          },
        });
        return response;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        addLog({
          id: generateId(),
          ts: Date.now(),
          level: 'error',
          type: 'network',
          message: `${method} ${url} FAILED (${duration}ms)`,
          stack: error?.stack,
          meta: {
            error: error?.message,
            duration,
            url,
            method,
          },
        });
        throw error;
      }
    };
  }

  if (typeof ErrorUtils !== 'undefined') {
    const originalHandler = ErrorUtils.getGlobalHandler?.();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      addLog({
        id: generateId(),
        ts: Date.now(),
        level: isFatal ? 'fatal' : 'error',
        type: 'crash',
        message: error.message,
        stack: error.stack,
        meta: { isFatal },
      });
      originalHandler?.(error, isFatal);
    });
  }
}

export function VibeDebugProvider({ children, serverUrl }: { children: React.ReactNode; serverUrl?: string }) {
  if (serverUrl) {
    useVibeDebugStore.setState({ serverUrl });
  }
  initInterceptor();
  return children;
}

export default function initVibeDebug(serverUrl?: string) {
  if (serverUrl) {
    useVibeDebugStore.setState({ serverUrl });
  }
  initInterceptor();
  return useVibeDebugStore;
}
