import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';

type RootStackParamList = {
  MyPatients: { workerId: string; workerName: string };
};
type RouteProps = RouteProp<RootStackParamList, 'MyPatients'>;

export default function MyPatientsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { workerId, workerName } = route.params || { workerId: '', workerName: '' };
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    
    // Fetch ALL patients and filter by worker name — handles cases where
    // workerId was not correctly assigned during earlier syncs
    fetch(`https://oneasha-backend.onrender.com/api/patients`)
      .then(res => res.json())
      .then(data => {
        // Filter by workerId first, then fallback to matching by workerName
        let myPatients = data.filter((p: any) => p.workerId === workerId);
        
        if (myPatients.length === 0 && workerName) {
          // Fallback: match by worker name (case-insensitive) for pre-existing records
          myPatients = data.filter((p: any) =>
            p.worker?.name?.toLowerCase() === workerName.toLowerCase()
          );
        }
        
        setPatients(myPatients);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [workerId, workerName]));

  const statusColor = (status: string) => {
    if (status === 'Action Taken') return '#10B981';
    return '#F59E0B';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Patients</Text>
        <Text style={styles.subtitle}>Registered by {workerName}</Text>
      </View>

      {loading && <Text style={styles.emptyText}>Loading...</Text>}
      {!loading && patients.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No patients registered yet.</Text>
          <Text style={styles.emptySubText}>Use "Add Patient" to register your first patient.</Text>
        </View>
      )}

      {patients.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.patientName}>{p.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor(p.status)}22` }]}>
              <Text style={[styles.statusText, { color: statusColor(p.status) }]}>{p.status}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Age</Text>
            <Text style={styles.detailValue}>{p.age} years</Text>
          </View>
          {p.phone ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{p.phone}</Text>
            </View>
          ) : null}
          {p.address ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{p.address}</Text>
            </View>
          ) : null}
          {p.riskFactor ? (
            <View style={[styles.detailRow, { marginTop: 4 }]}>
              <Text style={styles.riskLabel}>⚠️ Risk</Text>
              <Text style={styles.riskValue}>{p.riskFactor}</Text>
            </View>
          ) : null}

          {p.interventions && p.interventions.length > 0 && (
            <View style={styles.interventionBox}>
              <Text style={styles.interventionTitle}>📋 Intervention Logged</Text>
              <Text style={styles.interventionNotes}>{p.interventions[p.interventions.length - 1].notes}</Text>
              {p.interventions[p.interventions.length - 1].followUpDate && (
                <Text style={styles.followUpDate}>
                  📅 Follow-up: {p.interventions[p.interventions.length - 1].followUpDate}
                </Text>
              )}
            </View>
          )}
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6B7280', textAlign: 'center' },
  emptySubText: { fontSize: 14, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  patientName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  detailRow: { flexDirection: 'row', marginBottom: 6 },
  detailLabel: { width: 70, fontSize: 14, color: '#9CA3AF' },
  detailValue: { flex: 1, fontSize: 14, color: '#374151' },
  riskLabel: { width: 70, fontSize: 14, color: '#EF4444', fontWeight: '600' },
  riskValue: { flex: 1, fontSize: 14, color: '#EF4444', fontWeight: '600' },
  interventionBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  interventionTitle: { fontSize: 13, fontWeight: 'bold', color: '#065F46', marginBottom: 4 },
  interventionNotes: { fontSize: 13, color: '#374151', marginBottom: 4 },
  followUpDate: { fontSize: 13, color: '#4F46E5', fontWeight: '600' },
});
