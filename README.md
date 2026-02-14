# 好好吃饭 - 吃饭打卡小程序

## 技术架构

- **前端**：微信小程序原生
- **后端**：Node.js + Express
- **存储**：七牛云对象存储
- **数据库**：LowDB（JSON 文件存储，可替换为 MySQL/PostgreSQL）

## 项目结构

```
好好吃饭/
├── server/                    # 后端服务
│   ├── index.js              # Express 主入口
│   ├── package.json          # 依赖配置
│   ├── .env.example          # 环境变量示例
│   └── db.json               # 数据库文件（启动后生成）
├── miniprogram/              # 小程序前端
│   ├── components/           # 组件
│   ├── pages/                # 页面
│   ├── utils/                # 工具函数
│   ├── app.js                # 应用入口
│   ├── app.json              # 配置
│   └── app.wxss              # 全局样式
├── tests/
│   └── images/               # 测试图片
└── project.config.json       # 项目配置
```

## 快速开始

### 1. 配置七牛云

在 `server/.env` 中配置七牛云信息：

```env
QINIU_ACCESS_KEY=your-access-key
QINIU_SECRET_KEY=your-secret-key
QINIU_BUCKET=your-bucket-name
QINIU_DOMAIN=https://your-domain.qiniup.com
```

### 2. 启动后端服务

```bash
cd server
npm install
cp .env.example .env
# 编辑 .env 配置七牛云信息
npm start
```

后端服务运行在 `http://localhost:3000`

### 3. 配置小程序

修改 `miniprogram/app.js` 中的 API 地址：

```javascript
apiBase: 'https://your-api-domain.com',  // 替换为你的服务器地址
```

### 4. 微信开发者工具

1. 新建小程序项目，选择 `miniprogram/` 目录
2. 修改 `project.config.json` 中的 `appid`
3. 编译运行

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/login` | POST | 用户登录 |
| `/api/records` | GET | 获取记录列表 |
| `/api/records` | POST | 创建记录 |
| `/api/records/:id` | GET | 获取单条记录 |
| `/api/records/:id` | DELETE | 删除记录 |
| `/api/upload` | POST | 上传图片到七牛云 |
| `/api/qrcode` | GET | 生成小程序码 |

## 数据库字段

集合名：`records`

```json
{
  "id": "uuid",
  "openid": "用户标识",
  "imageUrl": "七牛云图片地址",
  "mealType": "breakfast|lunch|dinner|snack",
  "title": "午餐打卡",
  "timestamp": 1709312400000,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## 测试图片

在 `tests/images/` 目录下放入测试图片：
- breakfast_1.jpg ~ breakfast_3.jpg (3张早餐图)
- lunch_1.jpg ~ lunch_3.jpg (3张午餐图)
- dinner_1.jpg ~ dinner_3.jpg (3张晚餐图)
- snack_1.jpg (1张加餐图)

## 部署

### 生产环境

1. 使用 PM2 启动后端服务：
```bash
npm install -g pm2
pm2 start index.js
```

2. 配置 Nginx 反向代理
3. 申请 HTTPS 证书
4. 在小程序后台配置服务器域名
