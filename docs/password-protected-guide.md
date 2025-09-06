# 密码保护图床使用指南

## 🔐 访问信息

### 图床地址
**https://639dc79c.image-bed-frontend.pages.dev**

### 登录密码
**yang**

## 🚀 使用说明

### 1. 首次访问
- 打开图床地址
- 系统会显示登录界面
- 输入密码：`yang`
- 点击"登录"按钮

### 2. 成功登录后
- 登录状态会保存在浏览器本地存储中
- 右上角会显示"退出登录"按钮
- 可以正常使用上传功能

### 3. 上传图片
- **拖拽上传**：直接将图片拖到上传区域
- **点击上传**：点击"点击选择文件"按钮
- **批量上传**：可以一次选择多个图片

### 4. 获取链接
上传完成后可以复制三种格式：
- **直链**：`https://image-bed-worker.yangzhen0806.workers.dev/api/file/xxx`
- **Markdown**：`![filename](url)`
- **HTML**：`<img src="url" alt="filename" />`

### 5. 查看历史
- 在页面下方可以查看上传历史
- 历史记录保存在浏览器本地
- 可以快速复制之前上传的图片链接

## ⚠️ 安全须知

### 密码管理
- 请妥善保管登录密码
- 不要将密码分享给无关人员
- 如需修改密码，请联系管理员

### 使用规范
- 仅上传与工作相关的图片
- 不要上传敏感或私人信息
- 不要上传版权受限的内容
- 合理使用存储空间

### 登录状态
- 登录状态会保存24小时
- 关闭浏览器不会自动退出
- 如在公共电脑使用，请记得点击"退出登录"

## 🔧 技术信息

- **存储空间**：10GB（Cloudflare R2 免费额度）
- **文件大小限制**：50MB/文件
- **支持格式**：JPG、PNG、GIF、WebP、SVG
- **访问速度**：全球CDN加速

## 📞 技术支持

如遇到问题，请提供以下信息：
- 使用的浏览器和版本
- 具体的错误提示
- 操作步骤描述

## 🆙 高级功能

### API 接口
如需程序化上传，可以使用以下接口：

```bash
# 登录获取令牌
curl -X POST https://image-bed-worker.yangzhen0806.workers.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"password":"yang"}'

# 使用令牌上传文件
curl -X POST https://image-bed-worker.yangzhen0806.workers.dev/api/upload \
  -H "X-Upload-Token: YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

---

**更新时间**：2025年9月6日  
**版本**：v1.1 (包含密码保护功能)