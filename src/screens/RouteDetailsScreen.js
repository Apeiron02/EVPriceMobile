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
import { getRouteInfoPOST } from "../api/map"
import Constants from "expo-constants"

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey

const RouteDetailsScreen = ({ route, navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scrollViewRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [routeInfo, setRouteInfo] = useState(null)
  const [steps, setSteps] = useState([])
  const [expandedStep, setExpandedStep] = useState(null)
  const [waypoints, setWaypoints] = useState([])
  const [isLoadingSteps, setIsLoadingSteps] = useState(false)

  useEffect(() => {
    if (route.params) {
      const { origin, destination, routeCoordinates, routeInfo, waypoints: routeWaypoints } = route.params

      // Set waypoints if available
      if (routeWaypoints && routeWaypoints.length > 0) {
        setWaypoints(routeWaypoints)
      }

      // Always try to fetch detailed route information for step-by-step directions
      if (origin && destination) {
        if (routeInfo && routeInfo.legs && routeInfo.legs.length > 0) {
          // Use existing route info if available
          setRouteInfo(routeInfo)
          extractStepsFromRouteInfo(routeInfo)
        } else {
          // Fetch detailed route info from API
          fetchDetailedRouteInfo(origin, destination, routeWaypoints)
        }
      } else {
        // Fallback for basic route info
        setRouteInfo({
          distance: { text: "Information not available", value: 0 },
          duration: { text: "Information not available", value: 0 },
          start_address: origin?.name || "Start",
          end_address: destination?.name || "Destination",
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

  const extractStepsFromRouteInfo = (routeInfo) => {
    if (routeInfo.legs && routeInfo.legs.length > 0) {
      const allSteps = routeInfo.legs.flatMap((leg, legIndex) =>
        leg.steps
          ? leg.steps.map((step, stepIndex) => ({
              ...step,
              id: `leg-${legIndex}-step-${stepIndex}`,
              instructions: step.html_instructions || step.instructions || "Continue straight",
              distance: step.distance || { text: "Unknown distance", value: 0 },
              duration: step.duration || { text: "Unknown duration", value: 0 },
              maneuver: step.maneuver || "straight",
            }))
          : [],
      )
      setSteps(allSteps)
      console.log("Steps extracted from existing route info:", allSteps.length)
    }
  }

  const fetchDetailedRouteInfo = async (origin, destination, waypoints = []) => {
    try {
      setIsLoading(true)
      setIsLoadingSteps(true)
      console.log("Fetching detailed route info with steps...")

      let routeData

      if (waypoints && waypoints.length > 0) {
        // For routes with waypoints, we need to make multiple API calls
        // and combine the results to get complete step-by-step directions
        const allLegs = []
        const allSteps = []
        let totalDistance = 0
        let totalDuration = 0

        // First leg: origin to first waypoint
        let currentOrigin = origin
        for (let i = 0; i < waypoints.length; i++) {
          const currentDestination = waypoints[i]
          const legData = await getRouteInfoPOST(
            currentOrigin.latitude,
            currentOrigin.longitude,
            currentDestination.latitude,
            currentDestination.longitude,
            "driving",
          )

          if (legData && legData.routes && legData.routes[0] && legData.routes[0].legs) {
            const leg = legData.routes[0].legs[0]
            allLegs.push(leg)
            totalDistance += leg.distance?.value || 0
            totalDuration += leg.duration?.value || 0

            // Extract steps from this leg
            if (leg.steps) {
              const legSteps = leg.steps.map((step, stepIndex) => ({
                ...step,
                id: `leg-${i}-step-${stepIndex}`,
                instructions: step.html_instructions || step.instructions || "Continue straight",
                distance: step.distance || { text: "Unknown distance", value: 0 },
                duration: step.duration || { text: "Unknown duration", value: 0 },
                maneuver: step.maneuver || "straight",
              }))
              allSteps.push(...legSteps)
            }
          }
          currentOrigin = currentDestination
        }

        // Final leg: last waypoint to destination
        const finalLegData = await getRouteInfoPOST(
          currentOrigin.latitude,
          currentOrigin.longitude,
          destination.latitude,
          destination.longitude,
          "driving",
        )

        if (finalLegData && finalLegData.routes && finalLegData.routes[0] && finalLegData.routes[0].legs) {
          const finalLeg = finalLegData.routes[0].legs[0]
          allLegs.push(finalLeg)
          totalDistance += finalLeg.distance?.value || 0
          totalDuration += finalLeg.duration?.value || 0

          if (finalLeg.steps) {
            const finalSteps = finalLeg.steps.map((step, stepIndex) => ({
              ...step,
              id: `leg-final-step-${stepIndex}`,
              instructions: step.html_instructions || step.instructions || "Continue straight",
              distance: step.distance || { text: "Unknown distance", value: 0 },
              duration: step.duration || { text: "Unknown duration", value: 0 },
              maneuver: step.maneuver || "straight",
            }))
            allSteps.push(...finalSteps)
          }
        }

        // Set combined route info
        setRouteInfo({
          distance: {
            text: totalDistance < 1000 ? `${totalDistance} m` : `${(totalDistance / 1000).toFixed(1)} km`,
            value: totalDistance,
          },
          duration: {
            text:
              totalDuration < 3600
                ? `${Math.floor(totalDuration / 60)} min`
                : `${Math.floor(totalDuration / 3600)} h ${Math.floor((totalDuration % 3600) / 60)} min`,
            value: totalDuration,
          },
          start_address: origin?.name || "Start",
          end_address: destination?.name || "Destination",
          legs: allLegs,
        })

        setSteps(allSteps)
        console.log("Multi-waypoint route steps loaded:", allSteps.length)
      } else {
        // Single route without waypoints
        routeData = await getRouteInfoPOST(
          origin.latitude,
          origin.longitude,
          destination.latitude,
          destination.longitude,
          "driving",
        )

        if (routeData && routeData.routes && routeData.routes.length > 0) {
          const routeDetails = routeData.routes[0]

          // Set route info
          setRouteInfo({
            distance: routeDetails.legs?.[0]?.distance || { text: "Unknown distance", value: 0 },
            duration: routeDetails.legs?.[0]?.duration || { text: "Unknown duration", value: 0 },
            start_address: routeDetails.legs?.[0]?.start_address || origin?.name || "Start",
            end_address: routeDetails.legs?.[0]?.end_address || destination?.name || "Destination",
            legs: routeDetails.legs || [],
          })

          // Extract steps with proper formatting
          if (routeDetails.legs && routeDetails.legs.length > 0) {
            const allSteps = routeDetails.legs.flatMap((leg, legIndex) =>
              leg.steps
                ? leg.steps.map((step, stepIndex) => ({
                    ...step,
                    id: `leg-${legIndex}-step-${stepIndex}`,
                    instructions: step.html_instructions || step.instructions || "Continue straight",
                    distance: step.distance || { text: "Unknown distance", value: 0 },
                    duration: step.duration || { text: "Unknown duration", value: 0 },
                    maneuver: step.maneuver || "straight",
                  }))
                : [],
            )
            setSteps(allSteps)
            console.log("Single route steps loaded:", allSteps.length)
          }
        } else {
          throw new Error("No route data received from API")
        }
      }
    } catch (error) {
      console.error("Error fetching detailed route info:", error)
      // Set basic route info as fallback
      setRouteInfo({
        distance: { text: "Information not available", value: 0 },
        duration: { text: "Information not available", value: 0 },
        start_address: origin?.name || "Start",
        end_address: destination?.name || "Destination",
      })
      setSteps([])
    } finally {
      setIsLoading(false)
      setIsLoadingSteps(false)
    }
  }

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

  // Get the appropriate icon for a maneuver
  const getManeuverIcon = (maneuver) => {
    switch (maneuver) {
      case "turn-right":
        return <MaterialIcons name="turn-right" size={20} color="#fff" />
      case "turn-left":
        return <MaterialIcons name="turn-left" size={20} color="#fff" />
      case "turn-slight-right":
        return <MaterialIcons name="turn-slight-right" size={20} color="#fff" />
      case "turn-slight-left":
        return <MaterialIcons name="turn-slight-left" size={20} color="#fff" />
      case "turn-sharp-right":
        return <MaterialIcons name="turn-right" size={20} color="#fff" />
      case "turn-sharp-left":
        return <MaterialIcons name="turn-left" size={20} color="#fff" />
      case "roundabout-right":
      case "roundabout-left":
        return <MaterialIcons name="roundabout-right" size={20} color="#fff" />
      case "straight":
        return <MaterialIcons name="straight" size={20} color="#fff" />
      case "merge":
        return <MaterialIcons name="merge-type" size={20} color="#fff" />
      case "fork-right":
      case "fork-left":
        return <MaterialIcons name="call-split" size={20} color="#fff" />
      case "uturn-right":
      case "uturn-left":
        return <MaterialIcons name="u-turn-right" size={20} color="#fff" />
      case "ramp-right":
      case "ramp-left":
        return <MaterialIcons name="ramp-right" size={20} color="#fff" />
      case "keep-right":
      case "keep-left":
        return <MaterialIcons name="straight" size={20} color="#fff" />
      default:
        return <Ionicons name="arrow-forward" size={20} color="#fff" />
    }
  }

  // Show charging stations along the current route
  const showChargingStations = () => {
    const { origin, destination, routeCoordinates } = route.params

    if (!routeCoordinates || routeCoordinates.length === 0) {
      Alert.alert("Error", "Route information not found. Please create a route first.")
      return
    }

    if (!origin || !destination) {
      Alert.alert("Error", "Route origin and destination information is missing.")
      return
    }

    console.log("Showing charging stations for route with", routeCoordinates.length, "coordinates")

    // Navigate to map screen with charging stations display enabled
    navigation.navigate("MapScreen", {
      origin,
      destination,
      routeCoordinates,
      waypoints,
      showChargingStations: true,
      fromRouteDetails: true,
      routeInfo: routeInfo,
    })
  }

  // Show rest stops along the current route
  const showRestStops = () => {
    const { origin, destination, routeCoordinates } = route.params

    if (!routeCoordinates || routeCoordinates.length === 0) {
      Alert.alert("Error", "Route information not found. Please create a route first.")
      return
    }

    if (!origin || !destination) {
      Alert.alert("Error", "Route origin and destination information is missing.")
      return
    }

    console.log("Showing rest stops for route with", routeCoordinates.length, "coordinates")

    // Navigate to map screen with rest stops display enabled
    navigation.navigate("MapScreen", {
      origin,
      destination,
      routeCoordinates,
      waypoints,
      showRestStops: true,
      fromRouteDetails: true,
      routeInfo: routeInfo,
    })
  }

  // Open route in Google Maps with all waypoints
  const openInGoogleMaps = () => {
    const { origin, destination } = route.params

    if (!origin || !destination) {
      Alert.alert("Error", "Route information is incomplete. Cannot open Google Maps.")
      return
    }

    try {
      let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`

      // Add waypoints if they exist
      if (waypoints && waypoints.length > 0) {
        const waypointString = waypoints.map((waypoint) => `${waypoint.latitude},${waypoint.longitude}`).join("|")
        url += `&waypoints=${waypointString}`
        console.log("Opening Google Maps with waypoints:", waypointString)
      }

      console.log("Opening Google Maps URL:", url)

      Linking.openURL(url).catch((err) => {
        console.error("Failed to open Google Maps:", err)
        Alert.alert("Error", "Could not open Google Maps. Please ensure Google Maps app is installed.")
      })
    } catch (error) {
      console.error("Error creating Google Maps URL:", error)
      Alert.alert("Error", "Failed to create Google Maps link.")
    }
  }

  // Format distance for better display
  const formatDistance = (distance) => {
    if (!distance || !distance.value) return distance?.text || "Unknown"

    if (distance.value < 1000) {
      return `${distance.value} m`
    } else {
      return `${(distance.value / 1000).toFixed(1)} km`
    }
  }

  // Format duration for better display
  const formatDuration = (duration) => {
    if (!duration || !duration.value) return duration?.text || "Unknown"

    if (duration.value < 60) {
      return `${duration.value} sec`
    } else if (duration.value < 3600) {
      return `${Math.floor(duration.value / 60)} min`
    } else {
      const hours = Math.floor(duration.value / 3600)
      const minutes = Math.floor((duration.value % 3600) / 60)
      return `${hours} h ${minutes} min`
    }
  }

  // Strip HTML tags from instructions
  const stripHtml = (html) => {
    if (!html) return "Continue straight"
    return html.replace(/<[^>]*>?/gm, "").trim() || "Continue straight"
  }

  // Calculate total route info if we have multiple legs
  const getTotalRouteInfo = () => {
    if (routeInfo?.legs && routeInfo.legs.length > 1) {
      const totalDistance = routeInfo.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0)
      const totalDuration = routeInfo.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0)

      return {
        distance: {
          text: totalDistance < 1000 ? `${totalDistance} m` : `${(totalDistance / 1000).toFixed(1)} km`,
          value: totalDistance,
        },
        duration: {
          text:
            totalDuration < 3600
              ? `${Math.floor(totalDuration / 60)} min`
              : `${Math.floor(totalDuration / 3600)} h ${Math.floor((totalDuration % 3600) / 60)} min`,
          value: totalDuration,
        },
      }
    }
    return {
      distance: routeInfo?.distance || { text: "Information not available", value: 0 },
      duration: routeInfo?.duration || { text: "Information not available", value: 0 },
    }
  }

  const totalRouteInfo = getTotalRouteInfo()

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00b8d4" />
        <Text style={styles.loadingText}>Loading route details...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Map Preview */}
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

              {/* Show waypoints if they exist */}
              {waypoints &&
                waypoints.map((waypoint, index) => (
                  <Marker
                    key={`waypoint-${index}`}
                    coordinate={{
                      latitude: waypoint.latitude,
                      longitude: waypoint.longitude,
                    }}
                  >
                    <View style={[styles.customMarker, { backgroundColor: "#f39c12" }]}>
                      <Text style={styles.waypointNumber}>{index + 1}</Text>
                    </View>
                  </Marker>
                ))}

              {route.params.routeCoordinates && (
                <Polyline coordinates={route.params.routeCoordinates} strokeWidth={4} strokeColor="#00b8d4" />
              )}
            </MapView>
          ) : (
            <View style={[styles.mapPreview, styles.noMapContainer]}>
              <Text style={styles.noMapText}>Map information not available</Text>
            </View>
          )}

          <TouchableOpacity style={styles.showOnMapButton} onPress={handleShowOnMap}>
            <Ionicons name="map" size={16} color="#fff" />
            <Text style={styles.showOnMapText}>Show on map</Text>
          </TouchableOpacity>
        </View>

        {/* Route Summary */}
        <View style={styles.routeSummaryContainer}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeHeaderText}>Route Information</Text>
            {waypoints && waypoints.length > 0 && (
              <Text style={styles.waypointInfo}>
                {waypoints.length} waypoint{waypoints.length > 1 ? "s" : ""}
              </Text>
            )}
          </View>

          <View style={styles.routeInfoRow}>
            <View style={styles.routeInfoItem}>
              <Ionicons name="time-outline" size={24} color="#00b8d4" />
              <Text style={styles.routeInfoValue}>{totalRouteInfo.duration.text}</Text>
              <Text style={styles.routeInfoLabel}>Duration</Text>
            </View>

            <View style={styles.routeInfoDivider} />

            <View style={styles.routeInfoItem}>
              <Ionicons name="speedometer-outline" size={24} color="#00b8d4" />
              <Text style={styles.routeInfoValue}>{totalRouteInfo.distance.text}</Text>
              <Text style={styles.routeInfoLabel}>Distance</Text>
            </View>
          </View>

          <View style={styles.locationContainer}>
            <View style={styles.locationRow}>
              <View style={[styles.locationDot, { backgroundColor: "#2ecc71" }]} />
              <Text style={styles.locationText} numberOfLines={2}>
                {routeInfo?.start_address || route.params?.origin?.name || "Start"}
              </Text>
            </View>

            {waypoints &&
              waypoints.map((waypoint, index) => (
                <View key={`waypoint-info-${index}`}>
                  <View style={styles.locationDivider} />
                  <View style={styles.locationRow}>
                    <View style={[styles.locationDot, { backgroundColor: "#f39c12" }]} />
                    <Text style={styles.locationText} numberOfLines={2}>
                      {waypoint.name || `Waypoint ${index + 1}`}
                    </Text>
                  </View>
                </View>
              ))}

            <View style={styles.locationDivider} />

            <View style={styles.locationRow}>
              <View style={[styles.locationDot, { backgroundColor: "#e74c3c" }]} />
              <Text style={styles.locationText} numberOfLines={2}>
                {routeInfo?.end_address || route.params?.destination?.name || "Destination"}
              </Text>
            </View>
          </View>
        </View>

        {/* Step-by-Step Directions */}
        <View style={styles.stepsContainer}>
          <View style={styles.stepsHeader}>
            <Text style={styles.stepsHeaderText}>Step-by-Step Directions</Text>
            {isLoadingSteps && <ActivityIndicator size="small" color="#00b8d4" style={styles.stepsLoader} />}
          </View>

          {isLoadingSteps ? (
            <View style={styles.loadingStepsContainer}>
              <ActivityIndicator size="large" color="#00b8d4" />
              <Text style={styles.loadingText}>Loading navigation instructions...</Text>
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
                        <Text style={styles.stepDetailText}>{step.distance.text || formatDistance(step.distance)}</Text>
                      </View>

                      <View style={styles.stepDetailRow}>
                        <Ionicons name="time-outline" size={16} color="#00b8d4" />
                        <Text style={styles.stepDetailText}>{step.duration.text || formatDuration(step.duration)}</Text>
                      </View>

                      {step.maneuver && (
                        <View style={styles.stepDetailRow}>
                          <Ionicons name="compass-outline" size={16} color="#00b8d4" />
                          <Text style={styles.stepDetailText}>Maneuver: {step.maneuver.replace(/-/g, " ")}</Text>
                        </View>
                      )}
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
                  {routeInfo?.end_address || route.params?.destination?.name || "Destination"}
                </Text>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.noStepsContainer}>
              <Ionicons name="information-circle-outline" size={40} color="#ccc" />
              <Text style={styles.noStepsText}>Step-by-step directions are not available for this route.</Text>
              <Text style={styles.noStepsSubText}>Please check your internet connection and try again.</Text>
            </View>
          )}
        </View>

        {/* Suggestions */}
        <View style={styles.suggestionsContainer}>
          <TouchableOpacity style={styles.suggestionItem} onPress={openInGoogleMaps}>
            <View style={[styles.suggestionIconContainer, { backgroundColor: "#27ae60" }]}> 
              <Ionicons name="map-outline" size={20} color="#fff" />
            </View>
            <Text style={styles.suggestionText}>Open in Google Maps</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
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
  loadingStepsContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  routeHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  waypointInfo: {
    fontSize: 12,
    color: "#f39c12",
    fontWeight: "500",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  stepsHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  stepsLoader: {
    marginLeft: 10,
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
    lineHeight: 20,
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
  waypointNumber: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
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
