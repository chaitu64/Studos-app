import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function AcademicLibraryResourceRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useEffect(() => {
    if (id) router.replace({ pathname: '/resource/[id]', params: { id: String(id) } });
  }, [id]);
  return <View style={styles.root}><ActivityIndicator color="#FF6B63" /><Text style={styles.text}>Opening study resource…</Text></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#090B0F', gap: 10 }, text: { color: '#A5ACBA', fontSize: 13 } });