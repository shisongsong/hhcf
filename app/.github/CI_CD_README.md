# 好好吃饭 App CI/CD 配置

## 概述

GitHub Actions 自动构建 Android 和 iOS 应用。

## 构建触发条件

- push 到 main 分支
- pull request 到 main 分支
- 手动触发 workflow_dispatch

## Android 构建

### Debug 构建
自动构建，无需配置。

### Release 构建
需要配置以下 Secrets：

| Secret | 说明 |
|--------|------|
| `ANDROID_RELEASE_STORE_BASE64` | Keystore 文件 Base64 编码 |
| `ANDROID_RELEASE_KEY_ALIAS` | Key 别名 |
| `ANDROID_RELEASE_STORE_PASSWORD` | Keystore 密码 |
| `ANDROID_RELEASE_KEY_PASSWORD` | Key 密码 |

### 生成 Keystore
```bash
keytool -genkey -v -keystore app-release.keystore -alias your-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### 获取 Base64
```bash
base64 app-release.keystore
```

## iOS 构建

### Debug 构建
自动构建，使用临时签名。

### Release 构建
需要配置以下 Secrets：

| Secret | 说明 |
|--------|------|
| `IOS_CERTIFICATES_BASE64` | iOS 证书 (.p12) Base64 编码 |
| `IOS_PROVISIONING_PROFILE_BASE64` | 描述文件 Base64 编码 |
| `IOS_CERT_PASSWORD` | 证书密码 |
| `KEYCHAIN_PASSWORD` | Keychain 密码 |
| `CODE_SIGN_IDENTITY` | 签名证书名称 (如 "Apple Distribution: xxx") |
| `PROVISIONING_PROFILE_NAME` | 描述文件名称 |

## 生成 iOS 证书

1. 在 Apple Developer 平台创建 App ID
2. 创建 Distribution 证书
3. 创建描述文件 (App Store Distribution)
4. 导出证书为 .p12 格式
5. 获取 Base64:
   ```bash
   base64 -w 0 certificates.p12
   base64 -w 0 provisioning-profile.mobileprovision
   ```

## 在 GitHub 设置 Secrets

1. 打开仓库 Settings → Secrets and variables → Actions
2. 添加上述 Secrets

## 构建产物

- Android: `app/android/app/build/outputs/apk/debug/app-debug.apk`
- iOS: 需使用 Xcode 或 Transporter 上传

## 本地构建

```bash
cd app

# Android
npm run build:android

# iOS (需要 macOS)
npx expo run:ios
```
