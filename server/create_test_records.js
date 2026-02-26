const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function createTestRecords() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'hhcf',
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    // 查找已有用户
    const [users] = await pool.execute('SELECT id FROM users LIMIT 1');
    
    if (users.length === 0) {
      console.log('没有用户，请先注册');
      return;
    }

    const openid = users[0].id;
    console.log('使用用户:', openid);

    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    const titles = [
      '今天吃得真香！',
      '美味的一餐',
      '好好吃饭',
      '又是光盘行动',
      '幸福感满满',
      '家常便饭',
      '外卖也吃得开心',
      '自己动手丰衣足食',
    ];

    // 模拟一些图片URL（用占位图）
    const sampleImages = [
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
      'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400',
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      'https://images.unsplash.com/photo-1482049016gy-2d1a58a5a2?w=400',
    ];

    const records = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // 创建过去30天的记录
    for (let i = 0; i < 30; i++) {
      // 每天1-3条记录
      const recordsPerDay = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < recordsPerDay; j++) {
        const id = uuidv4();
        const shareId = uuidv4().replace(/-/g, '');
        const mealType = mealTypes[Math.floor(Math.random() * mealTypes.length)];
        const title = titles[Math.floor(Math.random() * titles.length)];
        const timestamp = now - (i * dayMs) + Math.floor(Math.random() * dayMs);
        
        // 随机选择1-3张图片
        const numImages = Math.floor(Math.random() * 3) + 1;
        const selectedImages = [];
        for (let k = 0; k < numImages; k++) {
          selectedImages.push(sampleImages[Math.floor(Math.random() * sampleImages.length)]);
        }
        
        const imageUrlJson = JSON.stringify(selectedImages);
        
        await pool.execute(
          'INSERT INTO records (id, openid, image_url, meal_type, title, timestamp, share_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?/1000))',
          [id, openid, imageUrlJson, mealType, title, timestamp, shareId, timestamp]
        );
        
        records.push({ id, mealType, title, timestamp });
      }
    }

    console.log(`成功创建 ${records.length} 条测试记录！`);

  } catch (err) {
    console.error('创建失败:', err);
  } finally {
    await pool.end();
  }
}

createTestRecords();
