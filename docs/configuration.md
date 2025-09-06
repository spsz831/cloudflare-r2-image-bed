# 环境变量配置示例

## Cloudflare Workers 环境变量

### 方式1：通过 wrangler.toml 配置
```toml
[vars]
# 最大文件大小限制（单位：MB）
MAX_FILE_SIZE = "50"

# 允许的来源（CORS）
ALLOWED_ORIGINS = "*"

# 支持的文件类型（可选）
ALLOWED_TYPES = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
```

### 方式2：通过 Cloudflare Dashboard 配置
1. 登录 Cloudflare Dashboard
2. 进入 Workers & Pages
3. 选择你的 Worker
4. 进入 Settings → Variables
5. 添加环境变量：

| 变量名 | 值 | 说明 |
|--------|----|----- |
| MAX_FILE_SIZE | 50 | 最大文件大小(MB) |
| ALLOWED_ORIGINS | * | 允许的来源 |
| ADMIN_TOKEN | your-secret-token | 管理员令牌（可选）|

### 方式3：通过 Wrangler CLI 配置
```bash
# 设置普通环境变量
wrangler secret put MAX_FILE_SIZE
# 输入: 50

# 设置敏感环境变量（如令牌）
wrangler secret put ADMIN_TOKEN
# 输入你的管理员令牌

# 查看所有环境变量
wrangler secret list
```

## R2 存储桶配置

### 存储桶绑定
在 `wrangler.toml` 中：
```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-bucket-name"
```

### 存储桶权限
- 确保Worker有读写权限
- 配置正确的CORS规则

## 前端配置

### API 基础URL配置
在 `frontend/js/app.js` 中修改：
```javascript
constructor() {
  // 开发环境
  // this.apiBaseUrl = 'http://localhost:8787';
  
  // 生产环境 - 替换为你的Worker URL
  this.apiBaseUrl = 'https://your-worker.your-subdomain.workers.dev';
  
  // 或者使用自定义域名
  // this.apiBaseUrl = 'https://api.yourdomain.com';
}
```

## 高级配置

### 文件命名策略
可以在Worker中自定义文件命名规则：
```javascript
function generateFileName(originalName, fileId) {
  const timestamp = Date.now();
  const extension = getFileExtension(originalName);
  
  // 选项1：时间戳 + 随机ID
  return `${timestamp}-${fileId}${extension}`;
  
  // 选项2：日期目录结构
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}/${fileId}${extension}`;
}
```

### 自定义域名配置
1. 在Cloudflare中添加域名
2. 创建CNAME记录指向Worker
3. 更新前端配置中的API URL

### 缓存配置
在Worker中可以设置缓存策略：
```javascript
const cacheHeaders = {
  'Cache-Control': 'public, max-age=31536000', // 1年
  'Expires': new Date(Date.now() + 31536000000).toUTCString()
};
```

## 环境变量使用示例

### 在Worker中使用
```javascript
export default {
  async fetch(request, env, ctx) {
    const maxFileSize = (env.MAX_FILE_SIZE || 50) * 1024 * 1024;
    const allowedOrigins = env.ALLOWED_ORIGINS || '*';
    const adminToken = env.ADMIN_TOKEN;
    
    // 使用环境变量...
  }
}
```

### 条件配置
```javascript
// 根据环境变量调整行为
if (env.ADMIN_TOKEN && request.headers.get('Authorization') === `Bearer ${env.ADMIN_TOKEN}`) {
  // 管理员功能
  return handleAdminRequest(request, env);
}
```