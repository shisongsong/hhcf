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
        await this.login();
        headers['Authorization'] = `Bearer ${this.token}`;
        const retryResponse = await fetch(`${API_BASE}${options.url}`, {
          method: options.method || 'GET',
          headers,
          body: options.data ? JSON.stringify(options.data) : undefined,
        });
        const retryData = await retryResponse.json();
        if (retryData.success) {
          return retryData;
        }
        throw new Error(retryData.error || '请求失败');
      }

      throw new Error(data.error || '请求失败');
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('API Error:', error.name, error.message);
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络');
      }
      throw new Error(error.message || '网络错误，请稍后重试');
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
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
    return this.request('/api/records?type=today');
  }

  async getRecords(page = 1, limit = 20) {
    return this.request(`/api/records?page=${page}&limit=${limit}`);
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

    const uploadResponse = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    let uploadResult;
    try {
      uploadResult = await uploadResponse.json();
    } catch {
      const text = await uploadResponse.text();
      console.error('Non-JSON response:', text);
      throw new Error('上传图片失败，请重试');
    }
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || '上传图片失败');
    }

    const { imageUrls } = uploadResult.data;
    
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

    const recordResult = await recordResponse.json();
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
