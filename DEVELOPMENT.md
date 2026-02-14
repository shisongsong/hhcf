# 本地开发配置

## 1. 微信开发者工具设置

1. 打开微信开发者工具
2. 点击「详情」按钮
3. 选择「本地设置」标签
4. 勾选 ✅ **「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」**

## 2. 获取本机局域网IP

```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1
```

输出示例：
```
inet 192.168.1.100 netmask 0xffffff00 broadcast 192.168.1.255
```

## 3. 修改小程序配置

编辑 `miniprogram/app.js`，将IP改成你的局域网IP：

```javascript
apiBase: 'http://192.168.x.x:3000',  // 替换为你的IP
```

## 4. 确保电脑防火墙允许3000端口

```bash
# macOS
sudo lsof -i :3000
```

## 5. 重启服务器

```bash
cd server
npm start
```

## 6. 重新编译小程序

在微信开发者工具中点击「编译」按钮。

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 上传返回HTML | 开启「不校验合法域名」 |
| 连接超时 | 检查IP是否正确，防火墙是否放行 |
| 端口被占用 | `lsof -ti:3000 | xargs kill -9` |
