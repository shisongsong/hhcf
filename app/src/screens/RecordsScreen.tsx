import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { getMealTypeInfo, Theme, TIME_THEMES } from '../utils/theme';
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

export const RecordsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, isLoggedIn, isAgreed, isLoading } = useApp();
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Wait for loading to complete and be logged in
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
      
      let allRecords = [];
      if (data.data?.records) {
        allRecords = data.data.records;
      } else if (data.data) {
        allRecords = Array.isArray(data.data) ? data.data : [];
      }
      
      console.log('记录数量:', allRecords.length);
      setRecords(allRecords);
    } catch (error) {
      console.error('Load records error:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  }, []);

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

    return Object.entries(groups).map(([title, data]) => ({
      title,
      data: data.sort((a, b) => b.timestamp - a.timestamp),
    }));
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleRecordPress = (record: MealRecord) => {
    navigation.navigate('Detail', { recordId: record.id });
  };

  const renderRecord = ({ item }: { item: MealRecord }) => {
    const mealInfo = getMealTypeInfo(item.mealType);
    return (
      <TouchableOpacity style={styles.timelineItem} onPress={() => handleRecordPress(item)}>
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
});

export default RecordsScreen;
