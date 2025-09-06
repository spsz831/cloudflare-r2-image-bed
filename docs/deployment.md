# 部署指南

## 1. 准备工作

### 1.1 注册Cloudflare账户
- 访问 [Cloudflare](https://www.cloudflare.com) 注册账户
- 进入 Dashboard

### 1.2 安装Wrangler CLI
```bash
npm install -g wrangler
# 或者
pnpm install -g wrangler
# 或者
yarn global add wrangler
```

### 1.3 登录Cloudflare
```bash
wrangler login
```

## 2. 创建R2存储桶

### 2.1 通过CLI创建
```bash
# 创建存储桶
wrangler r2 bucket create image-bed

# 查看存储桶列表
wrangler r2 bucket list
```

### 2.2 通过Web界面创建
1. 登录Cloudflare Dashboard
2. 进入 R2 Object Storage
3. 点击"Create bucket"
4. 输入存储桶名称: `image-bed`
5. 选择位置（推荐选择离用户最近的区域）

## 3. 配置CORS（跨域资源共享）

创建 `cors-config.json` 文件：
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3600
  }
]
```

应用CORS配置：
```bash
wrangler r2 bucket cors put image-bed --file cors-config.json
```

## 4. 部署Worker

### 4.1 修改配置文件
编辑 `worker/wrangler.toml`，确保以下配置正确：
```toml
name = "image-bed-worker"
main = "src/index.js"
compatibility_date = "2023-12-01"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "image-bed"  # 你的实际存储桶名称

[vars]
MAX_FILE_SIZE = "50"
ALLOWED_ORIGINS = "*"
```

### 4.2 部署Worker
```bash
cd worker
npm install
wrangler deploy
```

部署成功后会得到Worker的URL，例如：
`https://image-bed-worker.your-username.workers.dev`

## 5. 部署前端

### 5.1 使用Cloudflare Pages

#### 方法1：通过Git仓库（推荐）
1. 将代码推送到GitHub/GitLab
2. 登录Cloudflare Dashboard
3. 进入Pages
4. 点击"Create a project"
5. 连接Git仓库
6. 设置构建配置：
   - 构建命令：留空
   - 构建输出目录：`frontend`
7. 部署

#### 方法2：通过CLI直接部署
```bash
# 进入前端目录
cd frontend

# 修改 js/app.js 中的 apiBaseUrl
# this.apiBaseUrl = 'https://image-bed-worker.your-username.workers.dev';

# 部署
wrangler pages deploy . --project-name image-bed-frontend
```

### 5.2 自定义域名（可选）
1. 在Cloudflare Pages设置中添加自定义域名
2. 配置DNS记录
3. 启用HTTPS

## 6. 配置环境变量

在Worker中可以配置以下环境变量：

### 6.1 通过wrangler.toml配置
```toml
[vars]
MAX_FILE_SIZE = "50"          # 最大文件大小(MB)
ALLOWED_ORIGINS = "*"         # 允许的来源
```

### 6.2 通过CLI配置
```bash
# 设置环境变量
wrangler secret put ADMIN_TOKEN
# 输入管理员令牌（可选，用于管理接口）
```

### 6.3 通过Web界面配置
1. 进入Cloudflare Dashboard
2. 找到你的Worker
3. 进入Settings → Variables
4. 添加环境变量

## 7. 验证部署

### 7.1 测试API端点
```bash
# 健康检查
curl https://your-worker-url.workers.dev/api/health

# 获取文件列表
curl https://your-worker-url.workers.dev/api/list
```

### 7.2 测试前端
访问你的Pages域名，尝试上传图片

## 8. 监控和维护

### 8.1 查看Worker日志
```bash
wrangler tail
```

### 8.2 查看R2使用情况
在Cloudflare Dashboard的R2页面可以查看：
- 存储使用量
- 请求次数
- 费用统计

### 8.3 更新代码
```bash
# 更新Worker
cd worker
wrangler deploy

# 更新前端
cd frontend
wrangler pages deploy . --project-name image-bed-frontend
```

## 9. 安全建议

### 9.1 限制文件类型
Worker代码中已经限制了文件类型，只允许图片格式。

### 9.2 文件大小限制
通过 `MAX_FILE_SIZE` 环境变量控制最大文件大小。

### 9.3 速率限制（可选）
可以在Worker中添加基于IP的速率限制：

```javascript
// 简单的内存速率限制示例
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60000; // 1分钟
  const maxRequests = 10; // 每分钟最多10次请求
  
  const requests = rateLimitMap.get(ip) || [];
  const validRequests = requests.filter(time => now - time < windowMs);
  
  if (validRequests.length >= maxRequests) {
    return false;
  }
  
  validRequests.push(now);
  rateLimitMap.set(ip, validRequests);
  return true;
}
```

## 10. 故障排除

### 10.1 常见问题

1. **上传失败**
   - 检查CORS配置
   - 确认R2存储桶绑定正确
   - 查看Worker日志

2. **图片无法显示**
   - 检查R2存储桶是否公开
   - 确认文件URL格式正确

3. **部署失败**
   - 检查wrangler.toml配置
   - 确认账户权限
   - 查看错误日志

### 10.2 调试命令
```bash
# 查看Worker日志
wrangler tail

# 本地开发模式
wrangler dev

# 查看R2存储桶内容
wrangler r2 object list image-bed
```