import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import carService from '../api/carService';
import userService from '../api/userService';

// Props olarak cars, onCarSelect ve isModal parametrelerini alacak
const ElectricCarsScreen = ({ 
  navigation, 
  cars: propCars, 
  selectedCarId: propSelectedCarId, 
  onCarSelect, 
  isModal = false 
}) => {
  const [cars, setCars] = useState(propCars || []);
  const [loading, setLoading] = useState(!propCars);
  const [selectedCarId, setSelectedCarId] = useState(propSelectedCarId || null);

  useEffect(() => {
    // Eğer dışarıdan cars prop'u gelmemişse verileri API'den çek
    if (!propCars) {
      fetchData();
    }
  }, [propCars]);
  
  // Eğer dışarıdan cars prop'u değişirse state'i güncelle
  useEffect(() => {
    if (propCars) {
      setCars(propCars);
    }
  }, [propCars]);
  
  // Eğer dışarıdan selectedCarId prop'u değişirse state'i güncelle
  useEffect(() => {
    if (propSelectedCarId) {
      setSelectedCarId(propSelectedCarId);
    }
  }, [propSelectedCarId]);

  const fetchData = async () => {
    try {
      // Araçları getir
      const carsData = await carService.getAllElectricCars();
      setCars(carsData.results || carsData);
      
      // Kullanıcı tercihini getir
      const preference = await userService.getUserCarPreference();
      if (preference) {
        // Farklı API yanıt yapılarını kontrol et
        let preferredCarId = null;
        
        if (preference.selected_car_id) {
          preferredCarId = preference.selected_car_id;
        } else if (preference.selected_car && preference.selected_car.id) {
          preferredCarId = preference.selected_car.id;
        } else if (preference.arac_id) {
          preferredCarId = preference.arac_id;
        }
        
        if (preferredCarId) {
          setSelectedCarId(preferredCarId);
        }
      }
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCar = async (car) => {
    try {
      setLoading(true);
      
      // Eğer dışarıdan onCarSelect prop'u gelmişse onu çağır
      if (onCarSelect) {
        onCarSelect(car);
        return; // API'ye kaydetme işlemini dış bileşene bırak
      }
      
      // Bağımsız ekran olarak kullanılıyorsa, API'ye kaydet
      await userService.setUserCarPreference(car.id);
      setSelectedCarId(car.id);
      Alert.alert('Başarılı', 'Araç tercihiniz kaydedildi');
    } catch (error) {
      console.error('Araç tercihi kaydedilirken hata:', error);
      Alert.alert('Hata', 'Araç tercihi kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.carItem,
        selectedCarId === item.id && styles.selectedCar
      ]}
      onPress={() => handleSelectCar(item)}
    >
      <View style={styles.carContent}>
        <Text style={styles.carName}>{item.car_name}</Text>
        <Text style={styles.carInfo}>Ortalama Menzil: {item.average_range} km</Text>
        <Text style={styles.carInfo}>Batarya Kapasitesi: {item.kwh || 'Belirtilmemiş'} kWh</Text>
      </View>
      
      {selectedCarId === item.id && (
        <View style={styles.checkmarkContainer}>
          <Ionicons name="checkmark" size={20} color="#00b8d4" />
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00b8d4" />
        <Text style={styles.loadingText}>Araçlar yükleniyor...</Text>
      </View>
    );
  }

  // Modal veya bağımsız ekran olarak gösterme
  return (
    <View style={[styles.container, isModal && styles.modalContainer]}>
      {!isModal && <Text style={styles.title}>Elektrikli Araçlar</Text>}
      
      <FlatList
        data={cars}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, isModal && styles.modalListContent]}
        ListEmptyComponent={() => (
          <View style={styles.emptyList}>
            <Ionicons name="car-outline" size={48} color="#a0a9bc" />
            <Text style={styles.emptyText}>
              Araç bulunamadı
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1a2234',
  },
  modalContainer: {
    padding: 0,
    backgroundColor: 'transparent',
    flex: 1,
  },
  modalListContent: {
    paddingBottom: 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#ffffff',
  },
  listContent: {
    paddingBottom: 20,
  },
  carItem: {
    padding: 16,
    marginVertical: 8,
    backgroundColor: '#2d3446',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3d4559',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carContent: {
    flex: 1,
  },
  selectedCar: {
    borderColor: '#00b8d4',
  },
  carName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#ffffff',
  },
  carInfo: {
    fontSize: 14,
    color: '#a0a9bc',
    marginBottom: 4,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#a0a9bc',
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#a0a9bc',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default ElectricCarsScreen;