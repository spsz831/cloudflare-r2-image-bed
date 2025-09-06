# Cloudflare R2 图床

基于 Cloudflare R2 + Workers 的简单图床工具，支持免费 10GB 存储空间。

## 项目架构

```
cloudflare-r2-image-bed/
├── frontend/           # 前端文件
│   ├── index.html     # 主页面
│   ├── css/           # 样式文件
│   ├── js/            # JavaScript 文件
│   └── assets/        # 静态资源
├── worker/            # Cloudflare Workers
│   ├── src/           # Worker 源码
│   ├── wrangler.toml  # Worker 配置
│   └── package.json   # 依赖管理
└── docs/              # 文档和说明
```

## 技术栈

- **前端**: HTML5 + CSS3 + Vanilla JavaScript
- **后端**: Cloudflare Workers
- **存储**: Cloudflare R2
- **部署**: Cloudflare Pages + Workers

## 功能特性

### 前端功能
- ✅ 拖拽上传文件
- ✅ 点击选择上传
- ✅ 批量文件上传
- ✅ 实时文件预览
- ✅ 多格式链接复制（直链、Markdown、HTML）
- ✅ 本地上传历史记录

### 后端API
- `POST /api/upload` - 文件上传
- `GET /api/file/:id` - 文件获取
- `DELETE /api/delete/:id` - 文件删除
- `GET /api/list` - 文件列表

## 部署说明

### 1. R2 存储桶设置
```bash
# 创建 R2 存储桶
wrangler r2 bucket create image-bed

# 配置 CORS
wrangler r2 bucket cors put image-bed --file cors-config.json
```

### 2. Worker 部署
```bash
cd worker
npm install
wrangler deploy
```

### 3. 前端部署
```bash
# 部署到 Cloudflare Pages
wrangler pages deploy frontend --project-name image-bed-frontend
```

## 环境变量

在 Cloudflare Workers 中设置：
- `R2_BUCKET_NAME`: R2 存储桶名称
- `ADMIN_TOKEN`: 管理员令牌（可选）
- `MAX_FILE_SIZE`: 最大文件大小限制（MB）

## 开发指南

详细开发说明请参考 `docs/` 目录。