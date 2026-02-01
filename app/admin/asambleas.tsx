import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '@/src/services/supabase';

type Asamblea = {
  id: string;
  codigo_acceso: string;
  estado: string;
};

const PANEL_WIDTH = 520;

export default function AsambleasList() {
  const [asambleas, setAsambleas] = useState<Asamblea[]>([]);

  const cargarAsambleas = async () => {
    const { data } = await supabase
      .from('asambleas')
      .select('id, codigo_acceso, estado')
      .order('created_at', { ascending: false });

    if (data) setAsambleas(data);
  };

  useEffect(() => {
    cargarAsambleas();
  }, []);

  return (
    <LinearGradient
      colors={['#5fba8b', '#d9f3e2']}
      style={styles.page}
    >
      <View style={styles.panel}>
        <Text style={styles.title}>Asambleas existentes</Text>

        <FlatList
          data={asambleas}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/admin/asamblea',
                  params: { asambleaId: item.id },
                })
              }
            >
              <Text style={styles.cardTitle}>
                Código: {item.codigo_acceso}
              </Text>
              <Text style={styles.cardText}>
                Estado: {item.estado}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
  },

  panel: {
    width: '100%',
    maxWidth: PANEL_WIDTH,
    paddingTop: 32,
    paddingHorizontal: 16,
    flex: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },

  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderLeftWidth: 5,
    borderLeftColor: '#16a34a',
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
  },

  cardText: {
    fontSize: 14,
    color: '#374151',
  },
});
