import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';

interface WechatLoginButtonProps {
  onPress: () => void;
}

export const WechatLoginButton: React.FC<WechatLoginButtonProps> = ({ onPress }) => {
  const handlePress = () => {
    Alert.alert(
      '微信登录',
      '微信登录需要在微信开放平台配置AppID，是否继续？',
      [
        { text: '取消', style: 'cancel' },
        { text: '继续', onPress },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.wechatButton}
      onPress={handlePress}
    >
      <Text style={styles.wechatIcon}>💬</Text>
      <Text style={styles.wechatText}>微信一键登录</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wechatButton: {
    backgroundColor: '#07C160',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
  },
  wechatIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  wechatText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default WechatLoginButton;
