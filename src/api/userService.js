import api from './index';

export const userService = {
  // Kullanıcı bilgilerini getir
  getCurrentUser: async () => {
    try {
      const response = await api.get('kullanici-bilgilerim/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Kullanıcı araç tercihini getir
  getUserCarPreference: async () => {
    try {
      // API yanıtını detaylı loglama
      const response = await api.get('kullanici-arac-tercihi/');
      console.log('Detaylı kullanıcı araç tercihi yanıtı:', JSON.stringify(response.data));
      
      // API yanıtı bir paginated response (results array içinde) olarak geliyor olabilir
      if (response.data && response.data.results && response.data.results.length > 0) {
        console.log('Kullanıcı araç tercihi (results formatı):', response.data.results[0]);
        return response.data.results[0];
      } 
      // Veya doğrudan bir liste olarak geliyor olabilir
      else if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log('Kullanıcı araç tercihi (array formatı):', response.data[0]);
        return response.data[0];
      }
      // Eğer tercih bulunamadıysa null döndür
      return null;
    } catch (error) {
      console.error('Kullanıcı araç tercihi getirme hatası:', error);
      throw error;
    }
  },
  
  // Kullanıcı araç tercihini güncelle veya oluştur
  setUserCarPreference: async (carId) => {
    try {
      // API'ye gönderilecek veriyi güncellenmiş field adlarıyla oluştur
      const data = {
        selected_car_id: carId // Backend selected_car_id parametresini bekliyor
      };
      
      console.log('Araç tercihi gönderilen veri:', data);
      
      const currentPreference = await userService.getUserCarPreference();
      
      if (currentPreference) {
        // Log mevcut tercihi
        console.log('Mevcut tercih:', currentPreference);
        
        // Mevcut tercihi güncelle - tercihin id değerini kontrol et
        const preferenceId = currentPreference.id || (currentPreference.selected_car && currentPreference.selected_car.id);
        
        if (!preferenceId) {
          console.error('Tercih ID bulunamadı, güncellenemiyor');
          throw new Error('Tercih ID bulunamadı');
        }
        
        const updateResponse = await api.put(`kullanici-arac-tercihi/${preferenceId}/`, data);
        console.log('Tercih güncelleme yanıtı:', updateResponse.data);
        return updateResponse;
      } else {
        // Yeni tercih oluştur
        const createResponse = await api.post('kullanici-arac-tercihi/', data);
        console.log('Yeni tercih oluşturma yanıtı:', createResponse.data);
        return createResponse;
      }
    } catch (error) {
      console.error('Araç tercihi kaydetme detaylı hata:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default userService;