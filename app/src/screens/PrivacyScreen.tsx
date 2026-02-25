import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useApp } from '../context/AppContext';

export const PrivacyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, setPrivacyAgreed } = useApp();

  const handleAgree = async () => {
    await setPrivacyAgreed(true);
    navigation.replace('Login');
  };

  const handleDisagree = () => {
    navigation.goBack();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.text }]}>隐私政策</Text>

      <Text style={[styles.text, { color: theme.textSecondary }]}>
        感谢您使用「好好吃饭」！为了更好地保护您的个人隐私，请您仔细阅读以下隐私政策：
      </Text>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>一、信息收集</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        我们可能会收集您在使用服务时主动提供的信息，包括：
        {'\n'}• 手机号码（用于账号注册和登录）
        {'\n'}• 拍摄的照片（用于记录餐饮）
        {'n'}• 位置信息（用于个性化推荐，可选）
      </Text>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>二、信息使用</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        我们收集的信息将用于：
        {'\n'}• 提供餐饮记录服务
        {'\n'}• 改善用户体验
        {'\n'}• 数据统计分析
      </Text>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>三、信息保护</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        我们采用行业标准的安全措施保护您的个人信息，包括加密存储、访问控制等。
      </Text>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>四、第三方服务</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        本服务可能包含第三方链接，我们不对第三方行为负责。
      </Text>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>五、用户权利</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        您有权访问、更正、删除您的个人信息。如需帮助，请联系我们。
      </Text>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>六、联系我们</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        如有疑问，请通过应用内反馈联系我们。
      </Text>

      <Text style={[styles.lastUpdate, { color: theme.textSecondary }]}>
        最后更新：2026年2月25日
      </Text>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.disagreeButton, { borderColor: theme.textSecondary }]}
          onPress={handleDisagree}
        >
          <Text style={[styles.buttonText, { color: theme.textSecondary }]}>不同意</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.agreeButton, { backgroundColor: theme.accent }]}
          onPress={handleAgree}
        >
          <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>同意</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
  },
  lastUpdate: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
  buttons: {
    flexDirection: 'row',
    marginTop: 32,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  disagreeButton: {
    borderWidth: 1,
  },
  agreeButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PrivacyScreen;
