import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { getMealTypeInfo } from '../utils/theme';
import api from '../api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MealRecord {
  id: string;
  mealType: string;
  title: string;
  photos: string[];
  createdAt: string;
}

export const RecordsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useApp();
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadRecords(true);
  }, []);

  const loadRecords = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const data = await api.getRecords(currentPage, 20);
      const newRecords = data.data || [];
      
      if (reset) {
        setRecords(newRecords);
      } else {
        setRecords(prev => [...prev, ...newRecords]);
      }
      
      setHasMore(newRecords.length === 20);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Load records error:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await loadRecords(true);
    setRefreshing(false);
  }, []);

  const loadMore = () => {
    if (hasMore && !refreshing) {
      loadRecords(false);
    }
  };

  const handleRecordPress = (record: MealRecord) => {
    navigation.navigate('Detail', { record });
  };

  const renderRecord = ({ item }: { item: MealRecord }) => {
    const mealInfo = getMealTypeInfo(item.mealType);
    const date = new Date(item.createdAt);
    const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;

    return (
      <TouchableOpacity
        style={[styles.recordCard, { backgroundColor: theme.card }]}
        onPress={() => handleRecordPress(item)}
      >
        <View style={styles.recordContent}>
          <View style={styles.recordHeader}>
            <Text style={[styles.mealEmoji]}>{mealInfo.emoji}</Text>
            <Text style={[styles.mealName, { color: theme.textSecondary }]}>
              {mealInfo.name}
            </Text>
            <Text style={[styles.date, { color: theme.textSecondary }]}>
              {dateStr}
            </Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        {item.photos?.[0] && (
          <Image
            source={{ uri: item.photos[0] }}
            style={styles.thumbnail}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🍽️</Text>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        还没有记录
      </Text>
      <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
        点击首页的"记录美食"开始打卡
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>记录</Text>
      </View>
      <FlatList
        data={records}
        renderItem={renderRecord}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
      />
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
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
    flexGrow: 1,
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
  recordContent: {
    flex: 1,
    padding: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  mealName: {
    fontSize: 12,
    marginRight: 8,
  },
  date: {
    fontSize: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  thumbnail: {
    width: 100,
    height: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 14,
    marginTop: 8,
  },
});

export default RecordsScreen;
