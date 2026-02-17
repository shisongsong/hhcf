const app = getApp();
const { formatTime } = require('../../utils/util');
const { getMealTypeInfo } = require('../../utils/meal');
const { getActiveTheme, applyTabBarTheme, applyNavigationTheme } = require('../../utils/theme');
const { pickRandomShareCard } = require('../../utils/share-card');

const POSTER_STYLES = [
  {
    key: 'spark',
    name: '烟火拼贴',
    desc: '主图+多格拼贴',
  },
  {
    key: 'film',
    name: '胶片日记',
    desc: '胶片感时间轴',
  },
  {
    key: 'mag',
    name: '杂志封面',
    desc: '视觉冲击感',
  },
];

Page({
  data: {
    id: '',
    shareId: '',
    record: null,
    mealTypeInfo: null,
    formattedTime: null,
    theme: getActiveTheme(),
    isOwner: false,
    isSharedView: false,
    currentImageIndex: 0,
    posterStyles: POSTER_STYLES,
    currentPosterStyle: POSTER_STYLES[0].key,
    showPosterSheet: false,
    isGeneratingPoster: false,
    showPosterPreview: false,
    posterPreviewPath: '',
  },

  onLoad: function (options) {
    const id = options.id;
    const shareId = options.shareId;
    this.updateTheme();

    if (shareId) {
      this.setData({ shareId: shareId, isSharedView: true });
      this.loadSharedRecord(shareId);
      return;
    }

    if (id) {
      this.setData({ id: id, isSharedView: false });
      this.loadRecord(id);
      return;
    }

    wx.showToast({ title: '参数错误', icon: 'none' });
    setTimeout(() => {
      wx.navigateBack();
    }, 1200);
  },

  onShow: function () {
    this.updateTheme();
  },

  updateTheme: function () {
    const theme = getActiveTheme();
    this.setData({ theme: theme });
    applyTabBarTheme(theme);
    applyNavigationTheme(theme);
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
      this.setRecordData(res.data, true);
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
      }, 1400);
    }
  },

  loadSharedRecord: async function (shareId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await app.request({
        url: `/api/share/${shareId}`,
        method: 'GET',
      });
      if (!res.data) {
        throw new Error('记录不存在');
      }
      const record = {
        ...res.data,
        shareId: res.data.shareId || shareId,
      };
      this.setRecordData(record, false);
      wx.hideLoading();
    } catch (err) {
      console.error('加载分享记录失败', err);
      wx.hideLoading();
      const errorMsg = err.message || '';
      if (errorMsg.includes('记录不存在')) {
        wx.showToast({ title: '记录不存在或已删除', icon: 'none' });
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 1400);
    }
  },

  setRecordData: function (record, isOwner) {
    const mealTypeInfo = getMealTypeInfo(record.mealType);
    const formattedTime = formatTime(new Date(record.timestamp));
    let imageList = [];
    if (Array.isArray(record.imageUrl)) {
      imageList = record.imageUrl;
    } else if (record.imageUrl) {
      imageList = [record.imageUrl];
    }

    this.setData({
      id: record.id,
      shareId: record.shareId || this.data.shareId,
      record: {
        ...record,
        imageUrl: imageList,
      },
      mealTypeInfo: mealTypeInfo,
      formattedTime: formattedTime,
      isOwner: isOwner,
      currentImageIndex: 0,
    });

    wx.setNavigationBarTitle({
      title: record.title || '好好吃饭',
    });
  },

  onSwiperChange: function (e) {
    this.setData({
      currentImageIndex: e.detail.current,
    });
  },

  onImagePreview: function (e) {
    const index = e.currentTarget.dataset.index;
    const record = this.data.record;
    if (!record || !record.imageUrl || record.imageUrl.length === 0) return;
    wx.previewImage({
      urls: record.imageUrl,
      current: record.imageUrl[index],
    });
  },

  onPosterStyleTap: function (e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ currentPosterStyle: key });
  },

  onOpenPosterSheet: function () {
    if (!this.data.isOwner) {
      wx.showToast({ title: '只能生成自己的海报', icon: 'none' });
      return;
    }
    if (!this.data.record || !this.data.record.imageUrl || this.data.record.imageUrl.length === 0) {
      wx.showToast({ title: '暂无可用图片', icon: 'none' });
      return;
    }
    this.setData({
      showPosterSheet: true,
      showPosterPreview: false,
    });
  },

  onClosePosterSheet: function () {
    if (this.data.isGeneratingPoster) return;
    this.setData({ showPosterSheet: false });
  },

  onGeneratePoster: async function () {
    if (this.data.isGeneratingPoster) return;
    const record = this.data.record;
    if (!record || !record.imageUrl || record.imageUrl.length === 0) {
      wx.showToast({ title: '暂无可用图片', icon: 'none' });
      return;
    }

    this.setData({ isGeneratingPoster: true });
    wx.showLoading({ title: '海报生成中...' });

    try {
      const qrRes = await app.request({
        url: '/api/qrcode',
        method: 'GET',
        data: { scene: this.data.shareId || this.data.id },
      });

      if (!qrRes.data || !qrRes.data.qrcode) {
        throw new Error('生成小程序码失败');
      }

      const posterPath = await this.renderPoster(record.imageUrl, qrRes.data.qrcode);

      this.setData({
        posterPreviewPath: posterPath,
        showPosterPreview: true,
        showPosterSheet: false,
      });
      wx.hideLoading();
    } catch (err) {
      console.error('生成海报失败', err);
      wx.hideLoading();
      wx.showToast({ title: '生成失败，请重试', icon: 'none' });
    } finally {
      this.setData({ isGeneratingPoster: false });
    }
  },

  renderPoster: async function (imageUrls, qrcodeDataUrl) {
    const canvasInfo = await this.getPosterCanvas();
    const canvas = canvasInfo.canvas;
    const ctx = canvasInfo.ctx;
    const width = canvasInfo.width;
    const height = canvasInfo.height;

    ctx.clearRect(0, 0, width, height);

    const sources = Array.isArray(imageUrls) ? imageUrls.slice(0, 4) : [];
    const photos = [];
    for (let i = 0; i < sources.length; i += 1) {
      const path = await this.fetchImagePath(sources[i]);
      const img = await this.loadCanvasImage(canvas, path);
      photos.push(img);
    }
    const qrcodeImg = await this.loadCanvasImage(canvas, qrcodeDataUrl);

    this.drawPosterByStyle(ctx, {
      width: width,
      height: height,
      photos: photos,
      qrcodeImg: qrcodeImg,
      styleKey: this.data.currentPosterStyle,
    });

    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas: canvas,
        fileType: 'jpg',
        quality: 1,
        destWidth: 1080,
        destHeight: 2220,
        success: (res) => resolve(res.tempFilePath),
        fail: reject,
      });
    });
  },

  getPosterCanvas: function () {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          reject(new Error('poster canvas not found'));
          return;
        }
        const canvas = res[0].node;
        const width = res[0].width;
        const height = res[0].height;
        const dpr = wx.getSystemInfoSync().pixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx.setTransform) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        } else {
          ctx.scale(dpr, dpr);
        }

        resolve({ canvas: canvas, ctx: ctx, width: width, height: height });
      });
    });
  },

  fetchImagePath: function (src) {
    return new Promise((resolve) => {
      wx.getImageInfo({
        src: src,
        success: (res) => resolve(res.path || src),
        fail: () => resolve(src),
      });
    });
  },

  loadCanvasImage: function (canvas, src) {
    return new Promise((resolve, reject) => {
      const img = canvas.createImage();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image load fail'));
      img.src = src;
    });
  },

  drawPosterByStyle: function (ctx, options) {
    if (options.styleKey === 'film') {
      this.drawPosterFilm(ctx, options);
      return;
    }
    if (options.styleKey === 'mag') {
      this.drawPosterMag(ctx, options);
      return;
    }
    this.drawPosterSpark(ctx, options);
  },

  drawPosterSpark: function (ctx, options) {
    const width = options.width;
    const height = options.height;
    const photos = options.photos;
    const qrcodeImg = options.qrcodeImg;
    const theme = this.data.theme;

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, theme.bgGradient[0]);
    bg.addColorStop(0.45, theme.bgGradient[1]);
    bg.addColorStop(1, theme.bgGradient[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    if (photos[0]) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      this.drawCoverImage(ctx, photos[0], 0, 0, width, height);
      ctx.restore();
    }

    ctx.globalAlpha = 0.24;
    ctx.fillStyle = theme.blobs[0];
    this.drawRoundRectPath(ctx, -40, -40, 220, 160, 80);
    ctx.fill();
    ctx.fillStyle = theme.blobs[2];
    this.drawRoundRectPath(ctx, 220, 20, 180, 120, 70);
    ctx.fill();
    ctx.fillStyle = theme.blobs[1];
    this.drawRoundRectPath(ctx, -30, 460, 180, 170, 60);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px sans-serif';
    ctx.fillText('MEAL', 18, 48);
    ctx.fillText('VIBES', 18, 84);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(this.data.formattedTime.full, 20, 106);

    this.drawPhotoOrPlaceholder(ctx, photos[0], 20, 122, 216, 258, 26, '主图');
    this.drawPhotoOrPlaceholder(ctx, photos[1], 246, 122, 94, 122, 18, '加餐');
    this.drawPhotoOrPlaceholder(ctx, photos[2], 246, 258, 94, 122, 18, '细节');
    this.drawPhotoOrPlaceholder(ctx, photos[3], 20, 394, 320, 166, 24, '拼贴');

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    this.drawRoundRectPath(ctx, 20, 576, 320, 144, 24);
    ctx.fill();

    ctx.fillStyle = '#2c241f';
    ctx.font = '700 20px sans-serif';
    const title = (this.data.record && this.data.record.title) || '这顿饭值得记录';
    this.drawWrappedText(ctx, title, 34, 614, 208, 2, 27);

    ctx.fillStyle = '#7f6655';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${this.data.mealTypeInfo.emoji} ${this.data.mealTypeInfo.label}`, 34, 672);

    this.drawRoundedImage(ctx, qrcodeImg, 266, 600, 58, 58, 12);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#7f6655';
    ctx.textAlign = 'center';
    ctx.fillText('扫码看同款', 295, 680);
    ctx.textAlign = 'start';
  },

  drawPosterFilm: function (ctx, options) {
    const width = options.width;
    const height = options.height;
    const photos = options.photos;
    const qrcodeImg = options.qrcodeImg;
    const theme = this.data.theme;

    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, width, height);

    const stripWidth = 330;
    const stripX = (width - stripWidth) / 2;
    ctx.fillStyle = '#0a0a0a';
    this.drawRoundRectPath(ctx, stripX, 20, stripWidth, height - 40, 24);
    ctx.fill();

    for (let i = 0; i < 16; i += 1) {
      const y = 38 + i * 40;
      ctx.fillStyle = '#363636';
      ctx.fillRect(stripX + 12, y, 9, 14);
      ctx.fillRect(stripX + stripWidth - 21, y, 9, 14);
    }

    const frameList = [
      { x: stripX + 36, y: 58, w: 258, h: 170, rotate: -0.03, label: 'FRAME 01' },
      { x: stripX + 36, y: 246, w: 258, h: 170, rotate: 0.02, label: 'FRAME 02' },
      { x: stripX + 36, y: 434, w: 258, h: 170, rotate: -0.015, label: 'FRAME 03' },
    ];

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 11px sans-serif';
    frameList.forEach((frame, idx) => {
      ctx.save();
      ctx.translate(frame.x + frame.w / 2, frame.y + frame.h / 2);
      ctx.rotate(frame.rotate);
      ctx.translate(-(frame.x + frame.w / 2), -(frame.y + frame.h / 2));

      ctx.fillStyle = '#262626';
      this.drawRoundRectPath(ctx, frame.x - 7, frame.y - 7, frame.w + 14, frame.h + 14, 14);
      ctx.fill();

      const photo = photos[idx];
      this.drawPhotoOrPlaceholder(ctx, photo, frame.x, frame.y, frame.w, frame.h, 10, frame.label);
      ctx.restore();
    });

    ctx.fillStyle = '#f5f5f5';
    ctx.font = '700 24px sans-serif';
    ctx.fillText('FILM LOG', stripX + 34, 644);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#bbbbbb';
    ctx.fillText(this.data.formattedTime.full, stripX + 34, 664);

    this.drawRoundedImage(ctx, qrcodeImg, stripX + stripWidth - 98, 626, 60, 60, 10);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(stripX + 34, 676, 88, 5);
  },

  drawPosterMag: function (ctx, options) {
    const width = options.width;
    const height = options.height;
    const photos = options.photos;
    const qrcodeImg = options.qrcodeImg;
    const theme = this.data.theme;

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#191514');
    bg.addColorStop(0.48, '#2b2320');
    bg.addColorStop(1, '#362a26');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = theme.accent;
    this.drawRoundRectPath(ctx, 14, 16, 332, 150, 24);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 32px sans-serif';
    ctx.fillText('FOOD', 28, 66);
    ctx.fillText('COVER', 28, 102);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(this.data.formattedTime.displayDate, 28, 132);

    this.drawPhotoOrPlaceholder(ctx, photos[0], 20, 178, 218, 262, 24, '主视觉');
    this.drawPhotoOrPlaceholder(ctx, photos[1], 246, 178, 94, 126, 18, 'NO.2');
    this.drawPhotoOrPlaceholder(ctx, photos[2], 246, 314, 94, 126, 18, 'NO.3');
    this.drawPhotoOrPlaceholder(ctx, photos[3], 20, 452, 320, 132, 20, 'NO.4');

    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    this.drawRoundRectPath(ctx, 20, 596, 320, 124, 22);
    ctx.fill();

    ctx.fillStyle = '#1f1f1f';
    ctx.font = '700 20px sans-serif';
    const title = (this.data.record && this.data.record.title) || '我的打卡';
    this.drawWrappedText(ctx, title, 34, 636, 200, 2, 26);

    ctx.fillStyle = theme.accent;
    ctx.font = '12px sans-serif';
    ctx.fillText(`${this.data.mealTypeInfo.emoji} ${this.data.mealTypeInfo.label}`, 34, 694);
    this.drawRoundedImage(ctx, qrcodeImg, 270, 622, 56, 56, 10);
  },

  drawRoundedImage: function (ctx, img, x, y, w, h, r) {
    ctx.save();
    this.drawRoundRectPath(ctx, x, y, w, h, r);
    ctx.clip();
    this.drawCoverImage(ctx, img, x, y, w, h);
    ctx.restore();
  },

  drawCoverImage: function (ctx, img, x, y, w, h) {
    const sourceW = img && img.width ? img.width : 0;
    const sourceH = img && img.height ? img.height : 0;
    if (!sourceW || !sourceH) {
      ctx.drawImage(img, x, y, w, h);
      return;
    }
    const scale = Math.max(w / sourceW, h / sourceH);
    const drawW = sourceW * scale;
    const drawH = sourceH * scale;
    const drawX = x + (w - drawW) / 2;
    const drawY = y + (h - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  },

  drawPhotoOrPlaceholder: function (ctx, photo, x, y, w, h, r, label) {
    if (photo) {
      this.drawRoundedImage(ctx, photo, x, y, w, h, r);
      return;
    }
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, 'rgba(255,255,255,0.22)');
    gradient.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = gradient;
    this.drawRoundRectPath(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.2;
    this.drawRoundRectPath(ctx, x + 1, y + 1, w - 2, h - 2, r);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label || '待补图', x + w / 2, y + h / 2 + 4);
    ctx.textAlign = 'start';
  },

  drawRoundRectPath: function (ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  },

  drawWrappedText: function (ctx, text, x, y, maxWidth, maxLine, lineHeight) {
    const chars = String(text || '').split('');
    const lines = [];
    let line = '';
    let truncated = false;

    for (let i = 0; i < chars.length; i += 1) {
      const testLine = line + chars[i];
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = chars[i];
        if (lines.length >= maxLine) {
          truncated = true;
          break;
        }
      } else {
        line = testLine;
      }
    }

    if (!truncated && line && lines.length < maxLine) {
      lines.push(line);
    } else if (!truncated && lines.length >= maxLine) {
      truncated = true;
    }

    if (truncated && lines.length > 0) {
      let last = lines[maxLine - 1] || '';
      if (!last) last = line || '';
      while (last.length > 0 && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLine - 1] = `${last}…`;
    }

    lines.slice(0, maxLine).forEach((item, idx) => {
      ctx.fillText(item, x, y + idx * lineHeight);
    });
  },

  onClosePosterPreview: function () {
    this.setData({ showPosterPreview: false });
  },

  onBackToStyleSheet: function () {
    this.setData({
      showPosterPreview: false,
      showPosterSheet: true,
    });
  },

  onSavePosterPreview: function () {
    const filePath = this.data.posterPreviewPath;
    if (!filePath) {
      wx.showToast({ title: '请先生成海报', icon: 'none' });
      return;
    }
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

  onDeleteTap: function () {
    if (!this.data.isOwner) {
      wx.showToast({ title: '只能删除自己的记录', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '删除这顿饭记录？',
      confirmColor: '#ff4d4f',
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
      }, 900);
    } catch (err) {
      console.error('删除失败', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  onShareAppMessage: function () {
    const record = this.data.record;
    const shareParam = this.data.shareId || (record && record.shareId);
    const path = shareParam
      ? `/pages/detail/detail?shareId=${shareParam}`
      : `/pages/detail/detail?id=${this.data.id}`;
    return {
      title: (record && record.title) || '好好吃饭',
      path: path,
      imageUrl: pickRandomShareCard(),
    };
  },

  onShareTimeline: function () {
    const record = this.data.record;
    const shareParam = this.data.shareId || (record && record.shareId);
    return {
      title: (record && record.title) || '好好吃饭',
      query: shareParam ? `shareId=${shareParam}` : `id=${this.data.id}`,
      imageUrl: pickRandomShareCard(),
    };
  },
});
