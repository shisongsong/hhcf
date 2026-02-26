import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import api from '../api';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, setIsLoggedIn, isLoggedIn } = useApp();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 如果已经登录，直接跳转
  useEffect(() => {
    if (isLoggedIn) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  }, [isLoggedIn, navigation]);

  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }

    try {
      await api.sendVerificationCode(phone);
      Alert.alert('提示', '验证码已发送');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      Alert.alert('发送失败', error.message);
    }
  };

  const handleLogin = async () => {
    if (!phone || !code) {
      Alert.alert('提示', '请输入手机号和验证码');
      return;
    }

    setLoading(true);
    try {
      const result = await api.phoneLogin(phone, code);
      await AsyncStorage.setItem('token', result.token);
      api.setToken(result.token);
      setIsLoggedIn(true);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error: any) {
      Alert.alert('登录失败', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgGradient?.[0] || theme.background }]}>
      <View style={styles.bgDecoration}>
        <View style={[styles.blob1, { backgroundColor: theme.blobs?.[0] || '#E8C4C8' }]} />
        <View style={[styles.blob2, { backgroundColor: theme.blobs?.[1] || '#D4A4B0' }]} />
        <View style={[styles.blob3, { backgroundColor: theme.blobs?.[2] || '#C48490' }]} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.logoEmoji}>🍽️</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>好好吃饭</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            记录每一餐的美好
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: theme.card }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>手机号</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderBottomColor: theme.textSecondary }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="请输入手机号"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>验证码</Text>
            <View style={styles.codeRow}>
              <TextInput
                style={[styles.input, styles.codeInput, { color: theme.text, borderBottomColor: theme.textSecondary }]}
                value={code}
                onChangeText={setCode}
                placeholder="请输入验证码"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.codeButton, { backgroundColor: countdown > 0 ? '#ccc' : theme.accent }]}
                onPress={handleSendCode}
                disabled={countdown > 0 || phone.length !== 11}
              >
                <Text style={styles.codeButtonText}>
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.primary }]}
            onPress={handleLogin}
            disabled={loading || !phone || !code}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>登录</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.privacyLink}
          onPress={() => navigation.navigate('Privacy')}
        >
          <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
            登录即表示同意《用户协议》和《隐私政策》
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  bgDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -50,
    right: -50,
    opacity: 0.5,
  },
  blob2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    bottom: '20%',
    left: -30,
    opacity: 0.4,
  },
  blob3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: '40%',
    right: 20,
    opacity: 0.3,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
  form: {
    borderRadius: 20,
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    fontSize: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    marginRight: 12,
  },
  codeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  codeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  privacyLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  privacyText: {
    fontSize: 12,
  },
});

export default LoginScreen;
