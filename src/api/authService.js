import api from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  // Kullanıcı girişi
  login: async (username, password) => {
    try {
      console.log(`Attempting login for user: ${username}`);
      
      const response = await api.post('token/', {
        username,
        password,
      });
      
      if (!response.data || !response.data.access) {
        console.error('Login response does not contain token:', response.data);
        if (response.data && response.data.detail) {
          // Daha açıklayıcı hata mesajı
          throw new Error(response.data.detail);
        } else {
          throw new Error('Token alınamadı');
        }
      }
      
      console.log('Login successful, saving tokens');
      
      // Token'ları kaydet
      await AsyncStorage.multiSet([
        ['access_token', response.data.access],
        ['refresh_token', response.data.refresh]
      ]);
      
      // Token doğrulama
      const token = await AsyncStorage.getItem('access_token');
      console.log('Token stored in AsyncStorage:', token ? 'Yes' : 'No');
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Token doğrulama
  verifyToken: async (token) => {
    if (!token) {
      console.log('No token provided for verification');
      return false;
    }
    
    try {
      await api.post('token/verify/', { token });
      return true;
    } catch (error) {
      console.log('Token verification failed:', error.message);
      return false;
    }
  },
  
  // Kullanıcı doğrulama (AppNavigator'da kullanılıyor)
  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        console.log('No token found during authentication check');
        // Token yoksa, temizlik yap
        await authService.logout();
        return false;
      }
      
      // Token doğrulama isteği gönder
      const isValid = await authService.verifyToken(token);
      
      if (!isValid) {
        console.log('Token is invalid or expired');
        await authService.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      // Token geçersiz veya sunucu hatası
      console.log('Authentication error:', error);
      // Token'ları temizle
      await authService.logout();
      return false; 
    }
  },
  
  // Kullanıcı çıkışı
  logout: async () => {
    try {
      // Token'ları temizle
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      console.log('Logout successful, tokens removed');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  },
};

export default authService;
