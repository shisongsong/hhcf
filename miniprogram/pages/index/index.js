const app = getApp();
const { recognizeMealType, getMealTypeInfo, getAllMealTypes, MEAL_TYPES } = require('../../utils/meal');

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
    todayMeals: [],
    showMealPopup: false,
    popupRecord: null,
    popupMealInfo: null,
    popupFormattedTime: null,
    showCameraPopup: false,
    cameraPhotos: [],
    photoAdjustData: [],
    currentCameraIndex: 0,
    isAdjustingPhoto: false,
    adjustPhotoIndex: -1,
    adjustScale: 1,
    adjustX: 0,
    adjustY: 0,
    cameraContext: null,
    touchStartDistance: 0,
    touchStartScale: 1,
    touchStartX: 0,
    touchStartY: 0,
    touchStartAdjustX: 0,
    touchStartAdjustY: 0,
  },

  onLoad: function () {
    this.checkPrivacyStatus();
    this.updateDate();
    this.updateTheme();
  },
  
  onReady: function() {
    this.setData({
      cameraContext: wx.createCameraContext(),
    });
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
    this.loadTodayMeals();
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

  openCameraPopup: function () {
    this.setData({
      showCameraPopup: true,
      cameraPhotos: [],
      photoAdjustData: [],
    });
    setTimeout(() => {
      this.setData({ cameraContext: wx.createCameraContext() });
    }, 100);
  },

  onCloseCameraPopup: function() {
    this.setData({
      showCameraPopup: false,
    });
  },

  onTakePhoto: function() {
    const { cameraContext, cameraPhotos } = this.data;
    if (cameraPhotos.length >= 9) {
      wx.showToast({ title: '最多9张', icon: 'none' });
      return;
    }
    
    cameraContext.takePhoto({
      quality: 'high',
      success: (res) => {
        const newPhotos = [...cameraPhotos, res.tempImagePath];
        const newAdjustData = [...this.data.photoAdjustData, { scale: 1, x: 0, y: 0 }];
        this.setData({
          cameraPhotos: newPhotos,
          photoAdjustData: newAdjustData,
          currentCameraIndex: newPhotos.length - 1,
        });
      },
      fail: (err) => {
        wx.showToast({ title: '拍照失败', icon: 'none' });
      },
    });
  },

  onChooseFromAlbum: function() {
    const { cameraPhotos } = this.data;
    const remaining = 9 - cameraPhotos.length;
    
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const newPhotos = res.tempFiles.map(f => f.tempFilePath);
        const allPhotos = [...cameraPhotos, ...newPhotos];
        const newAdjustData = [...this.data.photoAdjustData];
        newPhotos.forEach(() => {
          newAdjustData.push({ scale: 1, x: 0, y: 0 });
        });
        this.setData({
          cameraPhotos: allPhotos.slice(0, 9),
          photoAdjustData: newAdjustData.slice(0, 9),
        });
      },
    });
  },

  onDeletePhoto: function(e) {
    const { index } = e.currentTarget.dataset;
    const newPhotos = [...this.data.cameraPhotos];
    const newAdjustData = [...this.data.photoAdjustData];
    newPhotos.splice(index, 1);
    newAdjustData.splice(index, 1);
    this.setData({
      cameraPhotos: newPhotos,
      photoAdjustData: newAdjustData,
      currentCameraIndex: Math.min(this.data.currentCameraIndex, newPhotos.length - 1),
    });
  },

  onStartAdjustPhoto: function(e) {
    const { index } = e.currentTarget.dataset;
    const adjustData = this.data.photoAdjustData[index] || { scale: 1, x: 0, y: 0 };
    this.setData({
      isAdjustingPhoto: true,
      adjustPhotoIndex: index,
      adjustScale: adjustData.scale,
      adjustX: adjustData.x,
      adjustY: adjustData.y,
      touchStartDistance: 0,
      touchStartX: 0,
      touchStartY: 0,
    });
  },

  onTouchAdjustStart: function(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      this.setData({
        touchStartDistance: distance,
        touchStartScale: this.data.adjustScale,
      });
    } else if (e.touches.length === 1) {
      this.setData({
        touchStartX: e.touches[0].clientX,
        touchStartY: e.touches[0].clientY,
        touchStartAdjustX: this.data.adjustX,
        touchStartAdjustY: this.data.adjustY,
      });
    }
  },

  onTouchAdjustMove: function(e) {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = this.data.touchStartScale * (distance / this.data.touchStartDistance);
      this.setData({
        adjustScale: Math.max(0.5, Math.min(3, scale)),
      });
    } else if (e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - this.data.touchStartX;
      const deltaY = e.touches[0].clientY - this.data.touchStartY;
      const newX = this.data.touchStartAdjustX + deltaX;
      const newY = this.data.touchStartAdjustY + deltaY;
      this.setData({
        adjustX: newX,
        adjustY: newY,
      });
    }
  },

  onTouchAdjustEnd: function(e) {
    // Keep the current values
  },

  onConfirmAdjust: function() {
    const { adjustPhotoIndex, adjustScale, adjustX, adjustY, photoAdjustData } = this.data;
    const newAdjustData = [...photoAdjustData];
    newAdjustData[adjustPhotoIndex] = { scale: adjustScale, x: adjustX, y: adjustY };
    this.setData({
      photoAdjustData: newAdjustData,
      isAdjustingPhoto: false,
      adjustPhotoIndex: -1,
    });
  },

  onCancelAdjust: function() {
    this.setData({
      isAdjustingPhoto: false,
      adjustPhotoIndex: -1,
    });
  },

  onSavePhotos: async function() {
    const { cameraPhotos, photoAdjustData } = this.data;
    if (cameraPhotos.length === 0) {
      wx.showToast({ title: '请先拍照', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '处理中...' });

    try {
      const croppedPhotos = await this.cropPhotos(cameraPhotos);
      
      const tempFilePaths = croppedPhotos;
      const timestamp = Date.now();
      const mealTypeInfo = recognizeMealType(new Date(timestamp));
      
      this.setData({ showCameraPopup: false });
      wx.hideLoading();
      
      wx.navigateTo({
        url: `/pages/preview/preview?imagePaths=${encodeURIComponent(JSON.stringify(tempFilePaths))}&timestamp=${timestamp}&mealType=${mealTypeInfo.key}`,
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '处理失败', icon: 'none' });
      console.error(err);
    }
  },

  cropPhotos: function(photos) {
    return new Promise(async (resolve) => {
      const croppedPaths = [];
      
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        
        try {
          const cropped = await this.cropSinglePhoto(photo);
          croppedPaths.push(cropped);
        } catch (err) {
          croppedPaths.push(photo);
        }
        
        if (i === photos.length - 1) {
          resolve(croppedPaths);
        }
      }
    });
  },

  cropSinglePhoto: function(photoPath) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: photoPath,
        success: (info) => {
          const size = Math.min(info.width, info.height);
          const x = (info.width - size) / 2;
          const y = (info.height - size) / 2;
          
          wx.cropImage({
            src: photoPath,
            success: (res) => {
              resolve(res.tempFilePath);
            },
            fail: () => {
              reject(new Error('crop failed'));
            }
          });
        },
        fail: () => {
          reject(new Error('get image info failed'));
        }
      });
    });
  },

  loadTodayMeals: async function () {
    try {
      const res = await app.request({
        url: '/api/records',
        method: 'GET',
      });
      
      const records = res.data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      const todayEnd = todayStart + 24 * 60 * 60 * 1000;
      
      const todayRecords = records.filter(r => r.timestamp >= todayStart && r.timestamp < todayEnd);
      
      const mealTypes = getAllMealTypes();
      const todayMeals = mealTypes.map(meal => {
        const record = todayRecords.find(r => r.mealType === meal.key);
        return {
          ...meal,
          checked: !!record,
          record: record || null,
        };
      });
      
      this.setData({ todayMeals });
    } catch (err) {
      console.error('加载今日记录失败', err);
    }
  },

  onMealIconTap: function(e) {
    const { key } = e.currentTarget.dataset;
    const meal = this.data.todayMeals.find(m => m.key === key);
    
    if (!meal || !meal.checked) {
      this.onAddClick();
      return;
    }
    
    const mealInfo = getMealTypeInfo(key);
    const record = meal.record;
    
    const date = new Date(record.timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    this.setData({
      showMealPopup: true,
      popupRecord: record,
      popupMealInfo: mealInfo,
      popupFormattedTime: `${hours}:${minutes}`,
    });
  },

  onClosePopup: function() {
    this.setData({
      showMealPopup: false,
      popupRecord: null,
      popupMealInfo: null,
    });
  },

  onSharePoster: function() {
    const { popupRecord } = this.data;
    if (popupRecord) {
      wx.navigateTo({
        url: `/pages/detail/detail?id=${popupRecord.id}`,
      });
    }
    this.onClosePopup();
  },

  onShareMiniApp: function() {
    const { popupRecord, popupMealInfo } = this.data;
    if (popupRecord) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline'],
      });
    }
    this.onClosePopup();
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

    this.openCameraPopup();
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
