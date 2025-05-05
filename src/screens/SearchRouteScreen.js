import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getGeocode } from '../api/map';

const SearchRouteScreen = () => {
  const navigation = useNavigation();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoute = async () => {
    if (origin && destination) {
      setIsLoading(true);
      try {
        // Doğrudan adres bilgilerini kullanarak rota oluştur
        navigation.navigate('MapScreen', {
          origin: {
            name: origin
          },
          destination: {
            name: destination
          }
        });
      } catch (error) {
        console.error('Rota oluşturma hatası:', error);
        Alert.alert('Hata', 'Rota oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rota Oluştur</Text>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="location" size={20} color="#00b8d4" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Başlangıç noktası"
              value={origin}
              onChangeText={setOrigin}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="location" size={20} color="#00b8d4" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Varış noktası"
              value={destination}
              onChangeText={setDestination}
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity
            style={[styles.createButton, (!origin || !destination || isLoading) && styles.disabledButton]}
            onPress={handleCreateRoute}
            disabled={!origin || !destination || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Rota Oluştur</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  inputContainer: {
    padding: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  createButton: {
    backgroundColor: '#00b8d4',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SearchRouteScreen;