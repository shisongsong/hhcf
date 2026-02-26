import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  RefreshControl,
  Modal,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Theme, TIME_THEMES, getMealTypeInfo, recognizeMealType, getAllMealTypes } from '../utils/theme';
import api from '../api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MealRecord {
  id: string;
  mealType: string;
  title: string;
  imageUrl: string[];
  timestamp: number;
  createdAt: string;
}

interface TodayMeal {
  key: string;
  label: string;
  emoji: string;
  color: string;
  checked: boolean;
  record: MealRecord | null;
}

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, isLoggedIn, isAgreed, setTheme } = useApp();
  const [todayMeals, setTodayMeals] = useState<TodayMeal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showMealPopup, setShowMealPopup] = useState(false);
  const [popupRecord, setPopupRecord] = useState<MealRecord | null>(null);
  const [popupMealInfo, setPopupMealInfo] = useState<any>(null);
  const [popupFormattedTime, setPopupFormattedTime] = useState('');

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const month = months[today.getMonth()];

  const checkedCount = todayMeals.filter(m => m.checked).length;

  useEffect(() => {
    if (isAgreed && isLoggedIn) {
      loadTodayMeals();
    }
  }, [isAgreed, isLoggedIn]);

  const loadTodayMeals = async () => {
    try {
      const data = await api.getRecords(1, 100);
      const records = data.data?.records || data.data || [];
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = todayStart.getTime() + 24 * 60 * 60 * 1000;
      
      const todayRecords = records.filter((r: MealRecord) => 
        r.timestamp >= todayStart.getTime() && r.timestamp < todayEnd
      );
      
      const mealTypes = getAllMealTypes();
      const meals = mealTypes.map(meal => {
        const record = todayRecords.find(r => r.mealType === meal.key);
        return {
          ...meal,
          checked: !!record,
          record: record || null,
        };
      });
      
      setTodayMeals(meals);
    } catch (error) {
      console.error('Load meals error:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTodayMeals();
    setRefreshing(false);
  }, []);

  const handleThemePress = (themeKey: string) => {
    setTheme({ key: themeKey, ...TIME_THEMES[themeKey] });
  };

  const handleMealPress = (mealType: string) => {
    navigation.navigate('Camera', { mealType });
  };

  const handleMealIconTap = (meal: TodayMeal) => {
    if (!meal.checked || !meal.record) {
      handleMealPress(meal.key);
      return;
    }
    
    const mealInfo = getMealTypeInfo(meal.key);
    const record = meal.record;
    const date = new Date(record.timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    setPopupRecord(record);
    setPopupMealInfo(mealInfo);
    setPopupFormattedTime(`${hours}:${minutes}`);
    setShowMealPopup(true);
  };

  const handleClosePopup = () => {
    setShowMealPopup(false);
    setPopupRecord(null);
    setPopupMealInfo(null);
  };

  const handleSharePoster = () => {
    handleClosePopup();
    if (popupRecord) {
      navigation.navigate('Detail', { recordId: popupRecord.id });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgGradient?.[0] || theme.background }]}>
      <View style={styles.dynamicBg}>
        <View style={[styles.bgGradient, { background: `linear-gradient(180deg, ${theme.bgGradient?.[0]} 0%, ${theme.bgGradient?.[1]} 60%, ${theme.bgGradient?.[2]} 100%)` }]} />
        <View style={styles.decorations}>
          {theme.blobs?.map((blob: string, index: number) => (
            <View key={index} style={[styles.blob, styles[`blob${index}`], { backgroundColor: blob }]} />
          ))}
          <View style={[styles.timeElement, styles[`element${theme.key}`]]}>
            <Text style={styles.timeElementText}>{theme.emoji}</Text>
          </View>
        </View>
      </View>

      <View style={styles.debugPanel}>
        <TouchableOpacity style={styles.debugBtn} onPress={() => {
          const keys = Object.keys(TIME_THEMES);
          const currentIndex = keys.indexOf(theme.key);
          const nextKey = keys[(currentIndex + 1) % keys.length];
          handleThemePress(nextKey);
        }}>
          <Text style={styles.debugBtnText}>切换</Text>
        </TouchableOpacity>
        <View style={styles.themeList}>
          {Object.values(TIME_THEMES).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.themeItem, theme.key === t.key && styles.themeItemActive]}
              onPress={() => handleThemePress(t.key)}
            >
              <Text>{t.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={styles.mainContentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.timeBadge}>
          <Text style={styles.timeBadgeEmoji}>{theme.emoji}</Text>
          <Text style={[styles.timeName, { color: theme.textSecondary }]}>{theme.name}</Text>
        </View>
        
        <View style={styles.dateDisplay}>
          <Text style={[styles.month, { color: theme.textSecondary }]}>{month}</Text>
          <Text style={[styles.day, { color: theme.textPrimary }]}>{day}</Text>
        </View>
        
        <View style={styles.greeting}>
          <Text style={[styles.greetingText, { color: theme.textPrimary }]}>{theme.greeting}</Text>
        </View>
        
        <View style={styles.buttonWrapper}>
          <TouchableOpacity 
            style={[styles.bubbleBtn, { backgroundColor: theme.primary }]}
            onPress={() => handleMealPress(recognizeMealType())}
            activeOpacity={0.8}
          >
            <View style={[styles.bubbleMain, { backgroundColor: theme.primary }]} />
            <View style={styles.bubbleShine} />
            <View style={styles.btnContent}>
              <View style={styles.cameraIcon}>
                <View style={styles.cameraBody} />
                <View style={styles.cameraLens} />
                <View style={styles.cameraFlash} />
              </View>
              <Text style={styles.btnHint}>拍照打卡</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.mealStatus}>
          {todayMeals.map((meal) => (
            <TouchableOpacity
              key={meal.key}
              style={styles.mealIconItem}
              onPress={() => handleMealIconTap(meal)}
            >
              <View style={[styles.mealIconBg, { backgroundColor: meal.checked ? meal.color : 'rgba(255,255,255,0.3)' }]}>
                <Text style={styles.mealIconEmoji}>{meal.emoji}</Text>
              </View>
              <Text style={[styles.mealIconLabel, { color: meal.checked ? theme.textPrimary : theme.textSecondary }]}>
                {meal.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal visible={showMealPopup} transparent animationType="slide" onRequestClose={handleClosePopup}>
        <TouchableOpacity style={styles.popupMask} activeOpacity={1} onPress={handleClosePopup} />
        <View style={styles.popupModal}>
          {popupRecord && (
            <View style={styles.popupContent}>
              <View style={styles.popupImageList}>
                {popupRecord.imageUrl?.map((img: string, index: number) => (
                  <View key={index} style={styles.popupImageWrapper}>
                    <Image source={{ uri: img }} style={styles.popupImage} />
                  </View>
                ))}
              </View>
              <View style={styles.popupInfo}>
                <View style={[styles.popupMealTag, { backgroundColor: popupMealInfo?.color }]}>
                  <Text style={{ color: '#fff' }}>{popupMealInfo?.emoji}</Text>
                  <Text style={{ color: '#fff' }}>{popupMealInfo?.label}</Text>
                </View>
                <Text style={styles.popupTime}>{popupFormattedTime}</Text>
              </View>
              <View style={styles.popupActions}>
                <TouchableOpacity style={styles.popupActionBtn} onPress={handleSharePoster}>
                  <Text style={styles.actionIcon}>🖼️</Text>
                  <Text style={styles.actionText}>生成海报</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.popupActionBtn, styles.shareBtn]} onPress={() => {}}>
                  <Text style={styles.actionIcon}>📤</Text>
                  <Text style={styles.actionText}>分享好友</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  dynamicBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.5,
  },
  blob0: {
    width: 175,
    height: 175,
    top: -50,
    right: -40,
  },
  blob1: {
    width: 110,
    height: 110,
    bottom: '25%',
    left: -30,
  },
  blob2: {
    width: 75,
    height: 75,
    top: '45%',
    right: -20,
  },
  timeElement: {
    position: 'absolute',
    opacity: 0.06,
  },
  elementdawn: { top: '5%', right: '-5%' },
  elementmorning: { top: '-2%', right: '-2%' },
  elementnoon: { top: '-5%', right: '-5%' },
  elementafternoon: { top: '8%', right: '5%' },
  elementsunset: { top: '2%', right: '0%' },
  elementnight: { top: '5%', right: '-2%' },
  timeElementText: {
    fontSize: 140,
  },
  debugPanel: {
    position: 'absolute',
    bottom: 160,
    right: 10,
    zIndex: 100,
    alignItems: 'flex-end',
    gap: 7,
  },
  debugBtn: {
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
  },
  debugBtnText: {
    color: '#fff',
    fontSize: 10,
  },
  themeList: {
    flexDirection: 'row',
    gap: 4,
  },
  themeItem: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  themeItemActive: {
    borderColor: '#fff',
    transform: [{ scale: 1.15 }],
  },
  mainContent: {
    flex: 1,
    zIndex: 1,
  },
  mainContentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 22,
    marginBottom: 28,
  },
  timeBadgeEmoji: {
    fontSize: 18,
  },
  timeName: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1.5,
  },
  dateDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  month: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 5,
    marginBottom: 6,
  },
  day: {
    fontSize: 110,
    fontWeight: '700',
    lineHeight: 1,
    letterSpacing: -6,
  },
  greeting: {
    marginBottom: 36,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: 2,
  },
  buttonWrapper: {
    marginBottom: 28,
  },
  bubbleBtn: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleMain: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 55,
    opacity: 0.7,
  },
  bubbleShine: {
    position: 'absolute',
    width: '30%',
    height: '22%',
    top: '12%',
    left: '18%',
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 100,
  },
  btnContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  cameraIcon: {
    width: 32,
    height: 25,
    marginBottom: 6,
    position: 'relative',
  },
  cameraBody: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -16,
    width: 32,
    height: 20,
    backgroundColor: '#4A4A4A',
    borderRadius: 7,
  },
  cameraLens: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -6,
    marginTop: -6,
    width: 12,
    height: 12,
    backgroundColor: '#6BA3FF',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D0D0D0',
  },
  cameraFlash: {
    position: 'absolute',
    top: 2,
    right: 4,
    width: 6,
    height: 6,
    backgroundColor: '#FFF',
    borderRadius: 3,
  },
  btnHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  mealStatus: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  mealIconItem: {
    alignItems: 'center',
    gap: 4,
  },
  mealIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealIconEmoji: {
    fontSize: 20,
  },
  mealIconLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  popupMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  popupModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF8F5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 1001,
    paddingBottom: 34,
  },
  popupContent: {
    padding: 16,
  },
  popupImageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  popupImageWrapper: {
    width: (SCREEN_WIDTH - 64) / 3,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  popupImage: {
    width: '100%',
    height: '100%',
  },
  popupInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  popupMealTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  popupTime: {
    fontSize: 14,
    color: '#8B7355',
  },
  popupActions: {
    flexDirection: 'row',
    gap: 10,
  },
  popupActionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  shareBtn: {},
  actionIcon: {
    fontSize: 22,
  },
  actionText: {
    fontSize: 13,
    color: '#5D4037',
  },
});

export default HomeScreen;
