import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PatientRegistrationScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    address: '',
    riskFactor: ''
  });

  const handleSave = async () => {
    if (!formData.name || !formData.age) {
      if (Platform.OS === 'web') {
        window.alert('Validation Error: Please fill in the required fields (Name and Age).');
      } else {
        Alert.alert('Validation Error', 'Please fill in the required fields (Name and Age).');
      }
      return;
    }
    
    try {
      // 1. Get existing offline queue
      const existingStr = await AsyncStorage.getItem('@offline_patients');
      let offlineQueue = existingStr ? JSON.parse(existingStr) : [];
      
      // Get workerId stored after login
      const workerIdStr = await AsyncStorage.getItem('@current_worker_id');
      const newPatient = { ...formData, id: Date.now().toString(), workerId: workerIdStr || '' };
      offlineQueue.push(newPatient);
      
      // 2. Save locally first (Offline-First Guarantee)
      await AsyncStorage.setItem('@offline_patients', JSON.stringify(offlineQueue));
      
      // 3. Attempt network sync immediately
      try {
        const res = await fetch('https://oneasha-backend.onrender.com/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(offlineQueue)
        });
        
        if (res.ok) {
           // Success! Clear the offline queue.
           await AsyncStorage.setItem('@offline_patients', JSON.stringify([]));
           if (Platform.OS === 'web') {
             window.alert('Synced! Patient data successfully sent to the Admin Dashboard.');
             navigation.goBack();
           } else {
             Alert.alert('Synced!', 'Patient data successfully sent to the Admin Dashboard.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
           }
           return;
        }
      } catch (networkError) {
        // Silent catch: network is down. Fall back to offline message.
      }

      // 4. Fallback if network fails
      if (Platform.OS === 'web') {
        window.alert('Saved Offline. Patient details saved locally. Will sync to server when online.');
        navigation.goBack();
      } else {
        Alert.alert(
          'Saved Offline', 
          'Patient details saved locally. Will sync to server when online.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }

    } catch (e) {
      console.error('Failed to save patient', e);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ You are currently offline. Data will be saved locally on your device and synced automatically later.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Basic Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Patient Name *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Kavita Verma"
          value={formData.name}
          onChangeText={(t) => setFormData({...formData, name: t})}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Age *</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. 24"
          keyboardType="numeric"
          value={formData.age}
          onChangeText={(t) => setFormData({...formData, age: t})}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. 9876543210"
          keyboardType="phone-pad"
          value={formData.phone}
          onChangeText={(t) => setFormData({...formData, phone: t})}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Household Address / Village</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. H-402, Rampur"
          value={formData.address}
          onChangeText={(t) => setFormData({...formData, address: t})}
        />
      </View>

      <Text style={styles.sectionTitle}>Health Assessment</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Identified Risk Factors (if any)</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="e.g. Severe Anemia, High BP"
          multiline
          numberOfLines={3}
          value={formData.riskFactor}
          onChangeText={(t) => setFormData({...formData, riskFactor: t})}
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Record Offline</Text>
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
  },
  infoBox: {
    backgroundColor: '#DBEAFE', // blue-100
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6', // blue-500
  },
  infoText: {
    color: '#1E3A8A', // blue-900
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB', // gray-300
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4F46E5', // indigo-600
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    ...Platform.select({
      ios: { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
