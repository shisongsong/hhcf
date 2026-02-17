const app = getApp();
const { getTimeTheme, applyTabBarTheme } = require('../../utils/theme');

Page({
  data: {
    theme: getTimeTheme(),
    agreement: `
      隐私协议

      感谢使用「好好吃饭」！我们重视您的隐私保护，特此说明：

      1. 数据存储
      - 您的饮食记录存储在自有服务器数据库中
      - 数据与您的账号绑定
      - 我们不会将您的数据用于任何商业分析

      2. 数据安全
      - 所有记录仅您本人可见
      - 分享链接包含唯一标识，但会验证身份
      - 您可随时删除自己的记录

      3. 权限使用
      - 相机/相册权限：用于拍照打卡
      - 存储权限：保存海报到相册

      4. 您的权利
      - 可随时在 app 内删除所有记录
      - 卸载小程序不会自动删除数据（需手动删除）

      数据永不用于商业分析。

      点击「同意」即表示您已阅读并同意本协议。
    `,
  },

  onLoad: function () {
    this.updateTheme();
  },

  onShow: function () {
    this.updateTheme();
  },

  updateTheme: function () {
    const theme = getTimeTheme();
    this.setData({ theme });
    applyTabBarTheme(theme);
  },

  onDisagree: function () {
    wx.showModal({
      title: '提示',
      content: '需要同意隐私协议才能使用本小程序',
      showCancel: false,
      success: () => {
        wx.exitMiniProgram();
      },
    });
  },

  onAgree: function () {
    wx.setStorageSync('privacyAgreed', true);
    app.globalData.privacyAgreed = true;
    wx.switchTab({
      url: '/pages/index/index',
    });
  },
});
