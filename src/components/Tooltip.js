import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TouchableWithoutFeedback 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Tooltip = ({ text, position = 'bottom', iconColor = '#00b8d4' }) => {
  const [visible, setVisible] = useState(false);

  // Tooltip'i göster/gizle
  const toggleTooltip = () => {
    setVisible(!visible);
  };

  // Tooltip'i kapat
  const hideTooltip = () => {
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleTooltip} style={styles.iconButton}>
        <Ionicons name="information-circle-outline" size={20} color={iconColor} />
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={visible}
        animationType="fade"
        onRequestClose={hideTooltip}
      >
        <TouchableWithoutFeedback onPress={hideTooltip}>
          <View style={styles.modalOverlay}>
            <View style={[
              styles.tooltipContainer,
              position === 'top' && styles.tooltipTop,
              position === 'bottom' && styles.tooltipBottom,
              position === 'left' && styles.tooltipLeft,
              position === 'right' && styles.tooltipRight,
            ]}>
              <Text style={styles.tooltipText}>{text}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={hideTooltip}
              >
                <Ionicons name="close" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  iconButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipContainer: {
    backgroundColor: '#2d3446',
    borderRadius: 8,
    padding: 16,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: '#00b8d4',
    position: 'relative',
  },
  tooltipTop: {
    marginBottom: 20,
  },
  tooltipBottom: {
    marginTop: 20,
  },
  tooltipLeft: {
    marginRight: 20,
  },
  tooltipRight: {
    marginLeft: 20,
  },
  tooltipText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default Tooltip;