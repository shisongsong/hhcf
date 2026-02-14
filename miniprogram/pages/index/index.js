const app = getApp();
const { recognizeMealType } = require('../../utils/meal');

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

function getTimeTheme() {
  const hour = new Date().getHours();
  for (const key in TIME_THEMES) {
    if (TIME_THEMES[key].hour.includes(hour)) {
      return { key, ...TIME_THEMES[key] };
    }
  }
  return { key: 'morning', ...TIME_THEMES.morning };
}

const themeList = Object.entries(TIME_THEMES).map(([key, value]) => ({
  key,
  ...value
}));

Page({
  data: {
    isAgreed: false,
    isLoggedIn: false,
    day: '01',
    month: 'JAN',
    theme: {},
    themeList: themeList,
  },

  onLoad: function () {
    this.checkPrivacyStatus();
    this.updateDate();
    this.updateTheme();
  },
  
  updateDate: function() {
    const now = new Date();
    const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    this.setData({
      day: String(now.getDate()).padStart(2, '0'),
      month: months[now.getMonth()]
    });
  },

  updateTheme: function() {
    const theme = getTimeTheme();
    this.setData({ theme });
  },

  toggleTheme: function() {
    const keys = Object.keys(TIME_THEMES);
    const currentIndex = keys.indexOf(this.data.theme.key);
    const nextIndex = (currentIndex + 1) % keys.length;
    const nextKey = keys[nextIndex];
    this.setData({
      theme: { key: nextKey, ...TIME_THEMES[nextKey] }
    });
  },

  setTheme: function(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({
      theme: { key, ...TIME_THEMES[key] }
    });
  },

  onShow: function () {
    this.checkPrivacyStatus();
    this.checkLoginStatus();
  },

  checkPrivacyStatus: function () {
    const isAgreed = wx.getStorageSync('privacyAgreed') || false;
    this.setData({ isAgreed });
    if (!isAgreed) {
      wx.navigateTo({
        url: '/pages/privacy/privacy',
      });
    }
  },

  checkLoginStatus: async function () {
    const token = wx.getStorageSync('token');
    if (!token) {
      this.setData({ isLoggedIn: false });
      await app.login();
      this.setData({ isLoggedIn: true });
      return;
    }
    this.setData({ isLoggedIn: true });
  },

  ensureLogin: async function () {
    if (!this.data.isLoggedIn) {
      try {
        await app.login();
        this.setData({ isLoggedIn: true });
      } catch (err) {
        wx.showToast({ title: '登录失败', icon: 'none' });
        return false;
      }
    }
    return true;
  },

  onAddClick: async function () {
    if (!this.data.isAgreed) {
      wx.navigateTo({
        url: '/pages/privacy/privacy',
      });
      return;
    }

    const loggedIn = await this.ensureLogin();
    if (!loggedIn) return;

    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFiles.map(f => f.tempFilePath);
        const timestamp = Date.now();
        const mealTypeInfo = recognizeMealType(new Date(timestamp));
        wx.navigateTo({
          url: `/pages/preview/preview?imagePaths=${encodeURIComponent(JSON.stringify(tempFilePaths))}&timestamp=${timestamp}&mealType=${mealTypeInfo.key}`,
        });
      },
      fail: (err) => {
        if (err.errMsg !== 'chooseMedia:fail cancel') {
          wx.showToast({
            title: '请重新选择',
            icon: 'none',
          });
        }
      },
    });
  },

  goToRecords: function () {
    wx.switchTab({
      url: '/pages/records/records',
    });
  },

  onShareAppMessage: function () {
    return {
      title: '好好吃饭',
      path: '/pages/index/index',
    };
  },
});
