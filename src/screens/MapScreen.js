import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import MapView, { Marker } from 'react-native-maps'; // Remove PROVIDER_GOOGLE
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const mapRef = useRef(null);
  
  // Örnek şarj istasyonları - gerçek uygulamada API'den gelecek
  const chargingStations = [
    { id: 1, title: 'Şarj İstasyonu 1', description: 'Hızlı Şarj', coordinate: { latitude: 38.6810, longitude: 39.2264 } },
    { id: 2, title: 'Şarj İstasyonu 2', description: 'Normal Şarj', coordinate: { latitude: 38.6750, longitude: 39.2200 } },
    { id: 3, title: 'Şarj İstasyonu 3', description: 'Süper Hızlı Şarj', coordinate: { latitude: 38.6780, longitude: 39.2300 } },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Arama Çubuğu */}
      <View style={styles.searchContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Arama yapın"
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity onPress={() => setSearchText('')}>
            {searchText.length > 0 && (
              <Ionicons name="close-circle" size={20} color="#666" />
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Harita */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          // Remove provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: 38.6810,
            longitude: 39.2264,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          {chargingStations.map(station => (
            <Marker
              key={station.id}
              coordinate={station.coordinate}
              title={station.title}
              description={station.description}
            >
              {/* Remove custom marker view for now */}
            </Marker>
          ))}
        </MapView>
      </View>
      
      {/* Alt Navigasyon */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton}>
          <Ionicons name="compass" size={24} color="#00b8d4" />
          <Text style={styles.navText}>Keşfet</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButton}>
          <Ionicons name="location" size={24} color="#666" />
          <Text style={styles.navText}>Konumum</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButton}>
          <Ionicons name="add-circle" size={24} color="#666" />
          <Text style={styles.navText}>Ekle</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  markerContainer: {
    backgroundColor: '#00b8d4',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: '#666',
  },
});

export default MapScreen;