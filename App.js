import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Dosya yolunu kontrol edelim
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  // Uygulama başlangıcında token'ları temizleyelim
  useEffect(() => {
    const clearTokens = async () => {
      try {
        console.log('Checking and clearing tokens on app startup');
        
        // Önce token'ların var olup olmadığını kontrol edelim
        const accessToken = await AsyncStorage.getItem('access_token');
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        
        console.log('Found tokens on startup:', { 
          accessToken: accessToken ? 'exists' : 'none', 
          refreshToken: refreshToken ? 'exists' : 'none' 
        });
        
        // Uygulamayı her başlattığımızda token'ları temizliyoruz
        // Bu, geliştirme sırasında "her zaman LoginScreen göster" stratejisini zorlar
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        console.log('Tokens cleared successfully');
        
        // Kontrol amaçlı son durum
        const checkAccess = await AsyncStorage.getItem('access_token');
        console.log('After clearing, access token exists:', checkAccess ? 'yes' : 'no');
      } catch (error) {
        console.error('Error clearing tokens:', error);
      }
    };
    
    clearTokens();
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
      <StatusBar style="light" backgroundColor="#1a2234" />
    </SafeAreaProvider>
  );
}
