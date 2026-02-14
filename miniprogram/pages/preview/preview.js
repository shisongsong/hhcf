const { getMealTypeInfo, generateTitle, getAllMealTypes } = require('../../utils/meal');
const app = getApp();

Page({
  data: {
    imagePaths: [],
    imageUrls: [],
    timestamp: 0,
    mealType: 'lunch',
    mealTypeInfo: {},
    title: '',
    mealTypes: [],
    isUploading: false,
    uploadProgress: '',
    uploadedCount: 0,
    totalCount: 0,
  },

  onLoad: function (options) {
    const { imagePaths, timestamp, mealType } = options;
    const decodedImagePaths = JSON.parse(decodeURIComponent(imagePaths));
    const mealTypeInfo = getMealTypeInfo(mealType);
    const title = generateTitle(mealType);

    this.setData({
      imagePaths: decodedImagePaths,
      timestamp: parseInt(timestamp),
      mealType: mealType,
      mealTypeInfo: mealTypeInfo,
      title: title,
      mealTypes: getAllMealTypes(),
      totalCount: decodedImagePaths.length,
    });

    wx.setNavigationBarTitle({
      title: `${mealTypeInfo.label}打卡`,
    });

    this.uploadImages();
  },

  uploadImages: function () {
    this.setData({ isUploading: true, uploadProgress: '上传中...' });

    this.uploadAllImages()
      .then((imageUrls) => {
        this.setData({
          imageUrls: imageUrls,
          isUploading: false,
          uploadProgress: '上传完成',
        });
        setTimeout(() => {
          this.setData({ uploadProgress: '' });
        }, 2000);
      })
      .catch((err) => {
        console.error('上传失败', err);
        this.setData({
          isUploading: false,
          uploadProgress: '上传失败，点击重试',
        });
      });
  },

  uploadAllImages: async function () {
    const { imagePaths } = this.data;
    const uploadedUrls = [];

    for (let i = 0; i < imagePaths.length; i++) {
      this.setData({ uploadProgress: `上传 ${i + 1}/${imagePaths.length}` });
      
      try {
        const url = await this.uploadSingleImage(imagePaths[i]);
        uploadedUrls.push(url);
        this.setData({ uploadedCount: i + 1 });
      } catch (err) {
        console.error(`第 ${i + 1} 张上传失败:`, err);
        throw err;
      }
    }

    return uploadedUrls;
  },

  uploadSingleImage: function (imagePath) {
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src: imagePath,
        quality: 80,
        success: (compressRes) => {
          this.doUpload(compressRes.tempFilePath, resolve, reject);
        },
        fail: () => {
          this.doUpload(imagePath, resolve, reject);
        },
      });
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
        if (err.errMsg.includes('timeout')) {
          reject(new Error('上传超时，请重试'));
        } else {
          reject(new Error('网络请求失败: ' + (err.errMsg || '未知错误')));
        }
      },
    });
  },

  onRetryUpload: function () {
    if (this.data.isUploading) return;
    this.uploadImages();
  },

  onAddMoreImages: function () {
    wx.chooseMedia({
      count: 9 - this.data.imagePaths.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newPaths = res.tempFiles.map(f => f.tempFilePath);
        const allPaths = [...this.data.imagePaths, ...newPaths];
        this.setData({
          imagePaths: allPaths,
          totalCount: allPaths.length,
        });
        this.uploadImages();
      },
    });
  },

  onMealTypeChange: function (e) {
    const { key } = e.currentTarget.dataset;
    const mealTypeInfo = getMealTypeInfo(key);
    const title = generateTitle(key);
    this.setData({
      mealType: key,
      mealTypeInfo: mealTypeInfo,
      title: title,
    });
    wx.setNavigationBarTitle({
      title: `${mealTypeInfo.label}打卡`,
    });
  },

  onTitleTap: function () {
    const items = [
      `${this.data.mealTypeInfo.label}打卡`,
      '今日美食',
      '分享这顿饭',
    ];
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        this.setData({
          title: items[res.tapIndex],
        });
      },
    });
  },

  onBack: function () {
    wx.navigateBack();
  },

  saveRecord: function () {
    return app.request({
      url: '/api/records',
      method: 'POST',
      data: {
        imageUrls: this.data.imageUrls,
        mealType: this.data.mealType,
        title: this.data.title,
        timestamp: this.data.timestamp,
      },
    });
  },

  onConfirm: async function () {
    if (this.data.imageUrls.length === 0) {
      if (this.data.uploadProgress === '上传失败，点击重试') {
        this.uploadImages();
      }
      wx.showToast({ title: '请先上传图片', icon: 'none' });
      return;
    }

    if (this.data.isUploading) return;

    this.setData({ isUploading: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const saveRes = await this.saveRecord();

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });

      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/detail/detail?id=${saveRes.data.id}`,
        });
      }, 1500);
    } catch (err) {
      console.error('保存失败', err);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
      });
      this.setData({ isUploading: false });
    }
  },

  onShareAppMessage: function () {
    return {
      title: this.data.title,
      path: '/pages/index/index',
    };
  },
});
