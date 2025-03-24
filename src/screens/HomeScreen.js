import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2234" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yol Arkadaşım</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>Elektrikli Araç Uygulaması</Text>
        
        <TouchableOpacity 
          style={styles.mainButton}
          onPress={() => navigation.navigate('ChargingCalculator')}
        >
          <Ionicons name="flash" size={24} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Şarj Ücreti Hesaplama</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button}>
          <Ionicons name="map" size={24} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Şarj İstasyonları Haritası</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button}>
          <Ionicons name="car" size={24} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Araç Bilgilerim</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2234',
  },
  header: {
    backgroundColor: '#1a2234',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3446',
  },
  headerTitle: {
    color: '#00b8d4',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#ffffff',
    textAlign: 'center',
  },
  mainButton: {
    backgroundColor: '#00b8d4',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#2d3446',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;