// Navigasyon işlemleri için yardımcı fonksiyonlar
// Bu dosya, döngüsel bağımlılık sorununu çözmek için oluşturulmuştur

// Globalde saklanan navigasyon referansı
export let navigationRef = null;

// Navigasyon referansını ayarlamak için fonksiyon
export const setNavigationRef = (ref) => {
  navigationRef = ref;
};

// Stack'i resetlemek için fonksiyon
export const reset = (routes) => {
  if (navigationRef) {
    navigationRef.reset({
      index: routes.length - 1,
      routes: routes,
    });
  } else {
    console.error('Navigation reference is not set. Cannot reset navigation.');
  }
};

// Başka ekrana yönlendirmek için fonksiyon
export const navigate = (name, params) => {
  if (navigationRef) {
    navigationRef.navigate(name, params);
  } else {
    console.error('Navigation reference is not set. Cannot navigate.');
  }
}; 