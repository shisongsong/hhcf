import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Theme, TIME_THEMES, getMealTypeInfo, recognizeMealType, MEAL_TYPES } from '../utils/theme';
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

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, isLoggedIn, isAgreed, login, setTheme } = useApp();
  const [todayMeals, setTodayMeals] = useState<MealRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const month = months[today.getMonth()];

  const checkedCount = todayMeals.length;

  useEffect(() => {
    if (isAgreed && isLoggedIn) {
      loadTodayMeals();
    }
  }, [isAgreed, isLoggedIn]);

  const loadTodayMeals = async () => {
    try {
      const data = await api.getTodayMeals();
      setTodayMeals(data.data || []);
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
    setTheme(TIME_THEMES[themeKey]);
  };

  const handleMealPress = (mealType: string) => {
    navigation.navigate('Camera', { mealType });
  };

  const handleMealRecordPress = (record: MealRecord) => {
    navigation.navigate('Detail', { record });
  };

  const checkedMealTypes = todayMeals.map(m => m.mealType);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Text style={[styles.day, { color: theme.text }]}>{day}</Text>
          <Text style={[styles.month, { color: theme.textSecondary }]}>{month}</Text>
        </View>
        
        {/* Theme Switcher */}
        <View style={styles.themeContainer}>
          {Object.values(TIME_THEMES).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.themeButton,
                { backgroundColor: theme.key === t.key ? t.accent : '#E0E0E0' },
              ]}
              onPress={() => handleThemePress(t.key)}
            >
              <Text style={styles.themeEmoji}>
                {t.key === 'morning' ? '🌅' : t.key === 'noon' ? '☀️' : t.key === 'afternoon' ? '🌤️' : '🌙'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: theme.text }]}>今日打卡</Text>
          <Text style={[styles.progressCount, { color: theme.accent }]}>{checkedCount}/4</Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.card }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.accent,
                width: `${(checkedCount / 4) * 100}%`,
              },
            ]}
          />
        </View>
        <View style={styles.mealIndicators}>
          {MEAL_TYPES.map((mealType) => {
            const info = getMealTypeInfo(mealType);
            const isChecked = checkedMealTypes.includes(mealType);
            return (
              <TouchableOpacity
                key={mealType}
                style={styles.mealIndicator}
                onPress={() => handleMealPress(mealType)}
              >
                <Text style={[styles.mealEmoji, isChecked && styles.mealEmojiChecked]}>
                  {info.emoji}
                </Text>
                <Text style={[styles.mealName, { color: theme.textSecondary }]}>
                  {info.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Today's Records */}
      {todayMeals.length > 0 && (
        <View style={styles.recordsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>今日记录</Text>
          {todayMeals.map((record) => (
            <TouchableOpacity
              key={record.id}
              style={[styles.recordCard, { backgroundColor: theme.card }]}
              onPress={() => handleMealRecordPress(record)}
            >
              {record.imageUrl?.[0] && (
                <Image
                  source={{ uri: record.imageUrl[0] }}
                  style={styles.recordImage}
                />
              )}
              <View style={styles.recordInfo}>
                <Text style={[styles.recordTitle, { color: theme.text }]}>
                  {record.title}
                </Text>
                <Text style={[styles.recordMealType, { color: theme.textSecondary }]}>
                  {getMealTypeInfo(record.mealType).name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick Add Button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.accent }]}
        onPress={() => handleMealPress(recognizeMealType())}
      >
        <Text style={styles.addButtonText}>+ 记录美食</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  day: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  month: {
    fontSize: 18,
    marginLeft: 8,
  },
  themeContainer: {
    flexDirection: 'row',
  },
  themeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  themeEmoji: {
    fontSize: 18,
  },
  progressContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressCount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  mealIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  mealIndicator: {
    alignItems: 'center',
  },
  mealEmoji: {
    fontSize: 28,
    opacity: 0.5,
  },
  mealEmojiChecked: {
    opacity: 1,
  },
  mealName: {
    fontSize: 12,
    marginTop: 4,
  },
  recordsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  recordCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recordImage: {
    width: 80,
    height: 80,
  },
  recordInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  recordMealType: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default HomeScreen;
