import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import authService from '../api/authService';
import { reset } from '../navigation/navigationUtils';
import api from '../api/index';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userList, setUserList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Hata', 'Kullanıcı adı ve şifre gerekli');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(username, password);
      console.log('Login successful:', response);
      
      if (response && response.access) {
        console.log('Navigating to Home after successful login');
        
        reset([{ name: 'Home' }]);
      } else {
        throw new Error('Token alınamadı');
      }
    } catch (error) {
      console.error('Login Error:', error.response?.data || error.message);
      Alert.alert(
        "Giriş Başarısız",
        error.response?.data?.detail || 
        error.response?.data?.message || 
        error.message || 
        "Bir hata oluştu. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.",
        [{ text: "Tamam" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await api.get('kullanicilar/');
      if (response.data) {
        console.log('Kullanıcı listesi alındı:', response.data.length);
        setUserList(response.data);
      }
    } catch (error) {
      console.error('Kullanıcılar alınamadı:', error);
      Alert.alert(
        "Hata",
        "Kullanıcı listesi alınırken bir hata oluştu. Lütfen API bağlantınızı kontrol edin.",
        [
          { text: "İptal" },
          { 
            text: "API Testine Git", 
            onPress: () => navigation.navigate('Test', { endpoint: 'kullanicilar', autoTest: true })
          }
        ]
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  const openUserSelector = () => {
    fetchUsers();
    setShowUserModal(true);
  };

  const selectUser = (user) => {
    setUsername(user.username);
    if (user.password) {
      setPassword(user.password);
    } else {
      setPassword('testpass123');
    }
    setShowUserModal(false);
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => selectUser(item)}
    >
      <Ionicons name="person" size={24} color="#00b8d4" style={styles.userIcon} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        {item.email && <Text style={styles.userEmail}>{item.email}</Text>}
        {item.first_name && item.last_name && (
          <Text style={styles.userFullName}>{item.first_name} {item.last_name}</Text>
        )}
        {item.is_staff && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6c7a94" />
    </TouchableOpacity>
  );
  
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a2234" />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.logoContainer}>
            <Ionicons name="car-sport" size={80} color="#00b8d4" />
            <Text style={styles.appTitle}>Yol Arkadaşım</Text>
            <Text style={styles.appSubtitle}>Elektrikli Araç Uygulaması</Text>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Giriş Yap</Text>
            
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={22} color="#00b8d4" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Kullanıcı Adı"
                placeholderTextColor="#6c7a94"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.userSelector}
                onPress={openUserSelector}
                disabled={loading}
              >
                <Ionicons name="people" size={22} color="#00b8d4" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={22} color="#00b8d4" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor="#6c7a94"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={22} 
                  color="#6c7a94" 
                />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.forgotPassword}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Giriş Yap</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Hesabınız yok mu?</Text>
              <TouchableOpacity disabled={loading}>
                <Text style={styles.registerLink}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>v1.0.0 • Yol Arkadaşım</Text>
            <View style={styles.footerButtons}>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={() => navigation.navigate('Test', { endpoint: 'kullanicilar', autoTest: true })}
              >
                <Text style={styles.testButtonText}>API Bağlantı Testi</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={() => navigation.navigate('IpSelect')}
              >
                <Text style={styles.testButtonText}>Sunucu Değiştir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Kullanıcı Seçim Modalı */}
        <Modal
          visible={showUserModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowUserModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Kayıtlı Kullanıcılar</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowUserModal(false)}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {loadingUsers ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#00b8d4" />
                  <Text style={styles.loadingText}>Kullanıcılar yükleniyor...</Text>
                </View>
              ) : userList.length > 0 ? (
                <FlatList
                  data={userList}
                  renderItem={renderUserItem}
                  keyExtractor={(item, index) => (item.id?.toString() || index.toString())}
                  contentContainerStyle={styles.userList}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="alert-circle-outline" size={50} color="#a0a9bc" />
                  <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
                  <Text style={styles.emptySubText}>API bağlantınızı kontrol edin</Text>
                </View>
              )}

              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={fetchUsers}
                disabled={loadingUsers}
              >
                <Ionicons name="refresh" size={20} color="#fff" style={{marginRight: 10}} />
                <Text style={styles.refreshButtonText}>Yenile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2234',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00b8d4',
    marginTop: 10,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#a0a9bc',
    marginTop: 5,
  },
  formContainer: {
    backgroundColor: '#2d3446',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2234',
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#3d4559',
  },
  inputIcon: {
    padding: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#ffffff',
    fontSize: 16,
  },
  passwordToggle: {
    padding: 10,
  },
  userSelector: {
    padding: 10,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#00b8d4',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#00b8d4',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#00b8d480', // Adding opacity for disabled state
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    color: '#a0a9bc',
    fontSize: 14,
  },
  registerLink: {
    color: '#00b8d4',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#6c7a94',
    fontSize: 12,
    marginBottom: 10,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  testButton: {
    backgroundColor: '#2d3446',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00b8d4',
    marginTop: 5,
    marginHorizontal: 5,
  },
  testButtonText: {
    color: '#00b8d4',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Modal Stilleri
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2d3446',
    borderRadius: 10,
    width: '100%',
    maxHeight: '80%',
    padding: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a2234',
    padding: 15,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  userList: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#3d4559',
    marginVertical: 5,
    borderRadius: 8,
  },
  userIcon: {
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#a0a9bc',
    fontSize: 14,
    marginTop: 2,
  },
  userFullName: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: '#00b8d4',
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 5,
    marginTop: 2,
  },
  adminBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#a0a9bc',
    marginTop: 15,
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 15,
  },
  emptySubText: {
    color: '#a0a9bc',
    fontSize: 14,
    marginTop: 5,
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: '#00b8d4',
    marginHorizontal: 15,
    marginBottom: 15,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default LoginScreen;