import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import api from '../api';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, setIsLoggedIn } = useApp();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }

    try {
      await api.request({
        url: '/api/send-code',
        method: 'POST',
        data: { phone },
      });
      
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
      console.log('开始登录:', { phone, verificationCode: code });
      
      const result = await api.request({
        url: '/api/phone-login',
        method: 'POST',
        data: { phone, verificationCode: code },
      });
      
      console.log('登录成功:', result);
      
      // Store token
      await AsyncStorage.setItem('token', result.token);
      api.setToken(result.token);
      setIsLoggedIn(true);
      navigation.replace('Home');
    } catch (error: any) {
      console.log('登录失败:', error);
      Alert.alert('登录失败', error.message || '请检查网络后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleWechatLogin = async () => {
    // 微信登录逻辑
    Alert.alert('提示', '微信登录开发中');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>好好吃饭</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            记录每一餐的美好
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: theme.card }]}>
          <Text style={[styles.label, { color: theme.text }]}>手机号</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.textSecondary }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="请输入手机号"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          <Text style={[styles.label, { color: theme.text }]}>验证码</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.codeInput, { color: theme.text, borderColor: theme.textSecondary }]}
              value={code}
              onChangeText={setCode}
              placeholder="请输入验证码"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.codeButton, { backgroundColor: theme.accent }]}
              onPress={handleSendCode}
              disabled={countdown > 0}
            >
              <Text style={styles.codeButtonText}>
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: loading ? '#CCCCCC' : theme.accent }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>登录</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.textSecondary }]} />
            <Text style={[styles.dividerText, { color: theme.textSecondary }]}>或</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.textSecondary }]} />
          </View>

          <TouchableOpacity
            style={[styles.wechatButton, { backgroundColor: '#07C160' }]}
            onPress={handleWechatLogin}
          >
            <Text style={styles.wechatButtonText}>微信一键登录</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.agreement}>
          <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
            <Text style={[styles.agreementText, { color: theme.textSecondary }]}>
              登录即表示同意《用户协议》和《隐私政策》
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  form: {
    borderRadius: 16,
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  codeInput: {
    flex: 1,
    marginRight: 12,
  },
  codeButton: {
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  wechatButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wechatButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  agreement: {
    marginTop: 24,
    alignItems: 'center',
  },
  agreementText: {
    fontSize: 12,
  },
});

export default LoginScreen;
