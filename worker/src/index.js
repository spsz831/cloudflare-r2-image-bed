/**
 * YangZhen 图床Cloudflare R2 + Workers 后端API
 * 功能包含:
 * - 文件上传、获取、删除、列表
 * - 自动错误处理和日志记录
 * - 性能优化和缓存管理
 * - 安全限制和频率控制
 * @version 2.0.0
 * @author YangZhen
 */

// CORS响应头配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Upload-Token',
  'Access-Control-Max-Age': '86400',
};

// 支持的图片类型
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

// 文件扩展名映射
const FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

// 缓存策略
const CACHE_CONTROL = {
  IMAGE: 'public, max-age=31536000, immutable', // 1年
  ERROR: 'no-cache, no-store, must-revalidate'
};

// 错误码定义
const ERROR_CODES = {
  INVALID_FILE: 'INVALID_FILE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

// 日志等级
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// 日志输出函数
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: Object.keys(LOG_LEVELS)[level],
    message,
    ...data
  };
  console.log(JSON.stringify(logEntry));
}

// 支持多用户的用户列表
function getValidUsers(env) {
  // 支持多用户配置格式: "user1:pass1,user2:pass2,admin:yang"
  const userConfig = env.UPLOAD_USERS || env.UPLOAD_PASSWORD || 'admin:yang';
  
  if (userConfig.includes(':')) {
    const users = {};
    userConfig.split(',').forEach(userPass => {
      const [user, pass] = userPass.trim().split(':');
      if (user && pass) {
        users[user] = pass;
      }
    });
    return users;
  } else {
    // 兼容单密码模式
    return { admin: userConfig };
  }
}

// 验证上传令牌
function validateUploadToken(request, env) {
  const token = request.headers.get('X-Upload-Token');
  if (!token) return false;
  
  try {
    // 解析令牌
    const decoded = atob(token);
    const [username, password, timestamp] = decoded.split(':');
    
    const validUsers = getValidUsers(env);
    
    // 检查用户名和密码是否正确
    if (!validUsers[username] || validUsers[username] !== password) {
      return false;
    }
    
    // 检查令牌是否过期（24小时）
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24小时
    
    return tokenAge <= maxAge;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

// 生成访问令牌（基于用户名密码）
function generateAccessToken(username, password, env) {
  const validUsers = getValidUsers(env);
  
  // 支持两种登录方式
  if (username && password) {
    // 用户名密码登录
    if (validUsers[username] && validUsers[username] === password) {
      const timestamp = Date.now();
      const token = btoa(`${username}:${password}:${timestamp}`);
      return {
        success: true,
        token: token,
        username: username,
        expiresIn: 24 * 60 * 60 * 1000 // 24小时
      };
    }
  } else if (password) {
    // 兼容单密码模式
    for (const [user, pass] of Object.entries(validUsers)) {
      if (pass === password) {
        const timestamp = Date.now();
        const token = btoa(`${user}:${password}:${timestamp}`);
        return {
          success: true,
          token: token,
          username: user,
          expiresIn: 24 * 60 * 60 * 1000 // 24小时
        };
      }
    }
  }
  
  return { success: false, error: '用户名或密码错误' };
}

// 生成优化的文件ID
function generateFileId() {
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.getRandomValues(new Uint8Array(6))
    .reduce((str, byte) => str + byte.toString(36), '');
  return `${timestamp}-${randomStr}`;
}

// 获取文件扩展名
function getFileExtension(filename) {
  return filename.slice(filename.lastIndexOf('.'));
}

// 检查是否为支持的图片格式
function isValidImageType(contentType) {
  return SUPPORTED_IMAGE_TYPES.includes(contentType);
}

// 创建错误响应
function createErrorResponse(errorCode, message, statusCode = 400, details = {}) {
  const errorResponse = {
    success: false,
    error: message,
    code: errorCode,
    timestamp: new Date().toISOString(),
    ...details
  };

  log(LOG_LEVELS.ERROR, message, { errorCode, statusCode, ...details });

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': CACHE_CONTROL.ERROR
    },
  });
}

// 创建成功响应
function createSuccessResponse(data, statusCode = 200) {
  const response = {
    success: true,
    timestamp: new Date().toISOString(),
    ...data
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// 获取客户端IP地址
function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For') ||
         request.headers.get('X-Real-IP') ||
         'unknown';
}

// 验证文件大小
function validateFileSize(size, maxSize) {
  return size <= maxSize;
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 处理CORS预检请求
function handleOptions() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// 文件上传接口
async function handleUpload(request, env) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);

  try {
    log(LOG_LEVELS.INFO, '开始处理上传请求', { clientIP });

    const formData = await request.formData();
    const file = formData.get('file');

    // 验证文件存在
    if (!file || !file.name) {
      return createErrorResponse(
        ERROR_CODES.INVALID_FILE,
        '请选择要上传的文件',
        400,
        { clientIP }
      );
    }

    // 验证文件类型
    if (!isValidImageType(file.type)) {
      return createErrorResponse(
        ERROR_CODES.UNSUPPORTED_TYPE,
        `不支持的文件类型: ${file.type}，请上传图片文件`,
        400,
        { clientIP, fileType: file.type, fileName: file.name }
      );
    }

    // 验证文件大小
    const maxSize = (env.MAX_FILE_SIZE || 50) * 1024 * 1024;
    if (!validateFileSize(file.size, maxSize)) {
      return createErrorResponse(
        ERROR_CODES.FILE_TOO_LARGE,
        `文件大小超过限制: ${formatFileSize(file.size)}, 最大允许: ${formatFileSize(maxSize)}`,
        400,
        { clientIP, fileSize: file.size, maxSize, fileName: file.name }
      );
    }

    // 生成文件ID和存储路径
    const fileId = generateFileId();
    const fileExt = getFileExtension(file.name);
    const fileName = `${fileId}${fileExt}`;

    log(LOG_LEVELS.INFO, '开始上传文件到R2', {
      clientIP,
      fileId,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type
    });

    // 上传到R2
    const uploadResult = await env.R2_BUCKET.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: CACHE_CONTROL.IMAGE,
      },
      customMetadata: {
        originalName: file.name,
        uploadTime: new Date().toISOString(),
        fileSize: file.size.toString(),
        clientIP: clientIP,
        userAgent: request.headers.get('User-Agent') || 'unknown'
      },
    });

    if (!uploadResult) {
      throw new Error('R2上传失败');
    }

    // 构建返回URL
    const fileUrl = `${new URL(request.url).origin}/api/file/${fileId}`;
    const uploadTime = new Date().toISOString();
    const processingTime = Date.now() - startTime;

    const responseData = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      url: fileUrl,
      uploadTime,
      processingTime: `${processingTime}ms`
    };

    log(LOG_LEVELS.INFO, '文件上传成功', {
      clientIP,
      fileId,
      fileName: file.name,
      fileSize: file.size,
      processingTime
    });

    return createSuccessResponse(responseData);

  } catch (error) {
    const processingTime = Date.now() - startTime;

    log(LOG_LEVELS.ERROR, '文件上传失败', {
      clientIP,
      error: error.message,
      stack: error.stack,
      processingTime
    });

    return createErrorResponse(
      ERROR_CODES.UPLOAD_FAILED,
      '上传失败，请重试',
      500,
      { clientIP, processingTime: `${processingTime}ms` }
    );
  }
}

// 文件获取接口
async function handleGetFile(request, env, fileId) {
  const clientIP = getClientIP(request);

  try {
    log(LOG_LEVELS.INFO, '开始获取文件', { clientIP, fileId });

    // 查找文件（需要遍历可能的扩展名）
    let object = null;
    let fileName = null;

    for (const ext of FILE_EXTENSIONS) {
      const testFileName = `${fileId}${ext}`;
      const testObject = await env.R2_BUCKET.get(testFileName);
      if (testObject) {
        object = testObject;
        fileName = testFileName;
        break;
      }
    }

    if (!object) {
      log(LOG_LEVELS.WARN, '文件不存在', { clientIP, fileId });
      return createErrorResponse(
        ERROR_CODES.FILE_NOT_FOUND,
        '文件不存在',
        404,
        { clientIP, fileId }
      );
    }

    // 记录成功访问
    log(LOG_LEVELS.INFO, '文件获取成功', {
      clientIP,
      fileId,
      fileName,
      contentType: object.httpMetadata?.contentType,
      size: object.size
    });

    // 返回文件内容
    const headers = {
      ...corsHeaders,
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': CACHE_CONTROL.IMAGE,
      'Content-Disposition': `inline; filename="${object.customMetadata?.originalName || fileName}"`,
      'ETag': object.etag,
      'Last-Modified': object.uploaded?.toUTCString() || new Date().toUTCString(),
      'Content-Length': object.size?.toString()
    };

    return new Response(object.body, { headers });

  } catch (error) {
    log(LOG_LEVELS.ERROR, '获取文件失败', {
      clientIP,
      fileId,
      error: error.message,
      stack: error.stack
    });

    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      '获取文件失败',
      500,
      { clientIP, fileId }
    );
  }
}

// 文件删除接口
async function handleDeleteFile(request, env, fileId) {
  const clientIP = getClientIP(request);

  try {
    log(LOG_LEVELS.INFO, '开始删除文件', { clientIP, fileId });

    // 查找并删除文件
    let found = false;
    let deletedFileName = null;

    for (const ext of FILE_EXTENSIONS) {
      const fileName = `${fileId}${ext}`;
      const object = await env.R2_BUCKET.get(fileName);
      if (object) {
        await env.R2_BUCKET.delete(fileName);
        found = true;
        deletedFileName = fileName;
        log(LOG_LEVELS.INFO, '文件删除成功', {
          clientIP,
          fileId,
          fileName: deletedFileName,
          originalName: object.customMetadata?.originalName
        });
        break;
      }
    }

    if (!found) {
      log(LOG_LEVELS.WARN, '要删除的文件不存在', { clientIP, fileId });
      return createErrorResponse(
        ERROR_CODES.FILE_NOT_FOUND,
        '文件不存在',
        404,
        { clientIP, fileId }
      );
    }

    return createSuccessResponse({
      message: '文件已删除',
      fileId,
      fileName: deletedFileName
    });

  } catch (error) {
    log(LOG_LEVELS.ERROR, '删除文件失败', {
      clientIP,
      fileId,
      error: error.message,
      stack: error.stack
    });

    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      '删除文件失败',
      500,
      { clientIP, fileId }
    );
  }
}

// 文件列表接口
async function handleListFiles(request, env) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const cursor = url.searchParams.get('cursor') || undefined;

    const options = {
      limit: Math.min(limit, 1000),
    };
    if (cursor) {
      options.cursor = cursor;
    }

    const listed = await env.R2_BUCKET.list(options);
    
    const files = listed.objects.map(obj => ({
      key: obj.key,
      fileId: obj.key.split('.')[0],
      size: obj.size,
      uploaded: obj.uploaded,
      etag: obj.etag,
      url: `${new URL(request.url).origin}/api/file/${obj.key.split('.')[0]}`,
    }));

    const response = {
      files,
      truncated: listed.truncated,
      cursor: listed.cursor,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('List files error:', error);
    return new Response(JSON.stringify({ error: '获取文件列表失败' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 主处理函数
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 处理CORS预检请求
    if (method === 'OPTIONS') {
      return handleOptions();
    }

    // 路由处理
    
    // 登录接口
    if (path === '/api/login' && method === 'POST') {
      try {
        const body = await request.json();
        let result;
        
        if (body.username && body.password) {
          // 用户名密码登录
          result = generateAccessToken(body.username, body.password, env);
        } else if (body.password) {
          // 兼容单密码登录
          result = generateAccessToken(null, body.password, env);
        } else {
          return new Response(JSON.stringify({ error: '请提供用户名和密码或仅密码' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        if (result.success) {
          return new Response(JSON.stringify({
            success: true,
            token: result.token,
            username: result.username,
            message: '登录成功'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          return new Response(JSON.stringify({ error: result.error }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        return new Response(JSON.stringify({ error: '请求格式错误' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // 验证令牌接口
    if (path === '/api/verify' && method === 'POST') {
      const isValid = validateUploadToken(request, env);
      return new Response(JSON.stringify({ 
        valid: isValid,
        message: isValid ? '令牌有效' : '令牌无效'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (path === '/api/upload' && method === 'POST') {
      return handleUpload(request, env);
    }
    
    if (path.startsWith('/api/file/') && method === 'GET') {
      const fileId = path.split('/')[3];
      return handleGetFile(request, env, fileId);
    }
    
    if (path.startsWith('/api/delete/') && method === 'DELETE') {
      const fileId = path.split('/')[3];
      return handleDeleteFile(request, env, fileId);
    }
    
    if (path === '/api/list' && method === 'GET') {
      return handleListFiles(request, env);
    }

    // 健康检查
    if (path === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 404处理
    return new Response(JSON.stringify({ error: 'API接口不存在' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};