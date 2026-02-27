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
  connect: (serverUrl: string, sessionId: string, token: string) => void;
  disconnect: () => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
}

export const useVibeDebugStore = create<VibeDebugState>((set, get) => ({
  isConnected: false,
  sessionId: null,
  logs: [],
  socket: null,

  connect: (serverUrl: string, sessionId: string, token: string) => {
    const socket = io(serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[VibeDebug] Connected to server');
      socket.emit('auth', { token });
    });

    socket.on('authenticated', () => {
      set({ isConnected: true, sessionId });
      console.log('[VibeDebug] Authenticated');
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
      console.log('[VibeDebug] Disconnected');
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

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function initLogInterceptor(addLog: (log: LogEntry) => void) {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

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
