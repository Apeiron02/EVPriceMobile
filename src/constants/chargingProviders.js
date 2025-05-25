// Şarj sağlayıcıları sabit değerleri
// Not: Uygulamada gerçek logoları kullanmak için gerekli logoları assets klasörüne ekleyin

// Logo importları
import zesLogo from '../assets/provider-logos/zes.png';
import voltrunLogo from '../assets/provider-logos/voltrun.png';
import esarjLogo from '../assets/provider-logos/esarj.png';
import trugoLogo from '../assets/provider-logos/trugo.png';

export const CHARGING_PROVIDERS = [
  {
    id: 'zes',
    name: 'ZES',
    logo: zesLogo,
    primaryColor: '#1190CB', // ZES mavi
    secondaryColor: '#13C6FF',
  },
  {
    id: 'voltrun',
    name: 'Voltrun',
    logo: voltrunLogo,
    primaryColor: '#00AD4E', // Voltrun yeşil
    secondaryColor: '#4AD286',
  },
  {
    id: 'esarj',
    name: 'E-Şarj',
    logo: esarjLogo,
    primaryColor: '#FF5733', // E-Şarj turuncu
    secondaryColor: '#FF8B6B',
  },
  {
    id: 'trugo',
    name: 'Trugo',
    logo: trugoLogo,
    primaryColor: '#7B35E9', // Trugo mor
    secondaryColor: '#9B6BF4',
  }
];

// Şarj istasyonu tipi ve açıklamaları
export const CHARGE_TYPES = {
  AC: 'Yavaş Şarj (AC)',
  DC: 'Hızlı Şarj (DC)',
  ULTRA_DC: 'Ultra Hızlı Şarj (DC)'
};

// Birim fiyat bilgileri (örnek açıklamalar)
export const PRICE_TOOLTIPS = {
  zes: 'ZES standart fiyatı, üyelere özel indirimler uygulanabilir.',
  voltrun: 'Voltrun standart fiyatı, kampanya dönemlerinde değişiklik gösterebilir.',
  esarj: 'E-Şarj temel fiyatlandırması, aboneliğinize göre indirimler uygulanabilir.',
  trugo: 'Trugo güncel fiyatı, şarj seansınızın ilk 15 dakikası için geçerlidir.'
};