import React from 'react';
import { StatusBar, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import HomeScreen from './src/screens/HomeScreen';
import RecordsScreen from './src/screens/RecordsScreen';
import DetailScreen from './src/screens/DetailScreen';
import LoginScreen from './src/screens/LoginScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import CameraScreen from './src/screens/CameraScreen';
import { initLogInterceptor, useVibeDebugStore } from './src/utils/vibeDebug';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

initLogInterceptor(useVibeDebugStore.getState().addLog);

const TabBar: React.FC<{ theme: any; navigation: any }> = ({ theme, navigation }) => {
  const state = navigation.getState();
  const currentRoute = state.routes[state.index]?.name || 'Home';

  return (
    <View style={[styles.tabBar, { backgroundColor: theme?.card || '#fff', borderTopColor: '#E0E0E0' }]}>
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={[styles.tabIcon, currentRoute === 'Home' && styles.tabIconActive]}>🏠</Text>
        <Text style={[styles.tabText, { color: currentRoute === 'Home' ? theme?.accent : theme?.textSecondary }]}>首页</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate('Records')}
      >
        <Text style={[styles.tabIcon, currentRoute === 'Records' && styles.tabIconActive]}>📋</Text>
        <Text style={[styles.tabText, { color: currentRoute === 'Records' ? theme?.accent : theme?.textSecondary }]}>记录</Text>
      </TouchableOpacity>
    </View>
  );
};

const MainTabs: React.FC = () => {
  const { theme } = useApp();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBar: (props) => <TabBar {...props} theme={theme} />,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Records" component={RecordsScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { theme, isAgreed, isLoggedIn, isLoading } = useApp();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF8C42" />
      </View>
    );
  }

  const getInitialRouteName = () => {
    if (!isAgreed) return 'Privacy';
    if (!isLoggedIn) return 'Login';
    return 'Main';
  };

  const navTheme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      primary: theme?.accent || '#FF8C42',
      background: theme?.background || '#FFFFFF',
      card: theme?.card || '#FFFFFF',
      text: theme?.text || '#333333',
      border: theme?.card || '#FFFFFF',
      notification: theme?.accent || '#FF8C42',
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default App;
