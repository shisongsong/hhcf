const app = getApp();
const { recognizeMealType, getMealTypeInfo, getAllMealTypes, generateTitle } = require('../../utils/meal');
const { formatTime } = require('../../utils/util');
const { TIME_THEMES, getActiveTheme, getThemeList, setManualThemeKey, applyTabBarTheme } = require('../../utils/theme');
const { pickRandomShareCard } = require('../../utils/share-card');

const themeList = getThemeList();

Page({
  data: {
    isAgreed: false,
    isLoggedIn: false,
    day: '01',
    month: 'JAN',
    theme: {},
    themeList: themeList,
    todayMeals: [],
    todayCheckedCount: 0,
    showMealPopup: false,
    popupRecord: null,
    popupMealInfo: null,
    popupFormattedTime: null,
    showCameraPopup: false,
    cameraPhotos: [],
    photoAdjustData: [],
    currentCameraIndex: 0,
    cameraMealTypes: [],
    cameraMealType: 'lunch',
    cameraTitle: '',
    isUploading: false,
    uploadProgress: '',
    uploadedCount: 0,
    totalCount: 0,
    pendingCroppedPhotos: [],
    cropCanvasSize: 800,
    adjustFramePx: 560,
    isAdjustingPhoto: false,
    adjustPhotoIndex: -1,
    adjustScale: 1,
    adjustX: 0,
    adjustY: 0,
    currentPosterStyle: 'simple',
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

    const system = wx.getSystemInfoSync();
    const framePx = system.windowWidth * 560 / 750;
    this.setData({ adjustFramePx: framePx });
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
    const theme = getActiveTheme();
    this.setData({ theme });
    applyTabBarTheme(theme);
  },

  toggleTheme: function() {
    const keys = Object.keys(TIME_THEMES);
    const currentIndex = keys.indexOf(this.data.theme.key);
    const nextIndex = (currentIndex + 1) % keys.length;
    const nextKey = keys[nextIndex];
    const theme = { key: nextKey, ...TIME_THEMES[nextKey] };
    setManualThemeKey(nextKey);
    this.setData({ theme });
    applyTabBarTheme(theme);
  },

  setTheme: function(e) {
    const key = e.currentTarget.dataset.key;
    setManualThemeKey(key);
    const theme = { key, ...TIME_THEMES[key] };
    this.setData({ theme });
    applyTabBarTheme(theme);
  },

  onShow: function () {
    this.updateTheme();
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

  openCameraPopup: function (preferredMealKey) {
    const defaultMeal = recognizeMealType(new Date());
    const mealTypes = getAllMealTypes();
    const hasPreferred = mealTypes.some((meal) => meal.key === preferredMealKey);
    const selectedMealKey = hasPreferred ? preferredMealKey : defaultMeal.key;
    const defaultTitle = generateTitle(selectedMealKey);
    this.setData({
      showCameraPopup: true,
      cameraPhotos: [],
      photoAdjustData: [],
      cameraMealTypes: mealTypes,
      cameraMealType: selectedMealKey,
      cameraTitle: defaultTitle,
      uploadProgress: '',
      isUploading: false,
      uploadedCount: 0,
      totalCount: 0,
      pendingCroppedPhotos: [],
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
          totalCount: newPhotos.length,
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
          totalCount: allPhotos.slice(0, 9).length,
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
      adjustScale: Math.max(1, adjustData.scale || 1),
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
        adjustScale: Math.max(1, Math.min(3, scale)),
      });
    } else if (e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - this.data.touchStartX;
      const deltaY = e.touches[0].clientY - this.data.touchStartY;
      const newX = this.data.touchStartAdjustX + deltaX;
      const newY = this.data.touchStartAdjustY + deltaY;
      const maxOffset = (this.data.adjustScale - 1) * (this.data.adjustFramePx / 2);
      this.setData({
        adjustX: Math.max(-maxOffset, Math.min(maxOffset, newX)),
        adjustY: Math.max(-maxOffset, Math.min(maxOffset, newY)),
      });
    }
  },

  onTouchAdjustEnd: function(e) {
    // Keep the current values
  },

  onConfirmAdjust: function() {
    const { adjustPhotoIndex, adjustScale, adjustX, adjustY, photoAdjustData } = this.data;
    const newAdjustData = [...photoAdjustData];
    newAdjustData[adjustPhotoIndex] = { scale: Math.max(1, adjustScale), x: adjustX, y: adjustY };
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
    if (this.data.isUploading) return;
    const { cameraPhotos, photoAdjustData } = this.data;
    if (cameraPhotos.length === 0) {
      wx.showToast({ title: '请先拍照', icon: 'none' });
      return;
    }

    const loggedIn = await this.ensureLogin();
    if (!loggedIn) return;

    this.setData({
      isUploading: true,
      uploadProgress: '裁剪中...',
      uploadedCount: 0,
      totalCount: cameraPhotos.length,
    });

    try {
      const croppedPhotos = [];

      for (let i = 0; i < cameraPhotos.length; i++) {
        const photo = cameraPhotos[i];
        const adjustData = photoAdjustData[i] || { scale: 1, x: 0, y: 0 };
        const cropped = await this.cropToSquare(photo, adjustData);
        croppedPhotos.push(cropped);
      }

      this.setData({ pendingCroppedPhotos: croppedPhotos });
      await this.uploadAndSave(croppedPhotos);
    } catch (err) {
      console.error(err);
      this.setData({ isUploading: false, uploadProgress: '上传失败，点击重试' });
    }
  },

  uploadAndSave: async function (imagePaths) {
    try {
      const imageUrls = await this.uploadAllImages(imagePaths);
      this.setData({ uploadProgress: '保存中...' });
      const saveRes = await this.saveRecord(imageUrls);

      this.setData({
        isUploading: false,
        uploadProgress: '上传完成',
        showCameraPopup: false,
        cameraPhotos: [],
        photoAdjustData: [],
        pendingCroppedPhotos: [],
        currentCameraIndex: 0,
      });

      wx.showToast({ title: '保存成功', icon: 'success' });
      this.loadTodayMeals();

      setTimeout(() => {
        this.setData({ uploadProgress: '' });
      }, 1500);

      return saveRes;
    } catch (err) {
      console.error('保存失败', err);
      this.setData({ isUploading: false, uploadProgress: '上传失败，点击重试' });
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      throw err;
    }
  },

  onRetryUpload: function () {
    if (this.data.isUploading) return;
    const { pendingCroppedPhotos } = this.data;
    if (!pendingCroppedPhotos || pendingCroppedPhotos.length === 0) {
      this.onSavePhotos();
      return;
    }
    this.setData({ isUploading: true, uploadProgress: '上传中...' });
    this.uploadAndSave(pendingCroppedPhotos);
  },

  cropToSquare: function(photoPath, adjustData) {
    return new Promise((resolve) => {
      wx.getImageInfo({
        src: photoPath,
        success: (info) => {
          const srcSize = Math.min(info.width, info.height);
          const srcX = (info.width - srcSize) / 2;
          const srcY = (info.height - srcSize) / 2;
          
          const dstSize = srcSize;
          const scale = Math.max(1, adjustData ? adjustData.scale : 1);
          const framePx = this.data.adjustFramePx || 560;
          const offsetScale = dstSize / framePx;
          const rawOffsetX = (adjustData ? adjustData.x : 0) * offsetScale;
          const rawOffsetY = (adjustData ? adjustData.y : 0) * offsetScale;

          const drawSize = dstSize * scale;
          const maxOffset = (drawSize - dstSize) / 2;
          const offsetX = Math.max(-maxOffset, Math.min(maxOffset, rawOffsetX));
          const offsetY = Math.max(-maxOffset, Math.min(maxOffset, rawOffsetY));
          const drawX = (dstSize - drawSize) / 2 + offsetX;
          const drawY = (dstSize - drawSize) / 2 + offsetY;

          this.setData({ cropCanvasSize: dstSize }, () => {
            const ctx = wx.createCanvasContext('photoCropper', this);
            ctx.clearRect(0, 0, dstSize, dstSize);
            ctx.drawImage(photoPath, srcX, srcY, srcSize, srcSize, drawX, drawY, drawSize, drawSize);
            ctx.draw(false, () => {
              wx.canvasToTempFilePath({
                canvasId: 'photoCropper',
                width: dstSize,
                height: dstSize,
                destWidth: dstSize,
                destHeight: dstSize,
                quality: 1,
                fileType: 'jpg',
                success: (res) => {
                  resolve(res.tempFilePath);
                },
                fail: (err) => {
                  console.error('canvas to temp file fail', err);
                  resolve(photoPath);
                }
              }, this);
            });
          });
        },
        fail: () => {
          resolve(photoPath);
        }
      });
    });
  },

  uploadAllImages: async function (imagePaths) {
    const uploadedUrls = [];

    for (let i = 0; i < imagePaths.length; i++) {
      this.setData({ uploadProgress: `上传 ${i + 1}/${imagePaths.length}` });
      const url = await this.uploadSingleImage(imagePaths[i]);
      uploadedUrls.push(url);
      this.setData({ uploadedCount: i + 1 });
    }

    return uploadedUrls;
  },

  uploadSingleImage: function (imagePath) {
    return new Promise((resolve, reject) => {
      this.doUpload(imagePath, resolve, reject);
    });
  },

  doUpload: function (filePath, resolve, reject) {
    wx.uploadFile({
      url: `${app.globalData.apiBase}/api/upload`,
      filePath: filePath,
      name: 'files',
      header: {
        'Authorization': `Bearer ${app.getToken()}`,
      },
      timeout: 60000,
      success: (res) => {
        if (res.statusCode >= 400) {
          reject(new Error(`服务器错误: ${res.statusCode}`));
          return;
        }
        try {
          const data = JSON.parse(res.data);
          if (data.success) {
            resolve(data.data.imageUrls[0]);
          } else {
            reject(new Error(data.error || '上传失败'));
          }
        } catch (e) {
          reject(new Error('解析响应失败: ' + res.data));
        }
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('timeout')) {
          reject(new Error('上传超时，请重试'));
        } else {
          reject(new Error('网络请求失败: ' + (err.errMsg || '未知错误')));
        }
      },
    });
  },

  saveRecord: function (imageUrls) {
    return app.request({
      url: '/api/records',
      method: 'POST',
      data: {
        imageUrls,
        mealType: this.data.cameraMealType,
        title: this.data.cameraTitle,
        timestamp: Date.now(),
      },
    });
  },

  onCameraMealTap: function (e) {
    const { key } = e.currentTarget.dataset;
    this.setData({
      cameraMealType: key,
      cameraTitle: generateTitle(key),
    });
  },

  onCameraTitleTap: function () {
    const mealInfo = getMealTypeInfo(this.data.cameraMealType);
    const items = [
      `${mealInfo.label}打卡`,
      '今日美食',
      '分享这顿饭',
    ];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        this.setData({
          cameraTitle: items[res.tapIndex],
        });
      },
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
      
      const todayCheckedCount = todayMeals.filter(m => m.checked).length;
      
      this.setData({ todayMeals, todayCheckedCount });
    } catch (err) {
      console.error('加载今日记录失败', err);
    }
  },

  onMealIconTap: function(e) {
    const { key } = e.currentTarget.dataset;
    const meal = this.data.todayMeals.find(m => m.key === key);
    
    if (!meal || !meal.checked) {
      this.onAddClick(key);
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
    if (!popupRecord) return;
    this.onClosePopup();
    wx.navigateTo({
      url: `/pages/detail/detail?id=${popupRecord.id}`,
    });
  },

  generatePoster: function (record) {
    wx.showLoading({ title: '生成中...' });

    const mealTypeInfo = getMealTypeInfo(record.mealType);
    const formattedTime = formatTime(new Date(record.timestamp));

    app.request({
      url: '/api/qrcode',
      method: 'GET',
      data: { scene: record.shareId || record.id },
    }).then((res) => {
      if (res.data && res.data.qrcode) {
        this.drawPoster(record.imageUrl, res.data.qrcode, mealTypeInfo, formattedTime, record.id);
      } else {
        throw new Error('生成小程序码失败');
      }
    }).catch((err) => {
      console.error('生成海报失败', err);
      wx.hideLoading();
      wx.showToast({ title: '生成失败', icon: 'none' });
    });
  },

  drawPoster: function (imageUrl, qrcodeDataUrl, mealTypeInfo, formattedTime, recordId) {
    const style = this.data.currentPosterStyle || 'simple';
    const imageSrc = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
    const query = wx.createSelectorQuery();
    query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) {
        wx.hideLoading();
        wx.showToast({ title: '生成失败', icon: 'none' });
        return;
      }
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;

      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);

      wx.getImageInfo({
        src: imageSrc,
        success: (imgRes) => {
          const img = canvas.createImage();
          img.src = imgRes.path;
          img.onload = () => {
            if (style === 'simple') {
              this.drawSimpleStyle(ctx, canvas, img, qrcodeDataUrl);
            } else if (style === 'time') {
              this.drawTimeStyle(ctx, canvas, img, qrcodeDataUrl, formattedTime);
            } else if (style === 'warm') {
              this.drawWarmStyle(ctx, canvas, img, qrcodeDataUrl);
            }
          };
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: '生成失败', icon: 'none' });
        },
      });
    });
  },

  drawSimpleStyle: function (ctx, canvas, img, qrcodeDataUrl) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 320, 480);

    const imgSize = 280;
    const imgX = (320 - imgSize) / 2;
    ctx.drawImage(img, imgX, 20, imgSize, imgSize);

    const qrImg = canvas.createImage();
    qrImg.src = qrcodeDataUrl;
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 250, 400, 50, 50);

      ctx.fillStyle = '#666666';
      ctx.font = '12px sans-serif';
      ctx.fillText('扫码看这顿饭', 20, 440);

      wx.canvasToTempFilePath({
        canvas: canvas,
        success: (canvasRes) => {
          wx.hideLoading();
          this.saveToAlbum(canvasRes.tempFilePath);
        },
        fail: (err) => {
          console.error('导出海报失败', err);
          wx.hideLoading();
          wx.showToast({ title: '生成失败', icon: 'none' });
        },
      });
    };
  },

  drawTimeStyle: function (ctx, canvas, img, qrcodeDataUrl, formattedTime) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 480);
    gradient.addColorStop(0, '#F8F9FA');
    gradient.addColorStop(1, '#E9ECEF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 320, 480);

    ctx.drawImage(img, 20, 60, 280, 280);

    const dateText = formattedTime.full;
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(dateText, 20, 40);

    const qrImg = canvas.createImage();
    qrImg.src = qrcodeDataUrl;
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 20, 380, 60, 60);

      wx.canvasToTempFilePath({
        canvas: canvas,
        success: (canvasRes) => {
          wx.hideLoading();
          this.saveToAlbum(canvasRes.tempFilePath);
        },
        fail: (err) => {
          console.error('导出海报失败', err);
          wx.hideLoading();
          wx.showToast({ title: '生成失败', icon: 'none' });
        },
      });
    };
  },

  drawWarmStyle: function (ctx, canvas, img, qrcodeDataUrl) {
    ctx.fillStyle = '#FFF9F0';
    ctx.fillRect(0, 0, 320, 480);

    const imgSize = 260;
    const imgX = (320 - imgSize) / 2;
    ctx.drawImage(img, imgX, 30, imgSize, imgSize);

    ctx.fillStyle = '#5D4037';
    ctx.font = '24px "Ma Shan Zheng", cursive';
    ctx.textAlign = 'center';
    ctx.fillText('今天吃这个！', 160, 330);
    ctx.textAlign = 'left';

    const qrImg = canvas.createImage();
    qrImg.src = qrcodeDataUrl;
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 250, 410, 50, 50);

      wx.canvasToTempFilePath({
        canvas: canvas,
        success: (canvasRes) => {
          wx.hideLoading();
          this.saveToAlbum(canvasRes.tempFilePath);
        },
        fail: (err) => {
          console.error('导出海报失败', err);
          wx.hideLoading();
          wx.showToast({ title: '生成失败', icon: 'none' });
        },
      });
    };
  },

  saveToAlbum: function (filePath) {
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '保存失败', icon: 'none' });
      },
    });
  },

  onAddClick: async function (preferredMealKey) {
    if (!this.data.isAgreed) {
      wx.navigateTo({
        url: '/pages/privacy/privacy',
      });
      return;
    }

    const loggedIn = await this.ensureLogin();
    if (!loggedIn) return;

    this.openCameraPopup(preferredMealKey);
  },

  goToRecords: function () {
    wx.switchTab({
      url: '/pages/records/records',
    });
  },

  onShareAppMessage: function (res) {
    if (res && res.from === 'button' && res.target && res.target.dataset) {
      const { id, shareid, title } = res.target.dataset;
      const sharePath = shareid
        ? `/pages/detail/detail?shareId=${shareid}`
        : `/pages/detail/detail?id=${id}`;
      return {
        title: title || '好好吃饭',
        path: sharePath,
        imageUrl: pickRandomShareCard(),
      };
    }
    return {
      title: '好好吃饭',
      path: '/pages/index/index',
      imageUrl: pickRandomShareCard(),
    };
  },

  onShareTimeline: function (res) {
    if (res && res.target && res.target.dataset && res.target.dataset.id) {
      const shareid = res.target.dataset.shareid;
      const id = res.target.dataset.id;
      return {
        title: res.target.dataset.title || '好好吃饭',
        query: shareid ? `shareId=${shareid}` : `id=${id}`,
        imageUrl: pickRandomShareCard(),
      };
    }
    return {
      title: '好好吃饭',
      query: '',
      imageUrl: pickRandomShareCard(),
    };
  },
});
