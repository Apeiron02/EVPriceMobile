"use client"

import { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
  Animated,
  Platform,
} from "react-native"
import MapView, { Marker, Callout, PROVIDER_DEFAULT, Polyline } from "react-native-maps"
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons"
import api from "../api"
import * as Location from 'expo-location'
import { getRouteInfo } from '../api/map'

const { width, height } = Dimensions.get("window")
const ANIMATION_DURATION = 300

const MapScreen = ({ navigation, route }) => {
  const [searchText, setSearchText] = useState("")
  const mapRef = useRef(null)
  const [chargingStations, setChargingStations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)
  const [showStationDetails, setShowStationDetails] = useState(false)
  const [lastSearchedLocation, setLastSearchedLocation] = useState(null)
  const [mapType, setMapType] = useState("standard")
  const [showLocationInfo, setShowLocationInfo] = useState(false)
  const [routeCoordinates, setRouteCoordinates] = useState([])

  // Animation values
  const locationInfoOpacity = useRef(new Animated.Value(0)).current
  const bottomNavHeight = useRef(new Animated.Value(80)).current
  const modalTranslateY = useRef(new Animated.Value(height)).current

  // Haritanın başlangıç konumu - default Türkiye merkezine ayarlandı
  const [region, setRegion] = useState({
    latitude: 39.9334,
    longitude: 32.8597,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  })

  // Seçilen konum değiştiğinde şarj istasyonlarını getir
  useEffect(() => {
    if (selectedLocation) {
      const shouldFetchStations = shouldFetchNewStations(selectedLocation)

      if (shouldFetchStations) {
        fetchNearbyChargingStations(selectedLocation.latitude, selectedLocation.longitude)
        setLastSearchedLocation(selectedLocation)
      }

      // Konum bilgisini göster
      setShowLocationInfo(true)
      Animated.timing(locationInfoOpacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start()
    }
  }, [selectedLocation])

  // Konum bilgisi gösterildiğinde alt navigasyonu aşağı kaydır
  useEffect(() => {
    Animated.timing(bottomNavHeight, {
      toValue: showLocationInfo ? 130 : 80,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start()
  }, [showLocationInfo])

  // Modal gösterildiğinde animasyon
  useEffect(() => {
    Animated.timing(modalTranslateY, {
      toValue: showStationDetails ? 0 : height,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start()
  }, [showStationDetails])

  useEffect(() => {
    if (route?.params?.origin && route?.params?.destination) {
      const { origin, destination } = route.params;
      fetchRouteInfo(origin, destination);
      
      // Haritayı rota başlangıç ve bitiş noktalarını gösterecek şekilde ayarla
      const coordinates = [
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude }
      ];
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true
      });
    }
  }, [route?.params]);

  // İki konum arasındaki uzaklığı hesaplama (Haversine formülü)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3 // Dünya yarıçapı (metre)
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return distance // metre cinsinden
  }

  // Yeni istasyon sorgusu yapılması gerekip gerekmediğini kontrol et
  const shouldFetchNewStations = (newLocation) => {
    // İlk sorgu ise veya son aranan konum yoksa
    if (!lastSearchedLocation) {
      return true
    }

    // Son aranan konum ile yeni konum arasındaki mesafe (metre)
    const distance = calculateDistance(
      lastSearchedLocation.latitude,
      lastSearchedLocation.longitude,
      newLocation.latitude,
      newLocation.longitude,
    )

    // Eğer mesafe 500 metreden fazla ise yeni sorgu yap
    return distance > 500
  }

  // Yakındaki şarj istasyonlarını getir
  const fetchNearbyChargingStations = async (latitude, longitude) => {
    setIsLoading(true)
    try {
      const response = await api.get(`yakin-sarj-istasyonlari/?lat=${latitude}&lng=${longitude}`)
      console.log("API yanıtı:", response)

      // API yanıtını kontrol et
      if (response && response.data && response.data.stations) {
        // API'den gelen stations dizisini kullan
        const stations = response.data.stations

        if (Array.isArray(stations) && stations.length > 0) {
          // API'den gelen veri yapısına göre istasyonları işle
          const mappedStations = stations.map((station, index) => ({
            id: station.place_id || `station-${index}`,
            title: station.name || `İstasyon ${index + 1}`,
            description: station.vicinity || "",
            rating: station.rating || 0,
            coordinate: {
              latitude: Number.parseFloat(station.latitude),
              longitude: Number.parseFloat(station.longitude),
            },
            details: station, // Tüm istasyon verilerini saklayalım
          }))
          setChargingStations(mappedStations)
          console.log(`${mappedStations.length} şarj istasyonu bulundu`)
        } else {
          console.log("Yakında şarj istasyonu bulunamadı")
          setChargingStations([])
          Alert.alert("Bilgi", "Bu bölgede şarj istasyonu bulunamadı. Lütfen başka bir bölge seçin.", [
            { text: "Tamam" },
          ])
        }
      } else {
        console.log("API yanıtı beklenen formatta değil:", response)
        setChargingStations([])
        Alert.alert("Bilgi", "Şarj istasyonu bilgileri alınamadı. Lütfen tekrar deneyin.", [{ text: "Tamam" }])
      }
    } catch (error) {
      console.error("Şarj istasyonları yüklenirken hata oluştu:", error)
      setChargingStations([])
      Alert.alert("Hata", "Şarj istasyonları yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.", [{ text: "Tamam" }])
    } finally {
      setIsLoading(false)
    }
  }

  // İstasyon detaylarını göster
  const handleStationPress = (e, station) => {
    setSelectedStation(station)
    setShowStationDetails(true)
  }

  // Google Maps'de yol tarifi göster
  const openDirections = (station) => {
    if (station && station.coordinate) {
      const { latitude, longitude } = station.coordinate
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`
      Linking.openURL(url).catch((err) => {
        console.error("Yol tarifi açılamadı:", err)
        Alert.alert("Hata", "Yol tarifi açılamadı. Lütfen Google Maps uygulamasının yüklü olduğundan emin olun.")
      })
    }
  }

  // Haritada bir noktaya tıklandığında
  const onMapPress = (event) => {
    // Eğer şarj istasyonu modal'ı açıksa, marker'a tıklama olayından ayır
    if (showStationDetails) {
      return
    }

    const { coordinate } = event.nativeEvent
    setSelectedLocation(coordinate)

    // Seçilen konuma yakınlaş
    mapRef.current.animateToRegion(
      {
        ...coordinate,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000,
    )
  }

  // Kullanıcı konumuna git
  const goToUserLocation = async () => {
    setIsLoading(true)
    try {
      // Önce cihazdan konum al
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error("Konum izni verilmedi");
        Alert.alert("Konum Hatası", "Konumunuza erişim izni verilmedi. Lütfen izinleri kontrol edin.", [{ text: "Tamam" }]);
        setIsLoading(false);
        return;
      }
      
      // Konum al
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }
      
      console.log("Cihazdan alınan konum:", userCoords)
      
      try {
        // Konum bilgisini API'ye GET parametreleri ile gönder
        // API'nin istediği formata göre latitude ve longitude'u query parametresi olarak ekle
        const response = await api.get(`kullanici-konumu/?latitude=${userCoords.latitude}&longitude=${userCoords.longitude}`)
        console.log("Kullanıcı konumu API yanıtı:", response.data)
        
        // API yanıtı başarılı mı kontrol et
        if (response && response.data && response.data.success === true) {
          // API'den gelen konum bilgisini kullan
          const serverLocation = response.data;
          const userLocation = {
            latitude: Number(serverLocation.latitude || userCoords.latitude),
            longitude: Number(serverLocation.longitude || userCoords.longitude),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }
          
          console.log("API'den alınan konum kullanılıyor:", userLocation)
          
          setRegion(userLocation)
          setSelectedLocation({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          })
        } else {
          // API başarısız yanıt döndürdüyse, yerel konumu kullan
          throw new Error("API geçerli konum verisi döndürmedi");
        }
      } catch (apiError) {
        console.error("API ile konum işlemi hatası:", apiError.message);
        
        // API hatası olsa da cihazdan alınan konumu kullan
        const userLocation = {
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
        
        console.log("Yerel konum kullanılıyor:", userLocation)
        
        setRegion(userLocation)
        setSelectedLocation({
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
        })
      }
      
      // Haritayı konuma taşı
      if (mapRef && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: selectedLocation?.latitude || userCoords.latitude,
          longitude: selectedLocation?.longitude || userCoords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }, 1000);
      }
      
      // Konum bilgisini göster
      setShowLocationInfo(true)
      Animated.timing(locationInfoOpacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start()
      
    } catch (error) {
      console.error("Kullanıcı konumu alma işlemi başarısız:", error)
      Alert.alert("Konum Hatası", "Konumunuz alınamadı. Lütfen tekrar deneyin veya konum izinlerinizi kontrol edin.", [{ text: "Tamam" }])
    } finally {
      setIsLoading(false)
    }
  }

  // Harita tipini değiştir
  const toggleMapType = () => {
    setMapType(mapType === "standard" ? "satellite" : "standard")
  }

  // Konum bilgisini kapat
  const closeLocationInfo = () => {
    Animated.timing(locationInfoOpacity, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start(() => {
      setShowLocationInfo(false)
    })
  }

  const fetchRouteInfo = async (origin, destination) => {
    try {
      const routeData = await getRouteInfo(
        origin.latitude, 
        origin.longitude, 
        destination.latitude, 
        destination.longitude
      );
      
      if (routeData && routeData.coordinates) {
        setRouteCoordinates(routeData.coordinates);
      }
    } catch (error) {
      console.error('Rota bilgisi alınırken hata:', error);
      Alert.alert('Hata', 'Rota bilgisi alınamadı. Lütfen tekrar deneyin.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Harita */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={region}
          onPress={onMapPress}
          mapType={mapType}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={true}
        >
          {/* Başlangıç ve bitiş noktaları için marker'lar */}
          {route?.params?.origin && (
            <Marker
              coordinate={{
                latitude: route.params.origin.latitude,
                longitude: route.params.origin.longitude
              }}
              title="Başlangıç"
              description={route.params.origin.name}
            />
          )}
          
          {route?.params?.destination && (
            <Marker
              coordinate={{
                latitude: route.params.destination.latitude,
                longitude: route.params.destination.longitude
              }}
              title="Varış"
              description={route.params.destination.name}
            />
          )}

          {/* Seçilen konum marker'ı */}
          {selectedLocation && (
            <Marker coordinate={selectedLocation} title="Seçilen Konum" pinColor="#3498db">
              <View style={styles.selectedLocationMarker}>
                <View style={styles.selectedLocationDot} />
                <View style={styles.selectedLocationRing} />
              </View>
            </Marker>
          )}

          {/* Şarj istasyonları */}
          {chargingStations.map((station) => (
            <Marker
              key={station.id}
              coordinate={station.coordinate}
              onPress={(e) => {
                e.stopPropagation() // Haritaya tıklama olayından ayır
                handleStationPress(e, station)
              }}
            >
              <View style={styles.markerContainer}>
                <FontAwesome5 name="charging-station" size={14} color="#fff" />
                {station.rating > 0 && (
                  <View style={styles.ratingContainer}>
                    <Text style={styles.ratingText}>{station.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              <Callout tooltip>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{station.title}</Text>
                  {station.description ? <Text style={styles.calloutDescription}>{station.description}</Text> : null}
                  <View style={styles.calloutFooter}>
                    <Text style={styles.calloutInfoText}>Detaylar için tıklayın</Text>
                    <Ionicons name="chevron-forward" size={12} color="#00b8d4" />
                  </View>
                </View>
              </Callout>
            </Marker>
          ))}

          {/* Rota çizgisi */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={4}
              strokeColor="#00b8d4"
            />
          )}
        </MapView>

        {/* Arama Çubuğu - Yeniden Düzenlenmiş */}
        <View style={styles.searchContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.searchBar}
            onPress={() => navigation.navigate('SearchRoute')}
          >
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <Text style={styles.searchInput}>
              {searchText || "Konum veya şarj istasyonu ara"}
            </Text>
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {/* Harita Kontrolleri */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton} onPress={toggleMapType}>
            <Ionicons name={mapType === "standard" ? "map" : "earth"} size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlButton} onPress={goToUserLocation}>
            <Ionicons name="locate" size={22} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Yükleniyor indikatörü */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00b8d4" />
          </View>
        )}

        {/* Konum bilgisi */}
        {showLocationInfo && (
          <Animated.View style={[styles.locationInfoContainer, { opacity: locationInfoOpacity }]}>
            <View style={styles.locationInfoHeader}>
              <Text style={styles.locationInfoTitle}>Seçilen Konum</Text>
              <TouchableOpacity onPress={closeLocationInfo}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.locationInfoContent}>
              <View style={styles.locationCoordinates}>
                <Ionicons name="location" size={16} color="#00b8d4" style={styles.locationIcon} />
                <Text style={styles.locationInfoText}>
                  {selectedLocation && typeof selectedLocation.latitude === 'number' 
                    ? `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`
                    : 'Koordinat bilgisi yükleniyor...'
                  }
                </Text>
              </View>
              <View style={styles.stationCountContainer}>
                <FontAwesome5 name="charging-station" size={14} color="#00b8d4" style={styles.stationIcon} />
                <Text style={styles.stationCountText}>
                  {isLoading ? "Şarj istasyonları aranıyor..." : `${chargingStations.length} şarj istasyonu bulundu`}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Şarj istasyonu detay modali */}
      <Modal
        visible={showStationDetails}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowStationDetails(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStationDetails(false)}>
          <Animated.View style={[styles.modalContainer, { transform: [{ translateY: modalTranslateY }] }]}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalDragIndicator} />

              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <FontAwesome5 name="charging-station" size={18} color="#00b8d4" style={styles.modalTitleIcon} />
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {selectedStation?.title}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={() => setShowStationDetails(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                {selectedStation?.rating > 0 && (
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingLabel}>Değerlendirme</Text>
                    <View style={styles.starsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={selectedStation.rating >= star ? "star" : "star-outline"}
                          size={18}
                          color="#FFD700"
                          style={{ marginRight: 2 }}
                        />
                      ))}
                      <Text style={styles.ratingValue}> ({selectedStation.rating.toFixed(1)})</Text>
                    </View>
                  </View>
                )}

                {selectedStation?.description ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={18} color="#00b8d4" style={styles.infoIcon} />
                    <Text style={styles.infoText}>{selectedStation.description}</Text>
                  </View>
                ) : null}

                <View style={styles.buttonsContainer}>
                  <TouchableOpacity
                    style={styles.directionButton}
                    onPress={() => {
                      openDirections(selectedStation)
                      setShowStationDetails(false)
                    }}
                  >
                    <Ionicons name="navigate" size={18} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Yol Tarifi</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.favoriteButton}>
                    <Ionicons name="heart-outline" size={18} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Favorilere Ekle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Alt Navigasyon - Konum butonu kaldırıldı */}
      <Animated.View style={[styles.bottomNav, { height: bottomNavHeight }]}>
        <View style={styles.bottomNavContent}>
          <TouchableOpacity style={styles.navButton}>
            <Ionicons name="compass" size={24} color="#00b8d4" />
            <Text style={[styles.navText, { color: "#00b8d4" }]}>Keşfet</Text>
          </TouchableOpacity>

          {/* Konum butonu kaldırıldı */}

          <TouchableOpacity style={styles.navButton}>
            <FontAwesome5 name="charging-station" size={22} color="#666" />
            <Text style={styles.navText}>İstasyonlar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton}>
            <Ionicons name="settings-outline" size={24} color="#666" />
            <Text style={styles.navText}>Ayarlar</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  searchContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 40,
    left: 0,
    right: 0,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  mapControls: {
    position: "absolute",
    right: 16,
    bottom: 150,
    alignItems: "center",
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedLocationMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  selectedLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3498db",
    borderWidth: 2,
    borderColor: "#fff",
  },
  selectedLocationRing: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#3498db",
    backgroundColor: "rgba(52, 152, 219, 0.2)",
  },
  markerContainer: {
    backgroundColor: "#00b8d4",
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: "#fff",
  },
  ratingContainer: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: "#FFD700",
    minWidth: 20,
    alignItems: "center",
  },
  ratingText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
  },
  calloutContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    width: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutTitle: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#00b8d4",
    marginBottom: 5,
  },
  calloutDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  calloutFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 5,
  },
  calloutInfoText: {
    fontSize: 11,
    color: "#00b8d4",
    fontStyle: "italic",
  },
  loadingContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -25,
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  locationInfoContainer: {
    position: "absolute",
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  locationInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  locationInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  locationInfoContent: {
    padding: 12,
  },
  locationCoordinates: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationInfoText: {
    fontSize: 13,
    color: "#333",
  },
  stationCountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stationIcon: {
    marginRight: 8,
  },
  stationCountText: {
    fontSize: 13,
    color: "#00b8d4",
    fontWeight: "500",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    overflow: "hidden",
  },
  bottomNavContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    minHeight: 300,
  },
  modalDragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  modalTitleIcon: {
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    padding: 16,
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
  },
  ratingLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingValue: {
    fontSize: 14,
    color: "#666",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "flex-start",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    lineHeight: 20,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 0,
  },
  directionButton: {
    backgroundColor: "#00b8d4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  favoriteButton: {
    backgroundColor: "#ff6b6b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
})

export default MapScreen