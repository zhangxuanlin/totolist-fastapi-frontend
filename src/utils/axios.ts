import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';

// 创建 axios 实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_DATA_API_BASE_URL || '/api',
  timeout: 600000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 在发送请求之前做些什么
    // 例如：添加 token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => {
    // 处理请求错误
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    // 对响应数据做些什么
    const { status, data } = response;
    
    // 状态码成功
    if (status === 200) {
      // 根据后端约定的格式处理
      // 假设后端返回格式为 { code, message, data }
      if (data.code === 0 || data.code === 200) {
        return data;
      } else {
        // 业务错误，显示错误信息
        message.error(data.message || '操作失败');
        return Promise.reject(data);
      }
    }
    
    return response.data;
  },
  (error: any) => {
    // 处理响应错误
    console.error('Response error:', error);
    
    // 根据状态码处理不同的错误
    const status = error.response?.status;
    
    switch (status) {
      case 401:
        message.error('登录失效，请重新登录');
        // 清除 token 并跳转到登录页
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      case 403:
        message.error('没有权限访问该资源');
        break;
      case 404:
        message.error('请求的资源不存在');
        break;
      case 500:
        message.error('服务器内部错误');
        break;
      default:
        message.error(error.message || '请求失败');
    }
    
    return Promise.reject(error);
  }
);

// 封装常用请求方法
const request = {
  /**
   * GET 请求
   * @param url 请求地址
   * @param params 请求参数
   * @param config 额外配置
   */
  get<T = any>(url: string, params?: object, config?: AxiosRequestConfig): Promise<T> {
    return service.get(url, { params, ...config });
  },

  /**
   * POST 请求
   * @param url 请求地址
   * @param data 请求体
   * @param config 额外配置
   */
  post<T = any>(url: string, data?: object, config?: AxiosRequestConfig): Promise<T> {
    return service.post(url, data, config);
  },

  /**
   * PUT 请求
   * @param url 请求地址
   * @param data 请求体
   * @param config 额外配置
   */
  put<T = any>(url: string, data?: object, config?: AxiosRequestConfig): Promise<T> {
    return service.put(url, data, config);
  },

  /**
   * DELETE 请求
   * @param url 请求地址
   * @param params 请求参数
   * @param config 额外配置
   */
  delete<T = any>(url: string, params?: object, config?: AxiosRequestConfig): Promise<T> {
    return service.delete(url, { params, ...config });
  },

  /**
   * PATCH 请求
   * @param url 请求地址
   * @param data 请求体
   * @param config 额外配置
   */
  patch<T = any>(url: string, data?: object, config?: AxiosRequestConfig): Promise<T> {
    return service.patch(url, data, config);
  },
};

export default request;
export { service };
