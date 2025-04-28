import api from './index';

export const carService = {
  // Tüm elektrikli araçları getir (sayfalama ile tüm verileri alır)
  getAllElectricCars: async () => {
    try {
      console.log('Tüm araçları getirme işlemi başlatıldı...');
      
      // İlk sayfayı yükle ve toplam sayfa sayısını öğren
      const firstPageResponse = await api.get('elektrikli-araclar/?page=1');
      const totalPages = firstPageResponse.data.count ? Math.ceil(firstPageResponse.data.count / 10) : 1;
      
      console.log(`Toplam ${totalPages} sayfa ve ${firstPageResponse.data.count} araç bulundu.`);
      
      // İlk sayfanın sonuçlarını ekle
      let allCars = [...firstPageResponse.data.results];
      
      // Diğer tüm sayfaları paralel olarak getir (sayfa 2'den başla çünkü sayfa 1'i zaten aldık)
      if (totalPages > 1) {
        console.log(`${totalPages - 1} ek sayfa daha yükleniyor...`);
        
        const pagePromises = [];
        for (let page = 2; page <= totalPages; page++) {
          pagePromises.push(api.get(`elektrikli-araclar/?page=${page}`));
        }
        
        const pageResponses = await Promise.all(pagePromises);
        
        // Her sayfanın sonuçlarını ana listeye ekle
        pageResponses.forEach(response => {
          if (response.data && response.data.results) {
            allCars = [...allCars, ...response.data.results];
          }
        });
      }
      
      console.log(`Toplam ${allCars.length} araç başarıyla yüklendi.`);
      
      // Toplam araç sayısı ve tüm araçlarla birlikte oluşturulan veri yapısını döndür
      return {
        count: allCars.length,
        results: allCars
      };
    } catch (error) {
      console.error('Araç verisi getirme hatası:', error);
      throw error;
    }
  },
  
  // Tek bir sayfa araç getir (önceki api fonksiyonu ile uyumlu)
  getSinglePageElectricCars: async (page = 1, pageSize = 10) => {
    try {
      const response = await api.get(`elektrikli-araclar/?page=${page}&page_size=${pageSize}`);
      return response.data;
    } catch (error) {
      console.error('Araç sayfası getirme hatası:', error);
      throw error;
    }
  },
  
  // Arama yaparak elektrikli araçları getir
  searchElectricCars: async (query) => {
    try {
      const response = await api.get(`elektrikli-araclar/?search=${encodeURIComponent(query)}&page_size=500`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Belirli bir aracın detaylarını getir
  getElectricCarById: async (carId) => {
    try {
      const response = await api.get(`elektrikli-araclar/${carId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default carService;