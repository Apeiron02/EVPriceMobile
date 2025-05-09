import api from './index';

// Şarj sağlayıcıları ile ilgili API işlemleri
const chargingProviderService = {
  // Tüm şarj istasyonu fiyatlarını getir
  getAllProviderPrices: async () => {
    try {
      const response = await api.get('sarj-istasyonlari-fiyatlari/');
      return response.data;
    } catch (error) {
      console.error('Şarj istasyonu fiyatları alınırken hata:', error);
      throw error;
    }
  },

  // Şarj istasyonu fiyatlarını sağlayıcı ID'sine göre getir
  getProviderPricesById: async (providerId) => {
    try {
      const response = await api.get(`sarj-istasyonlari-fiyatlari/${providerId}/`);
      return response.data;
    } catch (error) {
      console.error(`${providerId} fiyatları alınırken hata:`, error);
      throw error;
    }
  },

  // ZES fiyatlarını getir
  getZesPrices: async () => {
    try {
      const response = await api.get('zes-fiyatlari/');
      return response.data;
    } catch (error) {
      console.error('ZES fiyatları alınırken hata:', error);
      throw error;
    }
  },

  // Trugo fiyatlarını getir
  getTrugoPrices: async () => {
    try {
      const response = await api.get('trugo-fiyatlari/');
      return response.data;
    } catch (error) {
      console.error('Trugo fiyatları alınırken hata:', error);
      throw error;
    }
  },

  // Voltrun fiyatlarını getir
  getVoltrunPrices: async () => {
    try {
      const response = await api.get('voltrun-fiyatlari/');
      return response.data;
    } catch (error) {
      console.error('Voltrun fiyatları alınırken hata:', error);
      throw error;
    }
  },

  // Esarj fiyatlarını getir
  getEsarjPrices: async () => {
    try {
      const response = await api.get('esarj-fiyatlari/');
      return response.data;
    } catch (error) {
      console.error('E-şarj fiyatları alınırken hata:', error);
      throw error;
    }
  },
  
  // API'den gelen fiyat verilerini işle ve formatla
  formatProviderPrices: (data) => {
    const formatted = {};
    
    if (!data) return formatted;
    
    // Son güncelleme bilgisi
    if (data.son_guncelleme) {
      formatted.lastUpdated = new Date(data.son_guncelleme);
    }
    
    // Her sağlayıcı için fiyat bilgilerini işle
    Object.keys(data).forEach(providerId => {
      // "son_guncelleme" anahtarını atla
      if (providerId === 'son_guncelleme') return;
      
      // Sağlayıcı verisi bir dizi değilse işleme devam etme
      if (!Array.isArray(data[providerId]) || data[providerId].length === 0) return;
      
      // Sağlayıcı için en güncel eklenme tarihini bul
      const latestDate = data[providerId].reduce((latest, item) => {
        if (!latest || new Date(item.eklenme_tarihi) > new Date(latest)) {
          return item.eklenme_tarihi;
        }
        return latest;
      }, null);
      
      // Sağlayıcı fiyat listesini ekle
      formatted[providerId] = {
        prices: data[providerId].map(item => ({
          id: item.id,
          chargeType: item.sarj_tipi,
          priceText: item.fiyat_metni,
          priceValue: item.fiyat_degeri,
          addedDate: item.eklenme_tarihi
        })),
        lastUpdated: latestDate ? new Date(latestDate) : null
      };
    });
    
    return formatted;
  }
};

export default chargingProviderService;