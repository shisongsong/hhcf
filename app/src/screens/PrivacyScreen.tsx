import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';

const AGREEMENT_TEXT = `欢迎使用好好吃饭！

我们非常重视您的隐私保护。本应用尊重并保护您的个人隐私。

我们收集的信息：
• 您拍摄的照片（用于记录餐饮）
• 您的位置信息（用于推荐附近美食）

我们如何使用您的信息：
• 提供餐饮记录服务
• 改进我们的服务
• 与您沟通

信息存储：
• 您的照片存储在安全的云服务器上
• 我们不会将您的信息分享给第三方

使用本应用即表示您同意我们的隐私政策。`;

export const PrivacyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, agreeToPrivacy, isLoggedIn } = useApp();

  const handleAgree = async () => {
    await agreeToPrivacy();
    if (isLoggedIn) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  const handleDisagree = () => {
    Alert.alert('提示', '您需要同意隐私协议才能使用本应用');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgGradient?.[0] || theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>隐私协议</Text>
      </View>

      <ScrollView style={[styles.content, { backgroundColor: '#fff' }]}>
        <Text style={styles.agreementText}>{AGREEMENT_TEXT}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.btn, styles.btnDisagree]} onPress={handleDisagree}>
          <Text style={[styles.btnText, { color: theme.textSecondary }]}>不同意</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.btn, styles.btnAgree, { backgroundColor: theme.primary }]} 
          onPress={handleAgree}
        >
          <Text style={[styles.btnText, { color: '#fff' }]}>同意</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  agreementText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisagree: {
    backgroundColor: '#f5f5f5',
  },
  btnAgree: {},
  btnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PrivacyScreen;
