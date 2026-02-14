# 微信小程序自动发布配置

## 准备工作

### 1. 获取微信小程序CI密钥
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入小程序管理后台 → 开发管理 → 开发设置
3. 找到"小程序代码上传密钥"，点击"生成"
4. 下载密钥文件，保存为 `private.key`
5. 复制密钥内容

### 2. 配置GitHub Secrets
在你的GitHub仓库中依次添加以下Secrets：

| Secret名称 | 说明 | 示例 |
|-----------|------|------|
| APPID | 小程序AppID | wx562e5e15550c776e |
| PRIVATE_KEY | 下载的私钥内容 | -----BEGIN RSA PRIVATE KEY-----... |
| USER_VERSION | 版本号描述 | v1.0.0 |

### 3. 初始化Git并推送

```bash
# 添加所有文件
git add -A

# 提交
git commit -m "feat: 初始化项目"

# 关联GitHub仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/好好吃饭.git

# 推送
git push -u origin main
```

## 自动发布流程

每次推送到 `main` 分支时：
1. GitHub Actions 自动构建
2. 生成预览二维码
3. 自动发布到体验版
4. 版本号格式：`CI-{run_number}`

## 查看结果

1. 打开GitHub仓库的Actions页面查看构建状态
2. 体验版发布成功后，微信开发者工具会收到通知
3. 在手机微信扫描二维码即可体验

## 注意事项

- 体验版需要先在微信公众平台配置体验成员
- 每次发布会覆盖之前的体验版
- CI密钥有效期为90天，过期需要重新生成
