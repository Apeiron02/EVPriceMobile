"use client"

import { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
  Animated,
  Platform,
} from "react-native"
import MapView, { Marker, Callout, PROVIDER_DEFAULT, Polyline } from "react-native-maps"
import { Ionicons, FontAwesome5 } from "@expo/vector-icons"
import api from "../api"
import * as Location from "expo-location"
import { getRouteInfoPOST } from "../api/map"
import RouteCitiesManager from "../api/RouteCitiesManager"
import { getStopoverSuggestions } from "../api/stopoverSuggestions"

import Constants from 'expo-constants';
const { width, height } = Dimensions.get("window")
const ANIMATION_DURATION = 300

const API_URL = Constants.expoConfig?.extra?.API_URL ?? Constants.manifest?.extra?.API_URL;
const GOOGLE_MAPS_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_KEY ?? Constants.manifest?.extra?.GOOGLE_MAPS_KEY;

const OccupancyIndicator = ({ level }) => (
  <View style={styles.occupancyContainer}>
    <Text style={styles.occupancyLabel}>Occupancy:</Text>
    <View style={styles.occupancyIndicator}>
      {[1,2,3,4,5].map(i => (
        <View
          key={i}
          style={[
            styles.occupancyDot,
            {
              backgroundColor: i <= level ? "#4caf50" : "#e0e0e0",
              borderColor: i <= level ? "#2e7d32" : "#bdbdbd",
            }
          ]}
        />
      ))}
      <Text style={styles.occupancyText}>
        {level === 1 ? "Very Low" : 
         level === 2 ? "Low" : 
         level === 3 ? "Medium" : 
         level === 4 ? "High" : "Very High"}
      </Text>
    </View>
  </View>
);

const MapScreen = ({ navigation, route }) => {
  const [searchText, setSearchText] = useState("")
  const mapRef = useRef(null)
  const [chargingStations, setChargingStations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)
  const [showStationDetails, setShowStationDetails] = useState(false)
  const [lastSearchedLocation, setLastSearchedLocation] = useState(null)
  const [mapType, setMapType] = useState("standard")
  const [showLocationInfo, setShowLocationInfo] = useState(false)
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [showChargingStations, setShowChargingStations] = useState(false)
  const [routeStations, setRouteStations] = useState([])
  const [isLoadingStations, setIsLoadingStations] = useState(false)
  const [showRestStops, setShowRestStops] = useState(false)
  const [restStops, setRestStops] = useState([])
  const [isLoadingRestStops, setIsLoadingRestStops] = useState(false)
  const [selectedRestStop, setSelectedRestStop] = useState(null)
  const [showRestStopDetails, setShowRestStopDetails] = useState(false)

  // City information states
  const [citiesManager] = useState(() => new RouteCitiesManager())
  const [routeCitiesInfo, setRouteCitiesInfo] = useState(null)
  const [showCitiesInfo, setShowCitiesInfo] = useState(false)

  // Animation values
  const locationInfoOpacity = useRef(new Animated.Value(0)).current
  const bottomNavHeight = useRef(new Animated.Value(80)).current
  const modalTranslateY = useRef(new Animated.Value(height)).current
  const restStopModalTranslateY = useRef(new Animated.Value(height)).current

  // Default map region - centered on Turkey
  const [region, setRegion] = useState({
    latitude: 39.9334,
    longitude: 32.8597,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  })

  // Check if route exists
  const hasActiveRoute = routeCoordinates.length > 0 && route?.params?.origin && route?.params?.destination

  // City detection function
  const detectCitiesAlongRoute = async (routeCoordinates, routeParams) => {
    try {
      console.log("🏙️ Starting city detection...")

      const citiesInfo = await citiesManager.logCitiesAlongRoute(routeCoordinates, routeParams)
      setRouteCitiesInfo(citiesInfo)

      if (citiesInfo && citiesInfo.totalCities > 0) {
        console.log(`✅ ${citiesInfo.totalCities} cities detected:`, citiesInfo.citiesText)
        setShowCitiesInfo(true)
        console.log("📊 City information (JSON):", JSON.stringify(citiesInfo, null, 2))
      } else {
        console.log("⚠️ No cities detected")
        setShowCitiesInfo(false)
      }

      return citiesInfo
    } catch (error) {
      console.error("❌ Error during city detection:", error)
      return null
    }
  }

  // Clear city information
  const clearCitiesInfo = () => {
    citiesManager.clearCities()
    setRouteCitiesInfo(null)
    setShowCitiesInfo(false)
  }

  // Get user location on component mount
  useEffect(() => {
    getCurrentUserLocation()
  }, [])

  // Get current user location
  const getCurrentUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        console.log("Location permission not granted")
        return
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }

      setUserLocation(userCoords)
      console.log("User location obtained:", userCoords)
    } catch (error) {
      console.error("Error getting user location:", error)
    }
  }

  // Fetch nearby charging stations when location changes
  useEffect(() => {
    if (selectedLocation) {
      const shouldFetchStations = shouldFetchNewStations(selectedLocation)

      if (shouldFetchStations) {
        fetchNearbyChargingStations(selectedLocation.latitude, selectedLocation.longitude)
        setLastSearchedLocation(selectedLocation)
      }

      setShowLocationInfo(true)
      Animated.timing(locationInfoOpacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start()
    }
  }, [selectedLocation])

  // Animate bottom navigation when location info is shown
  useEffect(() => {
    Animated.timing(bottomNavHeight, {
      toValue: showLocationInfo ? 130 : 80,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start()
  }, [showLocationInfo])

  // Modal animations
  useEffect(() => {
    Animated.timing(modalTranslateY, {
      toValue: showStationDetails ? 0 : height,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start()
  }, [showStationDetails])

  useEffect(() => {
    Animated.timing(restStopModalTranslateY, {
      toValue: showRestStopDetails ? 0 : height,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start()
  }, [showRestStopDetails])

  useEffect(() => {
    const detectCities = async () => {
      if (route?.params?.origin && route?.params?.destination) {
        const { origin, destination, routeCoordinates } = route.params
        if (routeCoordinates && routeCoordinates.length > 0) {
          console.log("Using existing route information:", routeCoordinates.length)
          setRouteCoordinates(routeCoordinates)
          await detectCitiesAlongRoute(routeCoordinates, { origin, destination })
          mapRef.current.fitToCoordinates(routeCoordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          })
        } else {
          console.log("Fetching route information from API")
          fetchRouteInfo(origin, destination)
        }
        if (route.params?.fromRouteDetails) {
          if (route.params.showChargingStations) {
            console.log("Request to show charging stations from Route Details page")
            toggleChargingStations()
          }
          if (route.params.showRestStops) {
            console.log("Request to show rest stops from Route Details page")
            toggleRestStops()
          }
        }
      } else {
        clearCitiesInfo()
      }
    }
    detectCities()
  }, [route?.params])

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return distance // in meters
  }

  // Check if new station query is needed
  const shouldFetchNewStations = (newLocation) => {
    if (!lastSearchedLocation) {
      return true
    }

    const distance = calculateDistance(
      lastSearchedLocation.latitude,
      lastSearchedLocation.longitude,
      newLocation.latitude,
      newLocation.longitude,
    )

    return distance > 500 // Query if distance is more than 500 meters
  }

  // Fetch nearby charging stations
  const fetchNearbyChargingStations = async (latitude, longitude) => {
    setIsLoading(true)
    try {
      const response = await api.get(`yakin-sarj-istasyonlari/?lat=${latitude}&lng=${longitude}&radius=2`)
      console.log("API response:", response)

      if (response && response.data && response.data.stations) {
        const stations = response.data.stations

        if (Array.isArray(stations) && stations.length > 0) {
          const mappedStations = stations.map((station, index) => ({
            id: station.place_id || `station-${index}`,
            title: station.name || `Station ${index + 1}`,
            description: station.vicinity || "",
            coordinate: {
              latitude: Number.parseFloat(station.latitude),
              longitude: Number.parseFloat(station.longitude),
            },
            details: station,
            occupancy: getRandomOccupancyLevel(),
          }))
          setChargingStations(mappedStations)
          console.log(`${mappedStations.length} charging stations found`)
        } else {
          console.log("No charging stations found nearby")
          setChargingStations([])
          Alert.alert("Info", "No charging stations found in this area. Please try another location.", [{ text: "OK" }])
        }
      } else {
        console.log("API response not in expected format:", response)
        setChargingStations([])
        Alert.alert("Info", "Could not retrieve charging station information. Please try again.", [{ text: "OK" }])
      }
    } catch (error) {
      console.error("Error loading charging stations:", error)
      setChargingStations([])
      Alert.alert("Error", "An error occurred while loading charging stations. Please try again.", [{ text: "OK" }])
    } finally {
      setIsLoading(false)
    }
  }

  // Show station details
  const handleStationPress = (e, station) => {
    setSelectedStation(station)
    setShowStationDetails(true)
  }

  // Create route to charging station from selected location
  const showDirectionsToStation = async (station) => {
    if (!selectedLocation) {
      Alert.alert("Location Required", "Please select a location on the map first to get directions.")
      return
    }

    if (!station || !station.coordinate) {
      Alert.alert("Error", "Invalid station location.")
      return
    }

    try {
      setIsLoading(true)
      console.log("Creating route to station:", station.title)

      const origin = selectedLocation
      const destination = {
        latitude: station.coordinate.latitude,
        longitude: station.coordinate.longitude,
        name: station.title,
      }

      // Get route information
      const routeData = await getRouteInfoPOST(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
        "driving"
      )

      if (routeData && routeData.coordinates && routeData.coordinates.length > 0) {
        setRouteCoordinates(routeData.coordinates)
        await detectCitiesAlongRoute(routeData.coordinates, { origin, destination })
        
        // Fit map to show the route
        mapRef.current.fitToCoordinates(routeData.coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        })

        // Update route params for navigation
        navigation.setParams({
          origin,
          destination,
          routeCoordinates: routeData.coordinates,
        })

        Alert.alert("Route Created", `Route to ${station.title} has been created.`)
        setShowStationDetails(false)
      } else {
        Alert.alert("Error", "Could not create route to this station.")
      }
    } catch (error) {
      console.error("Error creating route to station:", error)
      Alert.alert("Error", "Failed to create route. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle map press
  const onMapPress = (event) => {
    if (showStationDetails) {
      return
    }

    const { coordinate } = event.nativeEvent
    setSelectedLocation(coordinate)

    mapRef.current.animateToRegion(
      {
        ...coordinate,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000,
    )

    fetchNearbyChargingStations(coordinate.latitude, coordinate.longitude)
  }

  // Go to user location
  const goToUserLocation = async () => {
    setIsLoading(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        console.error("Location permission not granted")
        Alert.alert("Location Error", "Location access permission not granted. Please check permissions.", [
          { text: "OK" },
        ])
        setIsLoading(false)
        return
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }

      console.log("Location from device:", userCoords)
      setUserLocation(userCoords)

      try {
        const response = await api.get(
          `kullanici-konumu/?latitude=${userCoords.latitude}&longitude=${userCoords.longitude}`,
        )
        console.log("User location API response:", response.data)

        if (response && response.data && response.data.success === true) {
          const serverLocation = response.data
          const userLocation = {
            latitude: Number(serverLocation.latitude || userCoords.latitude),
            longitude: Number(serverLocation.longitude || userCoords.longitude),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }

          console.log("Using location from API:", userLocation)

          setRegion(userLocation)
          setSelectedLocation({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          })
        } else {
          throw new Error("API did not return valid location data")
        }
      } catch (apiError) {
        console.error("API location operation error:", apiError.message)

        const userLocation = {
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }

        console.log("Using local location:", userLocation)

        setRegion(userLocation)
        setSelectedLocation({
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
        })
      }

      if (mapRef && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: selectedLocation?.latitude || userCoords.latitude,
            longitude: selectedLocation?.longitude || userCoords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000,
        )
      }

      setShowLocationInfo(true)
      Animated.timing(locationInfoOpacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start()
    } catch (error) {
      console.error("Failed to get user location:", error)
      Alert.alert("Location Error", "Could not get your location. Please try again or check location permissions.", [
        { text: "OK" },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle map type
  const toggleMapType = () => {
    setMapType(mapType === "standard" ? "satellite" : "standard")
  }

  // Close location info
  const closeLocationInfo = () => {
    Animated.timing(locationInfoOpacity, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start(() => {
      setShowLocationInfo(false)
    })
  }

  const fetchRouteInfo = async (origin, destination) => {
    try {
      setIsLoading(true)
      console.log("Requesting route information:", origin, destination)
      if (!origin.latitude || !destination.latitude) {
        console.error("Invalid coordinates")
        Alert.alert("Error", "Valid coordinates are required to create a route.")
        setIsLoading(false)
        return
      }
      const routeData = await getRouteInfoPOST(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
        "driving",
      )
      console.log("Route data received")
      if (routeData && routeData.coordinates && routeData.coordinates.length > 0) {
        console.log(`${routeData.coordinates.length} detailed route coordinate points received`)
        setRouteCoordinates(routeData.coordinates)
        await detectCitiesAlongRoute(routeData.coordinates, { origin, destination })
        mapRef.current.fitToCoordinates(routeData.coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        })
        return
      }
      if (routeData && routeData.routes && routeData.routes.length > 0) {
        const route = routeData.routes[0]
        console.log("Processing standard route")
        if (route.overview_polyline && route.overview_polyline.points) {
          try {
            const decodedCoordinates = decodePolyline(route.overview_polyline.points)
            if (decodedCoordinates && decodedCoordinates.length > 0) {
              console.log(`Overview polyline decoded: ${decodedCoordinates.length} points`)
              setRouteCoordinates(decodedCoordinates)
              await detectCitiesAlongRoute(decodedCoordinates, { origin, destination })
              mapRef.current.fitToCoordinates(decodedCoordinates, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
              })
              return
            }
          } catch (decodeError) {
            console.error("Polyline decode error:", decodeError)
          }
        }
        if (route.legs && route.legs.length > 0) {
          console.log("Creating coordinates from route leg information")
          const pathCoordinates = []
          route.legs.forEach((leg) => {
            if (leg.steps) {
              leg.steps.forEach((step) => {
                if (step.polyline && step.polyline.points) {
                  try {
                    const stepPoints = decodePolyline(step.polyline.points)
                    if (stepPoints && stepPoints.length > 0) {
                      pathCoordinates.push(...stepPoints)
                    } else {
                      pathCoordinates.push({
                        latitude: step.start_location.lat,
                        longitude: step.start_location.lng,
                      })
                      pathCoordinates.push({
                        latitude: step.end_location.lat,
                        longitude: step.end_location.lng,
                      })
                    }
                  } catch (stepDecodeError) {
                    console.error("Step polyline decode error:", stepDecodeError)
                    pathCoordinates.push({
                      latitude: step.start_location.lat,
                      longitude: step.start_location.lng,
                    })
                    pathCoordinates.push({
                      latitude: step.end_location.lat,
                      longitude: step.end_location.lng,
                    })
                  }
                } else {
                  pathCoordinates.push({
                    latitude: step.start_location.lat,
                    longitude: step.start_location.lng,
                  })
                  pathCoordinates.push({
                    latitude: step.end_location.lat,
                    longitude: step.end_location.lng,
                  })
                }
              })
            }
          })
          if (pathCoordinates.length > 0) {
            console.log(`${pathCoordinates.length} coordinate points processed`)
            setRouteCoordinates(pathCoordinates)
            await detectCitiesAlongRoute(pathCoordinates, { origin, destination })
            mapRef.current.fitToCoordinates(pathCoordinates, {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            })
            return
          }
        }
        console.warn("Could not create route coordinates")
        Alert.alert(
          "Warning",
          "No route information found for this route. Please make sure you entered valid addresses.",
        )
      } else {
        console.warn("No route data found")
        Alert.alert(
          "Warning",
          "No route information found for this route. Please make sure you entered valid addresses.",
        )
      }
    } catch (error) {
      console.error("Error getting route information:", error)
      Alert.alert("Error", error.message || "Could not get route information. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Google polyline decoder function
  const decodePolyline = (encoded) => {
    if (!encoded || encoded.length === 0) {
      return []
    }

    const poly = []
    let index = 0
    const len = encoded.length
    let lat = 0
    let lng = 0

    while (index < len) {
      let b
      let shift = 0
      let result = 0

      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)

      const dlat = result & 1 ? ~(result >> 1) : result >> 1
      lat += dlat

      shift = 0
      result = 0

      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)

      const dlng = result & 1 ? ~(result >> 1) : result >> 1
      lng += dlng

      poly.push({
        latitude: lat * 1e-5,
        longitude: lng * 1e-5,
      })
    }

    return poly
  }

  // Get route checkpoints at specific intervals
  const getRouteCheckpoints = (coordinates, intervalKm = 25) => {
    if (!coordinates || coordinates.length < 2) return []

    const checkpoints = []
    let totalDistance = 0

    for (let i = 1; i < coordinates.length - 1; i++) {
      const current = coordinates[i]
      const next = coordinates[i + 1]

      const distance = calculateDistance(current.latitude, current.longitude, next.latitude, next.longitude) / 1000

      totalDistance += distance

      if (totalDistance >= intervalKm) {
        checkpoints.push({
          latitude: next.latitude,
          longitude: next.longitude,
        })
        totalDistance = 0
      }
    }

    return checkpoints
  }

  // Toggle charging stations display
  const toggleChargingStations = async () => {
    if (!showChargingStations && routeCoordinates.length > 0) {
      setIsLoadingStations(true)
      try {
        const checkpoints = getRouteCheckpoints(routeCoordinates, 25)
        console.log(`${checkpoints.length} checkpoints created`)

        const allStations = new Map()

        for (const checkpoint of checkpoints) {
          try {
            const response = await api.get(
              `yakin-sarj-istasyonlari/?lat=${checkpoint.latitude}&lng=${checkpoint.longitude}&radius=2`,
            )

            if (response.data && response.data.stations) {
              response.data.stations.forEach((station) => {
                const stationId = station.place_id || `${station.latitude}-${station.longitude}`
                if (!allStations.has(stationId)) {
                  allStations.set(stationId, {
                    ...station,
                    id: stationId,
                    occupancy: getRandomOccupancyLevel(),
                  })
                }
              })
            }
          } catch (error) {
            console.error(`Could not get charging stations for checkpoint:`, error)
            continue
          }
        }

        const uniqueStations = Array.from(allStations.values())
        console.log(`${uniqueStations.length} unique charging stations found`)

        setRouteStations(uniqueStations)
        setShowChargingStations(true)
      } catch (error) {
        console.error("Error loading charging stations:", error)
        Alert.alert("Error", "An error occurred while loading charging stations. Please try again.")
      } finally {
        setIsLoadingStations(false)
      }
    } else {
      setShowChargingStations(false)
      setRouteStations([])
    }
  }

  // REVISED: AI-powered rest stops toggle function
  const toggleRestStops = async () => {
    if (!showRestStops && routeCoordinates.length > 0) {
      setIsLoadingRestStops(true)
      try {
        // Extract cities from route using the cities manager
        const cities = extractCitiesFromRoute()

        if (cities.length === 0) {
          Alert.alert("Info", "No city information found on the route.")
          setIsLoadingRestStops(false)
          return
        }

        console.log("Cities along route:", cities)

        // Get AI-generated rest stop suggestions
        let aiSuggestions = ""
        try {
          aiSuggestions = await getStopoverSuggestions(cities)
          console.log("AI Rest Stop Suggestions:\n" + aiSuggestions)
        } catch (err) {
          console.error("Could not get rest stop suggestions:", err.message)
          Alert.alert("Warning", "Could not get AI suggestions. Using default rest stops.")
        }

        // Burada parse edip state'e kaydediyoruz
        const parsedRestStops = parseRestStopSuggestions(aiSuggestions)
        setRestStops(parsedRestStops)
        setShowRestStops(true)
        console.log("Rest stops:", parsedRestStops)
      } catch (error) {
        console.error("Error loading rest stops:", error)
        Alert.alert("Error", "An error occurred while loading rest stops. Please try again.")
      } finally {
        setIsLoadingRestStops(false)
      }
    } else {
      setShowRestStops(false)
      setRestStops([])
    }
  }

  // Extract cities from route - UPDATED
  const extractCitiesFromRoute = () => {
    if (routeCitiesInfo && routeCitiesInfo.cities && routeCitiesInfo.cities.length > 0) {
      return routeCitiesInfo.cities.map((city) => city.name)
    }
    return []
  }

  // Handle rest stop marker press
  const handleRestStopPress = (e, restStop) => {
    setSelectedRestStop(restStop)
    setShowRestStopDetails(true)

    Animated.timing(restStopModalTranslateY, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start()
  }

  // Add station to route
  const addStationToRoute = async (station) => {
    if (!hasActiveRoute) {
      Alert.alert(
        "No Active Route", 
        "Please create a route first before adding charging stations. You can create a route by searching for a destination.",
        [{ text: "OK" }]
      )
      return
    }

    try {
      setIsLoading(true)

      const stationIndex = routeCoordinates.findIndex(
        (coord) =>
          Math.abs(coord.latitude - station.coordinate.latitude) < 0.001 && 
          Math.abs(coord.longitude - station.coordinate.longitude) < 0.001,
      )

      if (stationIndex === -1) {
        const newRoute = await recalculateRouteWithWaypoint({
          latitude: station.coordinate.latitude,
          longitude: station.coordinate.longitude,
          name: station.title,
        })
        if (newRoute) {
          setRouteCoordinates(newRoute)

          if (route?.params?.origin && route?.params?.destination) {
            detectCitiesAlongRoute(newRoute, {
              origin: route.params.origin,
              destination: route.params.destination,
            })
          }

          Alert.alert("Success", `${station.title} added to route.`)
        }
      } else {
        Alert.alert("Info", "This station is already on the route.")
      }
    } catch (error) {
      console.error("Error adding station to route:", error)
      Alert.alert("Error", "An error occurred while adding the station to the route.")
    } finally {
      setIsLoading(false)
    }
  }

  // NEW: Add rest stop to route
  const addRestStopToRoute = async (restStop) => {
    if (!hasActiveRoute) {
      Alert.alert(
        "No Active Route", 
        "Please create a route first before adding rest stops. You can create a route by searching for a destination.",
        [{ text: "OK" }]
      )
      return
    }

    try {
      setIsLoading(true)

      // Check if rest stop is already on route
      const restStopIndex = routeCoordinates.findIndex(
        (coord) =>
          Math.abs(coord.latitude - restStop.latitude) < 0.001 &&
          Math.abs(coord.longitude - restStop.longitude) < 0.001,
      )

      if (restStopIndex === -1) {
        // Recalculate route with rest stop as waypoint
        const newRoute = await recalculateRouteWithWaypoint({
          latitude: restStop.latitude,
          longitude: restStop.longitude,
          name: restStop.name,
        })

        if (newRoute) {
          setRouteCoordinates(newRoute)

          // Re-detect cities for new route
          if (route?.params?.origin && route?.params?.destination) {
            await detectCitiesAlongRoute(newRoute, {
              origin: route.params.origin,
              destination: route.params.destination,
            })
          }

          Alert.alert("Success", `${restStop.name} has been added to your route.`)
          setShowRestStopDetails(false)
        }
      } else {
        Alert.alert("Info", "This rest stop is already on your route.")
      }
    } catch (error) {
      console.error("Error adding rest stop to route:", error)
      Alert.alert("Error", "An error occurred while adding the rest stop to your route.")
    } finally {
      setIsLoading(false)
    }
  }

  // Find nearest point on route
  const findNearestPointOnRoute = (station, routeCoords) => {
    let minDistance = Number.POSITIVE_INFINITY
    let nearestPoint = null

    routeCoords.forEach((coord) => {
      const distance = calculateDistance(station.latitude, station.longitude, coord.latitude, coord.longitude)
      if (distance < minDistance) {
        minDistance = distance
        nearestPoint = coord
      }
    })

    return nearestPoint
  }

  // Recalculate route with waypoint
  const recalculateRouteWithWaypoint = async (waypoint) => {
    try {
      const origin = route.params.origin
      const destination = route.params.destination

      const firstLeg = await getRouteInfoPOST(origin.latitude, origin.longitude, waypoint.latitude, waypoint.longitude)
      const secondLeg = await getRouteInfoPOST(
        waypoint.latitude,
        waypoint.longitude,
        destination.latitude,
        destination.longitude,
      )

      if (firstLeg && secondLeg) {
        return [...firstLeg.coordinates, ...secondLeg.coordinates]
      }
    } catch (error) {
      console.error("Error recalculating route:", error)
      throw error
    }
  }

  // API'dan gelen mola önerisi metnini parse eden fonksiyon
  function parseRestStopSuggestions(apiText) {
    const lines = apiText.split("\n").filter(line => /^\d+\./.test(line));
    return lines.map(line => {
      // 1. Ankara – Hamamönü Esnaf Lokantası: ... Koordinatlar: 39.941667, 32.853056
      const match = line.match(/^\d+\.\s*(.*?)\s*–\s*(.*?):(.*)Koordinatlar:\s*([0-9\.\-]+),\s*([0-9\.\-]+)/);
      if (!match) return null;
      const [_, city, name, desc, lat, lng] = match;
      // Adres bilgisini açıklamadan regex ile çekebilirsin, istersen ekle
      return {
        city: city.trim(),
        name: name.trim(),
        description: desc.trim(),
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      };
    }).filter(Boolean);
  }

  // Seçilen mola noktasına direkt rota çiz
  const showDirectionsToRestStop = async (restStop) => {
    if (!selectedLocation) {
      Alert.alert("Location Required", "Please select a location on the map first to get directions.")
      return
    }

    try {
      setIsLoading(true);
      const origin = selectedLocation;
      const destination = {
        latitude: restStop.latitude,
        longitude: restStop.longitude,
        name: restStop.name,
      };
      // Sadece origin ve destination ile yeni rota al
      const routeData = await getRouteInfoPOST(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
        "driving"
      );
      if (routeData && routeData.coordinates && routeData.coordinates.length > 0) {
        setRouteCoordinates(routeData.coordinates);
        await detectCitiesAlongRoute(routeData.coordinates, { origin, destination });
        mapRef.current.fitToCoordinates(routeData.coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });

        // Update navigation params
        navigation.setParams({
          origin,
          destination,
          routeCoordinates: routeData.coordinates,
        })

        Alert.alert("Route Created", `Route to ${restStop.name} has been created.`)
      }
      setShowRestStopDetails(false);
    } catch (error) {
      Alert.alert("Error", "Could not create route to rest stop.");
    } finally {
      setIsLoading(false);
    }
  };

  // Seçilen mola noktasını ara durak olarak ekle
  const addRestStopAsWaypoint = async (restStop) => {
    if (!hasActiveRoute) {
      Alert.alert(
        "No Active Route", 
        "Please create a route first before adding rest stops as waypoints.",
        [{ text: "OK" }]
      )
      return
    }

    try {
      setIsLoading(true);
      const origin = route?.params?.origin;
      const destination = route?.params?.destination;
      const waypoint = {
        latitude: restStop.latitude,
        longitude: restStop.longitude,
        name: restStop.name,
      };
      // Waypoint ile yeni rota al
      const firstLeg = await getRouteInfoPOST(origin.latitude, origin.longitude, waypoint.latitude, waypoint.longitude, "driving");
      const secondLeg = await getRouteInfoPOST(waypoint.latitude, waypoint.longitude, destination.latitude, destination.longitude, "driving");
      if (firstLeg && secondLeg) {
        const newRoute = [...firstLeg.coordinates, ...secondLeg.coordinates];
        setRouteCoordinates(newRoute);
        await detectCitiesAlongRoute(newRoute, { origin, destination });
        mapRef.current.fitToCoordinates(newRoute, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
        Alert.alert("Success", `${restStop.name} added to route as waypoint.`);
        setShowRestStopDetails(false);
      }
    } catch (error) {
      Alert.alert("Error", "Could not add rest stop to route.");
    } finally {
      setIsLoading(false);
    }
  };

  function getRandomOccupancyLevel() {
    // 1-4 arası eşit olasılık, 5 için %10 olasılık
    const rand = Math.random();
    if (rand < 0.10) return 5; // %10 olasılık
    // Geriye kalan %90'ı 1-4 arasında eşit dağıt
    return Math.floor(rand * 4) + 1; // 1,2,3,4
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={region}
          onPress={onMapPress}
          mapType={mapType}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={true}
        >
          {/* Origin and destination markers */}
          {route?.params?.origin && (
            <Marker
              coordinate={{
                latitude: route.params.origin.latitude,
                longitude: route.params.origin.longitude,
              }}
              title="Start"
              description={route.params.origin.name}
              pinColor="#2ecc71"
            >
              <View style={[styles.customMarker, { backgroundColor: "#2ecc71" }]}>
                <Ionicons name="flag" size={16} color="#fff" />
              </View>
            </Marker>
          )}

          {route?.params?.destination && (
            <Marker
              coordinate={{
                latitude: route.params.destination.latitude,
                longitude: route.params.destination.longitude,
              }}
              title="Destination"
              description={route.params.destination.name}
              pinColor="#e74c3c"
            >
              <View style={[styles.customMarker, { backgroundColor: "#e74c3c" }]}>
                <Ionicons name="location" size={16} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Selected location marker */}
          {selectedLocation && (
            <Marker coordinate={selectedLocation} title="Selected Location" pinColor="#3498db">
              <View style={styles.selectedLocationMarker}>
                <View style={styles.selectedLocationDot} />
                <View style={styles.selectedLocationRing} />
              </View>
            </Marker>
          )}

          {/* Nearby charging stations - Callout removed */}
          {chargingStations.map((station) => (
            <Marker
              key={station.id}
              coordinate={station.coordinate}
              onPress={(e) => {
                e.stopPropagation()
                handleStationPress(e, station)
              }}
            >
              <View style={styles.markerContainer}>
                <FontAwesome5 name="charging-station" size={14} color="#fff" />
              </View>
            </Marker>
          ))}

          {/* Route polyline */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={4}
              strokeColor="#00b8d4"
              lineDashPattern={[0]}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Route charging stations - Callout removed */}
          {showChargingStations &&
            routeStations.map((station) => (
              <Marker
                key={station.id || station.place_id}
                coordinate={{
                  latitude: Number.parseFloat(station.latitude || station.lat),
                  longitude: Number.parseFloat(station.longitude || station.lng),
                }}
                onPress={() =>
                  handleStationPress(null, {
                    ...station,
                    coordinate: {
                      latitude: Number.parseFloat(station.latitude || station.lat),
                      longitude: Number.parseFloat(station.longitude || station.lng),
                    },
                    title: station.name,
                    description: station.vicinity,
                  })
                }
              >
                <View style={styles.markerContainer}>
                  <FontAwesome5 name="charging-station" size={14} color="#fff" />
                </View>
              </Marker>
            ))}

          {/* AI-Generated Rest Stops */}
          {showRestStops &&
            restStops.map((restStop, idx) => (
              <Marker
                key={restStop.name + idx}
                coordinate={{ latitude: restStop.latitude, longitude: restStop.longitude }}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedRestStop(restStop);
                  setShowRestStopDetails(true);
                }}
              >
                <View style={styles.restStopMarker}>
                  <Ionicons name="cafe" size={14} color="#fff" />
                </View>
              </Marker>
            ))}
        </MapView>

        {/* Search Container */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              navigation.navigate("Home")
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate("SearchRoute")}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <Text style={styles.searchInput}>{searchText || "Search location or charging station"}</Text>
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton} onPress={toggleMapType}>
            <Ionicons name={mapType === "standard" ? "map" : "earth"} size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlButton} onPress={goToUserLocation}>
            <Ionicons name="locate" size={22} color="#333" />
          </TouchableOpacity>
          {routeCoordinates.length > 0 && (
            <TouchableOpacity
              style={[styles.mapControlButton, showChargingStations && styles.activeControlButton]}
              onPress={toggleChargingStations}
              disabled={isLoadingStations}
            >
              {isLoadingStations ? (
                <ActivityIndicator size="small" color="#00b8d4" />
              ) : (
                <FontAwesome5 name="charging-station" size={20} color={showChargingStations ? "#00b8d4" : "#333"} />
              )}
            </TouchableOpacity>
          )}
          {routeCoordinates.length > 0 && (
            <TouchableOpacity
              style={[styles.mapControlButton, showRestStops && styles.activeControlButton]}
              onPress={toggleRestStops}
              disabled={isLoadingRestStops}
            >
              {isLoadingRestStops ? (
                <ActivityIndicator size="small" color="#00b8d4" />
              ) : (
                <Ionicons name="cafe" size={20} color={showRestStops ? "#00b8d4" : "#333"} />
              )}
            </TouchableOpacity>
          )}
          {routeCitiesInfo && routeCitiesInfo.totalCities > 0 && (
            <TouchableOpacity
              style={[styles.mapControlButton, showCitiesInfo && styles.activeControlButton]}
              onPress={() => setShowCitiesInfo(!showCitiesInfo)}
            >
              <Ionicons name="business" size={20} color={showCitiesInfo ? "#00b8d4" : "#333"} />
            </TouchableOpacity>
          )}
        </View>

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00b8d4" />
          </View>
        )}

        {/* Location info */}
        {showLocationInfo && (
          <Animated.View style={[styles.locationInfoContainer, { opacity: locationInfoOpacity }]}>
            <View style={styles.locationInfoHeader}>
              <Text style={styles.locationInfoTitle}>Selected Location</Text>
              <TouchableOpacity onPress={closeLocationInfo}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.locationInfoContent}>
              <View style={styles.locationCoordinates}>
                <Ionicons name="location" size={16} color="#00b8d4" style={styles.locationIcon} />
                <Text style={styles.locationInfoText}>
                  {selectedLocation && typeof selectedLocation.latitude === "number"
                    ? `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`
                    : "Loading coordinate information..."}
                </Text>
              </View>
              <View style={styles.stationCountContainer}>
                <FontAwesome5 name="charging-station" size={14} color="#00b8d4" style={styles.stationIcon} />
                <Text style={styles.stationCountText}>
                  {isLoading ? "Searching charging stations..." : `${chargingStations.length} charging stations found`}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Cities info panel */}
        {showCitiesInfo && routeCitiesInfo && (
          <View style={styles.citiesInfoContainer}>
            <View style={styles.citiesInfoHeader}>
              <Text style={styles.citiesInfoTitle}>🏙️ Cities Along Route</Text>
              <TouchableOpacity onPress={() => setShowCitiesInfo(false)}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.citiesInfoContent}>
              <Text style={styles.citiesCountText}>Total {routeCitiesInfo.totalCities} cities detected</Text>
              <Text style={styles.citiesListText}>{routeCitiesInfo.citiesText}</Text>
              {routeCitiesInfo.summary.intermediateCitiesCount > 0 && (
                <Text style={styles.intermediateCitiesText}>
                  Intermediate cities: {routeCitiesInfo.summary.intermediateCities.join(", ")}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Charging station detail modal */}
        <Modal
          visible={showStationDetails}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowStationDetails(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStationDetails(false)}>
            <Animated.View style={[styles.modalContainer, { transform: [{ translateY: modalTranslateY }] }]}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalDragIndicator} />

                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <FontAwesome5 name="charging-station" size={18} color="#00b8d4" style={styles.modalTitleIcon} />
                    <Text style={styles.modalTitle} numberOfLines={2}>
                      {selectedStation?.title}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setShowStationDetails(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalContent}>
                  {selectedStation?.vicinity ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="location" size={18} color="#00b8d4" style={styles.infoIcon} />
                      <Text style={styles.infoText}>{selectedStation.vicinity}</Text>
                    </View>
                  ) : null}

                  <OccupancyIndicator level={selectedStation?.occupancy || 1} />

                  <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                      style={styles.directionButton}
                      onPress={() => {
                        showDirectionsToStation(selectedStation)
                        setShowStationDetails(false)
                      }}
                    >
                      <Ionicons name="navigate" size={18} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>Directions</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.addToRouteButton,
                        !hasActiveRoute && styles.disabledButton
                      ]}
                      onPress={() => {
                        if (hasActiveRoute) {
                          addStationToRoute(selectedStation)
                          setShowStationDetails(false)
                        }
                      }}
                      disabled={!hasActiveRoute}
                    >
                      <Ionicons name="add-circle" size={18} color="#fff" style={styles.buttonIcon} />
                      <Text style={[
                        styles.buttonText,
                        !hasActiveRoute && styles.disabledButtonText
                      ]}>
                        {hasActiveRoute ? "Add to Route" : "Create Route First"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {!hasActiveRoute && (
                    <View style={styles.noRouteMessage}>
                      <Ionicons name="information-circle" size={16} color="#ff9500" />
                      <Text style={styles.noRouteMessageText}>
                        Create a route first to add charging stations as waypoints.
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        {/* Rest stop detail modal */}
        <Modal
          visible={showRestStopDetails}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowRestStopDetails(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRestStopDetails(false)}>
            <Animated.View style={[styles.modalContainer, { transform: [{ translateY: restStopModalTranslateY }] }]}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalDragIndicator} />

                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Ionicons
                      name="cafe"
                      size={18}
                      color="#8e44ad"
                      style={styles.modalTitleIcon}
                    />
                    <Text
                      style={[styles.modalTitle, { color: "#8e44ad" }]}
                      numberOfLines={2}
                    >
                      {selectedRestStop?.name}
                    </Text>
                    <View style={styles.aiModalBadge}>
                      <Text style={styles.aiModalBadgeText}>🤖 AI</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setShowRestStopDetails(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalContent}>
                  <View style={styles.restStopCityContainer}>
                    <Ionicons name="location" size={16} color="#8e44ad" />
                    <Text style={styles.restStopCityText}>
                      {selectedRestStop?.city}
                    </Text>
                  </View>

                  <View style={styles.restStopDescriptionContainer}>
                    <Text style={styles.restStopDescriptionTitle}>About</Text>
                    <Text style={styles.restStopDescription}>
                      {selectedRestStop?.description || "No detailed information available about this rest stop."}
                    </Text>
                    <Text style={styles.aiGeneratedNote}>
                      ✨ This suggestion was generated by AI based on your route and preferences.
                    </Text>
                  </View>

                  <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                      style={[styles.directionButton, { backgroundColor: "#8e44ad" }]}
                      onPress={() => showDirectionsToRestStop(selectedRestStop)}
                    >
                      <Ionicons name="navigate" size={18} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>Directions</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.addToRouteButton, 
                        { backgroundColor: hasActiveRoute ? "#8e44ad" : "#ccc" }
                      ]}
                      onPress={() => addRestStopAsWaypoint(selectedRestStop)}
                      disabled={!hasActiveRoute}
                    >
                      <Ionicons name="add-circle" size={18} color="#fff" style={styles.buttonIcon} />
                      <Text style={[
                        styles.buttonText,
                        !hasActiveRoute && styles.disabledButtonText
                      ]}>
                        {hasActiveRoute ? "Add to Route" : "Create Route First"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {!hasActiveRoute && (
                    <View style={styles.noRouteMessage}>
                      <Ionicons name="information-circle" size={16} color="#ff9500" />
                      <Text style={styles.noRouteMessageText}>
                        Create a route first to add rest stops as waypoints.
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </View>

      {/* Bottom Navigation */}
      <Animated.View style={[styles.bottomNav, { height: bottomNavHeight }]}>
        <View style={styles.bottomNavContent}>
          <TouchableOpacity style={styles.navButton}>
            <Ionicons name="compass" size={24} color="#00b8d4" />
            <Text style={[styles.navText, { color: "#00b8d4" }]}>Explore</Text>
          </TouchableOpacity>

          {routeCoordinates.length > 0 && route?.params?.origin && route?.params?.destination ? (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                navigation.navigate("SearchDetails", {
                  origin: route.params.origin,
                  destination: route.params.destination,
                  routeCoordinates: routeCoordinates,
                  routeInfo: route.params.routeInfo || {},
                  citiesInfo: routeCitiesInfo,
                })
              }}
            >
              <Ionicons name="map-outline" size={24} color="#666" />
              <Text style={styles.navText}>Route Info</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyNavButton} />
          )}

          <TouchableOpacity style={styles.navButton}>
            <Ionicons name="settings-outline" size={24} color="#666" />
            <Text style={styles.navText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  searchContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 40,
    left: 0,
    right: 0,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  mapControls: {
    position: "absolute",
    right: 16,
    bottom: 150,
    alignItems: "center",
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedLocationMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  selectedLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3498db",
    borderWidth: 2,
    borderColor: "#fff",
  },
  selectedLocationRing: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#3498db",
    backgroundColor: "rgba(52, 152, 219, 0.2)",
  },
  markerContainer: {
    backgroundColor: "#00b8d4",
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: "#fff",
  },
  occupancyContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  occupancyLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  occupancyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  occupancyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginHorizontal: 2,
  },
  occupancyText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
    marginLeft: 8,
  },
  loadingContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -25,
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  locationInfoContainer: {
    position: "absolute",
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  locationInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  locationInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  locationInfoContent: {
    padding: 12,
  },
  locationCoordinates: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationInfoText: {
    fontSize: 13,
    color: "#333",
  },
  stationCountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stationIcon: {
    marginRight: 8,
  },
  stationCountText: {
    fontSize: 13,
    color: "#00b8d4",
    fontWeight: "500",
  },
  citiesInfoContainer: {
    position: "absolute",
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  citiesInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  citiesInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  citiesInfoContent: {
    padding: 12,
  },
  citiesCountText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  citiesListText: {
    fontSize: 14,
    color: "#00b8d4",
    fontWeight: "500",
    marginBottom: 8,
  },
  intermediateCitiesText: {
    fontSize: 12,
    color: "#8e44ad",
    fontStyle: "italic",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    overflow: "hidden",
  },
  bottomNavContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    minHeight: 300,
  },
  modalDragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  modalTitleIcon: {
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "flex-start",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    lineHeight: 20,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  directionButton: {
    backgroundColor: "#00b8d4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00b8d4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  activeControlButton: {
    backgroundColor: "#e1f5fe",
    borderColor: "#00b8d4",
    borderWidth: 2,
  },
  addToRouteButton: {
    backgroundColor: "#00b8d4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  addToRouteText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  disabledButtonText: {
    color: "#999",
  },
  noRouteMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9500",
  },
  noRouteMessageText: {
    fontSize: 12,
    color: "#856404",
    marginLeft: 8,
    flex: 1,
  },
  restStopMarker: {
    backgroundColor: "#8e44ad",
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: "#fff",
    position: "relative",
  },
  restStopCityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#f8f4fc",
    padding: 10,
    borderRadius: 8,
  },
  restStopCityText: {
    fontSize: 14,
    color: "#8e44ad",
    fontWeight: "500",
    marginLeft: 8,
  },
  restStopDescriptionContainer: {
    backgroundColor: "#f8f4fc",
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  restStopDescriptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  restStopDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  emptyNavButton: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  aiModalBadge: {
    backgroundColor: "#ff6b35",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  aiModalBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  aiGeneratedNote: {
    fontSize: 12,
    color: "#ff6b35",
    fontStyle: "italic",
    marginTop: 8,
    padding: 8,
    backgroundColor: "#fff5f0",
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#ff6b35",
  },
})

export default MapScreen