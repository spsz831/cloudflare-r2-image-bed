# 🌟 YangZhen 图床 - Cloudflare R2 图片托管服务

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?style=flat-square&logo=cloudflare)](https://workers.cloudflare.com/)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare-R2-blue?style=flat-square&logo=cloudflare)](https://developers.cloudflare.com/r2/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.0.0-purple?style=flat-square)](https://github.com/spsz831/cloudflare-r2-image-bed)

> 🚀 基于 Cloudflare R2 + Workers 的现代化图床服务，Apple 风格界面，完全免费，无需注册即可使用！

## ✨ 在线体验

**🔗 [立即体验图床服务](https://yangzhen-image-bed.pages.dev)**

无需注册，打开即用！支持拖拽上传、批量处理、实时预览。

## 🎯 核心特性

### 🎨 用户体验
- **🍎 Apple 风格界面** - 简洁优雅的设计语言
- **📱 响应式设计** - 完美适配桌面端和移动端
- **🌙 深色模式支持** - 自动适应系统主题
- **⚡ 极速上传** - EdgeOne CDN 全球加速
- **🔄 智能重试** - 自动重试机制，确保上传成功

### 🛠️ 功能完备
- **📁 拖拽上传** - 支持拖拽和点击选择文件
- **🔄 批量处理** - 同时上传多个文件
- **👁️ 实时预览** - 图片上传后立即预览
- **📋 多格式复制** - 直链、Markdown、HTML 格式一键复制
- **📚 历史记录** - 本地存储上传历史，支持搜索和管理
- **🗑️ 批量管理** - 支持单个删除和批量清空

### 🔧 技术优势
- **🆓 完全免费** - 基于 Cloudflare 免费套餐
- **🌐 全球 CDN** - Cloudflare 全球边缘网络加速
- **🔒 安全可靠** - 企业级安全保障
- **📊 智能监控** - 详细的上传日志和错误追踪
- **⚡ 高性能** - 优化的缓存策略和压缩算法

## 🖼️ 界面预览

<div align="center">

### 🏠 主界面
![主界面](https://yangzhen-image-bed.pages.dev/preview/main.png)

### 📱 移动端界面
![移动端](https://yangzhen-image-bed.pages.dev/preview/mobile.png)

### 📋 历史记录
![历史记录](https://yangzhen-image-bed.pages.dev/preview/history.png)

</div>

## 🚀 快速开始

### 📋 部署前准备

1. **Cloudflare 账户** - [注册 Cloudflare](https://dash.cloudflare.com/sign-up)
2. **Wrangler CLI** - 安装 Cloudflare 官方工具
3. **Git** - 用于克隆仓库

### ⚡ 一键部署

```bash
# 1. 克隆项目
git clone https://github.com/spsz831/cloudflare-r2-image-bed.git
cd cloudflare-r2-image-bed

# 2. 安装 Wrangler CLI
npm install -g wrangler

# 3. 登录 Cloudflare
wrangler login

# 4. 创建 R2 存储桶
wrangler r2 bucket create image-bed

# 5. 配置 CORS
wrangler r2 bucket cors put image-bed --file cors-config.json

# 6. 部署 Worker
cd worker
wrangler deploy

# 7. 部署前端
cd ../frontend
wrangler pages deploy . --project-name your-image-bed
```

### 🔧 环境配置

在 `worker/wrangler.toml` 中配置：

```toml
name = "image-bed-worker"
main = "src/index.js"
compatibility_date = "2023-12-01"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "image-bed"  # 你的 R2 存储桶名称

[vars]
MAX_FILE_SIZE = "50"       # 最大文件大小(MB)
ALLOWED_ORIGINS = "*"      # 允许的来源
```

## 📁 项目结构

```
cloudflare-r2-image-bed/
├── 📁 frontend/              # 前端应用
│   ├── 📄 index.html        # 主页面
│   ├── 📁 css/
│   │   └── 📄 style.css     # Apple 风格样式
│   └── 📁 js/
│       └── 📄 app.js        # 核心逻辑
├── 📁 worker/               # Cloudflare Workers
│   ├── 📄 wrangler.toml     # 部署配置
│   ├── 📄 package.json      # 依赖管理
│   └── 📁 src/
│       └── 📄 index.js      # API 后端
├── 📁 docs/                 # 文档目录
│   ├── 📄 deployment.md     # 部署指南
│   ├── 📄 configuration.md  # 配置说明
│   └── 📄 api-reference.md  # API 文档
├── 📄 cors-config.json      # CORS 配置
└── 📄 README.md             # 项目说明
```

## 🔌 API 接口

### 📤 文件上传
```http
POST /api/upload
Content-Type: multipart/form-data

{
  "file": <图片文件>
}
```

### 📥 文件获取
```http
GET /api/file/{fileId}
```

### 🗑️ 文件删除
```http
DELETE /api/delete/{fileId}
```

### 📋 文件列表
```http
GET /api/list?limit=50&cursor=xxx
```

### 🏥 健康检查
```http
GET /api/health
```

## 🛠️ 技术栈

### 前端技术
- **HTML5** - 语义化标签和现代API
- **CSS3** - Flexbox/Grid布局，动画效果
- **Vanilla JavaScript** - 原生JS，无框架依赖
- **Progressive Web App** - PWA特性支持

### 后端技术
- **Cloudflare Workers** - 边缘计算平台
- **Cloudflare R2** - 对象存储服务
- **Web Standards API** - Fetch、FormData、Response等

### 开发工具
- **Wrangler CLI** - Cloudflare 官方开发工具
- **Git** - 版本控制
- **Cloudflare Pages** - 静态网站托管

## 🎨 自定义配置

### 🎭 主题定制

修改 `frontend/css/style.css` 中的CSS变量：

```css
:root {
  --primary-color: #10B981;     /* 主色调 */
  --secondary-color: #34D399;   /* 辅助色 */
  --background: #f5f7fa;        /* 背景色 */
  --text-color: #1d1d1f;        /* 文字颜色 */
}
```

### ⚙️ 上传限制

在 `worker/wrangler.toml` 中调整：

```toml
[vars]
MAX_FILE_SIZE = "100"          # 调整最大文件大小
ALLOWED_ORIGINS = "https://yourdomain.com"  # 限制访问来源
```

### 🔐 安全设置

```javascript
// 在 worker/src/index.js 中添加
const RATE_LIMIT = {
  requests: 100,    // 每小时最大请求数
  window: 3600000   // 时间窗口(毫秒)
};
```

## 📊 监控与日志

### 📈 性能监控

```bash
# 查看实时日志
wrangler tail

# 查看存储使用情况
wrangler r2 bucket list

# 查看Worker指标
wrangler metrics
```

### 🐛 错误排查

常见问题解决：

1. **上传失败** - 检查CORS配置和文件大小限制
2. **图片无法显示** - 确认R2存储桶权限设置
3. **部署失败** - 检查wrangler.toml配置和账户权限

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 🔧 开发环境

```bash
# 克隆项目
git clone https://github.com/spsz831/cloudflare-r2-image-bed.git

# 本地开发
cd worker
wrangler dev  # 启动本地开发服务器

# 前端开发
cd frontend
# 使用任意HTTP服务器，如 python -m http.server 8000
```

### 📝 提交规范

- `feat:` 新功能
- `fix:` 错误修复
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

### 🎯 路线图

- [ ] 🖼️ 图片压缩和格式转换
- [ ] 📱 PWA支持和离线功能
- [ ] 🔐 用户认证和权限管理
- [ ] 📊 数据统计和分析面板
- [ ] 🌍 多语言支持
- [ ] 🤖 AI图片标签和搜索

## 💡 常见问题

### ❓ 为什么选择 Cloudflare R2？

1. **🆓 免费额度充足** - 每月10GB存储，1000万次请求
2. **🌐 全球CDN** - 自动全球分发，访问速度快
3. **🔒 数据安全** - 企业级安全保障
4. **💰 成本优势** - 比AWS S3便宜10倍

### ❓ 支持哪些图片格式？

支持所有主流图片格式：
- **JPEG/JPG** - 最常用的照片格式
- **PNG** - 支持透明背景
- **GIF** - 支持动画
- **WebP** - 现代高效格式
- **SVG** - 矢量图形

### ❓ 有上传大小限制吗？

默认限制50MB，可在配置中调整。Cloudflare Workers限制最大100MB。

### ❓ 图片会被压缩吗？

默认不压缩，保持原始质量。可通过修改代码添加压缩功能。

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议。

## 🙏 致谢

- [Cloudflare](https://cloudflare.com/) - 提供优秀的边缘计算平台
- [Apple Design](https://developer.apple.com/design/) - 设计灵感来源
- 所有贡献者和用户的支持

## 📞 联系方式

- **GitHub**: [@spsz831](https://github.com/spsz831)
- **Issues**: [提交问题](https://github.com/spsz831/cloudflare-r2-image-bed/issues)
- **Discussions**: [参与讨论](https://github.com/spsz831/cloudflare-r2-image-bed/discussions)

---

<div align="center">

**🌟 如果这个项目对您有帮助，请考虑给它一个 Star！**

[![Star History Chart](https://api.star-history.com/svg?repos=spsz831/cloudflare-r2-image-bed&type=Date)](https://star-history.com/#spsz831/cloudflare-r2-image-bed&Date)

**Made with ❤️ by [YangZhen](https://github.com/spsz831)**

</div>