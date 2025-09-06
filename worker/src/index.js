/**
 * Cloudflare R2图床后端API
 * 支持文件上传、获取、删除和列表功能
 */

// CORS响应头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Upload-Token',
  'Access-Control-Max-Age': '86400',
};

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

// 生成唯一文件ID
function generateFileId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${randomStr}`;
}

// 获取文件扩展名
function getFileExtension(filename) {
  return filename.slice(filename.lastIndexOf('.'));
}

// 检查是否为支持的图片格式
function isValidImageType(contentType) {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return validTypes.includes(contentType);
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
  try {
    // 验证上传令牌
    if (!validateUploadToken(request, env)) {
      return new Response(JSON.stringify({ error: '访问被拒绝，请先登录' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file || !file.name) {
      return new Response(JSON.stringify({ error: '请选择要上传的文件' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 检查文件类型
    if (!isValidImageType(file.type)) {
      return new Response(JSON.stringify({ error: '不支持的文件类型，请上传图片文件' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 检查文件大小
    const maxSize = (env.MAX_FILE_SIZE || 50) * 1024 * 1024; // MB转换为字节
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: `文件大小超过限制 ${env.MAX_FILE_SIZE || 50}MB` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 生成文件ID和存储路径
    const fileId = generateFileId();
    const fileExt = getFileExtension(file.name);
    const fileName = `${fileId}${fileExt}`;
    
    // 上传到R2
    await env.R2_BUCKET.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadTime: new Date().toISOString(),
        fileSize: file.size.toString(),
      },
    });

    // 构建返回URL
    const fileUrl = `${new URL(request.url).origin}/api/file/${fileId}`;
    
    const response = {
      success: true,
      fileId: fileId,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      url: fileUrl,
      uploadTime: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: '上传失败，请重试' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 文件获取接口
async function handleGetFile(request, env, fileId) {
  try {
    // 查找文件（需要遍历可能的扩展名）
    const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    let object = null;
    let fileName = null;

    for (const ext of extensions) {
      const testFileName = `${fileId}${ext}`;
      const testObject = await env.R2_BUCKET.get(testFileName);
      if (testObject) {
        object = testObject;
        fileName = testFileName;
        break;
      }
    }

    if (!object) {
      return new Response(JSON.stringify({ error: '文件不存在' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 返回文件内容
    const headers = {
      ...corsHeaders,
      'Content-Type': object.httpMetadata.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000',
      'Content-Disposition': `inline; filename="${object.customMetadata?.originalName || fileName}"`,
    };

    return new Response(object.body, { headers });
    
  } catch (error) {
    console.error('Get file error:', error);
    return new Response(JSON.stringify({ error: '获取文件失败' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// 文件删除接口
async function handleDeleteFile(request, env, fileId) {
  try {
    // 验证上传令牌
    if (!validateUploadToken(request, env)) {
      return new Response(JSON.stringify({ error: '访问被拒绝，请先登录' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 查找并删除文件
    const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    let found = false;

    for (const ext of extensions) {
      const fileName = `${fileId}${ext}`;
      const object = await env.R2_BUCKET.get(fileName);
      if (object) {
        await env.R2_BUCKET.delete(fileName);
        found = true;
        break;
      }
    }

    if (!found) {
      return new Response(JSON.stringify({ error: '文件不存在' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: '文件已删除' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Delete file error:', error);
    return new Response(JSON.stringify({ error: '删除文件失败' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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