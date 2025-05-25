/**
 * RouteCitiesManager kullanım örnekleri
 */

import RouteCitiesManager from "./RouteCitiesManager"

// Kullanım örneği 1: Basit şehir tespiti
const example1 = async () => {
  const citiesManager = new RouteCitiesManager()

  // Örnek rota parametreleri
  const routeParams = {
    origin: {
      latitude: 39.9334,
      longitude: 32.8597,
      name: "Ankara, Türkiye",
    },
    destination: {
      latitude: 41.0082,
      longitude: 28.9784,
      name: "İstanbul, Türkiye",
    },
  }

  // Örnek rota koordinatları (gerçek uygulamada API'den gelir)
  const routeCoordinates = [
    { latitude: 39.9334, longitude: 32.8597 },
    { latitude: 40.7589, longitude: 31.1565 }, // Bolu civarı
    { latitude: 40.7696, longitude: 30.4037 }, // Sakarya civarı
    { latitude: 41.0082, longitude: 28.9784 },
  ]

  // Şehirleri tespit et
  const citiesInfo = await citiesManager.logCitiesAlongRoute(routeCoordinates, routeParams)

  console.log("Tespit edilen şehirler:", citiesInfo)
  return citiesInfo
}

// Kullanım örneği 2: MapScreen entegrasyonu
const example2 = () => {
  const citiesManager = new RouteCitiesManager()

  // MapScreen'den gelen verilerle şehir tespiti
  const handleRouteCreated = async (routeCoordinates, origin, destination) => {
    const routeParams = { origin, destination }

    // Şehirleri tespit et
    const citiesInfo = await citiesManager.logCitiesAlongRoute(routeCoordinates, routeParams)

    // JSON formatında kaydet veya API'ye gönder
    const citiesJSON = citiesManager.getCitiesAsJSON()

    // Örnek: AsyncStorage'a kaydet
    // AsyncStorage.setItem('lastRouteCities', citiesJSON);

    // Örnek: API'ye gönder
    // sendCitiesToAPI(citiesInfo);

    return citiesInfo
  }

  return { handleRouteCreated }
}

// Kullanım örneği 3: Şehir bilgilerini API'ye gönderme
const sendCitiesToAPI = async (citiesInfo) => {
  try {
    const response = await fetch("YOUR_API_ENDPOINT/route-cities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(citiesInfo),
    })

    if (response.ok) {
      console.log("Şehir bilgileri API'ye başarıyla gönderildi")
    }
  } catch (error) {
    console.error("API'ye gönderim hatası:", error)
  }
}

export { example1, example2, sendCitiesToAPI }
