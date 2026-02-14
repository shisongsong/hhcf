const { getMealTypeInfo, generateTitle, getAllMealTypes } = require('../../utils/meal');
const app = getApp();

Page({
  data: {
    imagePath: '',
    imageUrl: '',
    timestamp: 0,
    mealType: 'lunch',
    mealTypeInfo: {},
    title: '',
    mealTypes: [],
    isUploading: false,
    uploadProgress: '',
  },

  onLoad: function (options) {
    const { imagePath, timestamp, mealType } = options;
    const decodedImagePath = decodeURIComponent(imagePath);
    const mealTypeInfo = getMealTypeInfo(mealType);
    const title = generateTitle(mealType);

    this.setData({
      imagePath: decodedImagePath,
      timestamp: parseInt(timestamp),
      mealType: mealType,
      mealTypeInfo: mealTypeInfo,
      title: title,
      mealTypes: getAllMealTypes(),
    });

    wx.setNavigationBarTitle({
      title: `${mealTypeInfo.label}打卡`,
    });

    this.uploadImageImmediately();
  },

  uploadImageImmediately: function () {
    this.setData({ isUploading: true, uploadProgress: '压缩中...' });

    this.uploadImage()
      .then((imageUrl) => {
        this.setData({
          imageUrl: imageUrl,
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

  onRetryUpload: function () {
    if (this.data.isUploading) return;
    this.uploadImageImmediately();
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

  uploadImage: function () {
    return new Promise((resolve, reject) => {
      // 先压缩图片
      wx.compressImage({
        src: this.data.imagePath,
        quality: 80, // 压缩质量
        success: (compressRes) => {
          const compressedPath = compressRes.tempFilePath;
          
          wx.uploadFile({
            url: `${app.globalData.apiBase}/api/upload`,
            filePath: compressedPath,
            name: 'file',
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
                  resolve(data.data.imageUrl);
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
        fail: (err) => {
          // 压缩失败，使用原图上传
          wx.uploadFile({
            url: `${app.globalData.apiBase}/api/upload`,
            filePath: this.data.imagePath,
            name: 'file',
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
                  resolve(data.data.imageUrl);
                } else {
                  reject(new Error(data.error || '上传失败'));
                }
              } catch (e) {
                reject(new Error('解析响应失败: ' + res.data));
              }
            },
            fail: (uploadErr) => {
              reject(new Error('上传失败: ' + (uploadErr.errMsg || '未知错误')));
            },
          });
        },
      });
    });
  },

  saveRecord: function () {
    return app.request({
      url: '/api/records',
      method: 'POST',
      data: {
        imageUrl: this.data.imageUrl,
        mealType: this.data.mealType,
        title: this.data.title,
        timestamp: this.data.timestamp,
      },
    });
  },

  onConfirm: async function () {
    if (!this.data.imageUrl) {
      if (this.data.uploadProgress === '上传失败，点击重试') {
        this.uploadImageImmediately();
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
