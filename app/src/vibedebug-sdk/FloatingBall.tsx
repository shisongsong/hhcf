import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { useVibeDebugStore, LogEntry } from './index';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function VibeDebugFloatingBall() {
  const { isConnected, logs } = useVibeDebugStore();
  const [expanded, setExpanded] = React.useState(false);

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
