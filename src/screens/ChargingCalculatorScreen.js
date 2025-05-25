import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import userService from '../api/userService';
import carService from '../api/carService';
import chargingProviderService from '../api/chargingProviderService';
import { CHARGING_PROVIDERS, CHARGE_TYPES, PRICE_TOOLTIPS } from '../constants/chargingProviders';
import ProviderCard from '../components/ProviderCard';
import ElectricCarsScreen from './ElectricCarsScreen';

const ChargingCalculatorScreen = ({ navigation }) => {
  const [carModel, setCarModel] = useState('');
  const [batteryCapacity, setBatteryCapacity] = useState('60');
  const [currentChargeLevel, setCurrentChargeLevel] = useState(20);
  const [targetChargeLevel, setTargetChargeLevel] = useState(80);
  const [electricityRate, setElectricityRate] = useState('2.5');
  const [activeTab, setActiveTab] = useState('sarjBilgileri');
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [carDetails, setCarDetails] = useState(null);
  const [carLoading, setCarLoading] = useState(true);
  const [availableCars, setAvailableCars] = useState([]);
  const [showCarPicker, setShowCarPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCarId, setSelectedCarId] = useState(null);
  
  // Şarj sağlayıcı state'leri
  const [providerPrices, setProviderPrices] = useState({});
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedChargeType, setSelectedChargeType] = useState(null);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadUserCarPreference();
  }, []);
  
  // Şarj sağlayıcılarının fiyatlarını yükle
  useEffect(() => {
    fetchProviderPrices();
  }, []);
  
  // Şarj sağlayıcılarının fiyatlarını API'den alma fonksiyonu
  const fetchProviderPrices = async () => {
    try {
      setProvidersLoading(true);
      setProvidersError(null);
      
      // Tüm sağlayıcıların fiyatlarını getir
      const allPricesData = await chargingProviderService.getAllProviderPrices();
      
      // Varsayılan tarih bilgisini ayarla
      if (allPricesData && allPricesData.son_guncelleme) {
        const updateDate = new Date(allPricesData.son_guncelleme);
        setLastUpdated(updateDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      } else {
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      }
      
      // API'den gelen veriyi işle
      const formattedPrices = chargingProviderService.formatProviderPrices(allPricesData);
      
      // Güncellenmiş provider prices state'i
      const updatedProviderPrices = {};
      
      // Her sağlayıcı için fiyat ve güncelleme tarihlerini ayarla
      Object.keys(formattedPrices).forEach(providerId => {
        if (providerId === 'lastUpdated') return;
        
        if (formattedPrices[providerId] && formattedPrices[providerId].prices) {
          updatedProviderPrices[providerId] = {
            prices: formattedPrices[providerId].prices,
            lastUpdated: formattedPrices[providerId].lastUpdated
          };
        }
      });
      
      setProviderPrices(updatedProviderPrices);
      
      // Seçili sağlayıcı ve şarj tipi varsa kontrol et ve güncelle
      if (selectedProvider) {
        const providerData = updatedProviderPrices[selectedProvider.id];
        
        if (providerData && providerData.prices && providerData.prices.length > 0) {
          // Eğer daha önce seçilmiş bir şarj tipi varsa, aynı ID'ye sahip olanı bul
          if (selectedChargeType) {
            const updatedChargeType = providerData.prices.find(item => item.id === selectedChargeType.id);
            
            // Eğer bulunamazsa ilk şarj tipini seç
            if (!updatedChargeType) {
              setSelectedChargeType(providerData.prices[0]);
              setElectricityRate(providerData.prices[0].priceValue.toString());
            } else {
              setSelectedChargeType(updatedChargeType);
              setElectricityRate(updatedChargeType.priceValue.toString());
            }
          } else {
            // Daha önce şarj tipi seçilmemişse ilk şarj tipini seç
            setSelectedChargeType(providerData.prices[0]);
            setElectricityRate(providerData.prices[0].priceValue.toString());
          }
        }
      }
    } catch (error) {
      console.error('Şarj sağlayıcı fiyatları alınırken hata:', error);
      setProvidersError('Şarj istasyonu fiyatları yüklenirken bir hata oluştu.');
    } finally {
      setProvidersLoading(false);
    }
  };
  
  // Şarj sağlayıcısı seçim fonksiyonu
  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    
    // Seçilen sağlayıcının şarj tiplerini kontrol et
    const providerData = providerPrices[provider.id];
    
    if (providerData && providerData.prices && providerData.prices.length > 0) {
      // İlk şarj tipini seç
      setSelectedChargeType(providerData.prices[0]);
      setElectricityRate(providerData.prices[0].priceValue.toString());
    } else {
      // Eğer şarj tipi yoksa seçileni temizle
      setSelectedChargeType(null);
    }
  };
  
  // Şarj tipi seçim fonksiyonu
  const handleChargeTypeSelect = (provider, chargeType) => {
    setSelectedChargeType(chargeType);
    
    // Elektrik fiyatını güncelle
    if (chargeType && chargeType.priceValue) {
      setElectricityRate(chargeType.priceValue.toString());
    }
  };
  
  // Kullanıcının araç tercihini API'den al
  const loadUserCarPreference = async () => {
    try {
      setCarLoading(true);
      
      // Mevcut araçları yükle (modal için)
      const carsData = await carService.getAllElectricCars();
      if (carsData && carsData.results && carsData.results.length > 0) {
        setAvailableCars(carsData.results);
      }
      
      // Kullanıcının araç tercihini getir
      const userCarPref = await userService.getUserCarPreference();
      
      if (userCarPref) {
        console.log('Kullanıcı araç tercihi alındı:', JSON.stringify(userCarPref));
        
        // Farklı API yanıt yapılarına göre araç ID'sini bul
        let selectedCarId = null;
        
        if (userCarPref.selected_car_id) {
          selectedCarId = userCarPref.selected_car_id;
        } else if (userCarPref.selected_car && userCarPref.selected_car.id) {
          selectedCarId = userCarPref.selected_car.id;
        } else if (userCarPref.arac_id) {
          selectedCarId = userCarPref.arac_id;
        }
        
        if (selectedCarId) {
          // Seçilen araç ID'sini state'e kaydet
          setSelectedCarId(selectedCarId);
          
          // Araç detaylarını getir
          const carData = await carService.getElectricCarById(selectedCarId);
          setCarDetails(carData);
          
          // Araç adını ve batarya kapasitesini ayarla
          if (carData && carData.car_name) {
            setCarModel(carData.car_name);
            setBatteryCapacity(carData.kwh.toString());
            console.log('Kullanıcının tercih ettiği araç yüklendi:', carData.car_name);
          }
        } else if (carsData && carsData.results && carsData.results.length > 0) {
          // Kullanıcı tercihi yoksa ilk aracı seç
          const firstCar = carsData.results[0];
          setCarModel(firstCar.car_name);
          setBatteryCapacity(firstCar.kwh.toString());
        }
      } else if (carsData && carsData.results && carsData.results.length > 0) {
        // Kullanıcı tercihi yoksa ilk aracı seç
        const firstCar = carsData.results[0];
        setCarModel(firstCar.car_name);
        setBatteryCapacity(firstCar.kwh.toString());
      }
    } catch (error) {
      console.error('Araç tercihi yüklenirken hata:', error);
    } finally {
      setCarLoading(false);
    }
  };

  // Araç seçme işlevi
  const handleCarSelect = (car) => {
    if (!car) return;
    
    setShowCarPicker(false);
    
    setSelectedCarId(car.id);
    setCarModel(car.car_name);
    
    if (car.kwh) {
      setBatteryCapacity(car.kwh.toString());
    }
    
    setCarDetails(car);
  };
  
  // Arama alanını temizle
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Function to round to nearest 5%
  const roundToFive = (value) => {
    return Math.round(value / 5) * 5;
  };

  const handleCurrentChargeChange = (value) => {
    setCurrentChargeLevel(roundToFive(value));
  };

  const handleTargetChargeChange = (value) => {
    setTargetChargeLevel(roundToFive(value));
  };

  const calculateChargingCost = async () => {
    // Değerleri sayıya çevir
    const capacity = parseFloat(batteryCapacity);
    const current = currentChargeLevel / 100;
    const target = targetChargeLevel / 100;
    const rate = parseFloat(electricityRate);

    // Gerekli enerji (kWh)
    const energyNeeded = capacity * (target - current);
    // Toplam ücret
    const totalCost = energyNeeded * rate;

    // Sonuçları state'e yaz
    setResults({
      energyNeeded: energyNeeded.toFixed(2),
      totalCost: totalCost.toFixed(2),
      provider: selectedProvider ? selectedProvider.name : 'Genel',
      chargeType: selectedChargeType ? selectedChargeType.chargeType : '',
      rate: rate.toFixed(2)
    });

    // API'ye kayıt için veri hazırla
    const data = {
      arac: carModel,
      arac_kwh: capacity,
      firma: selectedProvider ? selectedProvider.name : null,
      baslangic_sarj: currentChargeLevel,
      varis_sarj: targetChargeLevel,
      doldurulan_enerji: parseFloat(energyNeeded.toFixed(2)),
      toplam_ucret: parseFloat(totalCost.toFixed(2)),
      tarih: new Date().toISOString(),
    };
    console.log('API\'ye gönderilen şarj kaydı:', data);
    try {
      await chargingProviderService.saveChargingHistory(data);
      // Kayıt başarılı, isterseniz kullanıcıya bildirim gösterebilirsiniz
    } catch (error) {
      console.error('Şarj geçmişi kaydedilemedi:', error);
    }

    setShowResults(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2234" />
      
      {/* Header - Simplified */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#00b8d4" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Şarj Ücreti Hesaplama</Text>
        </View>
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Elektrikli Araç Şarj Ücreti Hesaplama</Text>
            <Text style={styles.subtitle}>
              Elektrikli aracınızın şarj maliyetini hesaplamak için batarya kapasitesi, 
              mevcut şarj durumu ve elektrik fiyatını kullanarak hesaplama yapabilirsiniz.
            </Text>
          </View>
          
          {/* Şarj Sağlayıcıları Bölümü */}
          <View style={styles.providersSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Şarj Sağlayıcıları</Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={fetchProviderPrices}
              >
                <Ionicons name="refresh" size={22} color="#00b8d4" />
              </TouchableOpacity>
            </View>
            
            {/* Hata mesajı */}
            {providersError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={22} color="#ff5252" />
                <Text style={styles.errorText}>{providersError}</Text>
              </View>
            )}
            
            {/* Yükleniyor durumu */}
            {providersLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#00b8d4" />
                <Text style={styles.loadingText}>Fiyatlar yükleniyor...</Text>
              </View>
            ) : (
              /* Sağlayıcı kartları listesi */
              <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.providersList}
              >
                {CHARGING_PROVIDERS.map((provider) => (
                  <View key={provider.id} style={{ width: 180, marginRight: 12 }}>
                    <ProviderCard
                      provider={provider}
                      priceOptions={providerPrices[provider.id]?.prices}
                      isSelected={selectedProvider && selectedProvider.id === provider.id}
                      onSelect={handleProviderSelect}
                      onChargeTypeSelect={handleChargeTypeSelect}
                      selectedChargeType={
                        selectedProvider && 
                        selectedProvider.id === provider.id && 
                        selectedChargeType
                      }
                      lastUpdated={
                        providerPrices[provider.id]?.lastUpdated 
                          ? new Date(providerPrices[provider.id].lastUpdated).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric'
                            })
                          : null
                      }
                      isLoading={providersLoading}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Araç Modeli:</Text>
              {carLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#00b8d4" />
                  <Text style={styles.loadingText}>Araç bilgileri yükleniyor...</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.customPickerContainer}
                  onPress={() => setShowCarPicker(true)}
                >
                  <Text style={styles.customPickerText}>{carModel || 'Lütfen araç seçin'}</Text>
                  <Ionicons name="chevron-down" size={20} color="#00b8d4" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Batarya Kapasitesi (kWh):</Text>
              {carLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#00b8d4" />
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  value={batteryCapacity}
                  onChangeText={setBatteryCapacity}
                  keyboardType="numeric"
                  placeholder="60"
                  placeholderTextColor="#6c7a94"
                />
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Mevcut Şarj Seviyesi (%):</Text>
              <Text style={styles.sliderValue}>{currentChargeLevel}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={5}
                value={currentChargeLevel}
                onValueChange={handleCurrentChargeChange}
                minimumTrackTintColor="#00b8d4"
                maximumTrackTintColor="#2d3446"
                thumbTintColor="#00b8d4"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Hedef Şarj Seviyesi (%):</Text>
              <Text style={styles.sliderValue}>{targetChargeLevel}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={5}
                value={targetChargeLevel}
                onValueChange={handleTargetChargeChange}
                minimumTrackTintColor="#00b8d4"
                maximumTrackTintColor="#2d3446"
                thumbTintColor="#00b8d4"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <Text style={styles.inputLabel}>Elektrik Fiyatı (TL/kWh):</Text>
                {selectedProvider && (
                  <TouchableOpacity 
                    style={[styles.providerBadge, { backgroundColor: selectedProvider.primaryColor }]}
                    onPress={() => setShowResults(false)}
                  >
                    <Text style={styles.providerBadgeText}>{selectedProvider.name}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={[
                  styles.input, 
                  selectedProvider && { borderColor: selectedProvider.primaryColor }
                ]}
                value={electricityRate}
                onChangeText={setElectricityRate}
                keyboardType="numeric"
                placeholder="2.5"
                placeholderTextColor="#6c7a94"
              />
              {selectedProvider && (
                <Text style={styles.infoText}>
                  <Ionicons name="information-circle" size={14} color={selectedProvider.primaryColor} /> 
                  {selectedProvider.name} fiyatı {selectedChargeType ? `(${selectedChargeType.chargeType})` : ''} kullanılıyor
                </Text>
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.calculateButton}
                onPress={calculateChargingCost}
              >
                <Text style={styles.buttonText}>Hesapla</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={() => {
                  setCurrentChargeLevel(20);
                  setTargetChargeLevel(80);
                  setElectricityRate('2.5');
                  setResults(null);
                  setShowResults(false);
                }}
              >
                <Text style={styles.resetButtonText}>Sıfırla</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showResults && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Hesaplama Sonucu</Text>
              
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'sarjBilgileri' && styles.activeTab]}
                  onPress={() => setActiveTab('sarjBilgileri')}
                >
                  <Text style={[styles.tabText, activeTab === 'sarjBilgileri' && styles.activeTabText]}>
                    Şarj Bilgileri
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'maliyetAnalizi' && styles.activeTab]}
                  onPress={() => setActiveTab('maliyetAnalizi')}
                >
                  <Text style={[styles.tabText, activeTab === 'maliyetAnalizi' && styles.activeTabText]}>
                    Maliyet Analizi
                  </Text>
                </TouchableOpacity>
              </View>
              
              {activeTab === 'sarjBilgileri' && (
                <View style={[
                  styles.resultBox, 
                  selectedProvider && { borderLeftColor: selectedProvider.primaryColor }
                ]}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Şarj Edilecek Enerji:</Text>
                    <Text style={styles.resultValue}>{results.energyNeeded} kWh</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Toplam Şarj Ücreti:</Text>
                    <Text style={styles.resultValue}>{results.totalCost} TL</Text>
                  </View>
                  {selectedProvider && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Şarj Sağlayıcı:</Text>
                      <Text style={[styles.resultValue, { color: selectedProvider.primaryColor }]}>
                        {results.provider}
                      </Text>
                    </View>
                  )}
                  {selectedChargeType && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Şarj Tipi:</Text>
                      <Text style={styles.resultValue}>
                        {results.chargeType}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              {activeTab === 'maliyetAnalizi' && (
                <View style={[
                  styles.resultBox, 
                  selectedProvider && { borderLeftColor: selectedProvider.primaryColor }
                ]}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Birim Fiyat:</Text>
                    <Text style={styles.resultValue}>{results.rate} TL/kWh</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Km Başına Maliyet:</Text>
                    <Text style={styles.resultValue}>{(parseFloat(results.rate) * 0.18).toFixed(2)} TL/km</Text>
                  </View>
                  {selectedProvider && (
                    <View style={styles.providerTipContainer}>
                      <Ionicons name="information-circle" size={18} color={selectedProvider.primaryColor} />
                      <Text style={styles.providerTipText}>
                        {PRICE_TOOLTIPS[selectedProvider.id]} 
                        {selectedChargeType ? ` Şarj tipi: ${selectedChargeType.chargeType}` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              <View style={styles.chargeStatusContainer}>
                <Text style={styles.chargeStatusLabel}>Şarj Durumu</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${currentChargeLevel}%` }]} />
                  <View 
                    style={[
                      styles.progressBarTarget, 
                      { left: `${targetChargeLevel}%`, marginLeft: -10 }
                    ]} 
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabelStart}>%{currentChargeLevel} (Mevcut)</Text>
                  <Text style={styles.progressLabelEnd}>%{targetChargeLevel} (Hedef)</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      
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
              <Text style={styles.modalTitle}>Araç Seçin ({availableCars.length} araç)</Text>
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
            
            {/* ElectricCarsScreen Bileşeni */}
            <View style={styles.carsListContainer}>
              {carLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#00b8d4" />
                  <Text style={styles.loadingText}>Araçlar yükleniyor...</Text>
                </View>
              ) : (
                <ElectricCarsScreen
                  cars={searchQuery ? 
                    availableCars.filter(car => 
                      car.car_name.toLowerCase().includes(searchQuery.toLowerCase())
                    ) : availableCars
                  }
                  selectedCarId={selectedCarId}
                  onCarSelect={handleCarSelect}
                  isModal={true}
                />
              )}
            </View>
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
  keyboardAvoid: {
    flex: 1,
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
    padding: 16,
  },
  titleContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a9bc',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Şarj sağlayıcıları bölümü stilleri
  providersSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  refreshButton: {
    padding: 5,
  },
  providersList: {
    paddingBottom: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: '#ff5252',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  errorText: {
    color: '#ff5252',
    marginLeft: 8,
    flex: 1,
  },
  // Hesaplama sekmeleri
  calculatorTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3d4559',
  },
  calculatorTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#2d3446',
  },
  activeCalculatorTab: {
    backgroundColor: '#3d4559',
  },
  calculatorTabText: {
    color: '#a0a9bc',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  activeCalculatorTabText: {
    color: '#00b8d4',
    fontWeight: 'bold',
  },
  // Form stilleri
  formContainer: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 0,
    color: '#ffffff',
    flex: 1,
  },
  input: {
    backgroundColor: '#2d3446',
    borderWidth: 1,
    borderColor: '#3d4559',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  sliderValue: {
    color: '#00b8d4',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  calculateButton: {
    backgroundColor: '#00b8d4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 2,
    marginLeft: 10,
  },
  resetButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3d4559',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 1,
  },
  resetButtonText: {
    color: '#a0a9bc',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Sonuç stilleri
  resultsContainer: {
    marginBottom: 30,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#ffffff',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#3d4559',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00b8d4',
  },
  tabText: {
    color: '#a0a9bc',
    fontSize: 16,
  },
  activeTabText: {
    color: '#00b8d4',
    fontWeight: 'bold',
  },
  resultBox: {
    backgroundColor: '#2d3446',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#00b8d4',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultLabel: {
    fontSize: 16,
    color: '#a0a9bc',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00b8d4',
  },
  chargeStatusContainer: {
    marginTop: 20,
  },
  chargeStatusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#2d3446',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00b8d4',
    borderRadius: 5,
  },
  progressBarTarget: {
    position: 'absolute',
    top: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#00b8d4',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  progressLabelStart: {
    color: '#a0a9bc',
    fontSize: 14,
  },
  progressLabelEnd: {
    color: '#a0a9bc',
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d3446',
    borderRadius: 8,
    padding: 15,
    height: 50,
  },
  loadingText: {
    color: '#a0a9bc',
    fontSize: 14,
    marginLeft: 10,
  },
  // Modal stilleri
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
    height: '80%',
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
  customPickerContainer: {
    backgroundColor: '#2d3446',
    borderWidth: 1,
    borderColor: '#3d4559',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customPickerText: {
    color: '#ffffff',
    fontSize: 16,
  },
  carsListContainer: {
    flex: 1,
    margin: 10,
    marginTop: 0,
    borderRadius: 8,
    overflow: 'hidden',
    height: 400,
  },
  infoText: {
    color: '#a0a9bc',
    fontSize: 12,
    marginTop: 5,
  },
  providerTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  providerTipText: {
    color: '#a0a9bc',
    fontSize: 12,
    marginLeft: 5,
  },
  providerBadge: {
    backgroundColor: '#2d3446',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  providerBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ChargingCalculatorScreen;