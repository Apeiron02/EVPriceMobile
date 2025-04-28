import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, FlatList, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateApiUrl, getApiBaseUrl } from '../api/index';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TestScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState('elektrikli-araclar');
  const [latitude, setLatitude] = useState('41.0082');  // Default İstanbul koordinatları
  const [longitude, setLongitude] = useState('28.9784');
  const [ipAddress, setIpAddress] = useState('192.168.1.101'); // Güncel IP adresi
  //const [ipAddress, setIpAddress] = useState('10.196.154.5'); // Güncel IP adresi
  
  // Component mount olduğunda mevcut API URL'den IP'yi al
  useEffect(() => {
    const currentBaseUrl = getApiBaseUrl();
    // http://10.196.154.5:8000 formatından IP adresini çıkar
    const urlParts = currentBaseUrl.split('//');
    if (urlParts.length > 1) {
      const hostPart = urlParts[1].split(':')[0];
      if (hostPart) {
        setIpAddress(hostPart);
      }
    }
    
    // Rota parametrelerini kontrol et
    if (route.params?.endpoint) {
      setSelectedEndpoint(route.params.endpoint);
      // Otomatik olarak API'yi test et
      if (route.params?.autoTest) {
        setTimeout(() => {
          testConnection();
        }, 500);
      }
    }
  }, [route.params]);
  
  // Kullanılabilir API endpoint'leri
  const apiEndpoints = [
    'elektrikli-araclar',
    'kullanici-arac-tercihi',
    'rota-gecmisi',
    'kullanici-kayit',
    'kullanici-profil',
    'kullanicilar',
    'token',
    'token-refresh',
    'token-verify',
    'yakin-sarj-istasyonlari',
    'rota-bilgisi',
    'hava-durumu'
  ];
  
  // Endpoint'leri gruplar - UI için
  const endpointGroups = [
    { title: 'Kullanıcı Bilgileri', items: ['kullanici-kayit', 'kullanici-profil', 'kullanicilar'] },
    { title: 'Araç Bilgileri', items: ['elektrikli-araclar', 'kullanici-arac-tercihi'] },
    { title: 'Rota ve Harita', items: ['rota-gecmisi', 'rota-bilgisi', 'yakin-sarj-istasyonlari'] },
    { title: 'Diğer', items: ['hava-durumu'] },
    { title: 'Kimlik Doğrulama', items: ['token', 'token-refresh', 'token-verify'] },
  ];
  
  // Endpoint için ikon seçimi
  const getIconForEndpoint = (endpoint) => {
    const iconMap = {
      'elektrikli-araclar': 'car',
      'kullanici-arac-tercihi': 'options',
      'rota-gecmisi': 'time',
      'kullanici-kayit': 'person-add',
      'kullanici-profil': 'person',
      'kullanicilar': 'people',
      'token': 'key',
      'token-refresh': 'refresh',
      'token-verify': 'checkmark-circle',
      'yakin-sarj-istasyonlari': 'flash',
      'rota-bilgisi': 'map',
      'hava-durumu': 'cloudy'
    };
    
    return iconMap[endpoint] || 'code-working';
  };
  
  // IP adresi değiştiğinde API URL'sini güncelle
  const handleIpChange = (newIp) => {
    setIpAddress(newIp);
  };

  // IP adresini kaydet ve API URL'sini güncelle
  const updateServerIp = async () => {
    try {
      // Mevcut IP'yi al ve karşılaştır
      const currentBaseUrl = getApiBaseUrl();
      const urlParts = currentBaseUrl.split('//');
      let currentIp = '';
      if (urlParts.length > 1) {
        currentIp = urlParts[1].split(':')[0];
      }
      
      // IP değişikliği varsa token'ları temizle
      if (currentIp !== ipAddress) {
        console.log('IP değişikliği tespit edildi. Oturum bilgileri temizleniyor.');
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        
        // Son kullanılan IP'yi güncelle
        await AsyncStorage.setItem('last_used_ip', ipAddress);
      }
      
      // Tüm uygulama için API URL'sini güncelle
      updateApiUrl(ipAddress);
      Alert.alert(
        "Başarılı",
        `Sunucu adresi güncellendi: ${ipAddress}`,
        [{ text: "Tamam" }]
      );
    } catch (error) {
      console.error('Sunucu IP güncellenirken hata:', error);
      Alert.alert(
        "Hata",
        `Sunucu adresi güncellenirken bir hata oluştu: ${error.message}`,
        [{ text: "Tamam" }]
      );
    }
  };
  
  const testConnection = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      let url = `http://${ipAddress}:8000/api/v1/`;
      
      // Endpoint'e göre URL oluştur
      if (selectedEndpoint === 'yakin-sarj-istasyonlari') {
        url = `http://${ipAddress}:8000/api/v1/${selectedEndpoint}/?lat=${latitude}&lng=${longitude}`;
      } else if (selectedEndpoint !== '') {
        url = `http://${ipAddress}:8000/api/v1/${selectedEndpoint}/`;
      }
      
      console.log('Requesting URL:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 saniye timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      console.log('Response:', data);
      setResult(data);
    } catch (err) {
      console.error('API Error:', err);
      
      let errorMessage = err.message;
      if (err.name === 'AbortError') {
        errorMessage = 'İstek zaman aşımına uğradı. Sunucu yanıt vermiyor.';
      } else if (err.message === 'Network request failed') {
        errorMessage = 'Ağ isteği başarısız oldu. Sunucu çalışmıyor veya IP adresi yanlış olabilir.';
      }
      
      setError(errorMessage);
      
      // Daha detaylı hata mesajı göster
      Alert.alert(
        "Bağlantı Hatası",
        `API'ye bağlanırken bir hata oluştu: ${errorMessage}\n\nSunucunun çalıştığından, IP adresinin doğru olduğundan ve Django sunucunuzdaki CORS ayarlarının düzgün yapılandırıldığından emin olun.`,
        [{ text: "Tamam" }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Endpoint Butonu Renderlama
  const renderEndpointButton = (endpoint) => (
    <TouchableOpacity
      key={endpoint}
      style={[
        styles.endpointButton,
        selectedEndpoint === endpoint && styles.selectedEndpoint
      ]}
      onPress={() => setSelectedEndpoint(endpoint)}
    >
      <Ionicons 
        name={getIconForEndpoint(endpoint)} 
        size={20} 
        color={selectedEndpoint === endpoint ? '#fff' : '#00b8d4'} 
        style={styles.endpointIcon}
      />
      <Text 
        style={[
          styles.endpointText,
          selectedEndpoint === endpoint && styles.selectedEndpointText,
          { marginLeft: 8 }
        ]}
        numberOfLines={1}
      >
        {endpoint}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Bağlantı Testi</Text>
      
      <View style={styles.ipContainer}>
        <Text style={styles.subtitle}>Sunucu IP Adresi:</Text>
        <View style={styles.ipInputContainer}>
          <TextInput
            style={styles.ipInput}
            value={ipAddress}
            onChangeText={handleIpChange}
            placeholder="Sunucu IP adresi (ör: 10.196.154.5)"
            placeholderTextColor="#a0a9bc"
          />
          <TouchableOpacity 
            style={styles.saveIpButton}
            onPress={updateServerIp}
          >
            <Ionicons name="save" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.ipSelectButton}
          onPress={() => navigation.navigate('IpSelect')}
        >
          <Ionicons name="list" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.ipSelectButtonText}>Kayıtlı IP'lere Git</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.subtitle}>Test edilecek endpoint'i seçin:</Text>
      
      <ScrollView style={styles.endpointScrollView}>
        {endpointGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.endpointGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.endpointButtonGrid}>
              {group.items.map(endpoint => renderEndpointButton(endpoint))}
            </View>
          </View>
        ))}
      </ScrollView>
      
      {selectedEndpoint === 'yakin-sarj-istasyonlari' && (
        <View style={styles.coordinatesContainer}>
          <Text style={styles.subtitle}>Koordinatlar:</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enlem:</Text>
              <TextInput
                style={styles.input}
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
                placeholder="Enlem (ör: 41.0082)"
                placeholderTextColor="#a0a9bc"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Boylam:</Text>
              <TextInput
                style={styles.input}
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
                placeholder="Boylam (ör: 28.9784)"
                placeholderTextColor="#a0a9bc"
              />
            </View>
          </View>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={testConnection}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="send" size={20} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Bağlantıyı Test Et</Text>
          </>
        )}
      </TouchableOpacity>
      
      {error && (
        <View style={styles.resultContainer}>
          <Text style={styles.errorText}>Hata: {error}</Text>
          <Text style={styles.tip}>
            İpucu: Django sunucusunun çalıştığından ve IP adresinin doğru olduğundan emin olun.
            Test edilen URL: http://{ipAddress}:8000/api/v1/{selectedEndpoint}/
            {selectedEndpoint === 'yakin-sarj-istasyonlari' ? `?lat=${latitude}&lng=${longitude}` : ''}
          </Text>
        </View>
      )}
      
      {result && (
        <ScrollView style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={styles.successText}>Bağlantı başarılı!</Text>
            <View style={styles.endpointInfo}>
              <Text style={styles.endpointInfoLabel}>Endpoint:</Text>
              <View style={styles.selectedEndpointBadge}>
                <Ionicons 
                  name={getIconForEndpoint(selectedEndpoint)} 
                  size={16} 
                  color="#fff" 
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.endpointValue}>{selectedEndpoint}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.jsonText}>
            {JSON.stringify(result, null, 2)}
          </Text>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1a2234',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#00b8d4',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 10,
    color: '#ffffff',
  },
  ipContainer: {
    backgroundColor: '#2d3446',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  ipInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ipInput: {
    flex: 1,
    backgroundColor: '#3d4559',
    borderRadius: 5,
    padding: 10,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#4d5569',
  },
  saveIpButton: {
    backgroundColor: '#00b8d4',
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  ipSelectButton: {
    flexDirection: 'row',
    backgroundColor: '#3d4559',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ipSelectButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
  endpointScrollView: {
    maxHeight: 250,
    marginBottom: 15,
  },
  endpointGroup: {
    marginBottom: 15,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#a0a9bc',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  endpointButtonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  endpointButton: {
    backgroundColor: '#2d3446',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3d4559',
    minWidth: 130,
    maxWidth: 170,
  },
  selectedEndpoint: {
    backgroundColor: '#00b8d4',
    borderColor: '#00b8d4',
  },
  endpointIcon: {
    marginRight: 5,
  },
  endpointText: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },
  selectedEndpointText: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  button: {
    backgroundColor: '#00b8d4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    flexDirection: 'row',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultContainer: {
    backgroundColor: '#2d3446',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    flex: 1,
  },
  resultHeader: {
    marginBottom: 15,
  },
  successText: {
    color: '#4caf50',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    color: '#f44336',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  jsonText: {
    fontFamily: 'monospace',
    color: '#ffffff',
    fontSize: 13,
  },
  tip: {
    marginTop: 10,
    fontStyle: 'italic',
    color: '#a0a9bc',
  },
  endpointInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  endpointInfoLabel: {
    color: '#a0a9bc',
    marginRight: 10,
  },
  endpointValue: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  selectedEndpointBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00b8d4',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  coordinatesContainer: {
    backgroundColor: '#2d3446',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  inputLabel: {
    color: '#ffffff',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#3d4559',
    borderRadius: 5,
    padding: 10,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#4d5569',
  }
});

export default TestScreen;