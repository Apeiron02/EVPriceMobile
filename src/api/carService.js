import api from './index';

export const carService = {
  // Tüm elektrikli araçları getir
  getAllElectricCars: async () => {
    try {
      const response = await api.get('elektrikli-araclar/');
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