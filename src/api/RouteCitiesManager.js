/**
 * Expo projesi için rota üzerindeki şehirleri tespit eden sınıf
 * Django RouteManager.js dosyasındaki fonksiyonlardan esinlenilmiştir
 */

import trCities from '../../tr-cities-utf8.json'

class RouteCitiesManager {
  constructor() {
    this.detectedCities = []
    this.routeCoordinates = []
    this.turkishCities = [
      "Adana",
      "Adıyaman",
      "Afyonkarahisar",
      "Ağrı",
      "Amasya",
      "Ankara",
      "Antalya",
      "Artvin",
      "Aydın",
      "Balıkesir",
      "Bilecik",
      "Bingöl",
      "Bitlis",
      "Bolu",
      "Burdur",
      "Bursa",
      "Çanakkale",
      "Çankırı",
      "Çorum",
      "Denizli",
      "Diyarbakır",
      "Edirne",
      "Elazığ",
      "Erzincan",
      "Erzurum",
      "Eskişehir",
      "Gaziantep",
      "Giresun",
      "Gümüşhane",
      "Hakkari",
      "Hatay",
      "Isparta",
      "Mersin",
      "İstanbul",
      "İzmir",
      "Kars",
      "Kastamonu",
      "Kayseri",
      "Kırklareli",
      "Kırşehir",
      "Kocaeli",
      "Konya",
      "Kütahya",
      "Malatya",
      "Manisa",
      "Kahramanmaraş",
      "Mardin",
      "Muğla",
      "Muş",
      "Nevşehir",
      "Niğde",
      "Ordu",
      "Rize",
      "Sakarya",
      "Samsun",
      "Siirt",
      "Sinop",
      "Sivas",
      "Tekirdağ",
      "Tokat",
      "Trabzon",
      "Tunceli",
      "Şanlıurfa",
      "Uşak",
      "Van",
      "Yozgat",
      "Zonguldak",
      "Aksaray",
      "Bayburt",
      "Karaman",
      "Kırıkkale",
      "Batman",
      "Şırnak",
      "Bartın",
      "Ardahan",
      "Iğdır",
      "Yalova",
      "Karabük",
      "Kilis",
      "Osmaniye",
      "Düzce",
    ]
  }

  /**
   * Başlangıç noktasını al (RouteManager.getOrigin() benzeri)
   * @param {Object} routeParams - Rota parametreleri
   * @returns {Object|null} Başlangıç koordinatları ve adres bilgisi
   */
  getOrigin(routeParams) {
    if (routeParams?.origin) {
      return {
        latitude: routeParams.origin.latitude,
        longitude: routeParams.origin.longitude,
        name: routeParams.origin.name || "Başlangıç Noktası",
      }
    }
    return null
  }

  /**
   * Varış noktasını al (RouteManager.getDestination() benzeri)
   * @param {Object} routeParams - Rota parametreleri
   * @returns {Object|null} Varış koordinatları ve adres bilgisi
   */
  getDestination(routeParams) {
    if (routeParams?.destination) {
      return {
        latitude: routeParams.destination.latitude,
        longitude: routeParams.destination.longitude,
        name: routeParams.destination.name || "Varış Noktası",
      }
    }
    return null
  }

  /**
   * Koordinattan şehir ismini bulmak için reverse geocoding fonksiyonu (Nominatim örneği)
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<string|null>} Şehir adı veya null
   */
  async reverseGeocodeCity(latitude, longitude) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RouteCitiesManager/1.0',
          },
        }
      )
      const data = await response.json()
      // Nominatim'de şehir bilgisi genellikle address.city veya address.town veya address.village'da olur
      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state
      if (city && this.turkishCities.includes(city)) {
        return city
      }
      return null
    } catch (error) {
      console.error('Reverse geocoding hatası:', error)
      return null
    }
  }

  /**
   * İlçe adını ile çevir (ör: Gebze -> Kocaeli)
   * @param {string} district
   * @returns {string|null} İl adı
   */
  getCityFromDistrict(district) {
    // İlçeden ile eşleştirme için örnek bir tablo (daha fazlası eklenebilir)
    const districtToCity = {
      "Gebze": "Kocaeli",
      "Darıca": "Kocaeli",
      "Çayırova": "Kocaeli",
      "Dilovası": "Kocaeli",
      "Hendek": "Sakarya",
      "Sapanca": "Sakarya",
      "Akyazı": "Sakarya",
      "Kaynaşlı": "Düzce",
      "Akçakoca": "Düzce",
      "Mudurnu": "Bolu",
      "Gerede": "Bolu",
      // ... daha fazla ilçe eklenebilir ...
    }
    return districtToCity[district] || null
  }

  /**
   * Rota üzerindeki şehirleri tespit et (Artık async, ara şehirler reverse geocoding ile bulunur)
   * @param {Array} routeCoordinates - Rota koordinatları
   * @param {Object} routeParams - Rota parametreleri (origin, destination)
   * @returns {Promise<Array>} Tespit edilen şehirler listesi
   */
  async getCitiesAlongRoute(routeCoordinates = [], routeParams = {}) {
    this.routeCoordinates = routeCoordinates
    try {
      // Başlangıç ve varış noktalarından şehir çıkar
      const origin = this.getOrigin(routeParams)
      const destination = this.getDestination(routeParams)
      let startCity = null
      let endCity = null
      if (origin?.name) {
        startCity = this.extractCityFromAddress(origin.name)
      }
      if (destination?.name) {
        endCity = this.extractCityFromAddress(destination.name)
      }
      // Rota koordinatlarından ara şehirleri bul (sadece ara şehirler)
      let intermediateCities = []
      if (routeCoordinates.length > 0) {
        intermediateCities = await this.estimateIntermediateCities(routeCoordinates, origin, destination)
      }
      // Sıralı ve tekrarsız şehir listesi oluştur
      const cities = []
      if (startCity && this.turkishCities.includes(startCity)) cities.push(startCity)
      for (const city of intermediateCities) {
        if (city && !cities.includes(city) && city !== startCity && city !== endCity && this.turkishCities.includes(city)) {
          cities.push(city)
        }
      }
      if (endCity && this.turkishCities.includes(endCity) && endCity !== startCity) cities.push(endCity)
      this.detectedCities = cities
      return this.detectedCities
    } catch (error) {
      console.error('Şehir tespiti sırasında hata:', error)
      return []
    }
  }

  /**
   * Şehir listesini güncelle (RouteManager.updateCitiesList() benzeri)
   * @param {Array} cities - Şehir listesi
   * @returns {Object} JSON formatında şehir bilgileri
   */
  updateCitiesList(cities) {
    if (!cities || cities.length === 0) {
      console.warn("Güncellenecek şehir listesi bulunamadı")
      return this.createEmptyCitiesInfo()
    }

    // Şehir listesini benzersiz hale getir
    const uniqueCities = [...new Set(cities)]
    this.detectedCities = uniqueCities

    // JSON formatında şehir bilgilerini oluştur
    const citiesInfo = this.createCitiesInfoElement(uniqueCities)

    console.log("Şehir listesi güncellendi:", uniqueCities.join(", "))
    return citiesInfo
  }

  /**
   * Şehir bilgi elementini JSON formatında oluştur (RouteManager.createCitiesInfoElement() benzeri)
   * @param {Array} cities - Şehir listesi
   * @returns {Object} JSON formatında şehir bilgileri
   */
  createCitiesInfoElement(cities) {
    const citiesInfo = {
      timestamp: new Date().toISOString(),
      routeId: this.generateRouteId(),
      totalCities: cities.length,
      cities: cities.map((city, index) => ({
        id: index + 1,
        name: city,
        order: index + 1,
        isStartCity: index === 0,
        isEndCity: index === cities.length - 1,
        isIntermediate: index > 0 && index < cities.length - 1,
      })),
      citiesText: cities.join(", "),
      summary: {
        startCity: cities.length > 0 ? cities[0] : null,
        endCity: cities.length > 1 ? cities[cities.length - 1] : null,
        intermediateCities: cities.length > 2 ? cities.slice(1, -1) : [],
        intermediateCitiesCount: Math.max(0, cities.length - 2),
      },
    }

    return citiesInfo
  }

  /**
   * Şehir listesini logla ve JSON döndür (RouteManager.logCitiesAlongRoute() benzeri)
   * @param {Array} routeCoordinates - Rota koordinatları
   * @param {Object} routeParams - Rota parametreleri
   * @returns {Promise<Object>} JSON formatında şehir bilgileri
   */
  async logCitiesAlongRoute(routeCoordinates = [], routeParams = {}) {
    try {
      // Şehirleri tespit et
      const cities = await this.getCitiesAlongRoute(routeCoordinates, routeParams)
      if (cities.length > 0) {
        console.log("Rotada Geçilen Şehirler:", cities.join(", "))
        // JSON formatında şehir bilgilerini oluştur ve döndür
        const citiesInfo = this.updateCitiesList(cities)
        // Detaylı log
        console.log("Şehir Bilgileri (JSON):", JSON.stringify(citiesInfo, null, 2))
        return citiesInfo
      } else {
        console.log("Rotada geçilen şehirler tespit edilemedi.")
        return this.createEmptyCitiesInfo()
      }
    } catch (error) {
      console.error("Şehir loglama sırasında hata:", error)
      return this.createEmptyCitiesInfo()
    }
  }

  /**
   * Adres metninden şehir bilgisini çıkar
   * @param {string} address - Adres metni
   * @returns {string|null} Şehir adı
   */
  extractCityFromAddress(address) {
    if (!address) return null

    // Türkiye adres formatları için şehir çıkarma
    // Örnek: "Atatürk Mah., 19 Mayıs Cd., 34758 Ataşehir/İstanbul, Türkiye"

    // İl/İlçe formatını kontrol et
    const cityRegex = /([\w\s]+)\/([\w\s]+),\s*Türkiye/i
    const cityMatch = address.match(cityRegex)

    if (cityMatch && cityMatch[2]) {
      const cityName = cityMatch[2].trim()
      if (this.turkishCities.includes(cityName)) {
        return cityName
      }
    }

    // Alternatif format: "İstanbul, Türkiye"
    const altCityRegex = /([\w\s]+),\s*Türkiye/i
    const altCityMatch = address.match(altCityRegex)

    if (altCityMatch && altCityMatch[1]) {
      const cityName = altCityMatch[1].trim()
      if (this.turkishCities.includes(cityName)) {
        return cityName
      }
    }

    // Doğrudan şehir ismi eşleşmesi ara
    for (const city of this.turkishCities) {
      if (address.includes(city)) {
        return city
      }
    }

    return null
  }

  /**
   * Şehir poligonlarını yükle
   */
  loadCities() {
    // Şehir poligonlarını yükleme işlemi burada yapılabilir
  }

  /**
   * Nokta poligon içinde mi? (ray-casting algoritması)
   * @param {[number, number]} point [lon, lat]
   * @param {Array} vs Poligonun köşe noktaları [[lon, lat], ...]
   * @returns {boolean}
   */
  isPointInPolygon(point, vs) {
    const x = point[0], y = point[1]
    let inside = false
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1]
      const xj = vs[j][0], yj = vs[j][1]
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0000001) + xi
      if (intersect) inside = !inside
    }
    return inside
  }

  /**
   * Bir noktanın hangi şehirde olduğunu bul (GeoJSON ile)
   * @param {[number, number]} point [lon, lat]
   * @returns {string|null} Şehir adı
   */
  getCityForPoint(point) {
    for (const feature of trCities.features) {
      const { geometry, properties } = feature
      if (geometry.type === 'Polygon') {
        if (this.isPointInPolygon(point, geometry.coordinates[0])) return properties.name
      } else if (geometry.type === 'MultiPolygon') {
        for (const poly of geometry.coordinates) {
          if (this.isPointInPolygon(point, poly[0])) return properties.name
        }
      }
    }
    return null
  }

  /**
   * Rota koordinatlarından sadece ara şehirleri tespit et (başlangıç ve varış hariç)
   * @param {Array} coordinates - Rota koordinatları
   * @param {Object} origin - Başlangıç noktası
   * @param {Object} destination - Varış noktası
   * @returns {Promise<Array>} Sıralı ve tekrarsız ara şehirler
   */
  async estimateIntermediateCities(coordinates, origin, destination) {
    if (!coordinates || coordinates.length < 2) return []
    // Başlangıç ve varış şehirlerini kesin olarak bul
    const startCoord = coordinates[0]
    const endCoord = coordinates[coordinates.length - 1]
    const startCity = this.getCityForPoint([startCoord.longitude, startCoord.latitude])
    const endCity = this.getCityForPoint([endCoord.longitude, endCoord.latitude])
    // Ara şehirleri bul
    const foundCities = []
    let lastCity = null
    const step = Math.max(1, Math.floor(coordinates.length / 100))
    for (let i = 0; i < coordinates.length; i += step) {
      const coord = coordinates[i]
      const city = this.getCityForPoint([coord.longitude, coord.latitude])
      if (
        city &&
        city !== lastCity &&
        this.turkishCities.includes(city) &&
        city !== startCity &&
        city !== endCity
      ) {
        foundCities.push(city)
        lastCity = city
      }
    }
    return foundCities
  }

  /**
   * İki koordinat arası mesafe (metre)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c
    return distance
  }

  /**
   * Boş şehir bilgisi oluştur
   * @returns {Object} Boş şehir bilgileri
   */
  createEmptyCitiesInfo() {
    return {
      timestamp: new Date().toISOString(),
      routeId: null,
      totalCities: 0,
      cities: [],
      citiesText: "Şehir bilgisi bulunamadı",
      summary: {
        startCity: null,
        endCity: null,
        intermediateCities: [],
        intermediateCitiesCount: 0,
      },
    }
  }

  /**
   * Benzersiz rota ID'si oluştur
   * @returns {string} Rota ID'si
   */
  generateRouteId() {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Şehir bilgilerini temizle
   */
  clearCities() {
    this.detectedCities = []
    this.routeCoordinates = []
  }

  /**
   * Mevcut şehir listesini al
   * @returns {Array} Tespit edilen şehirler
   */
  getDetectedCities() {
    return this.detectedCities
  }

  /**
   * Şehir bilgilerini JSON string olarak al
   * @returns {string} JSON formatında şehir bilgileri
   */
  getCitiesAsJSON() {
    const citiesInfo = this.createCitiesInfoElement(this.detectedCities)
    return JSON.stringify(citiesInfo, null, 2)
  }
}

export default RouteCitiesManager
