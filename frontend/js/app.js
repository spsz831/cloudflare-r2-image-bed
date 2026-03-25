/**
 * YangZhen 图床前端功能实现
 * 功能包含:
 * - 文件上传与预览
 * - 拖拽上传支持
 * - 多种链接格式复制
 * - 本地历史记录管理
 * - 自动重试与错误处理
 * @version 2.0.0
 * @author YangZhen
 */

class ImageBed {
  constructor() {
    // API配置
    this.apiBaseUrl = 'https://api.yz-image.com'; // EdgeOne加速API域名
    this.fallbackApiUrl = 'https://19950906.xyz'; // 备用正式域名

    // 文件限制配置
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    this.maxRetries = 3; // 最大重试次数
    this.retryDelay = 1000; // 重试延迟(ms)

    // 状态管理
    this.isUploading = false;
    this.uploadQueue = [];
    
    this.elements = {
      uploadArea: document.getElementById('uploadArea'),
      fileInput: document.getElementById('fileInput'),
      uploadBtn: document.getElementById('uploadBtn'),
      uploadProgress: document.getElementById('uploadProgress'),
      progressFill: document.getElementById('progressFill'),
      progressText: document.getElementById('progressText'),
      resultsSection: document.getElementById('resultsSection'),
      previewImg: document.getElementById('previewImg'),
      directLink: document.getElementById('directLink'),
      markdownLink: document.getElementById('markdownLink'),
      htmlLink: document.getElementById('htmlLink'),
      historyList: document.getElementById('historyList')
    };

    this.initializeEventListeners();
    this.loadUploadHistory();
  }

  // 带容错和重试的API请求方法
  async makeApiRequest(url, options = {}, retryCount = 0) {
    const maxRetries = this.maxRetries;

    try {
      // 首先尝试EdgeOne加速域名
      const edgeOneUrl = url.replace(this.fallbackApiUrl, this.apiBaseUrl);
      const response = await fetch(edgeOneUrl, {
        ...options,
        timeout: 30000 // 30秒超时
      });

      if (response.ok) {
        return response;
      }

      if (response.status >= 500 && retryCount < maxRetries) {
        console.warn(`服务器错误 ${response.status}，${this.retryDelay}ms后重试...`);
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.makeApiRequest(url, options, retryCount + 1);
      }

      throw new Error(`EdgeOne API failed: ${response.status}`);
    } catch (error) {
      if (retryCount < maxRetries && error.name === 'TypeError') {
        console.warn(`网络错误，${this.retryDelay}ms后重试...`);
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.makeApiRequest(url, options, retryCount + 1);
      }

      console.warn('EdgeOne API失败，尝试备用域名:', error.message);
      // 如果EdgeOne失败，使用原始域名
      const fallbackUrl = url.replace(this.apiBaseUrl, this.fallbackApiUrl);

      try {
        const response = await fetch(fallbackUrl, options);
        if (response.ok || retryCount >= maxRetries) {
          return response;
        }

        if (retryCount < maxRetries) {
          await this.delay(this.retryDelay * (retryCount + 1));
          return this.makeApiRequest(url, options, retryCount + 1);
        }

        return response;
      } catch (fallbackError) {
        if (retryCount < maxRetries) {
          await this.delay(this.retryDelay * (retryCount + 1));
          return this.makeApiRequest(url, options, retryCount + 1);
        }
        throw fallbackError;
      }
    }
  }

  // 延迟工具函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 初始化事件监听器
  initializeEventListeners() {
    // 文件选择按钮点击
    this.elements.uploadBtn.addEventListener('click', () => {
      this.elements.fileInput.click();
    });

    // 整个上传区域点击
    this.elements.uploadArea.addEventListener('click', (e) => {
      if (e.target !== this.elements.uploadBtn) {
        this.elements.fileInput.click();
      }
    });

    // 文件选择变化
    this.elements.fileInput.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files);
    });

    // 拖拽事件
    this.elements.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
    this.elements.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
    this.elements.uploadArea.addEventListener('drop', this.handleDrop.bind(this));

    // 阻止全页面拖拽
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
  }

  // 处理拖拽悬停
  handleDragOver(e) {
    e.preventDefault();
    this.elements.uploadArea.classList.add('dragover');
  }

  // 处理拖拽离开
  handleDragLeave(e) {
    e.preventDefault();
    this.elements.uploadArea.classList.remove('dragover');
  }

  // 处理文件拖拽放下
  handleDrop(e) {
    e.preventDefault();
    this.elements.uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    this.handleFileSelect(files);
  }

  // 处理文件选择
  async handleFileSelect(files) {
    if (!files || files.length === 0) return;

    // 防止重复上传
    if (this.isUploading) {
      this.showToast('正在上传中，请稍候...', 'warning');
      return;
    }

    const imageFiles = Array.from(files).filter(file => {
      // 检查文件类型
      if (!this.supportedTypes.includes(file.type)) {
        this.showToast(`不支持的文件类型: ${file.name}`, 'error');
        return false;
      }

      // 检查文件大小
      if (file.size > this.maxFileSize) {
        const sizeMB = Math.round(file.size / 1024 / 1024);
        this.showToast(`文件过大: ${file.name} (${sizeMB}MB)，限制50MB`, 'error');
        return false;
      }

      return true;
    });

    if (imageFiles.length === 0) {
      return;
    }

    this.isUploading = true;

    try {
      if (imageFiles.length === 1) {
        await this.uploadSingleFile(imageFiles[0]);
      } else {
        await this.uploadMultipleFiles(imageFiles);
      }
    } finally {
      this.isUploading = false;
    }
  }

  // 上传单个文件
  async uploadSingleFile(file) {
    if (!this.validateFile(file)) return;

    this.showUploadProgress();
    
    try {
      const result = await this.uploadFile(file);
      this.showUploadResult(result);
      this.addToHistory(result);
      this.showToast('上传成功！');
    } catch (error) {
      console.error('Upload failed:', error);
      this.showToast(error.message || '上传失败，请重试', 'error');
    } finally {
      this.hideUploadProgress();
    }
  }

  // 上传多个文件
  async uploadMultipleFiles(files) {
    this.showUploadProgress();
    this.elements.progressText.textContent = `正在上传 ${files.length} 个文件...`;

    const results = [];
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!this.validateFile(file)) continue;

      try {
        this.updateProgress((i / files.length) * 100);
        this.elements.progressText.textContent = `正在上传 ${file.name} (${i + 1}/${files.length})`;
        
        const result = await this.uploadFile(file);
        results.push(result);
        this.addToHistory(result);
        successCount++;
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    this.updateProgress(100);
    this.hideUploadProgress();

    if (successCount > 0) {
      this.showToast(`成功上传 ${successCount} 个文件`);
      // 显示最后一个成功上传的结果
      const lastResult = results[results.length - 1];
      if (lastResult) {
        this.showUploadResult(lastResult);
      }
    } else {
      this.showToast('上传失败，请检查文件格式和大小', 'error');
    }
  }

  // 验证文件
  validateFile(file) {
    if (!this.supportedTypes.includes(file.type)) {
      this.showToast(`不支持的文件类型: ${file.name}`, 'error');
      return false;
    }

    if (file.size > this.maxFileSize) {
      const sizeMB = Math.round(file.size / 1024 / 1024);
      this.showToast(`文件太大: ${file.name} (${sizeMB}MB)，最大支持50MB`, 'error');
      return false;
    }

    return true;
  }

  // 上传文件到服务器
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await this.makeApiRequest(`${this.apiBaseUrl}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || '上传失败');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('上传失败:', error);
      throw new Error(`上传失败: ${error.message}`);
    }
  }

  // 显示上传进度
  showUploadProgress() {
    this.elements.uploadProgress.style.display = 'block';
    this.elements.resultsSection.style.display = 'none';
    this.updateProgress(0);
  }

  // 隐藏上传进度
  hideUploadProgress() {
    setTimeout(() => {
      this.elements.uploadProgress.style.display = 'none';
    }, 500);
  }

  // 更新进度条
  updateProgress(percent) {
    this.elements.progressFill.style.width = `${percent}%`;
  }

  // 显示上传结果
  showUploadResult(result) {
    this.elements.previewImg.src = result.url;
    this.elements.directLink.value = result.url;
    this.elements.markdownLink.value = `![${result.fileName}](${result.url})`;
    this.elements.htmlLink.value = `<img src="${result.url}" alt="${result.fileName}" />`;
    
    this.elements.resultsSection.style.display = 'block';
    this.elements.resultsSection.classList.add('fade-in');
  }

  // 添加到历史记录
  addToHistory(result) {
    let history = this.getUploadHistory();
    
    const historyItem = {
      id: result.fileId,
      fileName: result.fileName,
      fileSize: result.fileSize,
      contentType: result.contentType,
      url: result.url,
      uploadTime: result.uploadTime
    };

    // 添加到历史记录开头
    history.unshift(historyItem);
    
    // 限制历史记录数量
    if (history.length > 50) {
      history = history.slice(0, 50);
    }

    localStorage.setItem('uploadHistory', JSON.stringify(history));
    this.renderHistory();
  }

  // 获取上传历史
  getUploadHistory() {
    try {
      const history = localStorage.getItem('uploadHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  // 加载上传历史
  loadUploadHistory() {
    this.renderHistory();
  }

  // 渲染历史记录
  renderHistory() {
    const history = this.getUploadHistory();
    const container = this.elements.historyList;

    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-history">
          <div class="empty-icon">📷</div>
          <p>暂无上传记录</p>
          <span>上传您的第一张图片开始使用服务</span>
        </div>
      `;
      return;
    }

    const historyHeader = `
      <div class="history-header">
        <div class="history-stats">
          <span>共 ${history.length} 张图片</span>
          <span>总大小 ${this.formatFileSize(history.reduce((sum, item) => sum + (item.fileSize || 0), 0))}</span>
        </div>
        <button class="clear-all-btn" onclick="imageBed.clearAllHistory()" title="清空所有记录">
          🗑️ 清空全部
        </button>
      </div>
    `;

    const historyItems = history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <img src="${item.url}" alt="${item.fileName}" class="history-thumbnail" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAyOEMyNCAyOCAyOCAyNCAyOCAyMFMxNiAxMiAyMCAxMlMxMiAxNiAxMiAyMFMxNiAyOCAyMCAyOFoiIGZpbGw9IiNDQ0NDQ0MiLz4KPC9zdmc+'">
        <div class="history-info">
          <h4 title="${item.fileName}">${this.truncateFileName(item.fileName)}</h4>
          <p>${this.formatFileSize(item.fileSize)} • ${this.formatDate(item.uploadTime)}</p>
        </div>
        <div class="history-actions">
          <div class="copy-options">
            <button class="copy-link-btn direct" onclick="imageBed.copyToClipboard('${item.url}')" title="复制直链">
              🔗
            </button>
            <button class="copy-link-btn markdown" onclick="imageBed.copyToClipboard('![${item.fileName}](${item.url})')" title="复制Markdown">
              📝
            </button>
            <button class="copy-link-btn html" onclick="imageBed.copyToClipboard('<img src=&quot;${item.url}&quot; alt=&quot;${item.fileName}&quot; />')" title="复制HTML">
              🌐
            </button>
            <button class="copy-link-btn" onclick="window.open('${item.url}', '_blank')" title="预览图片">
              👁️
            </button>
          </div>
          <button class="delete-btn" onclick="imageBed.deleteFromHistory('${item.id}')" title="删除记录">
            🗑️
          </button>
        </div>
      </div>
    `).join('');

    container.innerHTML = historyHeader + historyItems;
  }

  // 截断文件名
  truncateFileName(fileName, maxLength = 20) {
    if (fileName.length <= maxLength) return fileName;
    const ext = fileName.split('.').pop();
    const name = fileName.substring(0, fileName.lastIndexOf('.'));
    const maxNameLength = maxLength - ext.length - 4; // 4 for '...' and '.'
    return name.substring(0, maxNameLength) + '...' + '.' + ext;
  }

  // 从历史记录中删除
  deleteFromHistory(fileId) {
    if (!confirm('确定要从历史记录中删除这张图片吗？')) {
      return;
    }

    let history = this.getUploadHistory();
    const item = history.find(h => h.id === fileId);

    if (!item) {
      this.showToast('记录不存在', 'error');
      return;
    }

    history = history.filter(item => item.id !== fileId);
    localStorage.setItem('uploadHistory', JSON.stringify(history));
    this.renderHistory();
    this.showToast(`已删除 ${item.fileName}`);
  }

  // 清空所有历史记录
  clearAllHistory() {
    if (!confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
      return;
    }

    localStorage.removeItem('uploadHistory');
    this.renderHistory();
    this.showToast('已清空所有历史记录');
  }

  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // 格式化日期
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前';
    } else if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前';
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  }

  // 复制到剪贴板
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('已复制到剪贴板');
    } catch (error) {
      // 备用复制方法
      this.fallbackCopyTextToClipboard(text);
    }
  }

  // 备用复制方法
  fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      this.showToast('已复制到剪贴板');
    } catch (error) {
      console.error('Failed to copy text:', error);
      this.showToast('复制失败', 'error');
    }

    document.body.removeChild(textArea);
  }

  // 显示提示消息
  showToast(message, type = 'success') {
    // 移除现有toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // 添加图标
    const icon = this.getToastIcon(type);
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;

    document.body.appendChild(toast);

    // 添加显示动画
    setTimeout(() => toast.classList.add('show'), 10);

    // 根据类型设置不同的持续时间
    const duration = type === 'error' ? 5000 : 3000;

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  // 获取Toast图标
  getToastIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || '📝';
  }
}

// 全局函数
window.copyText = function(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    window.imageBed.copyToClipboard(input.value);
  }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.imageBed = new ImageBed();
});
