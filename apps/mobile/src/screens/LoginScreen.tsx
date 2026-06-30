import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  Login: undefined;
  Home: { workerName: string; workerId: string };
};
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  const handleLogin = async () => {
    if (phone.length < 10) {
      if (Platform.OS === 'web') window.alert('Please enter a valid 10-digit phone number.');
      return;
    }
    
    try {
      const res = await fetch('https://oneasha-backend.onrender.com/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password: pin })
      });
      
      if (!res.ok) {
        if (Platform.OS === 'web') window.alert('Invalid phone number or PIN. Please try again.');
        return;
      }
      
      const user = await res.json();
      // Persist workerId locally so all screens can use it
      await AsyncStorage.setItem('@current_worker_id', user.id);
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home', params: { workerName: user.name, workerId: user.id } }],
      });
    } catch (err) {
      if (Platform.OS === 'web') window.alert('Network error. Make sure you are online to login for the first time.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>+ OneASHA</Text>
          <Text style={styles.subtitle}>Field Worker Portal</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Registered Phone Number</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. 9876543210"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={10}
          />

          <Text style={styles.label}>4-Digit PIN</Text>
          <TextInput 
            style={styles.input}
            placeholder="••••"
            keyboardType="numeric"
            secureTextEntry
            value={pin}
            onChangeText={setPin}
            maxLength={4}
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Secure Login</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.footerText}>Offline mode is automatically enabled after first login.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4F46E5', // Indigo-600 background for branding
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF', // Indigo-100
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    color: '#1F2937',
  },
  loginButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerText: {
    textAlign: 'center',
    color: '#E0E7FF',
    marginTop: 32,
    fontSize: 12,
  }
});
