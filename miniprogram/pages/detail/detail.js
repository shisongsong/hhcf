const app = getApp();
const { formatTime } = require('../../utils/util');
const { getMealTypeInfo } = require('../../utils/meal');
const { getTimeTheme, applyTabBarTheme, applyNavigationTheme } = require('../../utils/theme');

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
    theme: getTimeTheme(),
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
    const theme = getTimeTheme();
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
    bg.addColorStop(0.52, theme.bgGradient[1]);
    bg.addColorStop(1, theme.bgGradient[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = theme.blobs[0];
    ctx.beginPath();
    ctx.arc(width - 20, 60, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.blobs[1];
    ctx.beginPath();
    ctx.arc(30, 360, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = theme.textPrimary;
    ctx.font = '700 20px sans-serif';
    ctx.fillText('今天吃得真不错', 20, 42);
    ctx.fillStyle = theme.textSecondary;
    ctx.font = '13px sans-serif';
    ctx.fillText(this.data.formattedTime.full, 20, 62);

    const fallback = '#F5F5F5';
    ctx.fillStyle = fallback;

    if (photos[0]) this.drawRoundedImage(ctx, photos[0], 20, 88, 220, 238, 24);
    if (photos[1]) this.drawRoundedImage(ctx, photos[1], 250, 88, 90, 114, 18);
    if (photos[2]) this.drawRoundedImage(ctx, photos[2], 250, 212, 90, 114, 18);
    if (photos[3]) {
      this.drawRoundedImage(ctx, photos[3], 20, 336, 320, 130, 22);
    } else if (photos[1]) {
      this.drawRoundedImage(ctx, photos[1], 20, 336, 320, 130, 22);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    this.drawRoundRectPath(ctx, 20, 486, 320, 136, 24);
    ctx.fill();

    ctx.fillStyle = theme.textPrimary;
    ctx.font = '600 18px sans-serif';
    const title = (this.data.record && this.data.record.title) || '这顿饭值得记录';
    this.drawWrappedText(ctx, title, 36, 520, 210, 2, 26);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = theme.textSecondary;
    ctx.fillText(`${this.data.mealTypeInfo.emoji} ${this.data.mealTypeInfo.label}`, 36, 578);

    this.drawRoundedImage(ctx, qrcodeImg, 270, 510, 56, 56, 12);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = theme.textSecondary;
    ctx.textAlign = 'center';
    ctx.fillText('扫码看同款', 298, 584);
    ctx.textAlign = 'start';
  },

  drawPosterFilm: function (ctx, options) {
    const width = options.width;
    const height = options.height;
    const photos = options.photos;
    const qrcodeImg = options.qrcodeImg;
    const theme = this.data.theme;

    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    const stripWidth = 320;
    const stripX = (width - stripWidth) / 2;
    ctx.fillStyle = '#111';
    this.drawRoundRectPath(ctx, stripX, 26, stripWidth, height - 52, 22);
    ctx.fill();

    for (let i = 0; i < 14; i += 1) {
      const y = 44 + i * 42;
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(stripX + 12, y, 10, 14);
      ctx.fillRect(stripX + stripWidth - 22, y, 10, 14);
    }

    const frameList = [
      { x: stripX + 34, y: 64, w: 252, h: 154 },
      { x: stripX + 34, y: 238, w: 252, h: 154 },
      { x: stripX + 34, y: 412, w: 252, h: 154 },
    ];
    frameList.forEach((frame, idx) => {
      ctx.fillStyle = '#222';
      this.drawRoundRectPath(ctx, frame.x - 6, frame.y - 6, frame.w + 12, frame.h + 12, 14);
      ctx.fill();
      const photo = photos[idx] || photos[0];
      if (photo) {
        this.drawRoundedImage(ctx, photo, frame.x, frame.y, frame.w, frame.h, 10);
      }
    });

    ctx.fillStyle = '#f1f1f1';
    ctx.font = '700 20px sans-serif';
    ctx.fillText('FILM DINNER LOG', stripX + 34, 610);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#bdbdbd';
    ctx.fillText(this.data.formattedTime.full, stripX + 34, 630);

    this.drawRoundedImage(ctx, qrcodeImg, stripX + stripWidth - 90, 588, 56, 56, 10);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(stripX + 34, 646, 74, 5);
  },

  drawPosterMag: function (ctx, options) {
    const width = options.width;
    const height = options.height;
    const photos = options.photos;
    const qrcodeImg = options.qrcodeImg;
    const theme = this.data.theme;

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#111111');
    bg.addColorStop(0.4, '#212121');
    bg.addColorStop(1, '#2f2f2f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px sans-serif';
    ctx.fillText('MEAL', 20, 54);
    ctx.font = '700 34px sans-serif';
    ctx.fillText('STORY', 20, 90);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#d0d0d0';
    ctx.fillText(this.data.formattedTime.displayDate, 22, 112);

    if (photos[0]) this.drawRoundedImage(ctx, photos[0], 20, 130, 320, 240, 28);
    if (photos[1]) this.drawRoundedImage(ctx, photos[1], 20, 384, 154, 118, 20);
    if (photos[2]) this.drawRoundedImage(ctx, photos[2], 186, 384, 154, 118, 20);
    if (photos[3]) this.drawRoundedImage(ctx, photos[3], 20, 514, 320, 96, 20);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    this.drawRoundRectPath(ctx, 20, 622, 320, 106, 22);
    ctx.fill();

    ctx.fillStyle = '#1f1f1f';
    ctx.font = '700 17px sans-serif';
    const title = (this.data.record && this.data.record.title) || '我的打卡';
    this.drawWrappedText(ctx, title, 34, 650, 200, 2, 24);

    ctx.fillStyle = theme.accent;
    ctx.font = '12px sans-serif';
    ctx.fillText(`${this.data.mealTypeInfo.emoji} ${this.data.mealTypeInfo.label}`, 34, 700);
    this.drawRoundedImage(ctx, qrcodeImg, 274, 640, 52, 52, 10);
  },

  drawRoundedImage: function (ctx, img, x, y, w, h, r) {
    ctx.save();
    this.drawRoundRectPath(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
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
    };
  },

  onShareTimeline: function () {
    const record = this.data.record;
    const shareParam = this.data.shareId || (record && record.shareId);
    return {
      title: (record && record.title) || '好好吃饭',
      query: shareParam ? `shareId=${shareParam}` : `id=${this.data.id}`,
    };
  },
});
