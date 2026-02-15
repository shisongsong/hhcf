const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const qiniu = require('qiniu');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 禁用 API 路由的 ETag 缓存
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('ETag', null);
  next();
});

// MySQL 连接池
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'hhcf',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const qiniuConfig = {
  accessKey: process.env.QINIU_ACCESS_KEY || 'your-access-key',
  secretKey: process.env.QINIU_SECRET_KEY || 'your-secret-key',
  bucket: process.env.QINIU_BUCKET || 'your-bucket',
  domain: process.env.QINIU_DOMAIN || 'https://your-domain.qiniup.com',
};

const mac = new qiniu.auth.digest.Mac(qiniuConfig.accessKey, qiniuConfig.secretKey);
const config = new qiniu.conf.Config();
config.zone = qiniu.zone.Zone_z2;

const upload = multer({ dest: 'uploads/' });

function generateToken(openid) {
  return Buffer.from(JSON.stringify({ openid, timestamp: Date.now() })).toString('base64');
}

function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const data = JSON.parse(decoded);
    if (Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) return null;
    return data.openid;
  } catch {
    return null;
  }
}

function generateShareId() {
  return uuidv4().replace(/-/g, '');
}

app.post('/api/login', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: '缺少 code' });
  }

  const appId = process.env.WECHAT_APPID;
  const appSecret = process.env.WECHAT_APPSECRET;

  console.log('WECHAT_APPID:', appId ? appId + '...' : 'NOT FOUND');
  console.log('WECHAT_APPSECRET:', appSecret ? appSecret : 'NOT FOUND');

  if (!appId || !appSecret) {
    // 如果没有配置微信参数，使用临时标识
    const openid = uuidv4();
    const token = generateToken(openid);
    return res.json({ success: true, openid, token, temp: true });
  }

  try {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
    console.log('请求微信登录 API:', url.replace(appSecret, '***'));
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    const data = await response.json();
    console.log('微信登录响应:', data);

    if (data.errcode) {
      console.error('微信登录失败:', data);
      // 降级使用临时标识
      const openid = uuidv4();
      const token = generateToken(openid);
      return res.json({ success: true, openid, token, temp: true });
    }

    const openid = data.openid;
    const token = generateToken(openid);
    res.json({ success: true, openid, token });
  } catch (err) {
    console.error('登录异常:', err);
    const openid = uuidv4();
    const token = generateToken(openid);
    res.json({ success: true, openid, token, temp: true });
  }
});

app.get('/api/records', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const openid = verifyToken(token);
  if (!openid) return res.status(401).json({ error: '未登录' });

  try {
    const [rows] = await pool.execute(
      'SELECT id, share_id as shareId, openid, image_url, meal_type as mealType, title, timestamp, created_at as createdAt FROM records WHERE openid = ? ORDER BY timestamp DESC',
      [openid]
    );
    const records = [];
    for (const row of rows) {
      const record = {
        ...row,
        imageUrl: row.image_url ? JSON.parse(row.image_url) : []
      };
      if (!record.shareId) {
        record.shareId = generateShareId();
        await pool.execute('UPDATE records SET share_id = ? WHERE id = ?', [record.shareId, record.id]);
      }
      records.push(record);
    }
    res.json({ success: true, data: records });
  } catch (err) {
    console.error('查询记录失败:', err);
    res.status(500).json({ error: '查询失败' });
  }
});

app.post('/api/records', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const openid = verifyToken(token);
  if (!openid) return res.status(401).json({ error: '未登录' });

  const { imageUrls, mealType, title, timestamp } = req.body;
  const id = uuidv4();
  const shareId = generateShareId();
  const now = timestamp || Date.now();
  
  // 存储为 JSON 数组
  const imageUrlJson = JSON.stringify(imageUrls || []);

  try {
    await pool.execute(
      'INSERT INTO records (id, openid, image_url, meal_type, title, timestamp, share_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, openid, imageUrlJson, mealType, title, now, shareId]
    );
    const record = { id, shareId, openid, imageUrls, mealType, title, timestamp: now };
    res.json({ success: true, data: record });
  } catch (err) {
    console.error('创建记录失败:', err);
    res.status(500).json({ error: '创建失败' });
  }
});

app.get('/api/records/:id', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const openid = verifyToken(token);
  if (!openid) return res.status(401).json({ error: '未登录' });

  try {
    const [rows] = await pool.execute(
      'SELECT id, share_id as shareId, openid, image_url, meal_type as mealType, title, timestamp, created_at as createdAt FROM records WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: '记录不存在' });

    const record = {
      ...rows[0],
      imageUrl: rows[0].image_url ? JSON.parse(rows[0].image_url) : []
    };
    
    if (record.openid !== openid) {
      return res.status(403).json({ error: '无权限访问' });
    }

    if (!record.shareId) {
      record.shareId = generateShareId();
      await pool.execute('UPDATE records SET share_id = ? WHERE id = ?', [record.shareId, record.id]);
    }

    res.json({ success: true, data: record });
  } catch (err) {
    console.error('查询记录失败:', err);
    res.status(500).json({ error: '查询失败' });
  }
});

app.get('/api/share/:shareId', async (req, res) => {
  const { shareId } = req.params;
  if (!shareId) return res.status(400).json({ error: '缺少参数' });

  try {
    const [rows] = await pool.execute(
      'SELECT id, share_id as shareId, image_url, meal_type as mealType, title, timestamp, created_at as createdAt FROM records WHERE share_id = ? OR id = ? LIMIT 1',
      [shareId, shareId]
    );
    if (rows.length === 0) return res.status(404).json({ error: '记录不存在' });

    const record = {
      ...rows[0],
      imageUrl: rows[0].image_url ? JSON.parse(rows[0].image_url) : []
    };

    if (!record.shareId) {
      record.shareId = generateShareId();
      await pool.execute('UPDATE records SET share_id = ? WHERE id = ?', [record.shareId, record.id]);
    }

    res.json({ success: true, data: record });
  } catch (err) {
    console.error('查询分享记录失败:', err);
    res.status(500).json({ error: '查询失败' });
  }
});

app.delete('/api/records/:id', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const openid = verifyToken(token);
  if (!openid) return res.status(401).json({ error: '未登录' });

  try {
    const [result] = await pool.execute(
      'DELETE FROM records WHERE id = ? AND openid = ?',
      [req.params.id, openid]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('删除记录失败:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

app.post('/api/upload', upload.array('files', 9), async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const openid = verifyToken(token);
  if (!openid) return res.status(401).json({ error: '未登录' });

  if (!req.files || req.files.length === 0) return res.status(400).json({ error: '没有文件' });

  try {
    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        const key = `eating/${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname) || '.jpg'}`;
        
        const options = {
          scope: `${qiniuConfig.bucket}:${key}`,
        };
        const putPolicy = new qiniu.rs.PutPolicy(options);
        const uploadToken = putPolicy.uploadToken(mac);

        const formUploader = new qiniu.form_up.FormUploader(config);
        const putExtra = new qiniu.form_up.PutExtra();

        formUploader.putFile(uploadToken, key, file.path, putExtra, (err, body, info) => {
          if (err) {
            reject(err);
            return;
          }
          if (info.statusCode === 200) {
            resolve(`${qiniuConfig.domain}/${key}`);
          } else {
            reject(new Error(body));
          }
        });
      });
    });

    const imageUrls = await Promise.all(uploadPromises);
    res.json({ success: true, data: { imageUrls } });
  } catch (err) {
    console.error('上传失败:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/qrcode', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const openid = verifyToken(token);
  if (!openid) return res.status(401).json({ error: '未登录' });

  const { scene } = req.query;
  if (!scene) return res.status(400).json({ error: '缺少参数' });

  try {
    const qrcodeUrl = `https://your-miniprogram.com/pages/detail/detail?shareId=${scene}`;
    const QRCode = require('qrcode');
    const qrcodeDataUrl = await QRCode.toDataURL(qrcodeUrl, { width: 280 });
    res.json({ success: true, data: { qrcode: qrcodeDataUrl } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function ensureShareIdColumn() {
  try {
    const [columns] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'records' AND COLUMN_NAME = 'share_id'"
    );
    if (columns.length === 0) {
      await pool.execute("ALTER TABLE records ADD COLUMN share_id VARCHAR(64) NULL");
      await pool.execute("CREATE INDEX idx_records_share_id ON records (share_id)");
    }
  } catch (err) {
    console.error('初始化 share_id 字段失败:', err);
  }
}

async function startServer() {
  await ensureShareIdColumn();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
  });
}

startServer();
