import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateApiUrl } from '../api';

const IpSelectScreen = ({ navigation }) => {
  const [ipAddresses, setIpAddresses] = useState([]);
  const [newIpAddress, setNewIpAddress] = useState('');
  const [selectedIp, setSelectedIp] = useState('');
  const [loading, setLoading] = useState(true);

  // AsyncStorage'dan kaydedilmiş IP adreslerini yükle
  useEffect(() => {
    loadSavedIps();
  }, []);

  const loadSavedIps = async () => {
    try {
      setLoading(true);
      const savedIps = await AsyncStorage.getItem('saved_ip_addresses');
      
      if (savedIps) {
        const ipsArray = JSON.parse(savedIps);
        setIpAddresses(ipsArray);
        
        // Son kullanılan IP adresini yükle
        const lastUsedIp = await AsyncStorage.getItem('last_used_ip');
        if (lastUsedIp) {
          setSelectedIp(lastUsedIp);
        } else if (ipsArray.length > 0) {
          // Kaydedilmiş IP yoksa listedeki ilk IP'yi seç
          setSelectedIp(ipsArray[0].ip);
        }
      } else {
        // Varsayılan IP listesi
        const defaultIps = [
          { id: '1', ip: '192.168.1.101', name: 'Ev' },
          { id: '2', ip: '10.0.2.2', name: 'Emülatör' }
        ];
        setIpAddresses(defaultIps);
        setSelectedIp('192.168.1.101');
        await AsyncStorage.setItem('saved_ip_addresses', JSON.stringify(defaultIps));
      }
    } catch (error) {
      console.error('IP adreslerini yüklerken hata:', error);
      Alert.alert(
        'Hata',
        'IP adresleri yüklenirken bir hata oluştu.'
      );
    } finally {
      setLoading(false);
    }
  };

  const saveIpAddress = async () => {
    if (!newIpAddress.trim()) {
      Alert.alert('Hata', 'Lütfen bir IP adresi girin');
      return;
    }

    // IP formatını basit kontrol et
    const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (!ipPattern.test(newIpAddress)) {
      Alert.alert('Hata', 'Geçersiz IP formatı. Örn: 192.168.1.101');
      return;
    }

    try {
      const newIp = {
        id: Date.now().toString(),
        ip: newIpAddress,
        name: 'Yeni Konum'
      };

      const updatedIps = [...ipAddresses, newIp];
      setIpAddresses(updatedIps);
      await AsyncStorage.setItem('saved_ip_addresses', JSON.stringify(updatedIps));
      setNewIpAddress('');
      
      // Yeni eklenen IP'yi seç
      setSelectedIp(newIpAddress);
      
      Alert.alert('Başarılı', 'IP adresi kaydedildi');
    } catch (error) {
      console.error('IP adresini kaydederken hata:', error);
      Alert.alert('Hata', 'IP adresi kaydedilemedi');
    }
  };

  const removeIpAddress = async (id) => {
    try {
      const filteredIps = ipAddresses.filter(item => item.id !== id);
      setIpAddresses(filteredIps);
      await AsyncStorage.setItem('saved_ip_addresses', JSON.stringify(filteredIps));
      
      // Silinen IP seçiliyse, başka bir IP seç
      const removedIp = ipAddresses.find(item => item.id === id);
      if (removedIp && removedIp.ip === selectedIp) {
        if (filteredIps.length > 0) {
          setSelectedIp(filteredIps[0].ip);
        } else {
          setSelectedIp('');
        }
      }
    } catch (error) {
      console.error('IP adresini silerken hata:', error);
      Alert.alert('Hata', 'IP adresi silinemedi');
    }
  };

  const editIpName = async (id, currentName) => {
    Alert.prompt(
      'İsim Değiştir',
      'Bu konum için yeni bir isim girin:',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: async (newName) => {
            if (newName && newName.trim()) {
              try {
                const updatedIps = ipAddresses.map(item => {
                  if (item.id === id) {
                    return { ...item, name: newName.trim() };
                  }
                  return item;
                });
                
                setIpAddresses(updatedIps);
                await AsyncStorage.setItem('saved_ip_addresses', JSON.stringify(updatedIps));
              } catch (error) {
                console.error('IP ismini düzenlerken hata:', error);
                Alert.alert('Hata', 'IP ismi güncellenemedi');
              }
            }
          }
        }
      ],
      'plain-text',
      currentName
    );
  };

  const selectIpAndContinue = async () => {
    if (!selectedIp) {
      Alert.alert('Hata', 'Lütfen bir IP adresi seçin');
      return;
    }

    try {
      // IP değiştiğinde varolan token'ları temizle
      const lastUsedIp = await AsyncStorage.getItem('last_used_ip');
      if (lastUsedIp !== selectedIp) {
        console.log('IP değişikliği tespit edildi. Oturum bilgileri temizleniyor.');
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      }
      
      // Seçilen IP'yi son kullanılan olarak kaydet
      await AsyncStorage.setItem('last_used_ip', selectedIp);
      
      // API URL'sini güncelle
      updateApiUrl(selectedIp);
      
      // Login ekranına git
      navigation.replace('Login');
    } catch (error) {
      console.error('IP seçilirken hata:', error);
      Alert.alert('Hata', 'IP adresi ayarlanamadı');
    }
  };

  const renderIpItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.ipItem,
        selectedIp === item.ip && styles.selectedIpItem
      ]}
      onPress={() => setSelectedIp(item.ip)}
    >
      <View style={styles.ipInfo}>
        <Ionicons 
          name={selectedIp === item.ip ? "radio-button-on" : "radio-button-off"} 
          size={22} 
          color={selectedIp === item.ip ? "#00b8d4" : "#6c7a94"} 
          style={styles.radioIcon}
        />
        <View style={styles.ipTextContainer}>
          <Text style={styles.ipAddress}>{item.ip}</Text>
          <Text style={styles.ipName}>{item.name}</Text>
        </View>
      </View>
      
      <View style={styles.ipActions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => editIpName(item.id, item.name)}
        >
          <Ionicons name="pencil" size={20} color="#a0a9bc" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => removeIpAddress(item.id)}
        >
          <Ionicons name="trash" size={20} color="#f44336" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00b8d4" />
        <Text style={styles.loadingText}>IP adresleri yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="wifi" size={40} color="#00b8d4" />
        <Text style={styles.title}>Sunucu Adresi Seçin</Text>
        <Text style={styles.subtitle}>Bağlanmak istediğiniz API sunucusunun adresini seçin veya ekleyin.</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Yeni IP adresi ekle (örn: 192.168.1.101)"
          placeholderTextColor="#6c7a94"
          value={newIpAddress}
          onChangeText={setNewIpAddress}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={saveIpAddress}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.listTitle}>Kayıtlı Adresler</Text>

      <FlatList
        data={ipAddresses}
        renderItem={renderIpItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.ipList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cloud-offline" size={40} color="#a0a9bc" />
            <Text style={styles.emptyText}>Kaydedilmiş IP adresi yok</Text>
            <Text style={styles.emptySubText}>Yukarıdan yeni bir IP adresi ekleyin</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.continueButton, !selectedIp && styles.disabledButton]}
        onPress={selectIpAndContinue}
        disabled={!selectedIp}
      >
        <Text style={styles.continueButtonText}>
          {selectedIp ? `${selectedIp} Adresine Bağlan` : 'Lütfen bir IP adresi seçin'}
        </Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 10 }} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2234',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a2234',
  },
  loadingText: {
    color: '#a0a9bc',
    marginTop: 20,
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 10,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a9bc',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#2d3446',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3d4559',
  },
  addButton: {
    backgroundColor: '#00b8d4',
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginLeft: 10,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  ipList: {
    flexGrow: 1,
  },
  ipItem: {
    flexDirection: 'row',
    backgroundColor: '#2d3446',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#3d4559',
  },
  selectedIpItem: {
    borderColor: '#00b8d4',
    backgroundColor: '#2a3040',
  },
  ipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioIcon: {
    marginRight: 10,
  },
  ipTextContainer: {
    flex: 1,
  },
  ipAddress: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ipName: {
    color: '#a0a9bc',
    fontSize: 14,
    marginTop: 2,
  },
  ipActions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 5,
  },
  continueButton: {
    backgroundColor: '#00b8d4',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#00b8d480',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 10,
  },
  emptySubText: {
    color: '#a0a9bc',
    fontSize: 14,
    marginTop: 5,
  }
});

export default IpSelectScreen; 