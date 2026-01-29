import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/src/services/supabase';

const PANEL_WIDTH = 520;

export default function AdminHome() {
  const [cargando, setCargando] = useState(false);

  const crearAsamblea = async () => {
    setCargando(true);

    const codigo = Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase();

    const { data, error } = await supabase
      .from('asambleas')
      .insert({
        codigo_acceso: codigo,
        estado: 'ABIERTA',
      })
      .select()
      .single();

    setCargando(false);

    if (error || !data) {
      Alert.alert('Error', 'No se pudo crear la asamblea');
      return;
    }

    router.push({
      pathname: '/admin/asamblea',
      params: { asambleaId: data.id },
    });
  };

  return (
    <View style={styles.page}>
      <View style={styles.panel}>
        <Text style={styles.title}>Panel Administrador</Text>

        {/* Crear nueva asamblea */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={crearAsamblea}
          disabled={cargando}
        >
          <Text style={styles.primaryButtonText}>
            ➕ Crear nueva asamblea
          </Text>
        </TouchableOpacity>

        {/* Ver asambleas existentes */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/admin/asambleas')}
        >
          <Text style={styles.secondaryButtonText}>
            📂 Ver asambleas existentes
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },

  panel: {
    width: '100%',
    maxWidth: PANEL_WIDTH,
    paddingTop: 40,
    paddingHorizontal: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },

  primaryButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },

  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },

  secondaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
