"use client"

import { useEffect, useRef, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Animated,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"

const { width, height } = Dimensions.get("window")

const HomeScreen = ({ navigation }) => {
  const [buttonsVisible, setButtonsVisible] = useState([false, false, false])
  const [headerVisible, setHeaderVisible] = useState(false)
  const [contentVisible, setContentVisible] = useState(false)

  // Simple opacity animations - safe for React Navigation
  const headerOpacity = useRef(new Animated.Value(0)).current
  const contentOpacity = useRef(new Animated.Value(0)).current
  const button1Opacity = useRef(new Animated.Value(0)).current
  const button2Opacity = useRef(new Animated.Value(0)).current
  const button3Opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Sequential entrance animations with delays
    const startAnimations = () => {
      // Header animation
      setTimeout(() => {
        setHeaderVisible(true)
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start()
      }, 200)

      // Content animation
      setTimeout(() => {
        setContentVisible(true)
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start()
      }, 600)

      // Sequential button animations
      setTimeout(() => {
        setButtonsVisible((prev) => [true, prev[1], prev[2]])
        Animated.timing(button1Opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start()
      }, 1200)

      setTimeout(() => {
        setButtonsVisible((prev) => [prev[0], true, prev[2]])
        Animated.timing(button2Opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start()
      }, 1500)

      setTimeout(() => {
        setButtonsVisible((prev) => [prev[0], prev[1], true])
        Animated.timing(button3Opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start()
      }, 1800)
    }

    startAnimations()
  }, [])

  const handleButtonPress = (screenName, buttonIndex) => {
    // Simple press feedback
    const buttonOpacities = [button1Opacity, button2Opacity, button3Opacity]
    const currentOpacity = buttonOpacities[buttonIndex]

    Animated.sequence([
      Animated.timing(currentOpacity, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(currentOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate(screenName)
    })
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2234" />

      {/* Enhanced Background with Gradient Layers */}
      <LinearGradient
        colors={["#1a2234", "#2d3446", "#1e3a4a", "#1a2234"]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Background Elements */}
      <View style={styles.backgroundElements}>
        <View style={[styles.floatingElement, styles.element1]} />
        <View style={[styles.floatingElement, styles.element2]} />
        <View style={[styles.floatingElement, styles.element3]} />
        <View style={[styles.floatingElement, styles.element4]} />
      </View>

      {/* Enhanced Header with Better Integration */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={["rgba(0, 184, 212, 0.15)", "rgba(0, 184, 212, 0.05)", "transparent"]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <View style={styles.logoBackground}>
                <Ionicons name="car-sport" size={28} color="#00b8d4" />
              </View>
              <View style={styles.logoGlow} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Yol Arkadaşım</Text>
              <Text style={styles.headerSubtitle}>EV Companion</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.statusContainer}>
              <View style={styles.headerAccent} />
              <View style={styles.statusIndicator}>
                <View style={styles.statusDot} />
              </View>
            </View>
          </View>
        </View>
        <View style={styles.headerBottomBorder} />
      </Animated.View>

      {/* Main Content */}
      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        {/* Title Section with Enhanced Typography */}
        <View style={styles.titleContainer}>
          <View style={styles.titleAccentContainer}>
            <View style={styles.titleAccent} />
            <View style={styles.titleAccentGlow} />
          </View>
          <Text style={styles.title}>Elektrikli Araç</Text>
          <Text style={styles.subtitle}>Uygulaması</Text>
          <Text style={styles.description}>Elektrikli araç yolculuğunuzda ihtiyacınız olan her şey</Text>
        </View>

        {/* Enhanced Buttons Container */}
        <View style={styles.buttonsContainer}>
          {/* Main Button with Enhanced Design */}
          <Animated.View style={[styles.mainButtonContainer, { opacity: button1Opacity }]}>
            <TouchableOpacity
              style={styles.mainButtonTouchable}
              onPress={() => handleButtonPress("ChargingCalculator", 0)}
              activeOpacity={0.9}
            >
              <View style={styles.mainButton}>
                <LinearGradient
                  colors={["#00e5ff", "#00b8d4", "#0097a7"]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.mainIconContainer}>
                      <View style={styles.iconBackground}>
                        <Ionicons name="flash" size={26} color="white" />
                      </View>
                      <View style={styles.iconRipple} />
                    </View>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.buttonTitle}>Şarj Ücreti</Text>
                      <Text style={styles.buttonSubtitle}>Hesaplama</Text>
                    </View>
                    <View style={styles.chevronContainer}>
                      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.9)" />
                    </View>
                  </View>
                </LinearGradient>
                <View style={styles.buttonGlow} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Secondary Button 1 with Sequential Color Animation */}
          <Animated.View style={[styles.secondaryButtonContainer, { opacity: button2Opacity }]}>
            <TouchableOpacity
              style={styles.buttonTouchable}
              onPress={() => handleButtonPress("MapScreen", 1)}
              activeOpacity={0.9}
            >
              <View style={[styles.button, styles.button1, buttonsVisible[1] && styles.buttonActive]}>
                <LinearGradient
                  colors={
                    buttonsVisible[1]
                      ? ["rgba(0, 184, 212, 0.8)", "rgba(0, 151, 167, 0.9)"]
                      : ["rgba(45, 52, 70, 0.8)", "rgba(45, 52, 70, 0.6)"]
                  }
                  style={styles.secondaryButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.secondaryIconContainer}>
                      <View style={styles.secondaryIconBackground}>
                        <Ionicons name="map" size={22} color="#00b8d4" />
                      </View>
                    </View>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.secondaryButtonTitle}>Harita Sayfası</Text>
                      <Text style={styles.secondaryButtonSubtitle}>Şarj istasyonları ve rotalar</Text>
                    </View>
                    <View style={styles.chevronContainer}>
                      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
                    </View>
                  </View>
                </LinearGradient>
                {buttonsVisible[1] && <View style={styles.secondaryButtonGlow} />}
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Secondary Button 2 with Sequential Color Animation */}
          <Animated.View style={[styles.secondaryButtonContainer, { opacity: button3Opacity }]}>
            <TouchableOpacity
              style={styles.buttonTouchable}
              onPress={() => handleButtonPress("UserProfile", 2)}
              activeOpacity={0.9}
            >
              <View style={[styles.button, styles.button2, buttonsVisible[2] && styles.buttonActive]}>
                <LinearGradient
                  colors={
                    buttonsVisible[2]
                      ? ["rgba(0, 184, 212, 0.8)", "rgba(0, 151, 167, 0.9)"]
                      : ["rgba(45, 52, 70, 0.8)", "rgba(45, 52, 70, 0.6)"]
                  }
                  style={styles.secondaryButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.buttonContent}>
                    <View style={styles.secondaryIconContainer}>
                      <View style={styles.secondaryIconBackground}>
                        <Ionicons name="person" size={22} color="#00b8d4" />
                      </View>
                    </View>
                    <View style={styles.buttonTextContainer}>
                      <Text style={styles.secondaryButtonTitle}>Kullanıcı Bilgilerim</Text>
                      <Text style={styles.secondaryButtonSubtitle}>Profil ve araç ayarları</Text>
                    </View>
                    <View style={styles.chevronContainer}>
                      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
                    </View>
                  </View>
                </LinearGradient>
                {buttonsVisible[2] && <View style={styles.secondaryButtonGlow} />}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Enhanced Bottom Accent */}
      <View style={styles.bottomAccent}>
        <LinearGradient
          colors={[
            "transparent",
            "rgba(0, 184, 212, 0.4)",
            "rgba(0, 184, 212, 0.8)",
            "rgba(0, 184, 212, 0.4)",
            "transparent",
          ]}
          style={styles.accentLine}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a2234",
  },
  backgroundGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backgroundElements: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  floatingElement: {
    position: "absolute",
    borderRadius: 50,
    opacity: 0.08,
    backgroundColor: "#00b8d4",
  },
  element1: {
    width: 120,
    height: 120,
    top: "8%",
    right: "5%",
  },
  element2: {
    width: 80,
    height: 80,
    top: "55%",
    left: "2%",
  },
  element3: {
    width: 100,
    height: 100,
    bottom: "15%",
    right: "15%",
  },
  element4: {
    width: 60,
    height: 60,
    top: "30%",
    left: "80%",
  },
  header: {
    position: "relative",
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoContainer: {
    position: "relative",
    marginRight: 16,
  },
  logoBackground: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 184, 212, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 184, 212, 0.3)",
  },
  logoGlow: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    backgroundColor: "rgba(0, 184, 212, 0.2)",
    borderRadius: 25,
    opacity: 0.6,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: "#00b8d4",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: "rgba(0, 184, 212, 0.8)",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAccent: {
    width: 4,
    height: 24,
    backgroundColor: "#00b8d4",
    borderRadius: 2,
    marginRight: 12,
  },
  statusIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(0, 184, 212, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 184, 212, 0.4)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00b8d4",
  },
  headerBottomBorder: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: "rgba(0, 184, 212, 0.2)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  titleAccentContainer: {
    position: "relative",
    marginBottom: 24,
  },
  titleAccent: {
    width: 60,
    height: 4,
    backgroundColor: "#00b8d4",
    borderRadius: 2,
  },
  titleAccentGlow: {
    position: "absolute",
    top: -2,
    left: -4,
    right: -4,
    bottom: -2,
    backgroundColor: "rgba(0, 184, 212, 0.3)",
    borderRadius: 4,
    opacity: 0.6,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 30,
    fontWeight: "600",
    color: "#00b8d4",
    textAlign: "center",
    marginBottom: 18,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
    letterSpacing: 0.2,
  },
  buttonsContainer: {
    width: "100%",
    maxWidth: 400,
  },
  mainButtonContainer: {
    marginBottom: 20,
  },
  mainButtonTouchable: {
    borderRadius: 18,
  },
  mainButton: {
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(0, 184, 212, 0.4)",
    ...Platform.select({
      ios: {
        shadowColor: "#00b8d4",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  buttonGradient: {
    paddingVertical: 22,
    paddingHorizontal: 24,
  },
  buttonGlow: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: "rgba(0, 184, 212, 0.2)",
    borderRadius: 22,
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  mainIconContainer: {
    position: "relative",
    marginRight: 18,
  },
  iconBackground: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  iconRipple: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 30,
  },
  secondaryIconContainer: {
    marginRight: 16,
  },
  secondaryIconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 184, 212, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 184, 212, 0.3)",
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    color: "white",
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  buttonSubtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  chevronContainer: {
    marginLeft: 8,
  },
  secondaryButtonContainer: {
    marginBottom: 16,
  },
  buttonTouchable: {
    borderRadius: 14,
  },
  button: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 184, 212, 0.2)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonActive: {
    borderColor: "rgba(0, 184, 212, 0.6)",
  },
  secondaryButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  secondaryButtonGlow: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    backgroundColor: "rgba(0, 184, 212, 0.15)",
    borderRadius: 16,
    opacity: 0.8,
  },
  secondaryButtonTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  secondaryButtonSubtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    letterSpacing: 0.1,
  },
  bottomAccent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  accentLine: {
    flex: 1,
  },
})

export default HomeScreen
