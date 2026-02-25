App({
  onLaunch: function () {
    this.checkPrivacyAgreement();
    this.checkLoginStatus();
    this.checkApiConnection();
  },
  globalData: {
    userInfo: null,
    privacyAgreed: false,
    token: null,
    apiBase: 'https://hhcf-api.openanthropic.com',
    apiConnected: false,
  },
  checkApiConnection: function() {
    return new Promise((resolve) => {
      wx.request({
        url: `${this.globalData.apiBase}/api/health`,
        method: 'GET',
        timeout: 5000,
        success: (res) => {
          this.globalData.apiConnected = true;
          resolve(true);
        },
        fail: () => {
          this.globalData.apiConnected = false;
          wx.showModal({
            title: '连接失败',
            content: '无法连接到服务器，请检查网络后重启小程序',
            showCancel: false,
          });
          resolve(false);
        },
      });
    });
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
      const doRequest = () => {
        wx.request({
          ...options,
          header,
          url: `${this.globalData.apiBase}${options.url}`,
          success: (res) => {
            if (res.data.success) {
              resolve(res.data);
            } else if (res.data.error === '未登录' || res.data.error === 'token无效') {
              this.login().then(() => {
                header['Authorization'] = `Bearer ${this.getToken()}`;
                wx.request({
                  ...options,
                  header,
                  url: `${this.globalData.apiBase}${options.url}`,
                  success: (retryRes) => {
                    if (retryRes.data.success) {
                      resolve(retryRes.data);
                    } else {
                      reject(new Error(retryRes.data.error || '请求失败'));
                    }
                  },
                  fail: reject,
                });
              }).catch(reject);
            } else {
              reject(new Error(res.data.error || '请求失败'));
            }
          },
          fail: reject,
        });
      };
      doRequest();
    });
  },
});
