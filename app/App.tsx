import React from 'react';
import { StatusBar, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import HomeScreen from './src/screens/HomeScreen';
import RecordsScreen from './src/screens/RecordsScreen';
import DetailScreen from './src/screens/DetailScreen';
import LoginScreen from './src/screens/LoginScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import CameraScreen from './src/screens/CameraScreen';

const Stack = createNativeStackNavigator();

const AppNavigator: React.FC = () => {
  const { theme, apiConnected, isAgreed, isLoggedIn } = useApp();

  if (!apiConnected) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={styles.errorEmoji}>📡</Text>
        <Text style={[styles.errorTitle, { color: theme.text }]}>连接失败</Text>
        <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>
          无法连接到服务器，请检查网络后重启App
        </Text>
      </View>
    );
  }

  const getInitialRouteName = () => {
    if (!isAgreed) return 'Privacy';
    if (!isLoggedIn) return 'Login';
    return 'Main';
  };

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: theme.accent,
          background: theme.background,
          card: theme.card,
          text: theme.text,
          border: theme.card,
          notification: theme.accent,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={getInitialRouteName()}
      >
        <Stack.Screen name="Privacy" component={PrivacyScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Camera" component={CameraScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const MainTabs: React.FC = () => {
  const { theme } = useApp();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Records" component={RecordsScreen} />
    </Stack.Navigator>
  );
};

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar barStyle="dark-content" />
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default App;
