const app = getApp();
const { formatTime } = require('../../utils/util');
const { getMealTypeInfo } = require('../../utils/meal');

Page({
  data: {
    id: '',
    record: null,
    isOwner: false,
    scale: 1,
    currentPosterStyle: 'simple',
    showActionSheet: false,
    currentImageIndex: 0,
    touchStartX: 0,
    touchStartY: 0,
  },

  onLoad: function (options) {
    const { id } = options;
    if (id) {
      this.setData({ id });
      this.loadRecord(id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  onTouchStart: function(e) {
    this.setData({
      touchStartX: e.touches[0].clientX,
      touchStartY: e.touches[0].clientY,
    });
  },

  onTouchMove: function(e) {
    // Can add visual feedback here
  },

  onTouchEnd: function(e) {
    const { record, currentImageIndex } = this.data;
    if (!record || !record.imageUrl) return;
    
    const deltaX = e.changedTouches[0].clientX - this.data.touchStartX;
    
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0 && currentImageIndex > 0) {
        this.setData({ currentImageIndex: currentImageIndex - 1 });
      } else if (deltaX < 0 && currentImageIndex < record.imageUrl.length - 1) {
        this.setData({ currentImageIndex: currentImageIndex + 1 });
      }
    }
  },

  onImagePreview: function (e) {
    const { index } = e.currentTarget.dataset;
    const { record } = this.data;
    wx.previewImage({
      urls: record.imageUrl,
      current: record.imageUrl[index],
    });
  },

  onSwiperChange: function (e) {
    this.setData({
      currentImageIndex: e.detail.current,
    });
  },

  loadRecord: async function (id) {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await app.request({
        url: `/api/records/${id}`,
        method: 'GET',
      });

      if (!res.data) {
        throw new Error('记录不存在');
      }

      const record = res.data;
      const isOwner = true;
      const mealTypeInfo = getMealTypeInfo(record.mealType);

      this.setData({
        record,
        isOwner,
        mealTypeInfo,
        formattedTime: formatTime(new Date(record.timestamp)),
      });

      wx.setNavigationBarTitle({
        title: record.title || '好好吃饭',
      });

      wx.hideLoading();
    } catch (err) {
      console.error('加载记录失败', err);
      wx.hideLoading();
      const errorMsg = err.message || '';
      if (errorMsg.includes('无权限')) {
        wx.showToast({ title: '无权限访问', icon: 'none' });
      } else if (errorMsg.includes('记录不存在')) {
        wx.showToast({ title: '记录不存在或已删除', icon: 'none' });
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
      setTimeout(() => {
        wx.switchTab({ url: '/pages/records/records' });
      }, 1500);
    }
  },

  onDeleteTap: function () {
    if (!this.data.isOwner) {
      wx.showToast({ title: '只能删除自己的记录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '删除这顿饭记录？',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          this.deleteRecord();
        }
      },
    });
  },

  deleteRecord: async function () {
    try {
      await app.request({
        url: `/api/records/${this.data.id}`,
        method: 'DELETE',
      });

      wx.showToast({ title: '已删除', icon: 'success' });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      console.error('删除失败', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  onMoreTap: function () {
    this.setData({ showActionSheet: true });
  },

  onCloseActionSheet: function () {
    this.setData({ showActionSheet: false });
  },

  onSavePoster: function () {
    if (!this.data.isOwner) {
      wx.showToast({ title: '只能分享自己的记录', icon: 'none' });
      return;
    }

    const styles = [
      { name: '简约白', key: 'simple' },
      { name: '时光灰', key: 'time' },
      { name: '手写暖', key: 'warm' },
    ];

    wx.showActionSheet({
      itemList: styles.map(s => s.name),
      success: (res) => {
        const selectedStyle = styles[res.tapIndex];
        this.setData({ currentPosterStyle: selectedStyle.key });
        this.generatePoster();
      },
    });
  },

  generatePoster: function () {
    wx.showLoading({ title: '生成中...' });

    const { record, id, mealTypeInfo, formattedTime } = this.data;

    app.request({
      url: '/api/qrcode',
      method: 'GET',
      data: { scene: id },
    }).then((res) => {
      if (res.data && res.data.qrcode) {
        this.drawPoster(record.imageUrl, res.data.qrcode, mealTypeInfo, formattedTime, id);
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
    const query = wx.createSelectorQuery();
    query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;

      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);

      wx.getImageInfo({
        src: imageUrl,
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

    const dateText = formattedTime.month + '.' + formattedTime.day + ' ' + formattedTime.hour + ':' + formattedTime.minute;
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

  onShareAppMessage: function () {
    const { record } = this.data;
    return {
      title: (record && record.title) || '好好吃饭',
      path: `/pages/detail/detail?id=${this.data.id}`,
    };
  },

  onShareTimeline: function () {
    const { record } = this.data;
    return {
      title: (record && record.title) || '好好吃饭',
      query: `id=${this.data.id}`,
    };
  },
});
