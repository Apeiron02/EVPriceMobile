"use client"

import { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
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
import { Ionicons, FontAwesome5 } from "@expo/vector-icons"
import api from "../api"
import * as Location from "expo-location"
import { getRouteInfoPOST } from "../api/map"

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
  const [showChargingStations, setShowChargingStations] = useState(false)
  const [routeStations, setRouteStations] = useState([])
  const [isLoadingStations, setIsLoadingStations] = useState(false)
  const [showRestStops, setShowRestStops] = useState(false)
  const [restStops, setRestStops] = useState([])
  const [isLoadingRestStops, setIsLoadingRestStops] = useState(false)
  const [selectedRestStop, setSelectedRestStop] = useState(null)
  const [showRestStopDetails, setShowRestStopDetails] = useState(false)

  // Animation values
  const locationInfoOpacity = useRef(new Animated.Value(0)).current
  const bottomNavHeight = useRef(new Animated.Value(80)).current
  const modalTranslateY = useRef(new Animated.Value(height)).current
  const restStopModalTranslateY = useRef(new Animated.Value(height)).current

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

  // Rest Stop modal gösterildiğinde animasyon
  useEffect(() => {
    Animated.timing(restStopModalTranslateY, {
      toValue: showRestStopDetails ? 0 : height,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start()
  }, [showRestStopDetails])

  useEffect(() => {
    if (route?.params?.origin && route?.params?.destination) {
      const { origin, destination, routeCoordinates } = route.params

      // Eğer rota bilgileri hazır olarak geldiyse, doğrudan göster
      if (routeCoordinates && routeCoordinates.length > 0) {
        console.log("Hazır rota bilgileri kullanılıyor:", routeCoordinates.length)
        setRouteCoordinates(routeCoordinates)

        // Haritayı rota başlangıç ve bitiş noktalarını gösterecek şekilde ayarla
        mapRef.current.fitToCoordinates(routeCoordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        })
      } else {
        // Rota bilgisi gelmemişse, API'den al
        console.log("Rota bilgileri API'den alınacak")
        fetchRouteInfo(origin, destination)
      }

      // Rota Detayları sayfasından gelen istekleri kontrol et
      if (route.params?.fromRouteDetails) {
        // Şarj istasyonlarını göster
        if (route.params.showChargingStations) {
          console.log("Rota Detayları sayfasından şarj istasyonlarını gösterme isteği alındı")
          toggleChargingStations()
        }

        // Mola noktalarını göster
        if (route.params.showRestStops) {
          console.log("Rota Detayları sayfasından mola noktalarını gösterme isteği alındı")
          toggleRestStops()
        }
      }
    }
  }, [route?.params])

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
      const response = await api.get(`yakin-sarj-istasyonlari/?lat=${latitude}&lng=${longitude}&radius=2`)
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

    // Seçilen konumun çevresindeki şarj istasyonlarını getir
    fetchNearbyChargingStations(coordinate.latitude, coordinate.longitude)
  }

  // Kullanıcı konumuna git
  const goToUserLocation = async () => {
    setIsLoading(true)
    try {
      // Önce cihazdan konum al
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        console.error("Konum izni verilmedi")
        Alert.alert("Konum Hatası", "Konumunuza erişim izni verilmedi. Lütfen izinleri kontrol edin.", [
          { text: "Tamam" },
        ])
        setIsLoading(false)
        return
      }

      // Konum al
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }

      console.log("Cihazdan alınan konum:", userCoords)

      try {
        // Konum bilgisini API'ye GET parametreleri ile gönder
        // API'nin istediği formata göre latitude ve longitude'u query parametresi olarak ekle
        const response = await api.get(
          `kullanici-konumu/?latitude=${userCoords.latitude}&longitude=${userCoords.longitude}`,
        )
        console.log("Kullanıcı konumu API yanıtı:", response.data)

        // API yanıtı başarılı mı kontrol et
        if (response && response.data && response.data.success === true) {
          // API'den gelen konum bilgisini kullan
          const serverLocation = response.data
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
          throw new Error("API geçerli konum verisi döndürmedi")
        }
      } catch (apiError) {
        console.error("API ile konum işlemi hatası:", apiError.message)

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
        mapRef.current.animateToRegion(
          {
            latitude: selectedLocation?.latitude || userCoords.latitude,
            longitude: selectedLocation?.longitude || userCoords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000,
        )
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
      Alert.alert("Konum Hatası", "Konumunuz alınamadı. Lütfen tekrar deneyin veya konum izinlerinizi kontrol edin.", [
        { text: "Tamam" },
      ])
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
      setIsLoading(true)
      console.log("Rota bilgisi isteniyor:", origin, destination)

      // Koordinatlar kontrol ediliyor
      if (!origin.latitude || !destination.latitude) {
        console.error("Geçersiz koordinatlar")
        Alert.alert("Hata", "Rota oluşturmak için geçerli koordinatlar gereklidir.")
        setIsLoading(false)
        return
      }

      // POST isteği kullanarak rota bilgisini al
      const routeData = await getRouteInfoPOST(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
        "driving",
      )

      console.log("Rota verisi alındı")

      // Doğrudan coordinates alanından verileri al - bu bizim polyline decoder'dan gelir
      if (routeData && routeData.coordinates && routeData.coordinates.length > 0) {
        console.log(`${routeData.coordinates.length} detaylı rota koordinat noktası alındı`)
        setRouteCoordinates(routeData.coordinates)

        // Rota bilgilerine göre haritayı ayarla
        mapRef.current.fitToCoordinates(routeData.coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        })
        return
      }

      // Eğer bizim decoder sonuçları yoksa, standart işlem yapılır
      if (routeData && routeData.routes && routeData.routes.length > 0) {
        // API'den gelen rota verilerini koordinat dizisine dönüştür
        const route = routeData.routes[0]
        console.log("Standart rota işlemi yapılıyor")

        if (route.overview_polyline && route.overview_polyline.points) {
          // Rota genel bakış polyline değerini decode et
          try {
            const decodedCoordinates = decodePolyline(route.overview_polyline.points)
            if (decodedCoordinates && decodedCoordinates.length > 0) {
              console.log(`Overview polyline decodlandı: ${decodedCoordinates.length} nokta`)
              setRouteCoordinates(decodedCoordinates)

              // Rota bilgilerine göre haritayı ayarla
              mapRef.current.fitToCoordinates(decodedCoordinates, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
              })
              return
            }
          } catch (decodeError) {
            console.error("Polyline decode hatası:", decodeError)
          }
        }

        // Eğer overview_polyline yoksa veya decode edilemiyorsa, adım adım rota bilgilerini kullan
        if (route.legs && route.legs.length > 0) {
          console.log("Rota bacak bilgilerinden koordinatlar oluşturuluyor")
          const pathCoordinates = []

          route.legs.forEach((leg) => {
            if (leg.steps) {
              leg.steps.forEach((step) => {
                // Adımların polyline verilerini decode et
                if (step.polyline && step.polyline.points) {
                  try {
                    const stepPoints = decodePolyline(step.polyline.points)
                    if (stepPoints && stepPoints.length > 0) {
                      pathCoordinates.push(...stepPoints)
                    } else {
                      // Polyline decode edilemezse, adımın başlangıç ve bitiş noktalarını ekle
                      pathCoordinates.push({
                        latitude: step.start_location.lat,
                        longitude: step.start_location.lng,
                      })
                      pathCoordinates.push({
                        latitude: step.end_location.lat,
                        longitude: step.end_location.lng,
                      })
                    }
                  } catch (stepDecodeError) {
                    console.error("Adım polyline decode hatası:", stepDecodeError)
                    // Hata durumunda başlangıç ve bitiş noktalarını ekle
                    pathCoordinates.push({
                      latitude: step.start_location.lat,
                      longitude: step.start_location.lng,
                    })
                    pathCoordinates.push({
                      latitude: step.end_location.lat,
                      longitude: step.end_location.lng,
                    })
                  }
                } else {
                  // Polyline yoksa, adımın başlangıç ve bitiş noktalarını ekle
                  pathCoordinates.push({
                    latitude: step.start_location.lat,
                    longitude: step.start_location.lng,
                  })
                  pathCoordinates.push({
                    latitude: step.end_location.lat,
                    longitude: step.end_location.lng,
                  })
                }
              })
            }
          })

          // Eğer koordinatlar başarıyla oluşturulduysa, haritada göster
          if (pathCoordinates.length > 0) {
            console.log(`${pathCoordinates.length} koordinat noktası işlendi`)
            setRouteCoordinates(pathCoordinates)

            // Rota bilgilerine göre haritayı ayarla
            mapRef.current.fitToCoordinates(pathCoordinates, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            })
            return
          }
        }

        console.warn("Rota koordinatları oluşturulamadı")
        Alert.alert("Uyarı", "Bu rotada yol bilgisi bulunamadı. Lütfen geçerli adresler girdiğinizden emin olun.")
      } else {
        console.warn("Rota verisi bulunamadı")
        Alert.alert("Uyarı", "Bu rotada yol bilgisi bulunamadı. Lütfen geçerli adresler girdiğinizden emin olun.")
      }
    } catch (error) {
      console.error("Rota bilgisi alınırken hata:", error)
      Alert.alert("Hata", error.message || "Rota bilgisi alınamadı. Lütfen tekrar deneyin.")
    } finally {
      setIsLoading(false)
    }
  }

  // Google polyline decoder fonksiyonu
  const decodePolyline = (encoded) => {
    if (!encoded || encoded.length === 0) {
      return []
    }

    const poly = []
    let index = 0
    const len = encoded.length
    let lat = 0
    let lng = 0

    while (index < len) {
      let b
      let shift = 0
      let result = 0

      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)

      const dlat = result & 1 ? ~(result >> 1) : result >> 1
      lat += dlat

      shift = 0
      result = 0

      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)

      const dlng = result & 1 ? ~(result >> 1) : result >> 1
      lng += dlng

      poly.push({
        latitude: lat * 1e-5,
        longitude: lng * 1e-5,
      })
    }

    return poly
  }

  // Rota üzerindeki noktaları belirli aralıklarla bölen fonksiyon
  const getRouteCheckpoints = (coordinates, intervalKm = 25) => {
    if (!coordinates || coordinates.length < 2) return []

    const checkpoints = []
    let totalDistance = 0

    // Başlangıç ve bitiş noktalarını hariç tut
    for (let i = 1; i < coordinates.length - 1; i++) {
      const current = coordinates[i]
      const next = coordinates[i + 1]

      // İki nokta arasındaki mesafeyi hesapla (km)
      const distance = calculateDistance(current.latitude, current.longitude, next.latitude, next.longitude) / 1000 // metre'den km'ye çevir

      totalDistance += distance

      // Belirlenen aralığa ulaşıldığında kontrol noktası ekle
      if (totalDistance >= intervalKm) {
        checkpoints.push({
          latitude: next.latitude,
          longitude: next.longitude,
        })
        totalDistance = 0 // Mesafeyi sıfırla
      }
    }

    return checkpoints
  }

  // Şarj istasyonlarını göster/gizle
  const toggleChargingStations = async () => {
    if (!showChargingStations && routeCoordinates.length > 0) {
      setIsLoadingStations(true)
      try {
        // Rota üzerindeki kontrol noktalarını al (her 100 km'de bir)
        const checkpoints = getRouteCheckpoints(routeCoordinates, 25)
        console.log(`${checkpoints.length} kontrol noktası oluşturuldu`)

        // Her kontrol noktası için şarj istasyonlarını ara
        const allStations = new Map() // Tekrar eden istasyonları önlemek için Map kullan

        for (const checkpoint of checkpoints) {
          try {
            const response = await api.get(
              `yakin-sarj-istasyonlari/?lat=${checkpoint.latitude}&lng=${checkpoint.longitude}&radius=2`,
            ) // 2 km yarıçap

            if (response.data && response.data.stations) {
              response.data.stations.forEach((station) => {
                // Her istasyonu benzersiz bir ID ile ekle
                const stationId = station.place_id || `${station.latitude}-${station.longitude}`
                if (!allStations.has(stationId)) {
                  allStations.set(stationId, {
                    ...station,
                    id: stationId,
                  })
                }
              })
            }
          } catch (error) {
            console.error(`Kontrol noktası için şarj istasyonları alınamadı:`, error)
            continue
          }
        }

        // Map'ten diziye çevir
        const uniqueStations = Array.from(allStations.values())
        console.log(`${uniqueStations.length} benzersiz şarj istasyonu bulundu`)

        setRouteStations(uniqueStations)
        setShowChargingStations(true)
      } catch (error) {
        console.error("Şarj istasyonları yüklenirken hata:", error)
        Alert.alert("Hata", "Şarj istasyonları yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.")
      } finally {
        setIsLoadingStations(false)
      }
    } else {
      setShowChargingStations(false)
      setRouteStations([])
    }
  }

  // AI önerisi ile mola noktalarını göster/gizle
  const toggleRestStops = async () => {
    if (!showRestStops && routeCoordinates.length > 0) {
      setIsLoadingRestStops(true)
      try {
        // Rota üzerindeki şehirleri belirle
        const cities = extractCitiesFromRoute()

        if (cities.length === 0) {
          Alert.alert("Bilgi", "Rota üzerinde şehir bilgisi bulunamadı.")
          setIsLoadingRestStops(false)
          return
        }

        console.log("Rota üzerindeki şehirler:", cities)

        // Normalde burada API isteği yapılacak, şimdilik örnek veri kullanıyoruz
        // Bu kısım gerçek API entegrasyonu ile değiştirilecek
        const mockRestStops = generateMockRestStops(cities)

        // Kısa bir gecikme ekleyerek yükleme animasyonunu göster
        setTimeout(() => {
          setRestStops(mockRestStops)
          setShowRestStops(true)
          setIsLoadingRestStops(false)
        }, 1500)
      } catch (error) {
        console.error("Mola noktaları yüklenirken hata:", error)
        Alert.alert("Hata", "Mola noktaları yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.")
        setIsLoadingRestStops(false)
      }
    } else {
      setShowRestStops(false)
      setRestStops([])
    }
  }

  // Rota üzerindeki şehirleri çıkaran yardımcı fonksiyon
  const extractCitiesFromRoute = () => {
    // Gerçek uygulamada, rota üzerindeki şehirleri belirlemek için
    // reverse geocoding veya rota API'sinden gelen bilgiler kullanılabilir

    // Örnek olarak, rotanın başlangıç, orta ve bitiş noktalarından şehirler
    if (!routeCoordinates || routeCoordinates.length < 2) return []

    const cities = []

    // Başlangıç şehri
    if (route?.params?.origin?.name) {
      const originCity = route.params.origin.name.split(",")[0].trim()
      cities.push(originCity)
    }

    // Rota üzerindeki ara şehirler (gerçek uygulamada API'den alınacak)
    // Örnek olarak, rotanın uzunluğuna göre 1-3 ara şehir ekliyoruz
    const routeLength = routeCoordinates.length

    if (routeLength > 50) {
      // Uzun rota için ara şehirler
      const midPoint1 = routeCoordinates[Math.floor(routeLength * 0.25)]
      const midPoint2 = routeCoordinates[Math.floor(routeLength * 0.5)]
      const midPoint3 = routeCoordinates[Math.floor(routeLength * 0.75)]

      // Gerçek uygulamada bu koordinatlar için reverse geocoding yapılacak
      // Şimdilik örnek şehir isimleri
      if (route?.params?.origin?.name && route?.params?.destination?.name) {
        const originCity = route.params.origin.name.split(",")[0].trim()
        const destCity = route.params.destination.name.split(",")[0].trim()

        // Ankara-İstanbul rotası için örnek şehirler
        if (originCity.includes("Ankara") && destCity.includes("İstanbul")) {
          cities.push("Bolu")
          cities.push("Sakarya")
        }
        // İstanbul-İzmir rotası için örnek şehirler
        else if (originCity.includes("İstanbul") && destCity.includes("İzmir")) {
          cities.push("Bursa")
          cities.push("Balıkesir")
        }
        // Ankara-Antalya rotası için örnek şehirler
        else if (originCity.includes("Ankara") && destCity.includes("Antalya")) {
          cities.push("Konya")
          cities.push("Isparta")
        }
        // Diğer rotalar için rastgele şehirler
        else {
          const turkishCities = ["Eskişehir", "Kayseri", "Konya", "Samsun", "Trabzon", "Gaziantep"]
          const randomCity1 = turkishCities[Math.floor(Math.random() * turkishCities.length)]
          cities.push(randomCity1)

          const randomCity2 = turkishCities.filter((city) => city !== randomCity1)[
            Math.floor(Math.random() * (turkishCities.length - 1))
          ]
          cities.push(randomCity2)
        }
      }
    } else if (routeLength > 20) {
      // Orta uzunlukta rota için bir ara şehir
      if (route?.params?.origin?.name && route?.params?.destination?.name) {
        const originCity = route.params.origin.name.split(",")[0].trim()
        const destCity = route.params.destination.name.split(",")[0].trim()

        // Ankara-Eskişehir rotası için örnek şehir
        if (originCity.includes("Ankara") && destCity.includes("Eskişehir")) {
          cities.push("Polatlı")
        } else {
          const turkishCities = ["Kırıkkale", "Afyon", "Düzce", "Çorum", "Yozgat"]
          cities.push(turkishCities[Math.floor(Math.random() * turkishCities.length)])
        }
      }
    }

    // Varış şehri
    if (route?.params?.destination?.name) {
      const destCity = route.params.destination.name.split(",")[0].trim()
      cities.push(destCity)
    }

    // Tekrarlanan şehirleri kaldır
    return [...new Set(cities)]
  }

  // Örnek mola noktaları oluşturan fonksiyon
  const generateMockRestStops = (cities) => {
    const restStopTypes = [
      { type: "cafe", name: "Kahve Molası", icon: "cafe" },
      { type: "restaurant", name: "Restoran", icon: "restaurant" },
      { type: "park", name: "Park", icon: "leaf" },
      { type: "museum", name: "Müze", icon: "business" },
      { type: "viewpoint", name: "Manzara Noktası", icon: "image" },
    ]

    return cities.flatMap((city, index) => {
      // Her şehir için rastgele 1-2 mola noktası oluştur
      const numStops = Math.floor(Math.random() * 2) + 1
      const cityStops = []

      for (let i = 0; i < numStops; i++) {
        const randomType = restStopTypes[Math.floor(Math.random() * restStopTypes.length)]

        // Şehre özgü mola noktası isimleri
        let stopName = ""
        let description = ""

        if (city === "Ankara") {
          if (randomType.type === "cafe") {
            stopName = "Kuğulu Park Cafe"
            description = "Kuğulu Park'ın yanında huzurlu bir ortamda kahvenizi yudumlayabilirsiniz."
          } else if (randomType.type === "restaurant") {
            stopName = "Hacı Arif Bey"
            description = "Geleneksel Türk mutfağının en lezzetli örneklerini bulabileceğiniz tarihi bir mekan."
          } else if (randomType.type === "museum") {
            stopName = "Anadolu Medeniyetleri Müzesi"
            description = "Türkiye'nin en önemli müzelerinden biri, Anadolu'nun zengin tarihini keşfedin."
          } else {
            stopName = `${city} ${randomType.name}`
            description = `${city}'da keyifli bir mola noktası. Yolculuğunuza devam etmeden önce dinlenebilirsiniz.`
          }
        } else if (city === "İstanbul") {
          if (randomType.type === "cafe") {
            stopName = "Pierre Loti Cafe"
            description = "Haliç'e hakim muhteşem manzarasıyla ünlü tarihi bir kafe."
          } else if (randomType.type === "restaurant") {
            stopName = "Karaköy Lokantası"
            description = "Geleneksel Türk mutfağının modern yorumlarını sunan şık bir mekan."
          } else if (randomType.type === "museum") {
            stopName = "Topkapı Sarayı"
            description = "Osmanlı İmparatorluğu'nun 400 yıl boyunca yönetim merkezi olan muhteşem saray."
          } else {
            stopName = `${city} ${randomType.name}`
            description = `${city}'da keyifli bir mola noktası. Yolculuğunuza devam etmeden önce dinlenebilirsiniz.`
          }
        } else if (city === "İzmir") {
          if (randomType.type === "cafe") {
            stopName = "Kordon Cafe"
            description = "İzmir Körfezi manzarasına karşı keyifli bir kahve molası."
          } else if (randomType.type === "restaurant") {
            stopName = "Deniz Restaurant"
            description = "Taze deniz ürünleri ve Ege mutfağının lezzetlerini sunan bir mekan."
          } else {
            stopName = `${city} ${randomType.name}`
            description = `${city}'da keyifli bir mola noktası. Yolculuğunuza devam etmeden önce dinlenebilirsiniz.`
          }
        } else if (city === "Antalya") {
          if (randomType.type === "cafe") {
            stopName = "Kaleiçi Cafe"
            description = "Tarihi Kaleiçi'nde otantik bir ortamda kahve keyfi."
          } else if (randomType.type === "viewpoint") {
            stopName = "Düden Şelalesi"
            description = "Muhteşem doğa manzarası sunan şelale, fotoğraf çekmek için ideal."
          } else {
            stopName = `${city} ${randomType.name}`
            description = `${city}'da keyifli bir mola noktası. Yolculuğunuza devam etmeden önce dinlenebilirsiniz.`
          }
        } else if (city === "Bolu") {
          if (randomType.type === "restaurant") {
            stopName = "Bolu Kebapçısı"
            description = "Meşhur Bolu mutfağının lezzetlerini tadabileceğiniz otantik bir mekan."
          } else if (randomType.type === "viewpoint") {
            stopName = "Abant Gölü"
            description = "Doğal güzelliğiyle ünlü Abant Gölü'nde huzurlu bir mola."
          } else {
            stopName = `${city} ${randomType.name}`
            description = `${city}'da keyifli bir mola noktası. Yolculuğunuza devam etmeden önce dinlenebilirsiniz.`
          }
        } else {
          stopName = `${city} ${randomType.name}`
          description = `${city}'da keyifli bir mola noktası.  Yolculuğunuza devam etmeden önce dinlenebilirsiniz.`
        }

        // Rastgele koordinat oluştur (gerçek uygulamada API'den gelecek)
        // Rota üzerindeki bir noktaya yakın olacak şekilde
        const routeIndex = Math.floor((routeCoordinates.length * (index + 1)) / (cities.length + 1))
        const baseCoord = routeCoordinates[routeIndex]

        // Koordinata küçük bir rastgele sapma ekle
        const latitude = baseCoord.latitude + (Math.random() - 0.5) * 0.01
        const longitude = baseCoord.longitude + (Math.random() - 0.5) * 0.01

        cityStops.push({
          id: `rest-stop-${city}-${i}`,
          name: stopName,
          type: randomType.type,
          icon: randomType.icon,
          city: city,
          description: description,
          rating: (3 + Math.random() * 2).toFixed(1), // 3.0-5.0 arası rastgele puanlama
          coordinate: {
            latitude,
            longitude,
          },
        })
      }

      return cityStops
    }) // İç içe dizileri düzleştir
  }

  // Mola noktası marker'ına tıklandığında
  const handleRestStopPress = (e, restStop) => {
    setSelectedRestStop(restStop)
    setShowRestStopDetails(true)

    // Modal animasyonunu başlat
    Animated.timing(restStopModalTranslateY, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start()
  }

  // İstasyonu rotaya ekle
  const addStationToRoute = async (station) => {
    try {
      setIsLoading(true)

      // Mevcut rotayı iki parçaya böl
      const stationIndex = routeCoordinates.findIndex(
        (coord) =>
          Math.abs(coord.latitude - station.latitude) < 0.001 && Math.abs(coord.longitude - station.longitude) < 0.001,
      )

      if (stationIndex === -1) {
        // İstasyon rotaya yakın bir noktada değilse, en yakın noktayı bul
        const nearestPoint = findNearestPointOnRoute(station, routeCoordinates)

        // Yeni rota hesapla
        const newRoute = await recalculateRouteWithWaypoint(station)
        if (newRoute) {
          setRouteCoordinates(newRoute)
          Alert.alert("Başarılı", `${station.name} rotaya eklendi.`)
        }
      } else {
        Alert.alert("Bilgi", "Bu istasyon zaten rota üzerinde.")
      }
    } catch (error) {
      console.error("İstasyon rotaya eklenirken hata:", error)
      Alert.alert("Hata", "İstasyon rotaya eklenirken bir sorun oluştu.")
    } finally {
      setIsLoading(false)
    }
  }

  // Rotadaki en yakın noktayı bul
  const findNearestPointOnRoute = (station, routeCoords) => {
    let minDistance = Number.POSITIVE_INFINITY
    let nearestPoint = null

    routeCoords.forEach((coord) => {
      const distance = calculateDistance(station.latitude, station.longitude, coord.latitude, coord.longitude)
      if (distance < minDistance) {
        minDistance = distance
        nearestPoint = coord
      }
    })

    return nearestPoint
  }

  // Yeni waypoint ile rotayı yeniden hesapla
  const recalculateRouteWithWaypoint = async (station) => {
    try {
      const origin = route.params.origin
      const destination = route.params.destination

      // İki aşamalı rota hesapla
      const firstLeg = await getRouteInfoPOST(origin.latitude, origin.longitude, station.latitude, station.longitude)

      const secondLeg = await getRouteInfoPOST(
        station.latitude,
        station.longitude,
        destination.latitude,
        destination.longitude,
      )

      if (firstLeg && secondLeg) {
        // İki rotayı birleştir
        return [...firstLeg.coordinates, ...secondLeg.coordinates]
      }
    } catch (error) {
      console.error("Rota yeniden hesaplanırken hata:", error)
      throw error
    }
  }

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
                longitude: route.params.origin.longitude,
              }}
              title="Başlangıç"
              description={route.params.origin.name}
              pinColor="#2ecc71" // Yeşil pin
            >
              <View style={[styles.customMarker, { backgroundColor: "#2ecc71" }]}>
                <Ionicons name="flag" size={16} color="#fff" />
              </View>
            </Marker>
          )}

          {route?.params?.destination && (
            <Marker
              coordinate={{
                latitude: route.params.destination.latitude,
                longitude: route.params.destination.longitude,
              }}
              title="Varış"
              description={route.params.destination.name}
              pinColor="#e74c3c" // Kırmızı pin
            >
              <View style={[styles.customMarker, { backgroundColor: "#e74c3c" }]}>
                <Ionicons name="location" size={16} color="#fff" />
              </View>
            </Marker>
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

          {/* Yakındaki şarj istasyonları */}
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
              lineDashPattern={[0]}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Rota üzerindeki şarj istasyonları */}
          {showChargingStations &&
            routeStations.map((station) => (
              <Marker
                key={station.id || station.place_id}
                coordinate={{
                  latitude: Number.parseFloat(station.latitude || station.lat),
                  longitude: Number.parseFloat(station.longitude || station.lng),
                }}
                onPress={() =>
                  handleStationPress(null, {
                    ...station,
                    coordinate: {
                      latitude: Number.parseFloat(station.latitude || station.lat),
                      longitude: Number.parseFloat(station.longitude || station.lng),
                    },
                    title: station.name,
                    description: station.vicinity,
                  })
                }
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
                    <Text style={styles.calloutTitle}>{station.name}</Text>
                    {station.vicinity ? <Text style={styles.calloutDescription}>{station.vicinity}</Text> : null}
                    <View style={styles.calloutFooter}>
                      <TouchableOpacity
                        style={styles.addToRouteButton}
                        onPress={() => {
                          addStationToRoute({
                            ...station,
                            latitude: Number.parseFloat(station.latitude || station.lat),
                            longitude: Number.parseFloat(station.longitude || station.lng),
                          })
                          setShowStationDetails(false)
                        }}
                      >
                        <Text style={styles.addToRouteText}>Rotaya Ekle</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Callout>
              </Marker>
            ))}

          {/* Mola noktaları */}
          {showRestStops &&
            restStops.map((restStop) => (
              <Marker
                key={restStop.id}
                coordinate={restStop.coordinate}
                onPress={(e) => {
                  e.stopPropagation() // Haritaya tıklama olayından ayır
                  handleRestStopPress(e, restStop)
                }}
              >
                <View
                  style={[styles.restStopMarker, { backgroundColor: restStop.type === "cafe" ? "#8e44ad" : "#27ae60" }]}
                >
                  <Ionicons name={restStop.icon} size={14} color="#fff" />
                  {restStop.rating && (
                    <View style={styles.ratingContainer}>
                      <Text style={styles.ratingText}>{restStop.rating}</Text>
                    </View>
                  )}
                </View>
                <Callout tooltip>
                  <View style={styles.calloutContainer}>
                    <Text style={styles.calloutTitle}>{restStop.name}</Text>
                    <Text style={styles.calloutDescription}>{restStop.city}</Text>
                    <View style={styles.calloutFooter}>
                      <Text style={styles.calloutInfoText}>Detaylar için tıklayın</Text>
                      <Ionicons name="chevron-forward" size={12} color="#8e44ad" />
                    </View>
                  </View>
                </Callout>
              </Marker>
            ))}
        </MapView>

        {/* Arama Çubuğu - Yeniden Düzenlenmiş */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Navigate to HomeScreen instead of going back
              navigation.navigate("Home")
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate("SearchRoute")}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <Text style={styles.searchInput}>{searchText || "Konum veya şarj istasyonu ara"}</Text>
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
          {routeCoordinates.length > 0 && (
            <TouchableOpacity
              style={[styles.mapControlButton, showChargingStations && styles.activeControlButton]}
              onPress={toggleChargingStations}
              disabled={isLoadingStations}
            >
              {isLoadingStations ? (
                <ActivityIndicator size="small" color="#00b8d4" />
              ) : (
                <FontAwesome5 name="charging-station" size={20} color={showChargingStations ? "#00b8d4" : "#333"} />
              )}
            </TouchableOpacity>
          )}
          {routeCoordinates.length > 0 && (
            <TouchableOpacity
              style={[styles.mapControlButton, showRestStops && styles.activeControlButton]}
              onPress={toggleRestStops}
              disabled={isLoadingRestStops}
            >
              {isLoadingRestStops ? (
                <ActivityIndicator size="small" color="#00b8d4" />
              ) : (
                <Ionicons name="cafe" size={20} color={showRestStops ? "#00b8d4" : "#333"} />
              )}
            </TouchableOpacity>
          )}
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
                  {selectedLocation && typeof selectedLocation.latitude === "number"
                    ? `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`
                    : "Koordinat bilgisi yükleniyor..."}
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

                  {selectedStation?.vicinity ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="location" size={18} color="#00b8d4" style={styles.infoIcon} />
                      <Text style={styles.infoText}>{selectedStation.vicinity}</Text>
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

                    <TouchableOpacity
                      style={styles.addToRouteButton}
                      onPress={() => {
                        addStationToRoute(selectedStation)
                        setShowStationDetails(false)
                      }}
                    >
                      <Ionicons name="add-circle" size={18} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>Rotaya Ekle</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        {/* Mola noktası detay modali */}
        <Modal
          visible={showRestStopDetails}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowRestStopDetails(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRestStopDetails(false)}>
            <Animated.View style={[styles.modalContainer, { transform: [{ translateY: restStopModalTranslateY }] }]}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalDragIndicator} />

                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Ionicons
                      name={selectedRestStop?.icon || "cafe"}
                      size={18}
                      color="#8e44ad"
                      style={styles.modalTitleIcon}
                    />
                    <Text style={[styles.modalTitle, { color: "#8e44ad" }]} numberOfLines={2}>
                      {selectedRestStop?.name}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setShowRestStopDetails(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalContent}>
                  <View style={styles.restStopCityContainer}>
                    <Ionicons name="location" size={16} color="#8e44ad" />
                    <Text style={styles.restStopCityText}>{selectedRestStop?.city}</Text>
                  </View>

                  {selectedRestStop?.rating && (
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingLabel}>Değerlendirme</Text>
                      <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={selectedRestStop.rating >= star ? "star" : "star-outline"}
                            size={18}
                            color="#FFD700"
                            style={{ marginRight: 2 }}
                          />
                        ))}
                        <Text style={styles.ratingValue}> ({selectedRestStop.rating})</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.restStopDescriptionContainer}>
                    <Text style={styles.restStopDescriptionTitle}>Hakkında</Text>
                    <Text style={styles.restStopDescription}>
                      {selectedRestStop?.description || "Bu mola noktası hakkında detaylı bilgi bulunmamaktadır."}
                    </Text>
                  </View>

                  <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                      style={[styles.directionButton, { backgroundColor: "#8e44ad" }]}
                      onPress={() => {
                        if (selectedRestStop) {
                          openDirections({
                            coordinate: selectedRestStop.coordinate,
                            title: selectedRestStop.name,
                          })
                        }
                        setShowRestStopDetails(false)
                      }}
                    >
                      <Ionicons name="navigate" size={18} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>Yol Tarifi</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.addToRouteButton, { backgroundColor: "#8e44ad" }]}
                      onPress={() => {
                        // Burada mola noktasını rotaya ekleme işlemi yapılabilir
                        Alert.alert("Bilgi", `${selectedRestStop?.name} rotanıza eklendi.`)
                        setShowRestStopDetails(false)
                      }}
                    >
                      <Ionicons name="add-circle" size={18} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>Rotaya Ekle</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </View>

      {/* Alt Navigasyon - Konum butonu kaldırıldı */}
      <Animated.View style={[styles.bottomNav, { height: bottomNavHeight }]}>
        <View style={styles.bottomNavContent}>
          <TouchableOpacity style={styles.navButton}>
            <Ionicons name="compass" size={24} color="#00b8d4" />
            <Text style={[styles.navText, { color: "#00b8d4" }]}>Keşfet</Text>
          </TouchableOpacity>

          {routeCoordinates.length > 0 && route?.params?.origin && route?.params?.destination ? (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                navigation.navigate("SearchDetails", {
                  origin: route.params.origin,
                  destination: route.params.destination,
                  routeCoordinates: routeCoordinates,
                  routeInfo: route.params.routeInfo || {},
                })
              }}
            >
              <Ionicons name="map-outline" size={24} color="#666" />
              <Text style={styles.navText}>Rota Bilgileri</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyNavButton} />
          )}

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
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00b8d4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  activeControlButton: {
    backgroundColor: "#e1f5fe",
    borderColor: "#00b8d4",
    borderWidth: 2,
  },
  addToRouteButton: {
    backgroundColor: "#00b8d4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  addToRouteText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  restStopMarker: {
    backgroundColor: "#8e44ad",
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: "#fff",
  },
  restStopCityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#f8f4fc",
    padding: 10,
    borderRadius: 8,
  },
  restStopCityText: {
    fontSize: 14,
    color: "#8e44ad",
    fontWeight: "500",
    marginLeft: 8,
  },
  restStopDescriptionContainer: {
    backgroundColor: "#f8f4fc",
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  restStopDescriptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  restStopDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  emptyNavButton: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
})

export default MapScreen
