import axios from "axios"

const STOP_OVER_SUGGESTIONS_URL = "http://192.168.1.108:8000/api/v1/rota-mola-onerileri/"

/**
 * Rota üzerindeki şehirler için mola önerileri alır.
 * @param {Array<string>} cities - Şehir isimleri dizisi
 * @returns {Promise<string>} - Öneriler (formatlı metin)
 */
export async function getStopoverSuggestions(cities) {
  if (!Array.isArray(cities) || cities.length === 0) {
    throw new Error("Geçerli bir şehir listesi gönderilmedi.")
  }

  try {
    const response = await axios.post(STOP_OVER_SUGGESTIONS_URL, { cities })
    if (response.data && response.data.suggestions) {
      return response.data.suggestions
    } else {
      throw new Error("API'den beklenen yanıt alınamadı.")
    }
  } catch (error) {
    // Hata mesajını detaylı döndür
    throw new Error(error.response?.data?.error || error.message)
  }
}
