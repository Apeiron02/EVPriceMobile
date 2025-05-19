import api from "./index"

// Google Polyline Decoder fonksiyonu
// Google'ın encode edilmiş polyline'larını çözmek için
function decodePolyline(encoded) {
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

export const getGeocode = async (address) => {
  try {
    // Doğru API endpoint'i kullanılıyor
    const response = await api.get("rota-bilgisi/", {
      params: {
        origin_address: address,
      },
    })

    // API yanıtından konum bilgisini çıkar
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0]
      if (route.legs && route.legs.length > 0) {
        const leg = route.legs[0]
        return {
          latitude: leg.start_location.lat,
          longitude: leg.start_location.lng,
        }
      }
    }
    return null
  } catch (error) {
    console.error("Konum bilgisi alınırken hata:", error)
    throw error
  }
}

// Adres bilgilerinden koordinat getiren fonksiyon
export const getAddressCoordinates = async (address) => {
  try {
    console.log(`${address} adresi için koordinat alınıyor (POST isteği)`)

    // API dokümanına uygun olarak POST metodu ile istek yapılıyor
    const response = await api.post("rota-bilgisi/", {
      origin_address: address,
    })

    // API yanıtından konum bilgisini çıkar
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0]
      if (route.legs && route.legs.length > 0) {
        const leg = route.legs[0]
        console.log(`${address} için koordinatlar alındı:`, leg.start_location)
        return {
          latitude: leg.start_location.lat,
          longitude: leg.start_location.lng,
        }
      }
    }
    console.warn(`${address} adresi için koordinat bulunamadı.`)
    return null
  } catch (error) {
    console.error(`${address} adresi için koordinat alınırken hata:`, error.response?.data || error.message)

    // API'den dönen hatayı kullanıcıya göster
    if (error.response?.data?.error) {
      throw new Error(`Adres arama hatası: ${error.response.data.error}`)
    }

    throw error
  }
}

export const getRouteInfo = async (originLat, originLng, destinationLat, destinationLng) => {
  try {
    const response = await api.get("rota-bilgisi/", {
      params: {
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
      },
    })
    return response.data
  } catch (error) {
    console.error("Rota bilgisi alınırken hata oluştu:", error)
    throw error
  }
}

// POST isteği ile rota bilgisi alan fonksiyon - Detaylı yol çizimi için
export const getRouteInfoPOST = async (originLat, originLng, destinationLat, destinationLng, mode = "driving") => {
  try {
    const routeData = {
      origin_lat: originLat,
      origin_lng: originLng,
      destination_lat: destinationLat,
      destination_lng: destinationLng,
      mode: mode,
    }

    console.log("Rota API isteği gönderiliyor:", routeData)

    // POST isteği gönder
    const response = await api.post("rota-bilgisi/", routeData)

    console.log("Rota API yanıtı alındı")

    // Ayrıntılı rota koordinatları için polyline'ları decode et
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0]
      const detailedCoordinates = []

      // Her bir adım için polyline değerlerini çözümle ve koordinatlara ekle
      if (route.legs) {
        route.legs.forEach((leg) => {
          if (leg.steps) {
            leg.steps.forEach((step) => {
              if (step.polyline && step.polyline.points) {
                // Poliline'ı çözümle ve koordinatlara ekle
                const decodedPoints = decodePolyline(step.polyline.points)
                if (decodedPoints && decodedPoints.length > 0) {
                  detailedCoordinates.push(...decodedPoints)
                }
              }
            })
          }
        })
      }

      // Eğer polyline bazlı koordinatlar çıkarıldıysa, bunları kullan
      if (detailedCoordinates.length > 0) {
        console.log(`${detailedCoordinates.length} adet detaylı koordinat çözümlendi`)

        // Overviewpolyline varsa, güzergahın tam detaylı hali için onu da kontrol et
        if (route.overview_polyline && route.overview_polyline.points) {
          const overviewPoints = decodePolyline(route.overview_polyline.points)
          if (overviewPoints && overviewPoints.length > detailedCoordinates.length) {
            console.log(`Genel bakış polyline'ından ${overviewPoints.length} koordinat çözümlendi, bunu kullanıyoruz`)
            response.data.coordinates = overviewPoints
          } else {
            console.log("Adım adım polyline koordinatları kullanılıyor")
            response.data.coordinates = detailedCoordinates
          }
        } else {
          response.data.coordinates = detailedCoordinates
        }
      }

      // Rota bilgilerini ekle
      if (route.legs && route.legs.length > 0) {
        const leg = route.legs[0]
        response.data.routeInfo = {
          distance: leg.distance,
          duration: leg.duration,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
        }
      }
    }

    return response.data
  } catch (error) {
    console.error("Rota bilgisi POST isteği sırasında hata oluştu:", error.response?.data || error.message)

    // API'den dönen hatayı göster
    if (error.response?.data?.error) {
      throw new Error(`Rota bilgisi hatası: ${error.response.data.error}`)
    }

    throw error
  }
}

// Adres tabanlı rota bilgisi alma fonksiyonu (POST metodu ile)
export const getRouteInfoByAddress = async (originAddress, destinationAddress, mode = "driving") => {
  try {
    console.log("Adresler arasında rota hesaplanıyor (POST isteği)")

    // API dokümanına uygun olarak POST metodu ile istek yapılıyor
    const routeData = {
      origin_address: originAddress,
      destination_address: destinationAddress,
      mode: mode,
    }

    const response = await api.post("rota-bilgisi/", routeData)
    console.log("Rota bilgisi başarıyla alındı")

    // Ayrıntılı rota koordinatları için polyline'ları decode et
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0]
      const detailedCoordinates = []

      // Her bir adım için polyline değerlerini çözümle ve koordinatlara ekle
      if (route.legs) {
        route.legs.forEach((leg) => {
          if (leg.steps) {
            leg.steps.forEach((step) => {
              if (step.polyline && step.polyline.points) {
                // Poliline'ı çözümle ve koordinatlara ekle
                const decodedPoints = decodePolyline(step.polyline.points)
                if (decodedPoints && decodedPoints.length > 0) {
                  detailedCoordinates.push(...decodedPoints)
                }
              }
            })
          }
        })
      }

      // Eğer polyline bazlı koordinatlar çıkarıldıysa, bunları kullan
      if (detailedCoordinates.length > 0) {
        console.log(`${detailedCoordinates.length} adet detaylı koordinat çözümlendi`)

        // Overviewpolyline varsa, güzergahın tam detaylı hali için onu da kontrol et
        if (route.overview_polyline && route.overview_polyline.points) {
          const overviewPoints = decodePolyline(route.overview_polyline.points)
          if (overviewPoints && overviewPoints.length > detailedCoordinates.length) {
            console.log(`Genel bakış polyline'ından ${overviewPoints.length} koordinat çözümlendi, bunu kullanıyoruz`)
            return {
              coordinates: overviewPoints,
              distance: route.legs[0].distance,
              duration: route.legs[0].duration,
              startAddress: route.legs[0].start_address,
              endAddress: route.legs[0].end_address,
            }
          }
        }

        return {
          coordinates: detailedCoordinates,
          distance: route.legs[0].distance,
          duration: route.legs[0].duration,
          startAddress: route.legs[0].start_address,
          endAddress: route.legs[0].end_address,
        }
      }
    }

    console.warn("Rota bilgisi bulunamadı veya boş döndü.")
    return null
  } catch (error) {
    console.error("Adres tabanlı rota bilgisi alınırken hata oluştu:", error.response?.data || error.message)

    // API'den dönen hatayı göster
    if (error.response?.data?.error) {
      throw new Error(`Rota bilgisi hatası: ${error.response.data.error}`)
    }

    throw error
  }
}

// Hata mesajlarını kullanıcı dostu hale getiren yardımcı fonksiyon
export const getReadableErrorMessage = (error) => {
  if (!error) return "Bilinmeyen bir hata oluştu."

  // API'den gelen hata mesajı
  if (error.response?.data?.error) {
    return error.response.data.error
  }

  // Ağ hatası
  if (error.message === "Network Error") {
    return "İnternet bağlantınızı kontrol edin."
  }

  // Zaman aşımı hatası
  if (error.message && error.message.includes("timeout")) {
    return "Sunucu yanıt vermiyor, lütfen daha sonra tekrar deneyin."
  }

  // Genel hata mesajı
  return error.message || "Bir hata oluştu, lütfen tekrar deneyin."
}

// Rota üzerindeki şarj istasyonlarını getiren fonksiyon
export const getRouteChargingStations = async (originLat, originLng, destinationLat, destinationLng) => {
  try {
    console.log("Rota üzerindeki şarj istasyonları için istek yapılıyor");
    
    // Rota noktalarını oluştur
    const route_points = [
      {
        lat: originLat,
        lng: originLng
      },
      {
        lat: destinationLat,
        lng: destinationLng
      }
    ];
    
    const response = await api.post("rota-sarj-istasyonlari/", {
      route_points: route_points
    });

    if (response.data && response.data.stations) {
      console.log(`${response.data.stations.length} şarj istasyonu bulundu`);
      return response.data.stations;
    }
    
    return [];
  } catch (error) {
    console.error("Rota şarj istasyonları alınırken hata:", error.response?.data || error);
    throw error;
  }
};
