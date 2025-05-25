import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Şarj sağlayıcı kartı bileşeni
const ProviderCard = ({ 
  provider, 
  priceOptions, 
  isSelected, 
  onSelect, 
  onChargeTypeSelect,
  selectedChargeType,
  lastUpdated,
  isLoading
}) => {
  // Şarj tipi seçimi için state
  const [expanded, setExpanded] = useState(false);
  
  // Animasyon değeri
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  
  // Seçildiğinde veya seçim kaldırıldığında animasyon
  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: isSelected ? 1.05 : 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected]);

  // Şarj tipine göre seçim yap
  const handleChargeTypeSelect = (chargeType) => {
    onChargeTypeSelect(provider, chargeType);
    setExpanded(false);
  };

  // Kartı genişletme/daraltma
  const toggleExpand = () => {
    if (isSelected) {
      setExpanded(!expanded);
    } else {
      onSelect(provider);
    }
  };

  return (
    <Animated.View style={[
      styles.container,
      isSelected && {
        borderColor: provider.primaryColor, 
        borderWidth: 2,
        shadowColor: provider.primaryColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
      },
      { transform: [{ scale: scaleAnim }] }
    ]}>
      <TouchableOpacity
        style={styles.card}
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        {/* Logo ve Sağlayıcı Adı */}
        <View style={styles.header}>
          {provider.logo ? (
            <Image 
              source={provider.logo}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: provider.primaryColor }]}>
              <Text style={styles.logoPlaceholderText}>
                {provider.name.charAt(0)}
              </Text>
            </View>
          )}
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{provider.name}</Text>
            {lastUpdated && (
              <Text style={styles.updateTime}>
                Son güncelleme: {lastUpdated}
              </Text>
            )}
          </View>
          {isSelected && (
            <View style={[styles.checkmarkBadge, { backgroundColor: provider.primaryColor }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          )}
        </View>
        
        {/* Fiyat Bilgisi */}
        <View style={styles.priceContainer}>
          {isLoading ? (
            <Text style={styles.priceLoading}>Yükleniyor...</Text>
          ) : !priceOptions || priceOptions.length === 0 ? (
            <Text style={styles.priceError}>Fiyat bilgisi bulunamadı</Text>
          ) : selectedChargeType ? (
            <View>
              <Text style={styles.priceSelected}>
                {selectedChargeType.priceValue} TL/kWh
              </Text>
              <Text style={styles.chargeTypeLabel}>
                {selectedChargeType.chargeType}
              </Text>
              {isSelected && (
                <TouchableOpacity 
                  style={styles.changeButton}
                  onPress={() => setExpanded(!expanded)}
                >
                  <Text style={styles.changeButtonText}>Değiştir</Text>
                  <Ionicons 
                    name={expanded ? "chevron-up" : "chevron-down"} 
                    size={14} 
                    color={provider.primaryColor} 
                  />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.selectButton, { borderColor: provider.primaryColor }]}
              onPress={() => setExpanded(true)}
            >
              <Text style={[styles.selectButtonText, { color: provider.primaryColor }]}>
                Şarj Tipi Seç
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Şarj Tipi Seçimi */}
        {expanded && isSelected && priceOptions && priceOptions.length > 0 && (
          <View style={styles.chargeTypeContainer}>
            <FlatList
              data={priceOptions}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.chargeTypeItem,
                    selectedChargeType && selectedChargeType.id === item.id && {
                      backgroundColor: provider.primaryColor + '30', // 30% opacity
                      borderColor: provider.primaryColor,
                    }
                  ]}
                  onPress={() => handleChargeTypeSelect(item)}
                >
                  <View style={styles.chargeTypeContent}>
                    <Text style={styles.chargeTypeName}>{item.chargeType}</Text>
                    <Text style={styles.chargeTypePrice}>{item.priceValue} TL/kWh</Text>
                  </View>
                  {selectedChargeType && selectedChargeType.id === item.id && (
                    <Ionicons name="checkmark-circle" size={18} color={provider.primaryColor} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.chargeTypeList}
            />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#3d4559',
    backgroundColor: '#2d3446',
    overflow: 'hidden',
  },
  card: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3d4559',
  },
  logoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  nameContainer: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  updateTime: {
    fontSize: 10,
    color: '#a0a9bc',
    marginTop: 2,
  },
  checkmarkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#1a2234',
    borderRadius: 8,
    alignItems: 'center',
  },
  priceSelected: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00b8d4',
    textAlign: 'center',
  },
  priceLoading: {
    fontSize: 14,
    color: '#a0a9bc',
  },
  priceError: {
    fontSize: 14,
    color: '#ff5252',
  },
  chargeTypeLabel: {
    fontSize: 12,
    color: '#a0a9bc',
    textAlign: 'center',
    marginTop: 4,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    padding: 4,
  },
  changeButtonText: {
    fontSize: 12,
    color: '#00b8d4',
    marginRight: 4,
  },
  selectButton: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chargeTypeContainer: {
    marginTop: 8,
  },
  chargeTypeList: {
    maxHeight: 150,
  },
  chargeTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#3d4559',
    borderRadius: 6,
    marginVertical: 4,
    backgroundColor: '#1a2234',
  },
  chargeTypeContent: {
    flex: 1,
  },
  chargeTypeName: {
    fontSize: 12,
    color: '#ffffff',
  },
  chargeTypePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00b8d4',
    marginTop: 2,
  },
});

export default ProviderCard;