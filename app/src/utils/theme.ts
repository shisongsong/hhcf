export interface Theme {
  key: string;
  name: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  accent: string;
  gradient: string[];
}

export const TIME_THEMES: Record<string, Theme> = {
  morning: {
    key: 'morning',
    name: '清晨',
    background: '#FFF8E7',
    card: '#FFFFFF',
    text: '#5D4E37',
    textSecondary: '#8B7355',
    accent: '#FFB347',
    gradient: ['#FFB347', '#FFCC33'],
  },
  noon: {
    key: 'noon',
    name: '午间',
    background: '#FFF0F5',
    card: '#FFFFFF',
    text: '#4A4A4A',
    textSecondary: '#7A7A7A',
    accent: '#FF6B6B',
    gradient: ['#FF6B6B', '#FF8E53'],
  },
  afternoon: {
    key: 'afternoon',
    name: '午后',
    background: '#F0F8FF',
    card: '#FFFFFF',
    text: '#2C3E50',
    textSecondary: '#5D6D7E',
    accent: '#3498DB',
    gradient: ['#3498DB', '#5DADE2'],
  },
  evening: {
    key: 'evening',
    name: '傍晚',
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#34495E',
    textSecondary: '#7F8C8D',
    accent: '#9B59B6',
    gradient: ['#9B59B6', '#8E44AD'],
  },
};

export const getActiveTheme = (): Theme => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) return TIME_THEMES.morning;
  if (hour >= 9 && hour < 14) return TIME_THEMES.noon;
  if (hour >= 14 && hour < 18) return TIME_THEMES.afternoon;
  return TIME_THEMES.evening;
};

export const getThemeList = (): Theme[] => Object.values(TIME_THEMES);

export const getMealTypeInfo = (mealType: string) => {
  const mealTypes: Record<string, { emoji: string; name: string; time: string }> = {
    breakfast: { emoji: '🌅', name: '早餐', time: '05:00-09:00' },
    lunch: { emoji: '☀️', name: '午餐', time: '11:00-14:00' },
    dinner: { emoji: '🌆', name: '晚餐', time: '17:00-20:00' },
    snack: { emoji: '🌙', name: '夜宵', time: '20:00-04:00' },
  };
  return mealTypes[mealType] || { emoji: '🍽️', name: '其他', time: '' };
};

export const recognizeMealType = (date: Date = new Date()): string => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 9) return 'breakfast';
  if (hour >= 9 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'snack';
  if (hour >= 17 && hour < 20) return 'dinner';
  return 'snack';
};

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
