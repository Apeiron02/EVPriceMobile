import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Text, Alert, TouchableOpacity } from 'react-native';

// Navigation utils
import { setNavigationRef } from './navigationUtils';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ChargingCalculatorScreen from '../screens/ChargingCalculatorScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import MapScreen from '../screens/MapScreen';
import LoginScreen from '../screens/LoginScreen';
// IP Seçim Ekranı
import IpSelectScreen from '../screens/IpSelectScreen';
// Temporarily comment out the problematic import
import TestScreen from '../screens/TestScreen';
import SearchRouteScreen from '../screens/SearchRouteScreen';

// Services
import authService from '../api/authService';

const Stack = createNativeStackNavigator();

// Eski döngüsel import kodu kaldırıldı
// let navigationRef = null;
// export const reset = (routes) => { ... }

const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Basit bir başlatma kontrolü
    const bootstrapAsync = async () => {
      try {
        // API bağlantısını kontrol etmek için basit bir test
        // await authService.checkApiConnection();
        setIsLoading(false);
      } catch (e) {
        console.error('Bootstrap error:', e);
        setError(e.message);
        setIsLoading(false);
      }
    };

    // Kısa bir yükleme ekranı göster ve başlat
    setTimeout(() => {
      bootstrapAsync();
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a2234' }}>
        <ActivityIndicator size="large" color="#00b8d4" />
      </View>
    );
  }

  if (error && error === 'Network request failed') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a2234', padding: 20 }}>
        <Text style={{ color: '#f44336', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
          Sunucuya bağlanılamıyor
        </Text>
        <Text style={{ color: '#ffffff', textAlign: 'center', marginBottom: 20 }}>
          API sunucusuna bağlantı kurulamadı. Lütfen sunucunun çalıştığından ve ağ bağlantınızın doğru olduğundan emin olun.
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <TouchableOpacity 
            style={{ 
              backgroundColor: '#2d3446',
              paddingVertical: 8,
              paddingHorizontal: 15,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#00b8d4',
              marginRight: 10
            }}
            onPress={() => navigationRef && navigationRef.navigate('Test')}
          >
            <Text style={{ color: '#00b8d4', fontSize: 14 }}>API Testi</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ 
              backgroundColor: '#00b8d4',
              paddingVertical: 8,
              paddingHorizontal: 15,
              borderRadius: 20
            }}
            onPress={() => {
              setError(null);
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 1000);
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 14 }}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={(ref) => { setNavigationRef(ref); }}
    >
      <Stack.Navigator
        initialRouteName="IpSelect"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a2234',
          },
          headerTintColor: '#00b8d4',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#1a2234',
          },
          headerShadowVisible: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen 
          name="IpSelect" 
          component={IpSelectScreen} 
          options={{ 
            headerShown: false,
            title: 'Sunucu Seçin',
          }} 
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="Test" 
          component={TestScreen} 
          options={{ 
            title: 'API Testi',
          }} 
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ 
            title: 'Ana Sayfa',
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="ChargingCalculator" 
          component={ChargingCalculatorScreen} 
          options={{ 
            title: 'Şarj Hesaplama',
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="UserProfile" 
          component={UserProfileScreen} 
          options={{ 
            title: 'Kullanıcı Bilgileri',
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="MapScreen" 
          component={MapScreen} 
          options={{ 
            title: 'Harita',
            headerShown: false,
          }} 
        />
        <Stack.Screen name="SearchRoute" component={SearchRouteScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;