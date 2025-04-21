import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API'nin temel URL'si (Django sunucunuzun URL'si) - varsayılan değer
let API_BASE_URL = 'http://192.168.1.101:8000';
let API_URL = `${API_BASE_URL}/api/v1/`;

// API URL'sini ve base URL'i döndüren fonksiyonlar
export const getApiUrl = () => API_URL;
export const getApiBaseUrl = () => API_BASE_URL;

// API URL'sini güncelleyen fonksiyon
export const updateApiUrl = (ipAddress) => {
  API_BASE_URL = `http://${ipAddress}:8000`;
  API_URL = `${API_BASE_URL}/api/v1/`;
  console.log(`API URL updated to: ${API_URL}`);
  
  // API instance'ını yeni URL ile güncelle
  api.defaults.baseURL = API_URL;
  
  return API_URL;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 saniye timeout
  // Retry mekanizması ekleniyor
  validateStatus: function (status) {
    return status >= 200 && status < 500; // 500 ve üzeri hataları reddet, böylece tekrar deneme yapılabilir
  }
});

// İstek göndermeden önce token ekleyen interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.log('Request error:', error);
    return Promise.reject(error);
  }
);

// Token yenileme işlemi için interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Network hatası veya timeout durumunda retry mekanizması
    if (!error.response && !originalRequest._retry) {
      console.log('Network error, attempting retry...');
      originalRequest._retry = true;
      // 2 saniye bekleyip yeniden dene
      await new Promise(resolve => setTimeout(resolve, 2000));
      return api(originalRequest);
    }
    
    // 401 hatası ve henüz yenileme denenmemiş ise
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        console.log('Attempting to refresh token...');
        // Refresh token ile yeni token al
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          console.log('No refresh token available');
          // Token'ları temizle ve çıkış yap
          await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
          return Promise.reject(error);
        }
        
        const response = await axios.post(`${API_URL}token/refresh/`, {
          refresh: refreshToken,
        });
        
        if (response.data && response.data.access) {
          console.log('Token refreshed successfully');
          // Yeni token'ı kaydet
          await AsyncStorage.setItem('access_token', response.data.access);
          
          // Yeni token ile isteği tekrarla
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return api(originalRequest);
        } else {
          console.log('Refresh response did not contain a new token');
          await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
          return Promise.reject(error);
        }
      } catch (err) {
        console.error('Token refresh failed:', err.message);
        // Token yenileme başarısız, kullanıcıyı çıkış yapmaya yönlendir
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;