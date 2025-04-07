import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ChargingCalculatorScreen from '../screens/ChargingCalculatorScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import MapScreen from '../screens/MapScreen'; // Add this import

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
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
        }}
      >
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;