const API_BASE = 'https://hhcf-api.openanthropic.com';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  async testConnection(): Promise<{success: boolean; message: string}> {
    try {
      console.log('测试连接...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('连接响应:', response.status);
      if (response.ok) {
        return { success: true, message: '连接成功' };
      }
      return { success: false, message: 'HTTP ' + response.status };
    } catch (error: any) {
      console.log('连接错误:', error.message);
      if (error.name === 'AbortError') {
        return { success: false, message: '连接超时' };
      }
      return { success: false, message: error.message };
    }
  }

  async request<T = any>(options: RequestOptions): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      console.log('API请求:', options.method || 'GET', options.url);
      console.log('Token:', this.token ? '已设置' : '未设置');
      
      const response = await fetch(`${API_BASE}${options.url}`, {
        method: options.method || 'GET',
        headers,
        body: options.data ? JSON.stringify(options.data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (data.success) {
        return data;
      }

      if (data.error === '未登录' || data.error === 'token无效') {
        // 清除本地存储的无效 token
        this.token = null;
        throw new Error('请重新登录');
      }

      throw new Error(data.error || '请求失败');
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('API Error:', error.name, error.message);
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络');
      }
      // Show more details about the error
      const errorMsg = error.message || '网络错误';
      throw new Error(`网络错误: ${errorMsg}`);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  async login(code: string): Promise<{ openid: string; token: string }> {
    const response = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await response.json();
    if (data.success) {
      this.token = data.token;
      return { openid: data.openid, token: data.token };
    }
    throw new Error(data.error || '登录失败');
  }

  async sendVerificationCode(phone: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || '发送失败');
    }
  }

  async phoneLogin(phone: string, verificationCode: string): Promise<{ openid: string; token: string }> {
    const response = await fetch(`${API_BASE}/api/phone-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, verificationCode }),
    });
    const data = await response.json();
    if (data.success) {
      this.token = data.token;
      return { openid: data.openid, token: data.token };
    }
    throw new Error(data.error || '登录失败');
  }

  async getTodayMeals() {
    const data = await this.request('/api/records');
    const records = data.data || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    const todayRecords = records.filter((r: any) => r.timestamp >= todayStart && r.timestamp < todayEnd);
    return { data: todayRecords };
  }

  async getRecords(page = 1, limit = 20) {
    return this.request(`/api/records?limit=${limit}`);
  }

  async getRecord(id: string) {
    return this.request(`/api/records/${id}`);
  }

  async uploadRecord(data: {
    mealType: string;
    title: string;
    photos: string[];
    date?: string;
  }) {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const formData = new FormData();
    data.photos.forEach((photo) => {
      formData.append('files', {
        uri: photo,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
    });

    console.log('上传图片...');
    const uploadResponse = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    let uploadResult;
    try {
      const text = await uploadResponse.text();
      console.log('上传响应:', text.substring(0, 200));
      uploadResult = JSON.parse(text);
    } catch (e) {
      console.error('解析上传响应失败:', e);
      throw new Error('上传图片失败，请重试');
    }
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || '上传图片失败');
    }

    const { imageUrls } = uploadResult.data;
    console.log('图片上传成功, URLs:', imageUrls);
    
    console.log('保存记录...');
    const recordResponse = await fetch(`${API_BASE}/api/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        imageUrls,
        mealType: data.mealType,
        title: data.title,
        timestamp: data.date ? new Date(data.date).getTime() : undefined,
      }),
    });

    let recordResult;
    try {
      const text = await recordResponse.text();
      console.log('记录响应:', text.substring(0, 200));
      recordResult = JSON.parse(text);
    } catch (e) {
      console.error('解析记录响应失败:', e);
      throw new Error('保存记录失败，请重试');
    }
    
    if (recordResult.success) {
      return recordResult;
    }
    throw new Error(recordResult.error || '保存记录失败');
  }

  async deleteRecord(id: string) {
    return this.request({
      url: `/api/records/${id}`,
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
export default api;
