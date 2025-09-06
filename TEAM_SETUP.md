# 🚀 YangZhen图床 - 使用和团队分享指南

## 📋 使用指南

### 1. **个人使用**
- 访问您的图床网站
- 使用密码 `yang` 登录
- 上传图片并获取链接

### 2. **部署步骤**

#### 后端部署 (Cloudflare Workers)
```bash
cd E:\WorkSpace\cloudflare-r2-image-bed\worker
wrangler deploy
```

#### 前端部署 (Cloudflare Pages)  
```bash
cd E:\WorkSpace\cloudflare-r2-image-bed\frontend
wrangler pages deploy . --project-name yangzhen-image-bed
```

---

## 👥 团队分享方案

### 方案一：共享密码 (适合小团队 3-5人)

**优点**: 简单易用，立即可用
**缺点**: 无法区分用户，安全性较低

**配置方法**:
```bash
# 修改为团队密码
wrangler secret put UPLOAD_PASSWORD
# 输入: team2024
```

### 方案二：多用户系统 (推荐，已实现)

**优点**: 用户区分，更安全，支持管理
**缺点**: 需要配置用户

**配置方法**:
```bash
# 设置多用户配置
wrangler secret put UPLOAD_USERS
# 输入格式: admin:yang,user1:pass1,user2:pass2,designer:design123
```

**登录方式**:
1. **用户名+密码**: 在用户名框输入用户名，密码框输入对应密码
2. **仅密码**: 留空用户名，直接输入密码（兼容模式）

**示例用户配置**:
```
admin:yang,张三:zhang123,李四:li456,设计师:design789
```

### 方案三：域名分发

**为团队成员提供专用访问链接**:
- 主管理员: `https://yangzhen-image-bed.pages.dev`
- 团队成员: `https://your-custom-domain.com`

---

## 🔧 高级配置

### 1. **自定义域名**
在Cloudflare Pages中绑定自定义域名：
- 进入Pages项目设置
- 添加自定义域名
- 配置DNS记录

### 2. **存储配置**
在Cloudflare R2中：
- 存储桶名称: `image-bed`
- 免费额度: 10GB
- 每月免费请求: 100万次

### 3. **安全设置**
```bash
# 设置上传大小限制 (MB)
wrangler secret put MAX_FILE_SIZE
# 输入: 50

# 设置允许的域名
wrangler secret put ALLOWED_ORIGINS
# 输入: https://yourdomain.com,https://your-team-site.com
```

---

## 📱 使用技巧

### 1. **批量上传**
- 支持同时拖拽多个图片
- 自动生成所有格式链接

### 2. **链接格式**
- **直链**: 直接访问图片URL
- **Markdown**: `![图片](URL)` - 适用于GitHub、博客
- **HTML**: `<img src="URL" alt="图片" />` - 适用于网页

### 3. **历史记录**
- 本地存储最近50张图片
- 支持快速复制各种格式
- 支持删除记录

---

## 🛠️ 故障排除

### 常见问题

1. **"访问被拒绝"**
   - 检查密码是否正确
   - 确认token未过期（24小时）

2. **上传失败**
   - 检查文件大小（最大50MB）
   - 确认文件类型（JPG/PNG/GIF/WebP/SVG）

3. **无法访问图片**
   - 检查R2存储桶配置
   - 确认Worker部署成功

### 重新部署
```bash
# 更新后端
cd worker && wrangler deploy

# 更新前端  
cd frontend && wrangler pages deploy . --project-name yangzhen-image-bed
```

---

## 📞 技术支持

如遇问题，请检查：
1. Cloudflare Workers日志
2. 浏览器开发者工具Console
3. 网络连接状态

**项目特色**:
- ✅ Apple风格UI设计
- ✅ 绿色主题配色
- ✅ 支持多用户系统
- ✅ 响应式设计
- ✅ 拖拽上传支持
- ✅ 多格式链接生成
- ✅ 历史记录管理