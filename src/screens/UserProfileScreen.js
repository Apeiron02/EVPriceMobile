"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  SectionList,
  Animated,
  Dimensions,
  Platform,
  FlatList,
} from "react-native"
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import authService from "../api/authService"
import userService from "../api/userService"
import carService from "../api/carService"
import chargingProviderService from "../api/chargingProviderService"
import { reset } from "../navigation/navigationUtils"

const { width, height } = Dimensions.get("window")

// Enhanced Loading Component with Animations
const LoadingScreen = ({ message, isVisible }) => {
  const spinValue = useRef(new Animated.Value(0)).current
  const fadeValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isVisible) {
      fadeValue.setValue(0)
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()

      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ).start()
    }
  }, [isVisible])

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  if (!isVisible) return null

  return (
    <Animated.View style={[styles.loadingOverlay, { opacity: fadeValue }]}>
      <View style={styles.loadingContainer}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="car-sport" size={40} color="#00b8d4" />
        </Animated.View>
        <Text style={styles.loadingText}>{message}</Text>
        <View style={styles.loadingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    </Animated.View>
  )
}

// Animated Card Component
const AnimatedCard = ({ children, delay = 0, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start()
    }, delay)
  }, [])

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

// Enhanced Info Row Component
const InfoRow = ({ icon, label, value, delay = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    setTimeout(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start()
    }, delay)
  }, [])

  return (
    <Animated.View style={[styles.enhancedInfoRow, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon} size={20} color="#00b8d4" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </Animated.View>
  )
}

// Enhanced History Card Component
const HistoryCard = ({ item, type, index }) => {
  const slideAnim = useRef(new Animated.Value(50)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start()
    }, index * 100)
  }, [])

  const formatDate = (dateString) => {
    if (!dateString) return "Tarih bilgisi yok"
    return new Date(dateString).toLocaleString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Animated.View
      style={[
        styles.enhancedHistoryCard,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <LinearGradient colors={["rgba(0, 184, 212, 0.1)", "rgba(0, 184, 212, 0.05)"]} style={styles.cardGradient}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconContainer}>
            <Ionicons name={type === "route" ? "map" : "flash"} size={24} color="#00b8d4" />
          </View>
          <Text style={styles.cardDate}>{formatDate(type === "route" ? item.created_at : item.tarih)}</Text>
        </View>

        {type === "route" ? (
          <View style={styles.cardContent}>
            <View style={styles.routeInfo}>
              <View style={styles.locationRow}>
                <Ionicons name="radio-button-on" size={12} color="#4caf50" />
                <Text style={styles.locationText} numberOfLines={2}>
                  {item.start_address || "Başlangıç konumu yok"}
                </Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.locationRow}>
                <Ionicons name="location" size={12} color="#f44336" />
                <Text style={styles.locationText} numberOfLines={2}>
                  {item.end_address || "Varış konumu yok"}
                </Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="speedometer" size={16} color="#00b8d4" />
                <Text style={styles.statValue}>
                  {item.total_distance ? `${item.total_distance.toFixed(1)} km` : "0 km"}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time" size={16} color="#00b8d4" />
                <Text style={styles.statValue}>
                  {item.total_duration ? `${Math.round(item.total_duration)} dk` : "0 dk"}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.cardContent}>
            <View style={styles.chargingInfo}>
              <View style={styles.chargingRow}>
                <FontAwesome5 name="car" size={14} color="#00b8d4" />
                <Text style={styles.chargingLabel}>Araç:</Text>
                <Text style={styles.chargingValue}>{item.arac || "-"}</Text>
              </View>
              <View style={styles.chargingRow}>
                <MaterialIcons name="business" size={14} color="#00b8d4" />
                <Text style={styles.chargingLabel}>Firma:</Text>
                <Text style={styles.chargingValue}>{item.firma || "-"}</Text>
              </View>
              <View style={styles.batteryProgress}>
                <Text style={styles.batteryLabel}>Şarj Durumu</Text>
                <View style={styles.batteryContainer}>
                  <View style={styles.batteryBar}>
                    <View style={[styles.batteryFill, { width: `${item.varis_sarj || 0}%` }]} />
                  </View>
                  <Text style={styles.batteryText}>
                    %{item.baslangic_sarj} → %{item.varis_sarj}
                  </Text>
                </View>
              </View>
              <View style={styles.chargingStats}>
                <View style={styles.statItem}>
                  <Ionicons name="flash" size={16} color="#00b8d4" />
                  <Text style={styles.statValue}>{item.doldurulan_enerji} kWh</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="card" size={16} color="#00b8d4" />
                  <Text style={styles.statValue}>{item.toplam_ucret} TL</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  )
}

const UserProfileScreen = ({ navigation }) => {
  const [selectedCar, setSelectedCar] = useState('TOGG T10X V1 RWD Uzun Menzil');
  const [showCarPicker, setShowCarPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingCars, setLoadingCars] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Araçlar yükleniyor...');
  const [cars, setCars] = useState([]);
  const [carDetails, setCarDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Kullanıcı bilgileri için state tanımla
  const [userInfo, setUserInfo] = useState({
    username: "",
    email: "",
    registrationDate: "",
  })

  // Animation refs
  const headerAnim = useRef(new Animated.Value(-100)).current
  const contentAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Start entrance animations
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()

    const loadData = async () => {
      try {
        console.log("Veri yükleme başlatılıyor...")
        await fetchCars() // Önce araçları yükle
        await fetchUserInfo() // Sonra kullanıcı bilgilerini yükle
        await fetchRouteHistory()
        await fetchChargingHistory()
        console.log("Tüm veriler yüklendi")
      } catch (error) {
        console.error("Veri yükleme hatası:", error)
      }
    }

    loadData()
  }, [])

  // Arama sorgusuna göre araçları filtrele
  const filteredCars = useMemo(() => {
    if (!cars.length) return []
    if (!searchQuery.trim()) return cars

    const query = searchQuery.toLowerCase().trim()
    return cars.filter(
      (car) =>
        car.car_name.toLowerCase().includes(query) || (car.brand_name && car.brand_name.toLowerCase().includes(query)),
    )
  }, [cars, searchQuery])

  // Araçları markalara göre grupla
  const groupedCars = useMemo(() => {
    if (!filteredCars.length) return []

    const brands = [
      ...new Set(
        filteredCars.map((car) => {
          const brandName = car.brand_name || car.car_name.split(" ")[0] || "Diğer"
          return brandName
        }),
      ),
    ]

    brands.sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base" }))

    return brands.map((brand) => {
      const carsInBrand = filteredCars.filter((car) => {
        const carBrand = car.brand_name || car.car_name.split(" ")[0] || "Diğer"
        return carBrand === brand
      })

      carsInBrand.sort((a, b) => a.car_name.localeCompare(b.car_name, "tr", { sensitivity: "base" }))

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
      } catch (error) {
        console.error('Veri yükleme hatası:', error);
      }
    };
    
    loadData();
  }, []);
  
  const fetchUserInfo = async () => {
    setLoading(true)
    try {
      const userData = await userService.getCurrentUser()
      if (userData) {
        const registrationDate = userData.date_joined ? new Date(userData.date_joined).toLocaleDateString("tr-TR") : ""

        setUserInfo({
          username: userData.username || "",
          email: userData.email || "",
          registrationDate: registrationDate,
        })
      }

      const userCarPref = await userService.getUserCarPreference()

      if (userCarPref) {
        let selectedCarId = null

        if (userCarPref.selected_car_id) {
          selectedCarId = userCarPref.selected_car_id
        } else if (userCarPref.selected_car && userCarPref.selected_car.id) {
          selectedCarId = userCarPref.selected_car.id
        } else if (userCarPref.arac_id) {
          selectedCarId = userCarPref.arac_id
        }

        if (selectedCarId) {
          await fetchCarDetails(selectedCarId)
        } else {
          checkAndSetDefaultCar()
        }
      } else {
        checkAndSetDefaultCar()
      }
    } catch (error) {
      console.error("Kullanıcı bilgileri yüklenirken hata:", error)
      Alert.alert("Hata", "Kullanıcı bilgileri yüklenirken bir hata oluştu.", [{ text: "Tamam" }])
    } finally {
      setLoading(false)
    }
  }

  const checkAndSetDefaultCar = () => {
    if (cars && cars.length > 0) {
      setSelectedCar(cars[0].car_name)
      fetchCarDetails(cars[0].id)
    }
  }

  const fetchCars = async () => {
    setLoadingCars(true)
    setLoadingMessage("Araç verileri yükleniyor...")

    try {
      console.log("🚗 Araç listesi API çağrısı başlatılıyor...")

      // Önce carService'in mevcut olup olmadığını kontrol et
      if (!carService || !carService.getAllElectricCars) {
        throw new Error("carService mevcut değil veya getAllElectricCars fonksiyonu bulunamadı")
      }

      const carsData = await carService.getAllElectricCars()
      console.log("🔍 API'den gelen ham veri:", JSON.stringify(carsData, null, 2))

      let processedCars = []

      // Farklı API yanıt formatlarını kontrol et
      if (carsData) {
        if (Array.isArray(carsData)) {
          // Direkt array geliyorsa
          processedCars = carsData
          console.log("✅ Direkt array formatında veri alındı")
        } else if (carsData.results && Array.isArray(carsData.results)) {
          // Paginated response
          processedCars = carsData.results
          console.log("✅ Paginated response formatında veri alındı")
        } else if (carsData.data && Array.isArray(carsData.data)) {
          // Data wrapper
          processedCars = carsData.data
          console.log("✅ Data wrapper formatında veri alındı")
        } else {
          console.log("❌ Beklenmeyen veri formatı:", typeof carsData)
          throw new Error("API'den beklenmeyen veri formatı geldi")
        }

        if (processedCars.length > 0) {
          setLoadingMessage("Araçlar sıralanıyor...")

          // Araçları kontrol et ve sırala
          const validCars = processedCars.filter((car) => car && car.car_name && car.id)
          console.log(`🔧 ${validCars.length}/${processedCars.length} geçerli araç bulundu`)

          if (validCars.length === 0) {
            throw new Error("Geçerli araç verisi bulunamadı")
          }

          const sortedCars = [...validCars].sort((a, b) =>
            a.car_name.localeCompare(b.car_name, "tr", { sensitivity: "base" }),
          )

          setCars(sortedCars)
          console.log(`✅ ${sortedCars.length} araç başarıyla yüklendi ve sıralandı`)

          // İlk 3 aracın adını logla
          console.log(
            "📋 İlk 3 araç:",
            sortedCars.slice(0, 3).map((car) => car.car_name),
          )
        } else {
          console.log("❌ Araç listesi boş")
          throw new Error("API'den boş araç listesi geldi")
        }
      } else {
        console.log("❌ API'den null/undefined veri geldi")
        throw new Error("API'den veri gelmedi")
      }
    } catch (error) {
      console.error("💥 Araç listesi yüklenirken hata:", error)

      // Hata durumunda örnek veri ekle (test için)
      const sampleCars = [
        { id: 1, car_name: "Tesla Model 3", average_range: 500, kwh: 75 },
        { id: 2, car_name: "BMW i3", average_range: 300, kwh: 42 },
        { id: 3, car_name: "Nissan Leaf", average_range: 400, kwh: 62 },
      ]

      setCars(sampleCars)
      console.log("🔧 Test için örnek araçlar yüklendi:", sampleCars.length)

      Alert.alert(
        "Uyarı",
        `Araç listesi yüklenirken hata oluştu: ${error.message}\n\nTest için örnek araçlar gösteriliyor.`,
        [{ text: "Tamam" }],
      )
    } finally {
      setLoadingCars(false)
      setLoadingMessage("")
    }
  }

  const fetchCarDetails = async (carId) => {
    try {
      const carData = await carService.getElectricCarById(carId)
      setCarDetails(carData)

      if (carData && carData.car_name) {
        setSelectedCar(carData.car_name)
      } else {
        const selectedCarFromList = cars.find((car) => car.id === carId)
        if (selectedCarFromList) {
          setSelectedCar(selectedCarFromList.car_name)
        }
      }
    } catch (error) {
      console.error('Araç detayları yüklenirken hata:', error);
    }
  }

  const handleCarSelect = async (car) => {
    setShowCarPicker(false)

    try {
      setLoadingCars(true)
      setLoadingMessage("Araç bilgileri yükleniyor...")

      const response = await userService.setUserCarPreference(car.id)
      await fetchCarDetails(car.id)
    } catch (error) {
      console.error("Araç tercihi kaydedilirken hata:", error)

      try {
        await fetchCarDetails(car.id)
      } catch (detailError) {
        console.error("Araç detayları alınamadı:", detailError)
      }

      Alert.alert("Bilgi", "Tercihleriniz geçici olarak gösterilecek, ancak sunucuya kaydedilemedi.", [
        { text: "Tamam" },
      ])
    } finally {
      setLoadingCars(false)
      setLoadingMessage("")
    }
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
    Alert.alert("Çıkış Yap", "Hesabınızdan çıkış yapmak istediğinize emin misiniz?", [
      {
        text: "İptal",
        style: "cancel",
      },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          try {
            await authService.logout()
            reset([{ name: "Login" }])
          } catch (error) {
            console.error("Logout Error:", error)
            Alert.alert("Hata", "Çıkış yapılırken bir hata oluştu.", [{ text: "Tamam" }])
          }
        },
      },
    ])
  }

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  )

  const clearSearch = () => {
    setSearchQuery("")
  }

  const handleRefreshCars = () => {
    Alert.alert("Araçları Yenile", "Tüm araç listesini yeniden yüklemek istiyor musunuz?", [
      { text: "İptal", style: "cancel" },
      { text: "Yenile", onPress: fetchCars },
    ])
  }

  const openCarPickerModal = async () => {
    console.log("🎯 Araç seçim modalı açılıyor...")
    console.log("📊 Mevcut araç sayısı:", cars.length)

    // Eğer araç listesi boşsa önce yükle
    if (cars.length === 0) {
      console.log("🔄 Araç listesi boş, yeniden yükleniyor...")
      setLoadingCars(true)
      await fetchCars() // Araçları yükle
      setShowCarPicker(true) // Modal'ı yükleme bittikten sonra aç
    } else {
      console.log("✅ Araç listesi mevcut, modal açılıyor")
      setShowCarPicker(true)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2234" />

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
      
      {/* Araç Seçim Modalı - Geliştirilmiş */}
      <Modal
        visible={showCarPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowCarPicker(false)
          setSearchQuery("")
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={{
            maxHeight: 500,
            width: 340,
            alignSelf: 'center',
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#232b3e',
            padding: 0,
            marginTop: 40
          }}>
            {/* Modal Header */}
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,184,212,0.15)'}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <FontAwesome5 name="car" size={20} color="#00b8d4" style={{marginRight: 8}} />
                <Text style={{color: '#00b8d4', fontSize: 18, fontWeight: 'bold'}}>Araç Seçin</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowCarPicker(false)
                  setSearchQuery("")
                }}
              >
                <Ionicons name="close" size={20} color="#00b8d4" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, {backgroundColor: '#1a2234', borderColor: 'rgba(0,184,212,0.15)'}]}>
              <Ionicons name="search" size={20} color="#a0a9bc" style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, {color: '#fff'}]}
                placeholder="Araç adı, marka, menzil veya kWh ile arayın..."
                placeholderTextColor="#a0a9bc"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#a0a9bc" />
                </TouchableOpacity>
              )}
            </View>

            {/* Results Info */}
            {filteredCars.length > 0 && (
              <View style={styles.resultsInfo}>
                <Text style={[styles.resultsInfoText, {color: '#a0a9bc'}]}>
                  {searchQuery ? `${filteredCars.length} araç bulundu` : `Toplam ${cars.length} araç`}
                </Text>
              </View>
            )}

            {/* Car List */}
            {loadingCars ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00b8d4" />
                <Text style={styles.loadingText}>Araçlar yükleniyor...</Text>
              </View>
            ) : groupedCars.length > 0 ? (
              <SectionList
                sections={groupedCars}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.carListItem,
                      {backgroundColor: selectedCar === item.car_name ? 'rgba(0,184,212,0.15)' : 'rgba(45,52,70,0.8)', borderBottomColor: 'rgba(0,184,212,0.07)'},
                      selectedCar === item.car_name && {borderLeftWidth: 4, borderLeftColor: '#00b8d4'},
                    ]}
                    onPress={() => handleCarSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.carItemContent}>
                      <View style={styles.carItemIcon}>
                        <FontAwesome5 
                          name="car-side" 
                          size={16} 
                          color={selectedCar === item.car_name ? "#00b8d4" : "#a0a9bc"} 
                        />
                      </View>
                      <View style={styles.carItemInfo}>
                        <Text
                          style={[
                            styles.carListItemText,
                            {color: selectedCar === item.car_name ? '#00b8d4' : '#fff', fontWeight: selectedCar === item.car_name ? 'bold' : '500'},
                          ]}
                          numberOfLines={1}
                        >
                          {item.car_name}
                        </Text>
                        <Text style={[styles.carItemSpecs, {color: '#a0a9bc'}]}>
                          {item.brand_name ? item.brand_name + ' • ' : ''}
                          {item.average_range ? `${item.average_range} km` : ''}
                          {item.kwh ? ` • ${item.kwh} kWh` : ''}
                        </Text>
                      </View>
                    </View>
                    {selectedCar === item.car_name && (
                      <Ionicons name="checkmark-circle" size={20} color="#00b8d4" />
                    )}
                  </TouchableOpacity>
                )}
                renderSectionHeader={({section}) => (
                  <View style={[styles.sectionHeader, {backgroundColor: 'transparent', borderBottomColor: 'rgba(0,184,212,0.15)'}]}>
                    <Text style={[styles.sectionHeaderText, {color: '#00b8d4'}]}>{section.title}</Text>
                  </View>
                )}
                showsVerticalScrollIndicator={true}
                style={{maxHeight: 320, minHeight: 100}}
                stickySectionHeadersEnabled={true}
                initialNumToRender={15}
                maxToRenderPerBatch={20}
                windowSize={10}
                removeClippedSubviews={true}
                getItemLayout={(data, index) => ({
                  length: 70,
                  offset: 70 * index,
                  index,
                })}
              />
            ) : searchQuery ? (
              <View style={styles.emptyList}>
                <Ionicons name="search-outline" size={48} color="#a0a9bc" />
                <Text style={styles.emptyListText}>
                  "{searchQuery}" için araç bulunamadı
                </Text>
                <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
                  <Text style={styles.clearSearchText}>Aramayı Temizle</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyList}>
                <Ionicons name="car-outline" size={48} color="#a0a9bc" />
                <Text style={styles.emptyListText}>
                  Araç listesi yüklenemedi
                </Text>
                <TouchableOpacity onPress={fetchCars} style={styles.retryButton}>
                  <Ionicons name="refresh" size={16} color="#00b8d4" />
                  <Text style={styles.retryText}>Yeniden Dene</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a2234",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    paddingBottom: 15,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    marginRight: 15,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 184, 212, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 184, 212, 0.3)",
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    color: "#00b8d4",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 184, 212, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 184, 212, 0.3)",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  userInfoContainer: {
    marginBottom: 20,
  },
  carSelectionContainer: {
    marginBottom: 20,
  },
  historyContainer: {
    marginBottom: 20,
  },
  sectionGradient: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 184, 212, 0.2)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 184, 212, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00b8d4",
    letterSpacing: 0.3,
  },
  userInfoContent: {
    gap: 16,
  },
  enhancedInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(45, 52, 70, 0.5)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 184, 212, 0.1)",
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 184, 212, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#a0a9bc",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  infoValue: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  carSelectionContent: {
    gap: 16,
  },
  enhancedCarPicker: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 184, 212, 0.3)",
  },
  carPickerGradient: {
    padding: 16,
  },
  carPickerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  carPickerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 184, 212, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  carPickerText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  carDetailsContainer: {
    backgroundColor: "rgba(45, 52, 70, 0.5)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 184, 212, 0.1)",
  },
  carDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  carDetailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#00b8d4",
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  carDetailsContent: {
    gap: 12,
  },
  carDetailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  carDetailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 184, 212, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  carDetailInfo: {
    flex: 1,
  },
  carDetailLabel: {
    fontSize: 14,
    color: "#a0a9bc",
    marginBottom: 2,
  },
  carDetailValue: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "600",
  },
  historyHeader: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "rgba(45, 52, 70, 0.3)",
    borderRadius: 12,
    padding: 4,
  },
  historyTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeHistoryTab: {
    backgroundColor: "rgba(0, 184, 212, 0.2)",
  },
  historyTabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#a0a9bc",
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  activeHistoryTabText: {
    color: "#00b8d4",
  },
  historyContent: {
    gap: 16,
  },
  enhancedHistoryCard: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 184, 212, 0.2)",
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 184, 212, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00b8d4",
    letterSpacing: 0.2,
  },
  cardContent: {
    gap: 12,
  },
  routeInfo: {
    gap: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: "#ffffff",
    lineHeight: 20,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: "#a0a9bc",
    marginLeft: 5,
    opacity: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 184, 212, 0.1)",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00b8d4",
  },
  chargingInfo: {
    gap: 12,
  },
  chargingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chargingLabel: {
    fontSize: 14,
    color: "#a0a9bc",
    minWidth: 60,
  },
  chargingValue: {
    flex: 1,
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "500",
  },
  batteryProgress: {
    gap: 8,
  },
  batteryLabel: {
    fontSize: 14,
    color: "#a0a9bc",
    fontWeight: "500",
  },
  batteryContainer: {
    gap: 6,
  },
  batteryBar: {
    height: 8,
    backgroundColor: "rgba(160, 169, 188, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  batteryFill: {
    height: "100%",
    backgroundColor: "#4caf50",
    borderRadius: 4,
  },
  batteryText: {
    fontSize: 12,
    color: "#a0a9bc",
    textAlign: "center",
  },
  chargingStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 184, 212, 0.1)",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#a0a9bc",
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#a0a9bc",
    textAlign: "center",
    opacity: 0.7,
  },
  logoutContainer: {
    marginTop: 20,
  },
  logoutButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 12,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 0.3,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(26, 34, 52, 0.95)",
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    color: "#a0a9bc",
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00b8d4",
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 184, 212, 0.3)",
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 184, 212, 0.2)",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    color: "#00b8d4",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 184, 212, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(45, 52, 70, 0.8)",
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(0, 184, 212, 0.2)",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  resultsInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 184, 212, 0.1)",
  },
  resultsInfoText: {
    color: "#a0a9bc",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  carListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 184, 212, 0.1)",
  },
  selectedCarItem: {
    backgroundColor: "rgba(0, 184, 212, 0.1)",
  },
  carItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  carItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 184, 212, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  carItemInfo: {
    flex: 1,
  },
  carItemSpecs: {
    fontSize: 12,
    color: "#a0a9bc",
    marginTop: 2,
    letterSpacing: 0.1,
  },
  selectedCarItemText: {
    color: "#00b8d4",
    fontWeight: "600",
  },
  sectionHeader: {
    backgroundColor: "rgba(15, 21, 33, 0.9)",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 184, 212, 0.2)",
  },
  sectionHeaderText: {
    color: "#00b8d4",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  emptyListText: {
    color: "#a0a9bc",
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  clearSearchButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0, 184, 212, 0.2)",
    borderRadius: 8,
  },
  clearSearchText: {
    color: "#00b8d4",
    fontSize: 14,
    fontWeight: "500",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0, 184, 212, 0.2)",
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: "#00b8d4",
    fontSize: 14,
    fontWeight: "500",
  },
  debugInfo: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    padding: 8,
    margin: 16,
    borderRadius: 4,
  },
  debugText: {
    color: "#ff6b6b",
    fontSize: 12,
    fontFamily: "monospace",
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  carList: {
    flex: 1,
  },
});

export default UserProfileScreen
