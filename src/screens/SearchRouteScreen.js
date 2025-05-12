"use client"

import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { getAddressCoordinates, getRouteInfoByAddress, getReadableErrorMessage } from "../api/map"

const SearchRouteScreen = () => {
  const navigation = useNavigation()
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleCreateRoute = async () => {
    if (origin && destination) {
      setIsLoading(true)
      setErrorMessage("")
      try {
        // İki farklı yaklaşımı deneyin - önce adres tabanlı doğrudan rota bilgisi
        try {
          console.log("Adreslerle doğrudan rota hesaplanıyor...")

          // API dokümanına uygun olarak adresler ile rota oluştur
          const routeInfo = await getRouteInfoByAddress(origin, destination)

          if (routeInfo && routeInfo.coordinates && routeInfo.coordinates.length > 0) {
            console.log("Rota hesaplandı, MapScreen'e yönlendiriliyor...")

            // Rota hesaplandı, haritaya gönder
            const originCoords = routeInfo.coordinates[0]
            const destinationCoords = routeInfo.coordinates[routeInfo.coordinates.length - 1]

            navigation.navigate("MapScreen", {
              origin: {
                latitude: originCoords.latitude,
                longitude: originCoords.longitude,
                name: origin,
              },
              destination: {
                latitude: destinationCoords.latitude,
                longitude: destinationCoords.longitude,
                name: destination,
              },
              routeCoordinates: routeInfo.coordinates,
              routeInfo: {
                distance: routeInfo.distance,
                duration: routeInfo.duration,
                startAddress: routeInfo.startAddress || origin,
                endAddress: routeInfo.endAddress || destination,
              },
            })
            return
          }

          console.log("Doğrudan rota hesaplanamadı, koordinat dönüşümü deneniyor...")
        } catch (routeError) {
          console.warn("Doğrudan rota oluşturma başarısız:", routeError.message)
          // Hata durumunda koordinat yaklaşımına devam et
        }

        // Adres bilgilerini koordinatlara dönüştür
        console.log("Başlangıç noktası için koordinat alınıyor:", origin)
        const originCoords = await getAddressCoordinates(origin)

        if (!originCoords) {
          throw new Error(
            "Başlangıç adresi koordinatları alınamadı. Lütfen geçerli bir adres girin (ör: Ankara, Türkiye).",
          )
        }

        console.log("Varış noktası için koordinat alınıyor:", destination)
        const destinationCoords = await getAddressCoordinates(destination)

        if (!destinationCoords) {
          throw new Error(
            "Varış adresi koordinatları alınamadı. Lütfen geçerli bir adres girin (ör: İstanbul, Türkiye).",
          )
        }

        console.log("Koordinatlar başarıyla alındı, MapScreen'e yönlendiriliyor.")

        // Koordinatları ve adres bilgilerini MapScreen'e gönder
        navigation.navigate("MapScreen", {
          origin: {
            ...originCoords,
            name: origin,
          },
          destination: {
            ...destinationCoords,
            name: destination,
          },
        })
      } catch (error) {
        console.error("Rota oluşturma hatası:", error)
        const errorMsg = getReadableErrorMessage(error)
        setErrorMessage(errorMsg)
        Alert.alert("Hata", errorMsg || "Rota oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.")
      } finally {
        setIsLoading(false)
      }
    } else {
      Alert.alert("Uyarı", "Lütfen başlangıç ve varış noktalarını girin.")
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="navigate-circle-outline" size={24} color="#0096c7" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Başlangıç noktası (ör: Ankara, Türkiye)"
                value={origin}
                onChangeText={setOrigin}
                placeholderTextColor="#999"
              />
              {origin ? (
                <TouchableOpacity onPress={() => setOrigin("")}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="location-outline" size={24} color="#ff4757" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Varış noktası (ör: İstanbul, Türkiye)"
                value={destination}
                onChangeText={setDestination}
                placeholderTextColor="#999"
              />
              {destination ? (
                <TouchableOpacity onPress={() => setDestination("")}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <TouchableOpacity
              style={[styles.createButton, (!origin || !destination || isLoading) && styles.disabledButton]}
              onPress={handleCreateRoute}
              disabled={!origin || !destination || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="map-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.createButtonText}>Rota Oluştur</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.tipContainer}>
              <Ionicons name="information-circle-outline" size={20} color="#0096c7" />
              <Text style={styles.tipText}>
                İpucu: Şehir, ilçe veya tam adres girebilirsiniz. Örneğin: "Ankara, Kızılay" veya "İstanbul, Taksim
                Meydanı"
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 10,
  },
  inputContainer: {
    padding: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 54,
    fontSize: 16,
    color: "#333",
  },
  createButton: {
    backgroundColor: "#0096c7",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    flexDirection: "row",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  errorText: {
    color: "#ff4757",
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
    textAlign: "center",
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#e1f5fe",
    borderRadius: 8,
    padding: 12,
    marginTop: 24,
  },
  tipText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#0277bd",
    lineHeight: 20,
  },
})

export default SearchRouteScreen
