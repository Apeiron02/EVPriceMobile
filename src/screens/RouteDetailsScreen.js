"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Linking,
  Animated,
} from "react-native"
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps"
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons"

const RouteDetailsScreen = ({ route, navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scrollViewRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [routeInfo, setRouteInfo] = useState(null)
  const [steps, setSteps] = useState([])
  const [expandedStep, setExpandedStep] = useState(null)

  useEffect(() => {
    if (route.params) {
      const { origin, destination, routeCoordinates, routeInfo } = route.params

      // Set route info if available
      if (routeInfo) {
        setRouteInfo(routeInfo)

        // Extract steps from route info if available
        if (routeInfo.legs && routeInfo.legs.length > 0) {
          const allSteps = routeInfo.legs.flatMap((leg) =>
            leg.steps
              ? leg.steps.map((step, stepIndex) => ({
                  ...step,
                  id: `step-${stepIndex}`,
                  // Try to get Turkish instructions if available
                  instructions: step.html_instructions_tr || step.html_instructions,
                  distance: step.distance ? step.distance : { text: "Bilgi yok" },
                  duration: step.duration ? step.duration : { text: "Bilgi yok" },
                }))
              : [],
          )
          setSteps(allSteps)
          console.log("Adım adım yönlendirmeler yüklendi:", allSteps.length)
        }
      } else {
        // If no route info is provided, create a basic one
        setRouteInfo({
          distance: { text: "Bilgi yok", value: 0 },
          duration: { text: "Bilgi yok", value: 0 },
          start_address: origin?.name || "Başlangıç",
          end_address: destination?.name || "Varış",
        })
      }
    }

    // Start fade-in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [route.params])

  const handleShowOnMap = () => {
    // Navigate back to map screen with the route information
    navigation.navigate("MapScreen", {
      ...route.params,
      fromRouteDetails: true,
    })
  }

  const toggleStep = (index) => {
    if (expandedStep === index) {
      setExpandedStep(null)
    } else {
      setExpandedStep(index)
    }
  }

  // Helper function to clean HTML tags from instructions
  const cleanInstructions = (html) => {
    if (!html) return ""
    return html.replace(/<[^>]*>/g, "")
  }

  // Get the appropriate icon for a maneuver
  const getManeuverIcon = (maneuver) => {
    switch (maneuver) {
      case "turn-right":
        return <MaterialIcons name="turn-right" size={20} color="#00b8d4" />
      case "turn-left":
        return <MaterialIcons name="turn-left" size={20} color="#00b8d4" />
      case "roundabout-right":
      case "roundabout-left":
        return <MaterialIcons name="roundabout-right" size={20} color="#00b8d4" />
      case "straight":
        return <MaterialIcons name="straight" size={20} color="#00b8d4" />
      case "merge":
        return <MaterialIcons name="merge-type" size={20} color="#00b8d4" />
      case "fork-right":
      case "fork-left":
        return <MaterialIcons name="call-split" size={20} color="#00b8d4" />
      case "uturn-right":
      case "uturn-left":
        return <MaterialIcons name="u-turn-right" size={20} color="#00b8d4" />
      default:
        return <Ionicons name="arrow-forward" size={20} color="#00b8d4" />
    }
  }

  // Şarj istasyonlarını göster
  const showChargingStations = () => {
    navigation.navigate("MapScreen", {
      ...route.params,
      showChargingStations: true,
      fromRouteDetails: true,
    })
  }

  // Mola noktalarını göster
  const showRestStops = () => {
    navigation.navigate("MapScreen", {
      ...route.params,
      showRestStops: true,
      fromRouteDetails: true,
    })
  }

  // Google Maps'te rotayı aç
  const openInGoogleMaps = () => {
    const { origin, destination } = route.params
    if (origin && destination) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`
      Linking.openURL(url).catch((err) => {
        console.error("Google Maps açılamadı:", err)
        Alert.alert("Hata", "Google Maps açılamadı. Lütfen Google Maps uygulamasının yüklü olduğundan emin olun.")
      })
    } else {
      Alert.alert("Hata", "Rota bilgileri eksik. Google Maps açılamadı.")
    }
  }

  // Format distance for better display
  const formatDistance = (distance) => {
    if (!distance || !distance.value) return distance?.text || ""

    if (distance.value < 1000) {
      return `${distance.value} m`
    } else {
      return `${(distance.value / 1000).toFixed(1)} km`
    }
  }

  // Format duration for better display
  const formatDuration = (duration) => {
    if (!duration || !duration.value) return duration?.text || ""

    if (duration.value < 60) {
      return `${duration.value} sn`
    } else if (duration.value < 3600) {
      return `${Math.floor(duration.value / 60)} dk`
    } else {
      const hours = Math.floor(duration.value / 3600)
      const minutes = Math.floor((duration.value % 3600) / 60)
      return `${hours} sa ${minutes} dk`
    }
  }

  // Strip HTML tags from instructions
  const stripHtml = (html) => {
    return html?.replace(/<[^>]*>?/gm, "") || ""
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00b8d4" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Harita Önizlemesi */}
        <View style={styles.mapPreviewContainer}>
          {route.params?.routeCoordinates ? (
            <MapView
              style={styles.mapPreview}
              provider={PROVIDER_DEFAULT}
              initialRegion={{
                latitude: route.params.routeCoordinates[0].latitude,
                longitude: route.params.routeCoordinates[0].longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              {route.params.origin && (
                <Marker
                  coordinate={{
                    latitude: route.params.origin.latitude,
                    longitude: route.params.origin.longitude,
                  }}
                >
                  <View style={[styles.customMarker, { backgroundColor: "#2ecc71" }]}>
                    <Ionicons name="flag" size={16} color="#fff" />
                  </View>
                </Marker>
              )}

              {route.params.destination && (
                <Marker
                  coordinate={{
                    latitude: route.params.destination.latitude,
                    longitude: route.params.destination.longitude,
                  }}
                >
                  <View style={[styles.customMarker, { backgroundColor: "#e74c3c" }]}>
                    <Ionicons name="location" size={16} color="#fff" />
                  </View>
                </Marker>
              )}

              {route.params.routeCoordinates && (
                <Polyline coordinates={route.params.routeCoordinates} strokeWidth={4} strokeColor="#00b8d4" />
              )}
            </MapView>
          ) : (
            <View style={[styles.mapPreview, styles.noMapContainer]}>
              <Text style={styles.noMapText}>Harita bilgisi bulunamadı</Text>
            </View>
          )}

          <TouchableOpacity style={styles.showOnMapButton} onPress={handleShowOnMap}>
            <Ionicons name="map" size={16} color="#fff" />
            <Text style={styles.showOnMapText}>Haritada göster</Text>
          </TouchableOpacity>
        </View>

        {/* Rota Özeti */}
        <View style={styles.routeSummaryContainer}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeHeaderText}>Rota Bilgileri</Text>
          </View>

          <View style={styles.routeInfoRow}>
            <View style={styles.routeInfoItem}>
              <Ionicons name="time-outline" size={24} color="#00b8d4" />
              <Text style={styles.routeInfoValue}>{routeInfo?.duration?.text || "Bilgi yok"}</Text>
              <Text style={styles.routeInfoLabel}>Süre</Text>
            </View>

            <View style={styles.routeInfoDivider} />

            <View style={styles.routeInfoItem}>
              <Ionicons name="speedometer-outline" size={24} color="#00b8d4" />
              <Text style={styles.routeInfoValue}>{routeInfo?.distance?.text || "Bilgi yok"}</Text>
              <Text style={styles.routeInfoLabel}>Mesafe</Text>
            </View>
          </View>

          <View style={styles.locationContainer}>
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, { backgroundColor: "#2ecc71" }]} />
              <Text style={styles.locationText} numberOfLines={2}>
                {routeInfo?.start_address || route.params?.origin?.name || "Başlangıç"}
              </Text>
            </View>

            <View style={styles.locationDivider} />

            <View style={styles.locationRow}>
              <View style={[styles.locationDot, { backgroundColor: "#e74c3c" }]} />
              <Text style={styles.locationText} numberOfLines={2}>
                {routeInfo?.end_address || route.params?.destination?.name || "Varış"}
              </Text>
            </View>
          </View>
        </View>

        {/* Adım Adım Yönlendirmeler */}
        <View style={styles.stepsContainer}>
          <View style={styles.stepsHeader}>
            <Text style={styles.stepsHeaderText}>Adım Adım Yönlendirmeler</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00b8d4" />
              <Text style={styles.loadingText}>Rota detayları yükleniyor...</Text>
            </View>
          ) : steps.length > 0 ? (
            <ScrollView
              ref={scrollViewRef}
              style={styles.stepsList}
              contentContainerStyle={styles.stepsListContent}
              showsVerticalScrollIndicator={false}
            >
              {steps.map((step, index) => (
                <TouchableOpacity
                  key={step.id || index}
                  style={[styles.stepItem, expandedStep === (step.id || index) && styles.expandedStepItem]}
                  onPress={() => toggleStep(step.id || index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.stepHeader}>
                    <View style={styles.stepIconContainer}>{getManeuverIcon(step.maneuver)}</View>

                    <View style={styles.stepInfo}>
                      <Text style={styles.stepInstruction} numberOfLines={expandedStep === (step.id || index) ? 0 : 2}>
                        {stripHtml(step.instructions)}
                      </Text>

                      <View style={styles.stepMetrics}>
                        <Text style={styles.stepDistance}>{formatDistance(step.distance)}</Text>
                        <Text style={styles.stepDuration}>{formatDuration(step.duration)}</Text>
                      </View>
                    </View>

                    <Ionicons
                      name={expandedStep === (step.id || index) ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#666"
                    />
                  </View>

                  {expandedStep === (step.id || index) && (
                    <View style={styles.stepDetails}>
                      <View style={styles.stepDetailRow}>
                        <Ionicons name="speedometer-outline" size={16} color="#00b8d4" />
                        <Text style={styles.stepDetailText}>{step.distance.text}</Text>
                      </View>

                      <View style={styles.stepDetailRow}>
                        <Ionicons name="time-outline" size={16} color="#00b8d4" />
                        <Text style={styles.stepDetailText}>{step.duration.text}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              {/* Final destination indicator */}
              <View style={styles.finalDestination}>
                <View style={[styles.stepIconContainer, { backgroundColor: "#e74c3c" }]}>
                  <Ionicons name="flag" size={20} color="#fff" />
                </View>
                <Text style={styles.finalDestinationText}>
                  {routeInfo?.end_address || route.params?.destination?.name || "Varış Noktası"}
                </Text>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.noStepsContainer}>
              <Ionicons name="information-circle-outline" size={40} color="#ccc" />
              <Text style={styles.noStepsText}>Bu rota için adım adım yönlendirme bilgisi bulunamadı.</Text>
              <Text style={styles.noStepsSubText}>Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.</Text>
            </View>
          )}
        </View>

        {/* Öneriler */}
        <View style={styles.suggestionsContainer}>
          <View style={styles.suggestionHeader}>
            <Text style={styles.suggestionHeaderText}>Öneriler</Text>
          </View>

          <TouchableOpacity style={styles.suggestionItem} onPress={showChargingStations}>
            <View style={styles.suggestionIconContainer}>
              <FontAwesome5 name="charging-station" size={20} color="#fff" />
            </View>
            <Text style={styles.suggestionText}>Rota üzerindeki şarj istasyonlarını göster</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.suggestionItem} onPress={showRestStops}>
            <View style={[styles.suggestionIconContainer, { backgroundColor: "#8e44ad" }]}>
              <Ionicons name="cafe" size={20} color="#fff" />
            </View>
            <Text style={styles.suggestionText}>Mola noktalarını göster</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.suggestionItem} onPress={openInGoogleMaps}>
            <View style={[styles.suggestionIconContainer, { backgroundColor: "#27ae60" }]}>
              <Ionicons name="map-outline" size={20} color="#fff" />
            </View>
            <Text style={styles.suggestionText}>Google Maps'te aç</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  mapPreviewContainer: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  mapPreview: {
    width: "100%",
    height: "100%",
  },
  noMapContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
  },
  noMapText: {
    fontSize: 16,
    color: "#666",
  },
  showOnMapButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#00b8d4",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  showOnMapText: {
    color: "#fff",
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "600",
  },
  routeSummaryContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  routeHeader: {
    marginBottom: 12,
  },
  routeHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  routeInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  routeInfoItem: {
    flex: 1,
    alignItems: "center",
  },
  routeInfoDivider: {
    width: 1,
    backgroundColor: "#e0e0e0",
  },
  routeInfoValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  routeInfoLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  locationContainer: {
    marginTop: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  locationText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  locationDivider: {
    height: 20,
    width: 1,
    backgroundColor: "#e0e0e0",
    marginLeft: 5.5,
  },
  stepsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
  },
  stepsHeader: {
    marginBottom: 12,
  },
  stepsHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  noStepsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noStepsText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginTop: 12,
    textAlign: "center",
  },
  noStepsSubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  stepsList: {
    flex: 1,
  },
  stepsListContent: {
    paddingBottom: 20,
  },
  stepItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  expandedStepItem: {
    backgroundColor: "#f0f7f8",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  stepIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#00b8d4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepInfo: {
    flex: 1,
    marginRight: 8,
  },
  stepInstruction: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  stepMetrics: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepDistance: {
    fontSize: 12,
    color: "#666",
    marginRight: 12,
  },
  stepDuration: {
    fontSize: 12,
    color: "#666",
  },
  stepDetails: {
    marginTop: 8,
    paddingLeft: 48,
    paddingBottom: 12,
    paddingRight: 12,
  },
  stepDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  stepDetailText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 8,
  },
  finalDestination: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  finalDestinationText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginLeft: 12,
  },
  customMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  suggestionsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
  },
  suggestionHeader: {
    marginBottom: 12,
  },
  suggestionHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00b8d4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
})

export default RouteDetailsScreen
