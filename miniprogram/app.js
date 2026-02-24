App({
  onLaunch: function () {
    this.checkPrivacyAgreement();
    this.checkLoginStatus();
  },
  globalData: {
    userInfo: null,
    privacyAgreed: false,
    token: null,
    apiBase: 'https://hhcf-api.openanthropic.com',
  },
  checkPrivacyAgreement: function () {
    const privacyAgreed = wx.getStorageSync('privacyAgreed');
    if (privacyAgreed) {
      this.globalData.privacyAgreed = true;
    }
  },
  checkLoginStatus: function () {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
    }
  },
  login: function () {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          wx.request({
            url: `${this.globalData.apiBase}/api/login`,
            method: 'POST',
            data: { code: res.code },
            success: (loginRes) => {
              if (loginRes.data.success) {
                this.globalData.token = loginRes.data.token;
                this.globalData.userInfo = { openid: loginRes.data.openid };
                wx.setStorageSync('token', loginRes.data.token);
                wx.setStorageSync('userInfo', this.globalData.userInfo);
                resolve(loginRes.data);
              } else {
                reject(new Error('登录失败'));
              }
            },
            fail: reject,
          });
        },
        fail: reject,
      });
    });
  },
  getToken: function () {
    return this.globalData.token;
  },
  request: function (options) {
    const token = this.getToken();
    const header = {
      ...options.header,
    };
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }
    return new Promise((resolve, reject) => {
      wx.request({
        ...options,
        header,
        url: `${this.globalData.apiBase}${options.url}`,
        success: (res) => {
          if (res.data.success) {
            resolve(res.data);
          } else {
            reject(new Error(res.data.error || '请求失败'));
          }
        },
        fail: reject,
      });
    });
  },
});
