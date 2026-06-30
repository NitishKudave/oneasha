import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  Login: undefined;
  Home: { workerName?: string; workerId?: string };
  RegisterPatient: undefined;
  MyPatients: { workerId: string; workerName: string };
  Immunization: undefined;
  AntenatalCare: undefined;
  PostnatalCare: undefined;
  HealthSurvey: undefined;
  Inventory: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();
  const workerName = route.params?.workerName || 'ASHA Worker';
  const workerId = route.params?.workerId || '';

  const [pendingRecords, setPendingRecords] = useState(0);
  const [reminders, setReminders] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      // Check offline queue
      const checkQueue = async () => {
        const existingStr = await AsyncStorage.getItem('@offline_patients');
        if (existingStr) {
          const q = JSON.parse(existingStr);
          setPendingRecords(q.length);
        } else {
          setPendingRecords(0);
        }
      };
      checkQueue();

      // Fetch follow-up reminders if we have a workerId
      if (workerId) {
        fetch(`https://oneasha-backend.onrender.com/api/reminders/${workerId}`)
          .then(res => res.json())
          .then(data => setReminders(Array.isArray(data) ? data : []))
          .catch(() => {});
      }
    }, [workerId])
  );

  const handleManualSync = async () => {
    const existingStr = await AsyncStorage.getItem('@offline_patients');
    if (!existingStr) return;
    try {
      const offlineQueue = JSON.parse(existingStr);
      if (offlineQueue.length === 0) return;
      
      const queueWithWorker = offlineQueue.map((p: any) => ({ ...p, workerId }));
      const res = await fetch('https://oneasha-backend.onrender.com/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queueWithWorker)
      });
      if (res.ok) {
        await AsyncStorage.setItem('@offline_patients', JSON.stringify([]));
        setPendingRecords(0);
        if (Platform.OS === 'web') window.alert('All records synced to Admin Dashboard!');
      }
    } catch (e) {
      if (Platform.OS === 'web') window.alert('Still offline. Try again when connected.');
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
          style={{ marginRight: 15, padding: 5 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Logout</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const quickActions = [
    { icon: '📝', label: 'Add Patient', screen: 'RegisterPatient', params: undefined },
    { icon: '👩‍⚕️', label: 'My Patients', screen: 'MyPatients', params: { workerId, workerName } },
    { icon: '💉', label: 'Immunization', screen: 'Immunization', params: undefined },
    { icon: '🤰', label: 'Antenatal Care', screen: 'AntenatalCare', params: undefined },
    { icon: '👶', label: 'Postnatal Care', screen: 'PostnatalCare', params: undefined },
    { icon: '📋', label: 'Health Survey', screen: 'HealthSurvey', params: undefined },
    { icon: '💊', label: 'Inventory', screen: 'Inventory', params: undefined },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Namaste, {workerName} 👋</Text>
        <Text style={styles.village}>Assigned: Rampur Village</Text>
      </View>

      {/* Sync Status Card */}
      <View style={styles.syncCard}>
        <View style={styles.syncHeader}>
          <Text style={styles.syncTitle}>Cloud Sync Status</Text>
          <View style={pendingRecords === 0 ? styles.badgeSuccess : styles.badgeWarning}>
            <Text style={pendingRecords === 0 ? styles.badgeText : styles.badgeTextWarning}>
              {pendingRecords === 0 ? '✓ Synced' : '⚠ Offline Mode'}
            </Text>
          </View>
        </View>
        <Text style={styles.syncText}>Records pending: {pendingRecords}</Text>
        {pendingRecords > 0 && (
          <TouchableOpacity style={styles.syncBtn} onPress={handleManualSync}>
            <Text style={styles.syncBtnText}>⬆ Sync {pendingRecords} Record(s) Now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionCard}
            onPress={() => navigation.navigate(action.screen as any, action.params as any)}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Today's Follow-ups */}
      <Text style={styles.sectionTitle}>
        Today's Follow-ups {reminders.length > 0 && `(${reminders.length} Scheduled)`}
      </Text>

      {reminders.length === 0 ? (
        <View style={styles.emptyFollowUp}>
          <Text style={styles.emptyText}>✅ No scheduled follow-ups today.</Text>
        </View>
      ) : (
        reminders.map((reminder, i) => (
          <View key={i} style={styles.taskCard}>
            <View style={styles.taskRow}>
              <Text style={styles.taskIcon}>🔴</Text>
              <View>
                <Text style={styles.taskName}>{reminder.patient?.name || 'Patient'}</Text>
                <Text style={styles.taskSubtext}>
                  Follow-up scheduled: {reminder.followUpDate}
                </Text>
                {reminder.notes ? (
                  <Text style={styles.taskNotes}>Doctor's note: {reminder.notes}</Text>
                ) : null}
              </View>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  village: { fontSize: 14, color: '#6B7280', marginTop: 4 },

  syncCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  syncHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  syncTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  syncText: { color: '#6B7280', fontSize: 14 },
  syncBtn: { marginTop: 12, backgroundColor: '#4F46E5', padding: 10, borderRadius: 8, alignItems: 'center' },
  syncBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  badgeSuccess: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#065F46', fontSize: 12, fontWeight: 'bold' },
  badgeWarning: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTextWarning: { color: '#92400E', fontSize: 12, fontWeight: 'bold' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionIcon: { fontSize: 30, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center' },

  emptyFollowUp: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: { color: '#6B7280', fontSize: 14 },

  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start' },
  taskIcon: { fontSize: 20, marginRight: 12, marginTop: 2 },
  taskName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  taskSubtext: { fontSize: 13, color: '#4F46E5', marginTop: 4, fontWeight: '600' },
  taskNotes: { fontSize: 12, color: '#6B7280', marginTop: 4 },
});
