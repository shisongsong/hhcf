import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  Share,
  Linking,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { getMealTypeInfo } from '../utils/theme';
import api from '../api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MealRecord {
  id: string;
  mealType: string;
  title: string;
  imageUrl: string[];
  timestamp: number;
  shareId: string;
}

export const DetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { theme } = useApp();
  const [record, setRecord] = useState<MealRecord | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  const recordId = route.params?.recordId;
  const passedRecord = route.params?.record;

  useEffect(() => {
    if (passedRecord) {
      setRecord(passedRecord);
      setLoading(false);
    } else if (recordId) {
      loadRecord();
    }
  }, [recordId, passedRecord]);

  const loadRecord = async () => {
    try {
      const data = await api.getRecord(recordId);
      setRecord(data.data);
    } catch (error) {
      console.error('Load record error:', error);
      Alert.alert('加载失败', '无法获取记录详情');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('删除记录', '确定要删除这条记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteRecord(record!.id);
            navigation.goBack();
          } catch (error) {
            Alert.alert('删除失败', '请重试');
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!record || !record.imageUrl || record.imageUrl.length === 0) {
      Alert.alert('分享失败', '暂无可用图片');
      return;
    }

    try {
      setIsSharing(true);
      
      await Share.share({
        title: record.title || '好好吃饭',
        message: `${record.title || '美食记录'} - 来自好好吃饭App`,
        url: record.imageUrl[0],
      });
    } catch (error: any) {
      console.error('Share error:', error);
      if (error.message !== 'User did not share') {
        Alert.alert('分享失败', error.message || '请重试');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveImage = async () => {
    if (!record || !record.imageUrl || record.imageUrl.length === 0) {
      Alert.alert('保存失败', '暂无可用图片');
      return;
    }

    try {
      await Linking.openURL(record.imageUrl[0]);
      Alert.alert('提示', '请长按图片保存到相册');
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('保存失败', error.message || '请重试');
    }
  };

  if (loading || !record) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  const mealTypeInfo = getMealTypeInfo(record.mealType);
  const date = new Date(record.timestamp);
  const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  const formattedTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.bgGradient?.[0] || theme.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.detailCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.mealTag, { backgroundColor: mealTypeInfo.color }]}>
              <Text style={styles.mealTagText}>
                {mealTypeInfo.emoji} {mealTypeInfo.label}
              </Text>
            </View>
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>{formattedTime}</Text>
          </View>

          <Text style={styles.recordTitle}>{record.title}</Text>
          <Text style={[styles.recordSubtitle, { color: theme.textSecondary }]}>{formattedDate}</Text>

          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            style={styles.photoSwiper}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentImageIndex(index);
            }}
          >
            {record.imageUrl?.map((img, index) => (
              <View key={index} style={styles.photoSwiperItem}>
                <Image source={{ uri: img }} style={styles.photoImage} resizeMode="cover" />
              </View>
            ))}
          </ScrollView>

          {record.imageUrl?.length > 1 && (
            <View style={styles.dotIndicator}>
              {record.imageUrl.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentImageIndex === index && { backgroundColor: mealTypeInfo.color },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.actionCard}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}
            onPress={handleSaveImage}
          >
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>保存图片</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={handleShare}
            disabled={isSharing}
          >
            <Text style={styles.actionBtnText}>
              {isSharing ? '分享中...' : '分享好友'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
            <Text style={[styles.actionBtnText, { color: '#FF3B30' }]}>删除记录</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← 返回</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  detailCard: {
    margin: 16,
    marginTop: 80,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  mealTagText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 14,
  },
  recordTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recordSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  photoSwiper: {
    marginHorizontal: -16,
  },
  photoSwiperItem: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  dotIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  actionCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  actionBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 10,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
  },
  backBtnText: {
    fontSize: 16,
    color: '#333',
  },
});

export default DetailScreen;
