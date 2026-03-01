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
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
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

const POSTER_STYLES = [
  { key: 'spark', name: '烟火拼贴', desc: '主图+多格拼贴' },
  { key: 'film', name: '胶片日记', desc: '胶片感时间轴' },
  { key: 'mag', name: '杂志封面', desc: '视觉冲击感' },
];

export const DetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { theme } = useApp();
  const [record, setRecord] = useState<MealRecord | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPosterSheet, setShowPosterSheet] = useState(false);
  const [currentPosterStyle, setCurrentPosterStyle] = useState(POSTER_STYLES[0].key);
  const [showPosterPreview, setShowPosterPreview] = useState(false);
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
      const imageUri = record.imageUrl[0];
      
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(imageUri, {
          mimeType: 'image/jpeg',
          dialogTitle: '分享美食记录',
        });
      } else {
        await Share.share({
          message: `${record.title} - 好好吃饭`,
          url: imageUri,
        });
      }
    } catch (error: any) {
      console.error('Share error:', error);
      Alert.alert('分享失败', error.message || '请重试');
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenPosterSheet = () => {
    if (!record || !record.imageUrl || record.imageUrl.length === 0) {
      Alert.alert('暂无可用图片');
      return;
    }
    setShowPosterSheet(true);
  };

  const handleGeneratePoster = async () => {
    if (!record || !record.imageUrl || record.imageUrl.length === 0) {
      Alert.alert('暂无可用图片');
      return;
    }

    try {
      setShowPosterSheet(false);
      setShowPosterPreview(true);
    } catch (error: any) {
      console.error('Generate poster error:', error);
      Alert.alert('生成失败', error.message || '请重试');
    }
  };

  const handleSavePoster = async () => {
    if (!record || !record.imageUrl || record.imageUrl.length === 0) {
      Alert.alert('保存失败', '暂无可用图片');
      return;
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要相册权限', '请允许访问相册');
        return;
      }

      const imageUri = record.imageUrl[0];
      const asset = await MediaLibrary.createAssetAsync(imageUri);
      
      const album = await MediaLibrary.getAlbumAsync('好好吃饭');
      if (album) {
        await MediaLibrary.addAssetsToAlbum([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync('好好吃饭', asset, false);
      }

      Alert.alert('保存成功', '已保存到相册');
      setShowPosterPreview(false);
    } catch (error: any) {
      console.error('Save poster error:', error);
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
            onPress={handleOpenPosterSheet}
          >
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>生成海报</Text>
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

      <Modal visible={showPosterSheet} transparent animationType="slide">
        <View style={styles.sheetMask}>
          <View style={styles.posterSheet}>
            <Text style={styles.sheetTitle}>选择海报模板</Text>
            <Text style={styles.sheetSubtitle}>支持多图展示，先预览再保存</Text>
            
            <View style={styles.styleList}>
              {POSTER_STYLES.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.styleItem,
                    currentPosterStyle === item.key && { borderColor: theme.accent },
                  ]}
                  onPress={() => setCurrentPosterStyle(item.key)}
                >
                  <Text style={styles.styleName}>{item.name}</Text>
                  <Text style={styles.styleDesc}>{item.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity 
                style={[styles.sheetBtn, styles.cancelBtn]}
                onPress={() => setShowPosterSheet(false)}
              >
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sheetBtn, styles.confirmBtn, { backgroundColor: theme.primary }]}
                onPress={handleGeneratePoster}
              >
                <Text style={[styles.confirmBtnText, { color: '#fff' }]}>预览海报</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPosterPreview} transparent animationType="slide">
        <View style={styles.sheetMask}>
          <View style={styles.posterPreview}>
            <Text style={styles.previewTitle}>海报预览</Text>
            <Text style={styles.previewHint}>确认后再保存到相册</Text>

            <View style={styles.previewImageWrap}>
              {record.imageUrl?.[0] && (
                <Image
                  source={{ uri: record.imageUrl[0] }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
              <View style={styles.previewOverlay}>
                <Text style={styles.previewMealType}>{mealTypeInfo.emoji} {mealTypeInfo.label}</Text>
                <Text style={styles.previewTitle2}>{record.title}</Text>
                <Text style={styles.previewDate}>{formattedDate}</Text>
              </View>
            </View>

            <View style={styles.previewActions}>
              <TouchableOpacity 
                style={[styles.sheetBtn, styles.cancelBtn]}
                onPress={() => setShowPosterPreview(false)}
              >
                <Text style={styles.cancelBtnText}>换个模板</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sheetBtn, styles.confirmBtn, { backgroundColor: theme.primary }]}
                onPress={handleSavePoster}
              >
                <Text style={[styles.confirmBtnText, { color: '#fff' }]}>保存到相册</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  sheetMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  posterSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  styleList: {
    gap: 12,
  },
  styleItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  styleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  styleDesc: {
    fontSize: 13,
    color: '#999',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  sheetBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  cancelBtn: {
    backgroundColor: '#f5f5f5',
  },
  cancelBtnText: {
    fontSize: 16,
    color: '#666',
  },
  confirmBtn: {},
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  posterPreview: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  previewImageWrap: {
    width: '100%',
    aspectRatio: 0.65,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 16,
  },
  previewMealType: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  previewTitle2: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  previewDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
});

export default DetailScreen;
