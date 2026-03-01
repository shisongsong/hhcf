import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { getMealTypeInfo, getAllMealTypes, Theme, TIME_THEMES } from '../utils/theme';
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

interface SectionData {
  title: string;
  data: MealRecord[];
}

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const REVERSED_MEAL_ORDER: Record<string, number> = { snack: 1, dinner: 2, lunch: 3, breakfast: 4 };

function getDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function cloneDayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

function getWeekRangeWithOffset(weekOffset: number) {
  const today = cloneDayStart(new Date());
  const weekdayOffset = (today.getDay() + 6) % 7;
  const currentWeekStart = addDays(today, -weekdayOffset);
  const weekStart = addDays(currentWeekStart, weekOffset * 7);
  const weekEnd = addDays(weekStart, 7);
  return {
    startMs: weekStart.getTime(),
    endMs: weekEnd.getTime(),
  };
}

function getMonthRangeWithOffset(monthOffset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
}

export const RecordsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, isLoggedIn, isAgreed, isLoading } = useApp();
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [loaded, setLoaded] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    if (!isLoading && isLoggedIn && isAgreed && !loaded) {
      loadRecords();
      setLoaded(true);
    }
  }, [isLoading, isLoggedIn, isAgreed, loaded]);

  const loadRecords = async () => {
    try {
      console.log('加载记录...');
      const data = await api.getRecords(1, 100);
      console.log('API返回:', JSON.stringify(data).substring(0, 200));
      
      let allRecords: MealRecord[] = [];
      if (data.data?.records) {
        allRecords = data.data.records;
      } else if (data.data) {
        allRecords = Array.isArray(data.data) ? data.data : [];
      }
      
      console.log('记录数量:', allRecords.length);
      setRecords(allRecords);
    } catch (error: any) {
      console.error('Load records error:', error);
      Alert.alert('加载失败', error.message || '请检查网络');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  }, []);

  const dailyStatusMap = useMemo(() => {
    const map: Record<string, Record<string, { checked: boolean; recordId: string }>> = {};
    const mealTypes = getAllMealTypes();
    
    records.forEach((record) => {
      const dayKey = getDayKey(record.timestamp);
      if (!map[dayKey]) {
        const meals: Record<string, { checked: boolean; recordId: string }> = {};
        mealTypes.forEach((meal) => {
          meals[meal.key] = { checked: false, recordId: '' };
        });
        map[dayKey] = meals;
      }
      
      const mealState = map[dayKey][record.mealType];
      if (mealState && !mealState.checked) {
        mealState.checked = true;
        mealState.recordId = record.id;
      }
    });
    
    return map;
  }, [records]);

  const weekViewData = useMemo(() => {
    const today = cloneDayStart(new Date());
    const weekdayOffset = (today.getDay() + 6) % 7;
    const currentWeekStart = addDays(today, -weekdayOffset);
    const weekStart = addDays(currentWeekStart, weekOffset * 7);
    const weekEnd = addDays(weekStart, 6);
    const label = `${String(weekStart.getMonth() + 1).padStart(2, '0')}.${String(weekStart.getDate()).padStart(2, '0')} - ${String(weekEnd.getMonth() + 1).padStart(2, '0')}.${String(weekEnd.getDate()).padStart(2, '0')}`;
    
    const days = [];
    const mealTypes = getAllMealTypes();
    const todayKey = getDayKey(today.getTime());
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const key = getDayKey(date.getTime());
      const dayData = dailyStatusMap[key];
      
      const meals = mealTypes.map((meal) => {
        if (!dayData || !dayData[meal.key]) {
          return { ...meal, checked: false, recordId: '' };
        }
        return { ...meal, ...dayData[meal.key] };
      });
      
      days.push({
        key,
        dateNum: date.getDate(),
        weekLabel: WEEKDAY_LABELS[i],
        isToday: key === todayKey,
        meals,
      });
    }
    
    return { label, days };
  }, [dailyStatusMap, weekOffset]);

  const monthViewData = useMemo(() => {
    const today = new Date();
    const cursor = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const leadingBlank = (firstDay.getDay() + 6) % 7;
    const days = [];
    const mealTypes = getAllMealTypes();
    const todayKey = getDayKey(today.getTime());
    
    for (let i = 0; i < leadingBlank; i++) {
      days.push({ key: `blank-${i}`, isPlaceholder: true });
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const key = getDayKey(date.getTime());
      const dayData = dailyStatusMap[key];
      
      const meals = mealTypes.map((meal) => {
        if (!dayData || !dayData[meal.key]) {
          return { ...meal, checked: false, recordId: '' };
        }
        return { ...meal, ...dayData[meal.key] };
      });
      
      days.push({
        key,
        isPlaceholder: false,
        dateNum: d,
        isToday: key === todayKey,
        meals,
      });
    }
    
    return { label: `${year}年${month + 1}月`, days };
  }, [dailyStatusMap, monthOffset]);

  const groupRecordsByDate = (): SectionData[] => {
    const groups: Record<string, MealRecord[]> = {};
    
    records.forEach(record => {
      const date = new Date(record.timestamp);
      const key = `${date.getMonth() + 1}月${date.getDate()}日`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    });

    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const orderA = REVERSED_MEAL_ORDER[a.mealType] || 99;
        const orderB = REVERSED_MEAL_ORDER[b.mealType] || 99;
        return orderA - orderB;
      });
    });

    return Object.entries(groups).map(([title, data]) => ({
      title,
      data: data.sort((a, b) => b.timestamp - a.timestamp),
    }));
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleRecordPress = (recordId: string) => {
    navigation.navigate('Detail', { recordId });
  };

  const handleDayMealTap = (recordId: string) => {
    if (recordId) {
      navigation.navigate('Detail', { recordId });
    }
  };

  const onPrevPeriod = () => {
    if (viewMode === 'week') {
      setWeekOffset(weekOffset - 1);
    } else if (viewMode === 'month') {
      setMonthOffset(monthOffset - 1);
    }
  };

  const onNextPeriod = () => {
    if (viewMode === 'week') {
      const next = Math.min(weekOffset + 1, 0);
      if (next !== weekOffset) setWeekOffset(next);
    } else if (viewMode === 'month') {
      const next = Math.min(monthOffset + 1, 0);
      if (next !== monthOffset) setMonthOffset(next);
    }
  };

  const onBackCurrentPeriod = () => {
    if (viewMode === 'week') {
      setWeekOffset(0);
    } else if (viewMode === 'month') {
      setMonthOffset(0);
    }
  };

  const renderRecord = ({ item }: { item: MealRecord }) => {
    const mealInfo = getMealTypeInfo(item.mealType);
    return (
      <TouchableOpacity style={styles.timelineItem} onPress={() => handleRecordPress(item.id)}>
        <View style={styles.timelineLeft}>
          <View style={[styles.timeDot, { backgroundColor: mealInfo.color }]}>
            <View style={[styles.dotInner, { backgroundColor: mealInfo.color }]} />
          </View>
          <View style={[styles.timeLine, { backgroundColor: `${mealInfo.color}20` }]} />
        </View>
        <View style={styles.timelineContent}>
          <View style={styles.contentHeader}>
            <Text style={[styles.mealLabel, { color: mealInfo.color }]}>
              {mealInfo.emoji} {mealInfo.label}
            </Text>
            <Text style={styles.recordTime}>{formatTime(item.timestamp)}</Text>
          </View>
          <View style={styles.imageGrid}>
            {item.imageUrl?.slice(0, 3).map((img, index) => (
              <View key={index} style={styles.gridImageItem}>
                <Image source={{ uri: img }} style={styles.gridImage} />
              </View>
            ))}
          </View>
          <View style={styles.contentFooter}>
            <Text style={styles.recordTitle}>{item.title}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.dateGroupTitle}>
      <Text style={[styles.dateGroupText, { color: theme.textSecondary }]}>{section.title}</Text>
    </View>
  );

  const renderWeekView = () => (
    <View style={styles.weekView}>
      <View style={styles.periodNav}>
        <TouchableOpacity style={styles.periodBtn} onPress={onPrevPeriod}>
          <Text style={styles.periodBtnText}>上周</Text>
        </TouchableOpacity>
        <View style={styles.periodCenter}>
          <Text style={styles.rangeTitle}>{weekViewData.label}</Text>
          {weekOffset !== 0 && (
            <TouchableOpacity onPress={onBackCurrentPeriod}>
              <Text style={styles.periodReset}>回到本周</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.periodBtn, weekOffset >= 0 && styles.periodBtnDisabled]} 
          onPress={onNextPeriod}
          disabled={weekOffset >= 0}
        >
          <Text style={[styles.periodBtnText, weekOffset >= 0 && styles.periodBtnTextDisabled]}>下周</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekDayList}>
        {weekViewData.days.map((day) => (
          <View key={day.key} style={[styles.weekDayCard, day.isToday && styles.weekDayCardToday]}>
            <View style={styles.weekDayHeader}>
              <Text style={[styles.weekDayLabel, day.isToday && styles.weekDayLabelToday]}>{day.weekLabel}</Text>
              <Text style={[styles.weekDayNum, day.isToday && styles.weekDayNumToday]}>{day.dateNum}</Text>
            </View>
            <View style={styles.mealGridSmall}>
              {day.meals.map((meal) => (
                <TouchableOpacity
                  key={meal.key}
                  style={[
                    styles.mealIconItem,
                    meal.checked ? styles.mealIconChecked : styles.mealIconUnchecked,
                    meal.checked && { borderColor: meal.color },
                  ]}
                  onPress={() => handleDayMealTap(meal.recordId)}
                >
                  <View
                    style={[
                      styles.mealIconBg,
                      { backgroundColor: meal.checked ? meal.color : 'rgba(255,255,255,0.55)' },
                    ]}
                  >
                    <Text style={styles.mealIconEmoji}>{meal.emoji}</Text>
                  </View>
                  <Text style={[styles.mealIconLabel, !meal.checked && styles.mealIconLabelUnchecked]}>
                    {meal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderMonthView = () => (
    <ScrollView style={styles.monthView} showsVerticalScrollIndicator={false}>
      <View style={styles.periodNav}>
        <TouchableOpacity style={styles.periodBtn} onPress={onPrevPeriod}>
          <Text style={styles.periodBtnText}>上月</Text>
        </TouchableOpacity>
        <View style={styles.periodCenter}>
          <Text style={styles.rangeTitle}>{monthViewData.label}</Text>
          {monthOffset !== 0 && (
            <TouchableOpacity onPress={onBackCurrentPeriod}>
              <Text style={styles.periodReset}>回到本月</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.periodBtn, monthOffset >= 0 && styles.periodBtnDisabled]}
          onPress={onNextPeriod}
          disabled={monthOffset >= 0}
        >
          <Text style={[styles.periodBtnText, monthOffset >= 0 && styles.periodBtnTextDisabled]}>下月</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.weekHeader}>
        {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
          <Text key={day} style={styles.weekHeaderText}>{day}</Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {monthViewData.days.map((day, index) => (
          <View
            key={day.key || index}
            style={[
              styles.monthCell,
              day.isPlaceholder && styles.monthCellPlaceholder,
              day.isToday && styles.monthCellToday,
            ]}
          >
            {!day.isPlaceholder && (
              <>
                <Text style={[styles.monthDayNum, day.isToday && styles.monthDayNumToday]}>
                  {day.dateNum}
                </Text>
                <View style={styles.mealGridTiny}>
                  {day.meals.slice(0, 2).map((meal) => (
                    <TouchableOpacity
                      key={meal.key}
                      style={[
                        styles.mealIconItemTiny,
                        meal.checked ? styles.mealIconChecked : styles.mealIconUnchecked,
                      ]}
                      onPress={() => handleDayMealTap(meal.recordId)}
                    >
                      <View
                        style={[
                          styles.mealIconBgTiny,
                          { backgroundColor: meal.checked ? meal.color : 'rgba(255,255,255,0.65)' },
                        ]}
                      >
                        <Text style={styles.mealIconEmojiTiny}>{meal.emoji}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bgGradient?.[0] || theme.background }]}>
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>记录</Text>
        {records.length > 0 && (
          <Text style={[styles.recordCount, { color: theme.textSecondary }]}>{records.length} 条</Text>
        )}
      </View>

      <View style={styles.viewSwitch}>
        {(['day', 'week', 'month'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.modeBtn, viewMode === mode && { backgroundColor: theme.accent }]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[styles.modeBtnText, viewMode === mode && { color: '#fff' }]}>
              {mode === 'day' ? '日视图' : mode === 'week' ? '周视图' : '月视图'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {records.length > 0 ? (
        viewMode === 'day' ? (
          <SectionList
            sections={groupRecordsByDate()}
            renderItem={renderRecord}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
          />
        ) : viewMode === 'week' ? (
          renderWeekView()
        ) : (
          renderMonthView()
        )
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={[styles.emptyText, { color: theme.textPrimary }]}>还没有记录哦</Text>
          <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>记录你的第一顿饭吧</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '600',
  },
  recordCount: {
    fontSize: 14,
  },
  viewSwitch: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  dateGroupTitle: {
    paddingVertical: 12,
  },
  dateGroupText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    width: 20,
    alignItems: 'center',
  },
  timeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timeLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  mealLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  recordTime: {
    fontSize: 12,
    color: '#999',
  },
  imageGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 4,
  },
  gridImageItem: {
    width: (SCREEN_WIDTH - 84) / 3,
    aspectRatio: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  contentFooter: {
    padding: 12,
    paddingTop: 8,
  },
  recordTitle: {
    fontSize: 14,
    color: '#333',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  periodBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  periodBtnDisabled: {
    opacity: 0.4,
  },
  periodBtnText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodBtnTextDisabled: {
    color: '#ccc',
  },
  periodCenter: {
    alignItems: 'center',
  },
  rangeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  periodReset: {
    fontSize: 12,
    color: '#FF8C42',
    marginTop: 4,
  },
  weekDayList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  weekDayCard: {
    width: (SCREEN_WIDTH - 64) / 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 4,
  },
  weekDayCardToday: {
    borderWidth: 2,
    borderColor: '#FF8C42',
  },
  weekDayHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  weekDayLabel: {
    fontSize: 12,
    color: '#999',
  },
  weekDayLabelToday: {
    color: '#FF8C42',
    fontWeight: '600',
  },
  weekDayNum: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  weekDayNumToday: {
    color: '#FF8C42',
  },
  mealGridSmall: {
    gap: 4,
  },
  mealIconItem: {
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 2,
  },
  mealIconChecked: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  mealIconUnchecked: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  mealIconBg: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealIconEmoji: {
    fontSize: 14,
  },
  mealIconLabel: {
    fontSize: 10,
    color: '#333',
    marginTop: 2,
  },
  mealIconLabelUnchecked: {
    color: '#999',
  },
  weekView: {
    flex: 1,
  },
  monthView: {
    flex: 1,
  },
  weekHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  monthCell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.8,
    padding: 4,
  },
  monthCellPlaceholder: {
    opacity: 0,
  },
  monthCellToday: {},
  monthDayNum: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  monthDayNumToday: {
    color: '#FF8C42',
    fontWeight: '700',
  },
  mealGridTiny: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
  },
  mealIconItemTiny: {
    padding: 2,
  },
  mealIconBgTiny: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealIconEmojiTiny: {
    fontSize: 10,
  },
});

export default RecordsScreen;
