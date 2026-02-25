import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useApp } from '../context/AppContext';

interface ShareButtonProps {
  recordId: string;
  title: string;
  mealType: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ recordId, title, mealType }) => {
  const { theme } = useApp();

  const handleShare = async () => {
    try {
      const shareUrl = `https://hhcf-api.openanthropic.com/api/share/${recordId}`;
      const message = `「好好吃饭」-${title}\n${shareUrl}`;
      
      await Share.share({
        message,
        title: '分享美食记录',
      });
    } catch (error) {
      Alert.alert('分享失败', '请稍后重试');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.shareButton, { backgroundColor: theme.accent }]}
      onPress={handleShare}
    >
      <Text style={styles.shareButtonText}>分享</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  shareButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ShareButton;
