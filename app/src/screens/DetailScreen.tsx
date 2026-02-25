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

export const DetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { theme } = useApp();
  const [record, setRecord] = useState<MealRecord>(route.params?.record);

  useEffect(() => {
    if (route.params?.recordId) {
      loadRecord(route.params.recordId);
    }
  }, [route.params?.recordId]);

  const loadRecord = async (id: string) => {
    try {
      const data = await api.getRecord(id);
      setRecord(data.data);
    } catch (error) {
      console.error('Load record error:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '删除记录',
      '确定要删除这条记录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteRecord(record.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('删除失败', '请稍后重试');
            }
          },
        },
      ]
    );
  };

  if (!record) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text>加载中...</Text>
      </View>
    );
  }

  const mealInfo = getMealTypeInfo(record.mealType);
  const date = new Date(record.createdAt);
  const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.text }]}>← 返回</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Text style={styles.deleteText}>删除</Text>
        </TouchableOpacity>
      </View>

      {/* Photos */}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {record.photos?.map((photo, index) => (
          <Image
            key={index}
            source={{ uri: photo }}
            style={styles.photo}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {/* Content */}
      <View style={[styles.content, { backgroundColor: theme.card }]}>
        <View style={styles.meta}>
          <Text style={styles.mealEmoji}>{mealInfo.emoji}</Text>
          <Text style={[styles.mealName, { color: theme.textSecondary }]}>
            {mealInfo.name}
          </Text>
          <Text style={[styles.date, { color: theme.textSecondary }]}>
            {dateStr}
          </Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          {record.title}
        </Text>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.accent }]}>
              {record.photos?.length || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              张照片
            </Text>
          </View>
        </View>
      </View>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
  },
  deleteButton: {
    padding: 8,
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  photo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  content: {
    padding: 20,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mealEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  mealName: {
    fontSize: 14,
    marginRight: 16,
  },
  date: {
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  stats: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: {
    alignItems: 'center',
    marginRight: 32,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default DetailScreen;
