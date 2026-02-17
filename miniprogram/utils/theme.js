const TIME_THEMES = {
  dawn: {
    name: '清晨',
    hour: [5, 6, 7],
    bgGradient: ['#F5E6E8', '#FCEAEC', '#FFE4D6'],
    primary: '#C45C69',
    accent: '#A84858',
    textPrimary: '#4A3040',
    textSecondary: '#7A6570',
    emoji: '🌅',
    blobs: ['#E8C4C8', '#D4A4B0', '#C48490'],
    greeting: '早安，新的一天',
  },
  morning: {
    name: '上午',
    hour: [8, 9, 10, 11],
    bgGradient: ['#FFF5E6', '#FFE8CC', '#FFDAB3'],
    primary: '#D4924A',
    accent: '#C48232',
    textPrimary: '#4A3828',
    textSecondary: '#7A6558',
    emoji: '☀️',
    blobs: ['#E8D4B8', '#D4C0A0', '#C4AC88'],
    greeting: '早上好呀',
  },
  noon: {
    name: '正午',
    hour: [12, 13, 14],
    bgGradient: ['#FFFEF5', '#FFF8DC', '#FFF3CD'],
    primary: '#D4A84A',
    accent: '#C49832',
    textPrimary: '#4A4230',
    textSecondary: '#7A7058',
    emoji: '🌤️',
    blobs: ['#E8DCA8', '#D4C890', '#C4B478'],
    greeting: '午餐时间到',
  },
  afternoon: {
    name: '下午',
    hour: [15, 16, 17],
    bgGradient: ['#E8F4F8', '#DCE8F0', '#D0DCE8'],
    primary: '#5B8BA0',
    accent: '#4A7A8C',
    textPrimary: '#303A40',
    textSecondary: '#586870',
    emoji: '🌇',
    blobs: ['#B8D0E0', '#A0C0D0', '#88B0C0'],
    greeting: '下午好',
  },
  sunset: {
    name: '黄昏',
    hour: [18, 19, 20],
    bgGradient: ['#FFE8E8', '#FFD8D0', '#FFC8B8'],
    primary: '#D4605A',
    accent: '#C44848',
    textPrimary: '#4A3030',
    textSecondary: '#7A5858',
    emoji: '🌆',
    blobs: ['#E8B8B0', '#D4A098', '#C48880'],
    greeting: '黄昏时刻',
  },
  night: {
    name: '夜晚',
    hour: [21, 22, 23, 0, 1, 2, 3, 4],
    bgGradient: ['#1A1A2E', '#16213E', '#0F3460'],
    primary: '#7B68EE',
    accent: '#6A5ACD',
    textPrimary: '#E8E8F0',
    textSecondary: '#B8B8C8',
    emoji: '🌙',
    blobs: ['#2D2D50', '#4B4B80', '#5B5B90'],
    greeting: '夜深了',
  },
};

const THEME_OVERRIDE_KEY = 'manualThemeKey';

function getTimeTheme(date = new Date()) {
  const hour = date.getHours();
  for (const key in TIME_THEMES) {
    if (TIME_THEMES[key].hour.includes(hour)) {
      return { key, ...TIME_THEMES[key] };
    }
  }
  return { key: 'morning', ...TIME_THEMES.morning };
}

function getManualThemeKey() {
  try {
    return wx.getStorageSync(THEME_OVERRIDE_KEY) || '';
  } catch (err) {
    return '';
  }
}

function setManualThemeKey(key) {
  if (!key || !TIME_THEMES[key]) return;
  try {
    wx.setStorageSync(THEME_OVERRIDE_KEY, key);
  } catch (err) {
    // ignore
  }
}

function clearManualThemeKey() {
  try {
    wx.removeStorageSync(THEME_OVERRIDE_KEY);
  } catch (err) {
    // ignore
  }
}

function getActiveTheme(date = new Date()) {
  const manualKey = getManualThemeKey();
  if (manualKey && TIME_THEMES[manualKey]) {
    return { key: manualKey, ...TIME_THEMES[manualKey], isManual: true };
  }
  return getTimeTheme(date);
}

function getThemeList() {
  return Object.entries(TIME_THEMES).map(([key, value]) => ({ key, ...value }));
}

function applyTabBarTheme(theme) {
  if (!theme || !wx.setTabBarStyle) return;
  try {
    wx.setTabBarStyle({
      color: 'rgba(70, 70, 70, 0.65)',
      selectedColor: theme.accent,
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderStyle: 'white',
    });
  } catch (err) {
    // 非 tabbar 页调用时静默跳过
  }
}

function applyNavigationTheme(theme) {
  if (!theme || !wx.setNavigationBarColor) return;
  try {
    wx.setNavigationBarColor({
      frontColor: theme.key === 'night' ? '#ffffff' : '#000000',
      backgroundColor: theme.bgGradient[0],
      animation: {
        duration: 240,
        timingFunc: 'easeIn',
      },
    });
  } catch (err) {
    // 自定义导航栏页面会忽略
  }
}

module.exports = {
  TIME_THEMES,
  getTimeTheme,
  getActiveTheme,
  getThemeList,
  getManualThemeKey,
  setManualThemeKey,
  clearManualThemeKey,
  applyTabBarTheme,
  applyNavigationTheme,
};
