/**
 * 前端JavaScript功能实现
 * 包含文件上传、拖拽、预览、链接复制、历史记录等功能
 */

class ImageBed {
  constructor() {
    // 使用EdgeOne加速域名，提供中国区域快速访问
    this.apiBaseUrl = 'https://api.yz-image.com'; // EdgeOne加速API域名
    this.fallbackApiUrl = 'https://image-bed-worker.yangzhen0806.workers.dev'; // 备用原始域名
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    
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

  // 带容错的API请求方法
  async makeApiRequest(url, options = {}) {
    try {
      // 首先尝试EdgeOne加速域名
      const edgeOneUrl = url.replace(this.fallbackApiUrl, this.apiBaseUrl);
      const response = await fetch(edgeOneUrl, options);
      if (response.ok) {
        return response;
      }
      throw new Error(`EdgeOne API failed: ${response.status}`);
    } catch (error) {
      console.warn('EdgeOne API失败，尝试备用域名:', error.message);
      // 如果EdgeOne失败，使用原始域名
      const fallbackUrl = url.replace(this.apiBaseUrl, this.fallbackApiUrl);
      return fetch(fallbackUrl, options);
    }
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

    const imageFiles = Array.from(files).filter(file => 
      this.supportedTypes.includes(file.type)
    );

    if (imageFiles.length === 0) {
      this.showToast('请选择有效的图片文件', 'error');
      return;
    }

    if (imageFiles.length === 1) {
      await this.uploadSingleFile(imageFiles[0]);
    } else {
      await this.uploadMultipleFiles(imageFiles);
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

    const response = await this.makeApiRequest(`${this.apiBaseUrl}/api/upload`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || '上传失败');
    }

    return result;
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

    container.innerHTML = history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <img src="${item.url}" alt="${item.fileName}" class="history-thumbnail" loading="lazy">
        <div class="history-info">
          <h4>${item.fileName}</h4>
          <p>${this.formatFileSize(item.fileSize)} • ${this.formatDate(item.uploadTime)}</p>
        </div>
        <div class="history-actions">
          <div class="copy-options">
            <button class="copy-link-btn direct" onclick="imageBed.copyToClipboard('${item.url}')" title="复制直链">
              🔗 直链
            </button>
            <button class="copy-link-btn markdown" onclick="imageBed.copyToClipboard('![${item.fileName}](${item.url})')" title="复制Markdown格式">
              📝 MD
            </button>
            <button class="copy-link-btn html" onclick="imageBed.copyToClipboard('<img src=&quot;${item.url}&quot; alt=&quot;${item.fileName}&quot; />')" title="复制HTML格式">
              🌐 HTML
            </button>
          </div>
          <button class="delete-btn" onclick="imageBed.deleteFromHistory('${item.id}')">删除</button>
        </div>
      </div>
    `).join('');
  }

  // 从历史记录中删除
  deleteFromHistory(fileId) {
    let history = this.getUploadHistory();
    history = history.filter(item => item.id !== fileId);
    localStorage.setItem('uploadHistory', JSON.stringify(history));
    this.renderHistory();
    this.showToast('已从历史记录中删除');
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
    toast.textContent = message;
    document.body.appendChild(toast);

    // 3秒后自动移除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 3000);
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