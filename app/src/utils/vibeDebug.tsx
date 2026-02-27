import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

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

export function QRScanner({ serverUrl, onConnected }: { serverUrl: string; onConnected?: () => void }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const { connect, addLog, isConnected } = useVibeDebugStore();

  useEffect(() => {
    initLogInterceptor(addLog);
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    try {
      const url = new URL(data);
      const sessionId = url.searchParams.get('session');
      const token = url.searchParams.get('token');

      if (!sessionId || !token) {
        Alert.alert('Invalid QR Code', 'This QR code is not a valid VibeDebug session');
        return;
      }

      connect(serverUrl, sessionId, token);
      setModalVisible(false);
      onConnected?.();
    } catch (e) {
      Alert.alert('Invalid QR Code', 'Could not parse QR code');
    }
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to scan QR codes');
        return;
      }
    }
    setModalVisible(true);
  };

  if (isConnected) {
    return null;
  }

  return (
    <View style={styles.qrContainer}>
      <TouchableOpacity style={styles.qrButton} onPress={openScanner}>
        <Text style={styles.qrButtonText}>扫码连接调试</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={handleBarCodeScanned}
          >
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>
          </CameraView>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>取消</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = require('react-native').Dimensions.get('window');

export function VibeDebugFloatingBall() {
  const { isConnected, logs } = useVibeDebugStore();
  const [expanded, setExpanded] = useState(false);

  const translateX = useSharedValue(SCREEN_WIDTH - 70);
  const translateY = useSharedValue(100);
  const scale = useSharedValue(1);

  const errorCount = logs.filter((l) => l.level === 'error' || l.level === 'fatal').length;
  const recentErrors = logs.filter((l) => l.level === 'error' || l.level === 'fatal').slice(0, 5);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(1.2);
    })
    .onUpdate((event) => {
      translateX.value = Math.max(0, Math.min(SCREEN_WIDTH - 50, event.absoluteX - 25));
      translateY.value = Math.max(0, Math.min(SCREEN_HEIGHT - 50, event.absoluteY - 25));
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      if (translateX.value > SCREEN_WIDTH / 2) {
        translateX.value = withSpring(SCREEN_WIDTH - 70);
      } else {
        translateX.value = withSpring(10);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(setExpanded)(!expanded);
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const ballColor = errorCount > 0 ? '#ef4444' : isConnected ? '#22c55e' : '#f59e0b';

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.ball, { backgroundColor: ballColor }, animatedStyle]}>
        <Text style={styles.ballText}>V</Text>

        {expanded && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>VibeDebug</Text>
              <TouchableOpacity onPress={() => setExpanded(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: ballColor }]} />
              <Text style={styles.statusText}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>

            {errorCount > 0 && (
              <View style={styles.errorSection}>
                <Text style={styles.errorTitle}>Recent Errors ({errorCount})</Text>
                {recentErrors.map((log) => (
                  <View key={log.id} style={styles.errorItem}>
                    <Text style={styles.errorMessage} numberOfLines={2}>
                      {log.message}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {errorCount === 0 && (
              <Text style={styles.noErrorText}>No errors yet</Text>
            )}
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  qrContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 9999,
  },
  qrButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  qrButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanArea: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#22c55e',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  closeButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ball: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  ballText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: 60,
    width: 280,
    maxHeight: 400,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    color: '#999',
    fontSize: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#ccc',
    fontSize: 14,
  },
  errorSection: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
  },
  errorMessage: {
    color: '#fca5a5',
    fontSize: 12,
  },
  noErrorText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});
