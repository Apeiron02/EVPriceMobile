"use client"

import { useCallback } from "react"

import { useState } from "react"

/**
 * MapScreen.js dosyasına entegre edilecek şehir tespit fonksiyonları
 * Mevcut MapScreen bileşeninize bu fonksiyonları ekleyebilirsiniz
 */

import RouteCitiesManager from "../screens/RouteCitiesManager"

// MapScreen bileşeninizin içinde kullanım örneği
export const useRouteCitiesIntegration = () => {
  const [citiesManager] = useState(() => new RouteCitiesManager())
  const [routeCitiesInfo, setRouteCitiesInfo] = useState(null)

  // Rota oluşturulduktan sonra şehirleri tespit et
  const detectCitiesAlongRoute = useCallback(
    async (routeCoordinates, routeParams) => {
      try {
        console.log("Şehir tespiti başlatılıyor...")
        // Şehirleri tespit et ve JSON formatında al
        const citiesInfo = await citiesManager.logCitiesAlongRoute(routeCoordinates, routeParams)
        // State'i güncelle
        setRouteCitiesInfo(citiesInfo)
        // JSON formatında konsola yazdır
        console.log("Tespit edilen şehirler (JSON):", citiesManager.getCitiesAsJSON())
        return citiesInfo
      } catch (error) {
        console.error("Şehir tespiti sırasında hata:", error)
        return null
      }
    },
    [citiesManager],
  )

  // Şehir bilgilerini temizle
  const clearCitiesInfo = useCallback(() => {
    citiesManager.clearCities()
    setRouteCitiesInfo(null)
  }, [citiesManager])

  return {
    citiesManager,
    routeCitiesInfo,
    detectCitiesAlongRoute,
    clearCitiesInfo,
  }
}

// MapScreen bileşeninizde kullanım örneği:
/*
const MapScreen = ({ navigation, route }) => {
  // ... mevcut state'ler
  const { citiesManager, routeCitiesInfo, detectCitiesAlongRoute, clearCitiesInfo } = useRouteCitiesIntegration();

  // Rota bilgisi alındıktan sonra şehirleri tespit et
  const fetchRouteInfo = async (origin, destination) => {
    try {
      // ... mevcut rota alma kodu
      // Rota koordinatları alındıktan sonra şehirleri tespit et
      if (routeCoordinates && routeCoordinates.length > 0) {
        const citiesInfo = await detectCitiesAlongRoute(routeCoordinates, { origin, destination });
        // Şehir bilgilerini kullan
        if (citiesInfo && citiesInfo.totalCities > 0) {
          console.log(`${citiesInfo.totalCities} şehir tespit edildi:`, citiesInfo.citiesText);
        }
      }
    } catch (error) {
      console.error('Rota bilgisi alınırken hata:', error);
    }
  };

  // ... geri kalan bileşen kodu
};
*/
