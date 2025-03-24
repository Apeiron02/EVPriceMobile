import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  // Remove Slider from here
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
// Add the correct import for Slider
import Slider from '@react-native-community/slider';

const ChargingCalculatorScreen = ({ navigation }) => {
  const [carModel, setCarModel] = useState('Tesla Model 3');
  const [batteryCapacity, setBatteryCapacity] = useState('60');
  const [currentChargeLevel, setCurrentChargeLevel] = useState(20);
  const [targetChargeLevel, setTargetChargeLevel] = useState(80);
  const [electricityRate, setElectricityRate] = useState('2.5');
  const [activeTab, setActiveTab] = useState('sarjBilgileri');
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Function to round to nearest 5%
  const roundToFive = (value) => {
    return Math.round(value / 5) * 5;
  };

  const handleCurrentChargeChange = (value) => {
    setCurrentChargeLevel(roundToFive(value));
  };

  const handleTargetChargeChange = (value) => {
    setTargetChargeLevel(roundToFive(value));
  };

  const calculateChargingCost = () => {
    // Convert inputs to numbers
    const capacity = parseFloat(batteryCapacity);
    const current = currentChargeLevel / 100;
    const target = targetChargeLevel / 100;
    const rate = parseFloat(electricityRate);

    // Calculate energy needed in kWh
    const energyNeeded = capacity * (target - current);
    
    // Calculate total cost
    const totalCost = energyNeeded * rate;

    setResults({
      energyNeeded: energyNeeded.toFixed(2),
      totalCost: totalCost.toFixed(2),
    });
    
    setShowResults(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2234" />
      
      {/* Header - Simplified */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#00b8d4" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Şarj Ücreti Hesaplama</Text>
        </View>
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Elektrikli Araç Şarj Ücreti Hesaplama</Text>
            <Text style={styles.subtitle}>
              Elektrikli aracınızın şarj maliyetini hesaplamak için batarya kapasitesi, 
              mevcut şarj durumu ve elektrik fiyatını kullanarak hesaplama yapabilirsiniz.
            </Text>
          </View>
          
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#00b8d4" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Elektrikli aracınızın şarj maliyetini hesaplamak için batarya kapasitesi, 
              mevcut şarj durumu ve elektrik fiyatını kullanarak hesaplama yapabilirsiniz.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Araç Modeli:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={carModel}
                  onValueChange={(itemValue) => setCarModel(itemValue)}
                  style={styles.picker}
                  dropdownIconColor="#00b8d4"
                >
                  <Picker.Item label="Tesla Model 3" value="Tesla Model 3" />
                  <Picker.Item label="Tesla Model Y" value="Tesla Model Y" />
                  <Picker.Item label="Volkswagen ID.4" value="Volkswagen ID.4" />
                  <Picker.Item label="Hyundai Kona Electric" value="Hyundai Kona Electric" />
                  <Picker.Item label="Kia EV6" value="Kia EV6" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Batarya Kapasitesi (kWh):</Text>
              <TextInput
                style={styles.input}
                value={batteryCapacity}
                onChangeText={setBatteryCapacity}
                keyboardType="numeric"
                placeholder="60"
                placeholderTextColor="#6c7a94"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Mevcut Şarj Seviyesi (%):</Text>
              <Text style={styles.sliderValue}>{currentChargeLevel}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={5}
                value={currentChargeLevel}
                onValueChange={handleCurrentChargeChange}
                minimumTrackTintColor="#00b8d4"
                maximumTrackTintColor="#2d3446"
                thumbTintColor="#00b8d4"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Hedef Şarj Seviyesi (%):</Text>
              <Text style={styles.sliderValue}>{targetChargeLevel}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={5}
                value={targetChargeLevel}
                onValueChange={handleTargetChargeChange}
                minimumTrackTintColor="#00b8d4"
                maximumTrackTintColor="#2d3446"
                thumbTintColor="#00b8d4"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Elektrik Fiyatı (TL/kWh):</Text>
              <TextInput
                style={styles.input}
                value={electricityRate}
                onChangeText={setElectricityRate}
                keyboardType="numeric"
                placeholder="2.5"
                placeholderTextColor="#6c7a94"
              />
            </View>

            <TouchableOpacity 
              style={styles.calculateButton}
              onPress={calculateChargingCost}
            >
              <Text style={styles.buttonText}>Hesapla</Text>
            </TouchableOpacity>
          </View>

          {showResults && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Hesaplama Sonucu</Text>
              
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'sarjBilgileri' && styles.activeTab]}
                  onPress={() => setActiveTab('sarjBilgileri')}
                >
                  <Text style={[styles.tabText, activeTab === 'sarjBilgileri' && styles.activeTabText]}>
                    Şarj Bilgileri
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'maliyetAnalizi' && styles.activeTab]}
                  onPress={() => setActiveTab('maliyetAnalizi')}
                >
                  <Text style={[styles.tabText, activeTab === 'maliyetAnalizi' && styles.activeTabText]}>
                    Maliyet Analizi
                  </Text>
                </TouchableOpacity>
              </View>
              
              {activeTab === 'sarjBilgileri' && (
                <View style={styles.resultBox}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Şarj Edilecek Enerji:</Text>
                    <Text style={styles.resultValue}>{results.energyNeeded} kWh</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Toplam Şarj Ücreti:</Text>
                    <Text style={styles.resultValue}>{results.totalCost} TL</Text>
                  </View>
                </View>
              )}
              
              {activeTab === 'maliyetAnalizi' && (
                <View style={styles.resultBox}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Birim Fiyat:</Text>
                    <Text style={styles.resultValue}>{electricityRate} TL/kWh</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Km Başına Maliyet:</Text>
                    <Text style={styles.resultValue}>{(parseFloat(electricityRate) * 0.18).toFixed(2)} TL/km</Text>
                  </View>
                </View>
              )}
              
              <View style={styles.chargeStatusContainer}>
                <Text style={styles.chargeStatusLabel}>Şarj Durumu</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${currentChargeLevel}%` }]} />
                  <View 
                    style={[
                      styles.progressBarTarget, 
                      { left: `${targetChargeLevel}%`, marginLeft: -10 }
                    ]} 
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabelStart}>%{currentChargeLevel} (Mevcut)</Text>
                  <Text style={styles.progressLabelEnd}>%{targetChargeLevel} (Hedef)</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2234',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1a2234',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3446',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerTitle: {
    color: '#00b8d4',
    fontSize: 20,
    fontWeight: 'bold',
  },
  // headerNav ve ilgili stiller kaldırıldı
  
  scrollView: {
    flex: 1,
    padding: 16,
  },
  titleContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a9bc',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#2d3446',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#a0a9bc',
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#2d3446',
    borderWidth: 1,
    borderColor: '#3d4559',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  pickerContainer: {
    backgroundColor: '#2d3446',
    borderWidth: 1,
    borderColor: '#3d4559',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#ffffff',
  },
  sliderValue: {
    color: '#00b8d4',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 5,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  calculateButton: {
    backgroundColor: '#00b8d4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultsContainer: {
    marginBottom: 30,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#ffffff',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#3d4559',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00b8d4',
  },
  tabText: {
    color: '#a0a9bc',
    fontSize: 16,
  },
  activeTabText: {
    color: '#00b8d4',
    fontWeight: 'bold',
  },
  resultBox: {
    backgroundColor: '#2d3446',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultLabel: {
    fontSize: 16,
    color: '#a0a9bc',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00b8d4',
  },
  chargeStatusContainer: {
    marginTop: 20,
  },
  chargeStatusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#2d3446',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00b8d4',
    borderRadius: 5,
  },
  progressBarTarget: {
    position: 'absolute',
    top: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#00b8d4',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  progressLabelStart: {
    color: '#a0a9bc',
    fontSize: 14,
  },
  progressLabelEnd: {
    color: '#a0a9bc',
    fontSize: 14,
  },
});

export default ChargingCalculatorScreen;