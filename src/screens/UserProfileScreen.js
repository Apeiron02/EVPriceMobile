import React, { useState, useEffect, useMemo } from 'react';
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
  Alert,
  ActivityIndicator,
  TextInput,
  SectionList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import authService from '../api/authService';
import userService from '../api/userService';
import carService from '../api/carService';
import { reset } from '../navigation/navigationUtils';

// Gelişmiş yükleme göstergesi bileşeni
const LoadingScreen = ({ message, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00b8d4" />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  );
};

const UserProfileScreen = ({ navigation }) => {
  const [selectedCar, setSelectedCar] = useState('TOGG T10X V1 RWD Uzun Menzil');
  const [showCarPicker, setShowCarPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingCars, setLoadingCars] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Araçlar yükleniyor...');
  const [cars, setCars] = useState([]);
  const [carDetails, setCarDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [routeHistory, setRouteHistory] = useState([]);
  const [loadingRouteHistory, setLoadingRouteHistory] = useState(false);
  
  // Kullanıcı bilgileri için state tanımla
  const [userInfo, setUserInfo] = useState({
    username: '',
    email: '',
    registrationDate: ''
  });

  // Arama sorgusuna göre araçları filtrele
  const filteredCars = useMemo(() => {
    if (!cars.length) return [];
    if (!searchQuery.trim()) return cars;
    
    const query = searchQuery.toLowerCase().trim();
    return cars.filter(car => 
      car.car_name.toLowerCase().includes(query) || 
      (car.brand_name && car.brand_name.toLowerCase().includes(query))
    );
  }, [cars, searchQuery]);

  // Araçları markalara göre grupla
  const groupedCars = useMemo(() => {
    if (!filteredCars.length) return [];
    
    // Öncelikle benzersiz markaları bulalım
    const brands = [...new Set(filteredCars.map(car => {
      // Marka bilgisi yoksa 'Diğer' olarak gruplayalım
      const brandName = car.brand_name || (car.car_name.split(' ')[0] || 'Diğer');
      return brandName;
    }))];
    
    // Markaları alfabetik olarak sıralayalım
    brands.sort((a, b) => a.localeCompare(b, 'tr', {sensitivity: 'base'}));
    
    // Her marka için bir bölüm oluşturalım
    return brands.map(brand => {
      // İlgili markaya ait tüm araçları bulalım
      const carsInBrand = filteredCars.filter(car => {
        const carBrand = car.brand_name || (car.car_name.split(' ')[0] || 'Diğer');
        return carBrand === brand;
      });
      
      // Bu markadaki araçları alfabetik olarak sıralayalım
      carsInBrand.sort((a, b) => a.car_name.localeCompare(b.car_name, 'tr', {sensitivity: 'base'}));
      
      return {
        title: brand,
        data: carsInBrand
      };
    });
  }, [filteredCars]);
  
  // Araçları önce yükle, sonra kullanıcı bilgilerini getir
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchCars();
        await fetchUserInfo();
        await fetchRouteHistory();
      } catch (error) {
        console.error('Veri yükleme hatası:', error);
      }
    };
    
    loadData();
  }, []);
  
  const fetchUserInfo = async () => {
    setLoading(true);
    try {
      const userData = await userService.getCurrentUser();
      if (userData) {
        // Tarih formatını düzenle, API'den gelen date_joined değerini kullanıyoruz
        const registrationDate = userData.date_joined ? 
          new Date(userData.date_joined).toLocaleDateString('tr-TR') : '';
        
        setUserInfo({
          username: userData.username || '',
          email: userData.email || '',
          registrationDate: registrationDate
        });
      }

      // Kullanıcının araç tercihini getir
      console.log('Kullanıcı araç tercihi getiriliyor...');
      const userCarPref = await userService.getUserCarPreference();
      
      if (userCarPref) {
        console.log('Kullanıcı araç tercihi alındı:', JSON.stringify(userCarPref));
        
        // Farklı API yanıt yapılarına göre araç ID'sini bul
        let selectedCarId = null;
        
        if (userCarPref.selected_car_id) {
          selectedCarId = userCarPref.selected_car_id;
          console.log('selected_car_id alanından araç ID bulundu:', selectedCarId);
        } else if (userCarPref.selected_car && userCarPref.selected_car.id) {
          selectedCarId = userCarPref.selected_car.id;
          console.log('selected_car.id alanından araç ID bulundu:', selectedCarId);
        } else if (userCarPref.arac_id) {
          selectedCarId = userCarPref.arac_id;
          console.log('arac_id alanından araç ID bulundu:', selectedCarId);
        }
        
        if (selectedCarId) {
          console.log('Araç detayları getiriliyor, ID:', selectedCarId);
          await fetchCarDetails(selectedCarId);
        } else {
          // Tercih var ama ID yok
          checkAndSetDefaultCar();
        }
      } else {
        console.log('Kullanıcının araç tercihi bulunamadı.');
        checkAndSetDefaultCar();
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
      Alert.alert(
        "Hata", 
        "Kullanıcı bilgileri yüklenirken bir hata oluştu.",
        [{ text: "Tamam" }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Eğer araç listesi yüklenmişse ve kullanıcı tercihi yoksa ilk aracı seç
  const checkAndSetDefaultCar = () => {
    if (cars && cars.length > 0) {
      console.log('Kullanıcı tercihi bulunamadı, varsayılan araç seçiliyor...');
      setSelectedCar(cars[0].car_name);
      fetchCarDetails(cars[0].id);
    } else {
      console.log('Araçlar henüz yüklenmedi, varsayılan araç seçilemiyor.');
    }
  };

  // Tüm elektrikli araçları getir
  const fetchCars = async () => {
    setLoadingCars(true);
    setLoadingMessage('Araç verileri yükleniyor...');
    
    try {
      // Araç verisini getirmek ve tüm sayfaları birleştirmek için carService'i kullan
      const carsData = await carService.getAllElectricCars();
      
      // API'den veri gelmiş mi kontrol et
      console.log('Gelen toplam araç sayısı:', carsData.results ? carsData.results.length : 0);
      
      // API'den gelen veri yapısına göre results dizisini kullan
      if (carsData && carsData.results && carsData.results.length > 0) {
        setLoadingMessage('Araçlar sıralanıyor...');
        
        // Araçları alfabetik olarak sıralayalım
        const sortedCars = [...carsData.results].sort((a, b) => 
          a.car_name.localeCompare(b.car_name, 'tr', {sensitivity: 'base'})
        );
        
        setCars(sortedCars);
        console.log(`Toplam ${sortedCars.length} araç başarıyla yüklendi ve sıralandı`);
      } else {
        console.log('API\'den araç verisi gelmedi veya boş');
        Alert.alert(
          "Uyarı", 
          "Araç listesi boş veya veriler alınamadı.",
          [{ text: "Tamam" }]
        );
      }
    } catch (error) {
      console.error('Araç listesi yüklenirken hata:', error);
      Alert.alert(
        "Hata", 
        "Araç listesi yüklenirken bir hata oluştu.",
        [{ text: "Tamam" }]
      );
    } finally {
      setLoadingCars(false);
      setLoadingMessage('');
    }
  };

  // Belirli bir aracın detaylarını getir
  const fetchCarDetails = async (carId) => {
    try {
      const carData = await carService.getElectricCarById(carId);
      setCarDetails(carData);
      
      // API'den araç detayı gelmiş mi kontrol et
      console.log('Gelen araç detayı ID:', carId, 'Data:', carData);
      
      // Araç adını doğrudan API'den gelen veriden alarak ayarla
      if (carData && carData.car_name) {
        setSelectedCar(carData.car_name);
        console.log('Araç adı ayarlandı:', carData.car_name);
      } else {
        // Eğer araç listesinde bu araç varsa, seçilmiş araç ismini ayarla
        const selectedCarFromList = cars.find(car => car.id === carId);
        if (selectedCarFromList) {
          setSelectedCar(selectedCarFromList.car_name);
          console.log('Araç adı listeden bulunarak ayarlandı:', selectedCarFromList.car_name);
        }
      }
    } catch (error) {
      consoles.error('Araç detayları yüklenirken hata:', error);
    }
  };
  
  // Araç seçme fonksiyonu
  const handleCarSelect = async (car) => {
    setShowCarPicker(false);
    
    try {
      console.log('Seçilen araç:', car);
      
      // Araç detayları gelene kadar yükleniyor göster
      setLoadingCars(true);
      setLoadingMessage('Araç bilgileri yükleniyor...');
      
      // Kullanıcının araç tercihini kaydet
      const response = await userService.setUserCarPreference(car.id);
      console.log('Araç tercihi kaydetme yanıtı:', response.data);
      
      // Seçilen aracın detaylarını getir ve selectedCar değerini güncelle
      await fetchCarDetails(car.id);
      
      console.log('Araç seçimi başarıyla tamamlandı: ' + car.car_name);
    } catch (error) {
      console.error('Araç tercihi kaydedilirken hata:', error);
      
      // Hata olduğu durumda da araç detaylarını getirmeyi dene
      try {
        await fetchCarDetails(car.id);
      } catch (detailError) {
        console.error('Araç detayları alınamadı:', detailError);
      }
      
      Alert.alert(
        "Bilgi", 
        "Tercihleriniz geçici olarak gösterilecek, ancak sunucuya kaydedilemedi. Lütfen daha sonra tekrar deneyin.",
        [{ text: "Tamam" }]
      );
    } finally {
      setLoadingCars(false);
      setLoadingMessage('');
    }
  };
  
  // Kullanıcının rota geçmişini getir
  const fetchRouteHistory = async () => {
    setLoadingRouteHistory(true);
    try {
      const routeHistoryData = await userService.getRouteHistory();
      if (routeHistoryData && routeHistoryData.length > 0) {
        console.log('Rota geçmişi başarıyla yüklendi:', routeHistoryData.length, 'rota.');
        setRouteHistory(routeHistoryData);
      } else {
        console.log('Kullanıcının rota geçmişi bulunamadı veya boş.');
        // Rota geçmişi boşsa örnek verileri gösterme
        setRouteHistory([]);
      }
    } catch (error) {
      console.error('Rota geçmişi yüklenirken hata:', error);
      // Hata durumunda boş dizi ata
      setRouteHistory([]);
    } finally {
      setLoadingRouteHistory(false);
    }
  };
  
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
  
  // Araç listesi görünümünde marka başlığı
  const renderSectionHeader = ({section}) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  // Arama kutusunu temizleme
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Tüm elektrikli araçları yeniden yükle
  const handleRefreshCars = () => {
    Alert.alert(
      "Araçları Yenile", 
      "Tüm araç listesini yeniden yüklemek istiyor musunuz? Bu işlem biraz zaman alabilir.",
      [
        { 
          text: "İptal", 
          style: "cancel" 
        },
        { 
          text: "Yenile", 
          onPress: fetchCars 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2234" />
      
      {/* Gelişmiş yükleme göstergesi */}
      <LoadingScreen isVisible={loadingCars} message={loadingMessage} />
      
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
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#00b8d4" />
                <Text style={styles.loadingText}>Bilgiler yükleniyor...</Text>
              </View>
            ) : (
              <>
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
              </>
            )}
            
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Elektrikli Araç Seçimi</Text>
              {!loadingCars && (
                <TouchableOpacity onPress={handleRefreshCars}>
                  <Ionicons name="refresh" size={20} color="#00b8d4" />
                </TouchableOpacity>
              )}
            </View>
            
            {loadingCars ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#00b8d4" />
                <Text style={styles.loadingText}>{loadingMessage || 'Araçlar yükleniyor...'}</Text>
              </View>
            ) : (
              <>
                {/* Özel Araç Seçici */}
                <TouchableOpacity 
                  style={styles.customPickerContainer}
                  onPress={() => setShowCarPicker(true)}
                >
                  <Text style={styles.customPickerText}>{selectedCar || 'Lütfen araç seçin'}</Text>
                  <Ionicons name="chevron-down" size={20} color="#00b8d4" />
                </TouchableOpacity>
                
                {carDetails && (
                  <View style={styles.carInfoContainer}>
                    <Text style={styles.carInfoTitle}>Seçili Araç:</Text>
                    <Text style={styles.carInfoValue}>{selectedCar}</Text>
                    
                    <Text style={styles.carInfoTitle}>Ortalama Menzil:</Text>
                    <Text style={styles.carInfoValue}>{carDetails.average_range} km</Text>
                    
                    <Text style={styles.carInfoTitle}>Batarya Kapasitesi:</Text>
                    <Text style={styles.carInfoValue}>{carDetails.kwh} kWh</Text>
                  </View>
                )}
              </>
            )}
          </View>
          
          {/* Sağ Taraf - Rota Geçmişi */}
          <View style={styles.routeHistoryContainer}>
            <Text style={styles.sectionTitle}>Rota Geçmişi</Text>
            
            {loadingRouteHistory ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#00b8d4" />
                <Text style={styles.loadingText}>Rota geçmişi yükleniyor...</Text>
              </View>
            ) : routeHistory.length > 0 ? (
              routeHistory.map((route) => (
                <View key={route.id} style={styles.routeCard}>
                  <Text style={styles.routeDate}>
                    {route.created_at ? new Date(route.created_at).toLocaleString('tr-TR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Tarih bilgisi yok'}
                  </Text>
                  
                  <View style={styles.routeDetail}>
                    <Text style={styles.routeLabel}>Başlangıç:</Text>
                    <Text style={styles.routeValue}>{route.start_address || 'Başlangıç konumu yok'}</Text>
                  </View>
                  
                  <View style={styles.routeDetail}>
                    <Text style={styles.routeLabel}>Varış:</Text>
                    <Text style={styles.routeValue}>{route.end_address || 'Varış konumu yok'}</Text>
                  </View>
                  
                  <View style={styles.routeStats}>
                    <Text style={styles.routeDistance}>
                      {route.total_distance ? `${route.total_distance.toFixed(1)} km` : '0 km'}
                    </Text>
                    <Text style={styles.routeDuration}>
                      {route.total_duration ? `${Math.round(route.total_duration)} dk` : '0 dk'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyRouteHistory}>
                <Ionicons name="map-outline" size={32} color="#a0a9bc" />
                <Text style={styles.emptyListText}>Henüz rota geçmişi bulunmuyor.</Text>
              </View>
            )}
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
      
      {/* Araç Seçim Modalı - Geliştirilmiş */}
      <Modal
        visible={showCarPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCarPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Araç Seçin ({cars.length} araç)</Text>
              <TouchableOpacity onPress={() => setShowCarPicker(false)}>
                <Ionicons name="close" size={24} color="#00b8d4" />
              </TouchableOpacity>
            </View>
            
            {/* Arama Kutusu */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#a0a9bc" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Marka veya model ara..."
                placeholderTextColor="#a0a9bc"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={clearSearch}>
                  <Ionicons name="close-circle" size={20} color="#a0a9bc" />
                </TouchableOpacity>
              ) : null}
            </View>
            
            {/* Araç Sayısı Bilgisi */}
            <View style={styles.resultsInfo}>
              <Text style={styles.resultsInfoText}>
                {searchQuery 
                  ? `${filteredCars.length} araç bulundu`
                  : `Toplam ${cars.length} araç`}
              </Text>
            </View>
            
            {loadingCars ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#00b8d4" />
                <Text style={styles.loadingText}>{loadingMessage || 'Araçlar yükleniyor...'}</Text>
              </View>
            ) : filteredCars.length > 0 ? (
              <SectionList
                sections={groupedCars}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.carListItem, 
                      selectedCar === item.car_name && styles.selectedCarItem
                    ]}
                    onPress={() => handleCarSelect(item)}
                  >
                    <Text style={[
                      styles.carListItemText,
                      selectedCar === item.car_name && styles.selectedCarItemText
                    ]}>
                      {item.car_name}
                    </Text>
                    {selectedCar === item.car_name && (
                      <Ionicons name="checkmark" size={20} color="#00b8d4" />
                    )}
                  </TouchableOpacity>
                )}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={true}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={10}
                ListEmptyComponent={() => (
                  <View style={styles.emptyList}>
                    <Ionicons name="car-outline" size={48} color="#a0a9bc" />
                    <Text style={styles.emptyListText}>
                      Arama sonucunda araç bulunamadı.
                    </Text>
                  </View>
                )}
              />
            ) : (
              <View style={styles.emptyList}>
                <Ionicons name="car-outline" size={48} color="#a0a9bc" />
                <Text style={styles.emptyListText}>
                  Hiç araç bulunamadı. Lütfen daha sonra tekrar deneyin.
                </Text>
              </View>
            )}
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: '#a0a9bc',
    marginTop: 10,
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
    width: '50%',
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
  // Arama Kutusu
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d3446',
    borderRadius: 8,
    margin: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
  },
  // Section Header
  sectionHeader: {
    backgroundColor: '#0f1521',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3d4559',
  },
  sectionHeaderText: {
    color: '#00b8d4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Sonuç Bilgisi
  resultsInfo: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1a2234',
    borderBottomWidth: 1,
    borderBottomColor: '#3d4559',
  },
  resultsInfoText: {
    color: '#a0a9bc',
    fontSize: 14,
  },
  // Boş Liste
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyListText: {
    color: '#a0a9bc',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  // Yeni stiller
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 34, 52, 0.8)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyRouteHistory: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
});

export default UserProfileScreen;