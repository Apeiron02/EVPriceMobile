import api from './index';

export const userService = {
  // Kullanıcı araç tercihini getir
  getUserCarPreference: async () => {
    try {
      const response = await api.get('kullanici-arac-tercihi/');
      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      throw error;
    }
  },
  
  // Kullanıcı araç tercihini güncelle veya oluştur
  setUserCarPreference: async (carId) => {
    try {
      const currentPreference = await userService.getUserCarPreference();
      
      if (currentPreference) {
        // Mevcut tercihi güncelle
        return await api.put(`kullanici-arac-tercihi/${currentPreference.id}/`, {
          selected_car_id: carId
        });
      } else {
        // Yeni tercih oluştur
        return await api.post('kullanici-arac-tercihi/', {
          selected_car_id: carId
        });
      }
    } catch (error) {
      throw error;
    }
  },
};

export default userService;