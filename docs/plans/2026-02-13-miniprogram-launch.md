# 好好吃饭小程序上线完善计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成PRD验收清单剩余项，使小程序达到上线标准

**Architecture:** 微信小程序 + Express后端 + 七牛云存储

**Tech Stack:** 微信小程序原生, Node.js/Express, LowDB, 七牛云

---

## 待完成任务分析

根据PRD验收清单，已完成：
- ✅ 智能餐别按时间段精准匹配，修改后标题联动更新
- ✅ 回顾页⋮图标仅右上角可见，点击弹出菜单无卡顿
- ✅ 筛选后顶部提示条清晰，[重置]按钮功能正常
- ✅ 删除操作仅在全屏预览页出现，且需二次确认
- ✅ 隐私协议首次打开强制阅读+同意

待完成：
- ❌ 3种海报风格生成正确，小程序码扫码直达该记录（仅完成1种）
- ❌ 所有分享链接含参数校验，非本人无法访问（API层需添加openid校验）

---

## Task 1: 添加海报风格选择功能

**Files:**
- Modify: `miniprogram/pages/detail/detail.js:106-200`
- Modify: `miniprogram/pages/detail/detail.wxml`

**Step 1: 添加海报风格选项**

修改 detail.js 中的 onSavePoster 函数，添加风格选择：

```javascript
onSavePoster: function () {
  if (!this.data.isOwner) {
    wx.showToast({ title: '只能分享自己的记录', icon: 'none' });
    return;
  }

  const styles = [
    { name: '简约白', key: 'simple' },
    { name: '时光灰', key: 'time' },
    { name: '手写暖', key: 'warm' },
  ];

  wx.showActionSheet({
    itemList: styles.map(s => s.name),
    success: (res) => {
      const selectedStyle = styles[res.tapIndex];
      this.setData({ currentPosterStyle: selectedStyle.key });
      this.generatePoster();
    },
  });
},
```

**Step 2: 修改 drawPoster 支持不同风格**

在 detail.js 中，根据 this.data.currentPosterStyle 绘制不同风格：

```javascript
drawPoster: function (imageUrl, qrcodeDataUrl, mealTypeInfo, formattedTime, recordId) {
  const style = this.data.currentPosterStyle || 'simple';
  // 根据style绘制不同海报
  // simple: 简约白 - 白色背景，饭照居中
  // time: 时光灰 - 渐变背景，显示日期
  // warm: 手写暖 - 米色背景，手写体文案
}
```

---

## Task 2: API层添加openid校验

**Files:**
- Modify: `server/index.js:140-149`

**Step 1: 修改GET /api/records/:id 添加openid校验**

```javascript
app.get('/api/records/:id', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const openid = verifyToken(token);
  if (!openid) return res.status(401).json({ error: '未登录' });

  const record = db.get('records').find({ id: req.params.id }).value();
  if (!record) return res.status(404).json({ error: '记录不存在' });

  // 添加openid校验：返回时标记是否属于当前用户
  res.json({ 
    success: true, 
    data: { 
      ...record,
      isOwner: record.openid === openid 
    } 
  });
});
```

---

## Task 3: 前端适配API返回

**Files:**
- Modify: `miniprogram/pages/detail/detail.js:26-69`

**Step 1: 适配新的API返回结构**

```javascript
loadRecord: async function (id) {
  // ...
  const record = res.data;
  const isOwner = record.isOwner; // 直接使用API返回的isOwner
  // ...
},
```

---

## Task 4: 验证与测试

**Step 1: 测试海报生成**

1. 在微信开发者工具中编译
2. 创建一条记录
3. 进入详情页
4. 点击海报按钮，选择不同风格
5. 验证三种风格都能正常生成并保存到相册

**Step 2: 测试权限校验**

1. 用用户A创建记录
2. 用用户B访问该记录ID
3. 验证用户B无法查看（返回错误或无权限）

---

## 执行方式

**选择执行方式：**

1. **Subagent-Driven (当前会话)** - 每个任务分配给子代理，任务间审查，快速迭代
2. **Parallel Session (独立会话)** - 在新会话中批量执行

请选择你希望的执行方式。
