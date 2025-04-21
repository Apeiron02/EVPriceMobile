import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity, 
  ScrollView,
  Modal,
  FlatList,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import authService from '../api/authService';
import { reset } from '../navigation/navigationUtils';

const UserProfileScreen = ({ navigation }) => {
  const [selectedCar, setSelectedCar] = useState('TOGG T10X V1 RWD Uzun Menzil');
  const [showCarPicker, setShowCarPicker] = useState(false);
  
  // Örnek kullanıcı bilgileri
  const userInfo = {
    username: 'yusuf1',
    email: 'mykrmn02@gmail.com',
    registrationDate: '04/11/2024'
  };
  
  // Örnek araç verileri
  const carData = {
    'TOGG T10X V1 RWD Uzun Menzil': {
      range: '520 km',
      batteryCapacity: '52.0 kWh'
    },
    'Tesla Model 3': {
      range: '491 km',
      batteryCapacity: '60.0 kWh'
    },
    'Volkswagen ID.4': {
      range: '450 km',
      batteryCapacity: '77.0 kWh'
    }
  };
  
  // Araç listesi - eksik olan tanımlama eklendi
  const carList = Object.keys(carData);
  
  // Araç seçme fonksiyonu
  const handleCarSelect = (car) => {
    setSelectedCar(car);
    setShowCarPicker(false);
  };
  
  // Örnek rota geçmişi
  const routeHistory = [
    {
      id: 1,
      date: '22/03/2023 13:52',
      startLocation: 'İstanbul, Türkiye',
      endLocation: 'Taşköprü Yeni İzmit Yalova Yolu NO:67/A, 77602 Taşköprü/Çiftlikköy/Yalova, Türkiye',
      distance: '83.0 km',
      duration: '82 dk'
    },
    {
      id: 2,
      date: '15/03/2023 14:30',
      startLocation: 'Yenibosna Merkez, Bahçelievler/İstanbul, Türkiye',
      endLocation: 'Ömerlı, 34799 Çekmeköy/İstanbul, Türkiye',
      distance: '80.9 km',
      duration: '66 dk'
    },
    {
      id: 3,
      date: '15/03/2023 14:27',
      startLocation: 'Yenibosna Merkez, Bahçelievler/İstanbul, Türkiye',
      endLocation: 'Beykoz/İstanbul, Türkiye',
      distance: '60.6 km',
      duration: '54 dk'
    }
  ];
  
  const handleLogout = async () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        {
          text: "İptal",
          style: "cancel"
        },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            try {
              await authService.logout();
              reset([{ name: 'Login' }]);
            } catch (error) {
              console.error('Logout Error:', error);
              Alert.alert(
                "Hata",
                "Çıkış yapılırken bir hata oluştu. Lütfen tekrar deneyin.",
                [{ text: "Tamam" }]
              );
            }
          }
        }
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2234" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#00b8d4" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kullanıcı Bilgileri</Text>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.contentContainer}>
          {/* Sol Taraf - Kullanıcı Bilgileri */}
          <View style={styles.userInfoContainer}>
            <Text style={styles.sectionTitle}>Kullanıcı Bilgileri</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kullanıcı Adı:</Text>
              <Text style={styles.infoValue}>{userInfo.username}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>E-posta:</Text>
              <Text style={styles.infoValue}>{userInfo.email}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kayıt Tarihi:</Text>
              <Text style={styles.infoValue}>{userInfo.registrationDate}</Text>
            </View>
            
            <Text style={[styles.sectionTitle, {marginTop: 20}]}>Elektrikli Araç Seçimi</Text>
            
            {/* Özel Araç Seçici */}
            <TouchableOpacity 
              style={styles.customPickerContainer}
              onPress={() => setShowCarPicker(true)}
            >
              <Text style={styles.customPickerText}>{selectedCar}</Text>
              <Ionicons name="chevron-down" size={20} color="#00b8d4" />
            </TouchableOpacity>
            
            <View style={styles.carInfoContainer}>
              <Text style={styles.carInfoTitle}>Seçili Araç:</Text>
              <Text style={styles.carInfoValue}>{selectedCar}</Text>
              
              <Text style={styles.carInfoTitle}>Ortalama Menzil:</Text>
              <Text style={styles.carInfoValue}>{carData[selectedCar].range}</Text>
              
              <Text style={styles.carInfoTitle}>Batarya Kapasitesi:</Text>
              <Text style={styles.carInfoValue}>{carData[selectedCar].batteryCapacity}</Text>
            </View>
            
            {/* Çıkış Yap butonu buradan kaldırıldı */}
          </View>
          
          {/* Sağ Taraf - Rota Geçmişi */}
          <View style={styles.routeHistoryContainer}>
            <Text style={styles.sectionTitle}>Rota Geçmişi</Text>
            
            {routeHistory.map((route) => (
              <View key={route.id} style={styles.routeCard}>
                <Text style={styles.routeDate}>{route.date}</Text>
                
                <View style={styles.routeDetail}>
                  <Text style={styles.routeLabel}>Başlangıç:</Text>
                  <Text style={styles.routeValue}>{route.startLocation}</Text>
                </View>
                
                <View style={styles.routeDetail}>
                  <Text style={styles.routeLabel}>Varış:</Text>
                  <Text style={styles.routeValue}>{route.endLocation}</Text>
                </View>
                
                <View style={styles.routeStats}>
                  <Text style={styles.routeDistance}>{route.distance}</Text>
                  <Text style={styles.routeDuration}>{route.duration}</Text>
                </View>
              </View>
            ))}
          </View>
          
          {/* Çıkış Yap butonu sayfanın en altına taşındı */}
          <View style={[styles.logoutButtonContainer, {
            width: '100%',
            paddingHorizontal: 16,
            marginTop: 20,
            marginBottom: 10
          }]}>
            <TouchableOpacity style={[styles.actionButton, {
              width: '100%',
              borderRadius: 4,
              height: 48,
              backgroundColor: '#e53935'
            }]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="white" style={styles.buttonIcon} />
              <Text style={[styles.buttonText, {fontSize: 16}]}>Çıkış Yap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {/* Araç Seçim Modalı */}
      <Modal
        visible={showCarPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCarPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Araç Seçin</Text>
              <TouchableOpacity onPress={() => setShowCarPicker(false)}>
                <Ionicons name="close" size={24} color="#00b8d4" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={carList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.carListItem, 
                    selectedCar === item && styles.selectedCarItem
                  ]}
                  onPress={() => handleCarSelect(item)}
                >
                  <Text style={[
                    styles.carListItemText,
                    selectedCar === item && styles.selectedCarItemText
                  ]}>
                    {item}
                  </Text>
                  {selectedCar === item && (
                    <Ionicons name="checkmark" size={20} color="#00b8d4" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2234',
  },
  header: {
    backgroundColor: '#1a2234',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3446',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerTitle: {
    color: '#00b8d4',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  userInfoContainer: {
    flex: 1,
    minWidth: 300,
    backgroundColor: '#1a2234',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    marginRight: 16,
  },
  routeHistoryContainer: {
    flex: 1,
    minWidth: 300,
    backgroundColor: '#1a2234',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00b8d4',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  infoLabel: {
    width: 100,
    fontSize: 14,
    color: '#a0a9bc',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  pickerContainer: {
    backgroundColor: '#2d3446',
    borderWidth: 1,
    borderColor: '#3d4559',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  picker: {
    height: 50,
    color: '#ffffff',
    backgroundColor: '#2d3446',
  },
  carInfoContainer: {
    backgroundColor: '#2d3446',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  carInfoTitle: {
    fontSize: 14,
    color: '#a0a9bc',
    marginBottom: 4,
  },
  carInfoValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#00b8d4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    width: '50%', // Butonun genişliği ayarlandı
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  routeCard: {
    backgroundColor: '#2d3446',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  routeDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00b8d4',
    marginBottom: 12,
  },
  routeDetail: {
    marginBottom: 8,
  },
  routeLabel: {
    fontSize: 14,
    color: '#a0a9bc',
    marginBottom: 2,
  },
  routeValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  routeDistance: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00b8d4',
  },
  routeDuration: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00b8d4',
  },
  // Özel Picker Stilleri
  customPickerContainer: {
    backgroundColor: '#2d3446',
    borderWidth: 1,
    borderColor: '#3d4559',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  customPickerText: {
    color: '#ffffff',
    fontSize: 16,
  },
  
  // Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a2234',
    borderRadius: 8,
    width: '90%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#3d4559',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3d4559',
  },
  modalTitle: {
    color: '#00b8d4',
    fontSize: 18,
    fontWeight: 'bold',
  },
  carListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3d4559',
  },
  selectedCarItem: {
    backgroundColor: '#2d3446',
  },
  carListItemText: {
    color: '#ffffff',
    fontSize: 16,
  },
  selectedCarItemText: {
    color: '#00b8d4',
    fontWeight: 'bold',
  },
});

export default UserProfileScreen;