import api from './index';

export const getGeocode = async (address) => {
  try {
    // Doğru API endpoint'i kullanılıyor
    const response = await api.get('rota-bilgisi/', {
      params: {
        origin_address: address
      }
    });
    
    // API yanıtından konum bilgisini çıkar
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      if (route.legs && route.legs.length > 0) {
        const leg = route.legs[0];
        return {
          latitude: leg.start_location.lat,
          longitude: leg.start_location.lng
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Konum bilgisi alınırken hata:', error);
    throw error;
  }
};

export const getRouteInfo = async (originLat, originLng, destinationLat, destinationLng) => {
  try {
    const response = await api.get('rota-bilgisi/', {
      params: {
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Rota bilgisi alınırken hata oluştu:', error);
    throw error;
  }
};

// Adres tabanlı rota bilgisi alma fonksiyonu
export const getRouteInfoByAddress = async (originAddress, destinationAddress) => {
  try {
    const response = await api.get('rota-bilgisi/', {
      params: {
        origin_address: originAddress,
        destination_address: destinationAddress,
      },
    });
    
    // API yanıtından rota koordinatlarını çıkar
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      if (route.legs && route.legs.length > 0) {
        // Rota koordinatlarını oluştur
        const coordinates = [];
        route.legs.forEach(leg => {
          if (leg.steps) {
            leg.steps.forEach(step => {
              if (step.polyline && step.polyline.points) {
                // Polyline noktalarını decode etmek gerekebilir
                // Burada basit olarak başlangıç ve bitiş noktalarını ekleyelim
                coordinates.push({
                  latitude: step.start_location.lat,
                  longitude: step.start_location.lng
                });
                coordinates.push({
                  latitude: step.end_location.lat,
                  longitude: step.end_location.lng
                });
              }
            });
          }
        });
        
        return {
          coordinates: coordinates,
          distance: route.legs[0].distance,
          duration: route.legs[0].duration
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Adres tabanlı rota bilgisi alınırken hata oluştu:', error);
    throw error;
  }
};