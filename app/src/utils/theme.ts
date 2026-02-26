export interface Theme {
  key: string;
  name: string;
  bgGradient: string[];
  primary: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  emoji: string;
  blobs: string[];
  greeting: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  accent: string;
}

export const TIME_THEMES: Record<string, Theme> = {
  dawn: {
    key: 'dawn',
    name: '清晨',
    bgGradient: ['#F5E6E8', '#FCEAEC', '#FFE4D6'],
    primary: '#C45C69',
    accent: '#A84858',
    textPrimary: '#4A3040',
    textSecondary: '#7A6570',
    emoji: '🌅',
    blobs: ['#E8C4C8', '#D4A4B0', '#C48490'],
    greeting: '早安，新的一天',
    background: '#F5E6E8',
    card: '#FFFFFF',
    text: '#4A3040',
    textSecondary: '#7A6570',
    accent: '#A84858',
  },
  morning: {
    key: 'morning',
    name: '上午',
    bgGradient: ['#FFF5E6', '#FFE8CC', '#FFDAB3'],
    primary: '#D4924A',
    accent: '#C48232',
    textPrimary: '#4A3828',
    textSecondary: '#7A6558',
    emoji: '☀️',
    blobs: ['#E8D4B8', '#D4C0A0', '#C4AC88'],
    greeting: '早上好呀',
    background: '#FFF5E6',
    card: '#FFFFFF',
    text: '#4A3828',
    textSecondary: '#7A6558',
    accent: '#C48232',
  },
  noon: {
    key: 'noon',
    name: '正午',
    bgGradient: ['#FFFEF5', '#FFF8DC', '#FFF3CD'],
    primary: '#D4A84A',
    accent: '#C49832',
    textPrimary: '#4A4230',
    textSecondary: '#7A7058',
    emoji: '🌤️',
    blobs: ['#E8DCA8', '#D4C890', '#C4B478'],
    greeting: '午餐时间到',
    background: '#FFFEF5',
    card: '#FFFFFF',
    text: '#4A4230',
    textSecondary: '#7A7058',
    accent: '#C49832',
  },
  afternoon: {
    key: 'afternoon',
    name: '下午',
    bgGradient: ['#E8F4F8', '#DCE8F0', '#D0DCE8'],
    primary: '#5B8BA0',
    accent: '#4A7A8C',
    textPrimary: '#303A40',
    textSecondary: '#586870',
    emoji: '🌇',
    blobs: ['#B8D0E0', '#A0C0D0', '#88B0C0'],
    greeting: '下午好',
    background: '#E8F4F8',
    card: '#FFFFFF',
    text: '#303A40',
    textSecondary: '#586870',
    accent: '#4A7A8C',
  },
  sunset: {
    key: 'sunset',
    name: '黄昏',
    bgGradient: ['#FFE8E8', '#FFD8D0', '#FFC8B8'],
    primary: '#D4605A',
    accent: '#C44848',
    textPrimary: '#4A3030',
    textSecondary: '#7A5858',
    emoji: '🌆',
    blobs: ['#E8B8B0', '#D4A098', '#C48880'],
    greeting: '黄昏时刻',
    background: '#FFE8E8',
    card: '#FFFFFF',
    text: '#4A3030',
    textSecondary: '#7A5858',
    accent: '#C44848',
  },
  night: {
    key: 'night',
    name: '夜晚',
    bgGradient: ['#1A1A2E', '#16213E', '#0F3460'],
    primary: '#7B68EE',
    accent: '#6A5ACD',
    textPrimary: '#E8E8F0',
    textSecondary: '#B8B8C8',
    emoji: '🌙',
    blobs: ['#2D2D50', '#4B4B80', '#5B5B90'],
    greeting: '夜深了',
    background: '#1A1A2E',
    card: '#16213E',
    text: '#E8E8F0',
    textSecondary: '#B8B8C8',
    accent: '#6A5ACD',
  },
};

export const MEAL_TYPES = {
  breakfast: {
    key: 'breakfast',
    label: '早餐',
    emoji: '🌅',
    titlePrefix: '早餐打卡',
    color: '#FFB74D',
    bgColor: 'rgba(255, 183, 77, 0.15)',
  },
  lunch: {
    key: 'lunch',
    label: '午餐',
    emoji: '☀️',
    titlePrefix: '午餐打卡',
    color: '#7CB342',
    bgColor: 'rgba(124, 179, 66, 0.15)',
  },
  dinner: {
    key: 'dinner',
    label: '晚餐',
    emoji: '🌙',
    titlePrefix: '晚餐打卡',
    color: '#5C6BC0',
    bgColor: 'rgba(92, 107, 192, 0.15)',
  },
  snack: {
    key: 'snack',
    label: '加餐',
    emoji: '🍪',
    titlePrefix: '加餐打卡',
    color: '#BA68C8',
    bgColor: 'rgba(186, 104, 200, 0.15)',
  },
};

export const getActiveTheme = (): Theme => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return TIME_THEMES.dawn;
  if (hour >= 7 && hour < 12) return TIME_THEMES.morning;
  if (hour >= 12 && hour < 15) return TIME_THEMES.noon;
  if (hour >= 15 && hour < 18) return TIME_THEMES.afternoon;
  if (hour >= 18 && hour < 21) return TIME_THEMES.sunset;
  return TIME_THEMES.night;
};

export const getThemeList = (): Theme[] => Object.values(TIME_THEMES);

export const getMealTypeInfo = (mealType: string) => {
  return MEAL_TYPES[mealType as keyof typeof MEAL_TYPES] || MEAL_TYPES.snack;
};

export const getAllMealTypes = () => Object.values(MEAL_TYPES);

export const recognizeMealType = (date: Date = new Date()): string => {
  const hour = date.getHours();
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 23) return 'dinner';
  return 'snack';
};

export const generateTitle = (mealTypeKey: string) => {
  const mealInfo = getMealTypeInfo(mealTypeKey);
  return mealInfo.titlePrefix;
};
