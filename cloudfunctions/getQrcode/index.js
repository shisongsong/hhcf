const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event, context) => {
  try {
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: event.recordId,
      page: 'pages/detail/detail',
      width: 280,
      checkPath: true,
      envVersion: 'release',
    });
    return {
      buffer: result.buffer,
      contentType: result.contentType,
    };
  } catch (err) {
    console.error('生成小程序码失败', err);
    return {
      error: err.message || '生成小程序码失败',
    };
  }
};
