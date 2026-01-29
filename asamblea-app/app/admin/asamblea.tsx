import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/src/services/supabase';

export default function AdminAsamblea() {
  const { asambleaId } = useLocalSearchParams<{ asambleaId: string }>();

  const [asamblea, setAsamblea] = useState<any>(null);
  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [propuestaAbierta, setPropuestaAbierta] = useState<any>(null);
  const [totalAsistentes, setTotalAsistentes] = useState(0);
  const [apoderadosPendientes, setApoderadosPendientes] = useState(0);

  const cargarTodo = async () => {
    if (!asambleaId) return;

    const { data: a } = await supabase
      .from('asambleas')
      .select('*')
      .eq('id', asambleaId)
      .single();

    setAsamblea(a);

    const { data: props } = await supabase
      .from('propuestas')
      .select('*')
      .eq('asamblea_id', asambleaId)
      .order('orden');

    setPropuestas(props || []);
    setPropuestaAbierta(props?.find(p => p.estado === 'ABIERTA') || null);

    const { data: asistencias } = await supabase
      .from('asistencias')
      .select('*')
      .eq('asamblea_id', asambleaId);

    let total = 0;
    let pendientes = 0;

    (asistencias || []).forEach(a => {
      total += 1;
      if (a.es_apoderado) {
        if (a.estado_apoderado === 'APROBADO') total += 1;
        if (a.estado_apoderado === 'PENDIENTE') pendientes += 1;
      }
    });

    setTotalAsistentes(total);
    setApoderadosPendientes(pendientes);
  };

  useEffect(() => {
    cargarTodo();
    const i = setInterval(cargarTodo, 3000);
    return () => clearInterval(i);
  }, [asambleaId]);

  if (!asamblea) {
    return <View style={styles.center}><Text>Cargando…</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.container}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.label}>Código de acceso</Text>
          <Text style={styles.codigo}>{asamblea.codigo_acceso}</Text>
        </View>

        {/* TIEMPO DE INGRESO */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>⏱️ Tiempo de ingreso</Text>
          <Text>
            {asamblea.hora_cierre_ingreso
              ? 'CERRADO'
              : 'ABIERTO'}
          </Text>

          {!asamblea.hora_cierre_ingreso && (
            <TouchableOpacity
              style={styles.smallBtn}
              onPress={async () => {
                await supabase
                  .from('asambleas')
                  .update({ hora_cierre_ingreso: new Date().toISOString() })
                  .eq('id', asambleaId);
                cargarTodo();
              }}
            >
              <Text style={styles.smallBtnText}>Cerrar ingreso</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ESTADÍSTICAS */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalAsistentes}</Text>
            <Text>Asistentes</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{propuestas.length}</Text>
            <Text>Propuestas</Text>
          </View>
        </View>

        {/* ESTADO CENTRAL */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            📊 Estado: {asamblea.estado_actual || 'ESPERA'}
          </Text>

      <TouchableOpacity
        style={styles.orangeBtn}
        onPress={() =>
          router.push({
            pathname: '/admin/cronometro',
            params: { asambleaId },
          })
        }
      >
        <Text style={styles.btnText}>💬 Iniciar debate</Text>
      </TouchableOpacity>

          <TouchableOpacity
            style={styles.grayBtn}
            onPress={async () => {
              await supabase.rpc('regresar_a_espera', {
                p_asamblea_id: asambleaId,
              });
              cargarTodo();
            }}
          >
            <Text style={styles.btnText}>⏸️ Regresar a espera</Text>
          </TouchableOpacity>

          {propuestaAbierta && (
            <TouchableOpacity
              style={styles.purpleBtn}
              onPress={async () => {
                await supabase.rpc('cerrar_votacion', {
                  p_asamblea_id: asambleaId,
                });
                cargarTodo();
              }}
            >
              <Text style={styles.btnText}>📊 Cerrar votación</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ACCIONES */}
        <View style={styles.actions}>
          <Action
            text="➕ Crear propuesta"
            color="#16a34a"
            onPress={() =>
              router.push({ pathname: '/admin/crear-propuesta', params: { asambleaId } })
            }
          />

          <Action
            text="📋 Listado de propuestas"
            color="#2563eb"
            onPress={() =>
              router.push({ pathname: '/admin/listado-propuestas', params: { asambleaId } })
            }
          />

          <Action
            text={`👥 Apoderados pendientes (${apoderadosPendientes})`}
            color="#0ea5a4"
            onPress={() =>
              router.push({ pathname: '/admin/apoderados', params: { asambleaId } })
            }
          />

          <Action
            text="📊 Ver resultados"
            color="#10b981"
            onPress={() =>
              router.push({ pathname: '/admin/resultados', params: { asambleaId } })
            }
          />

          <Action
            text="📥 Descargar acta"
            color="#6366f1"
            onPress={() => Alert.alert('PDF', 'Aquí va el PDF')}
          />

          <Action
            text="🔴 Cerrar asamblea"
            color="#dc2626"
            onPress={() => router.back()}
          />
        </View>

      </View>
    </ScrollView>
  );
}

function Action({ text, color, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.btnText}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  page: { paddingVertical: 24, alignItems: 'center' },
  container: { maxWidth: 420, width: '100%', paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { alignItems: 'center', marginBottom: 20 },
  label: { color: '#64748b' },
  codigo: { fontSize: 34, fontWeight: 'bold', letterSpacing: 6, color: '#16a34a' },

  infoBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoTitle: { fontWeight: 'bold', marginBottom: 8 },

  stats: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: 'bold' },

  actions: { gap: 12 },

  actionBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  btnText: { color: '#fff', fontWeight: '600' },

  smallBtn: {
    marginTop: 8,
    backgroundColor: '#ef4444',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  smallBtnText: { color: '#fff' },

  orangeBtn: { backgroundColor: '#f59e0b', padding: 14, borderRadius: 10, marginTop: 8 },
  redBtn: { backgroundColor: '#ef4444', padding: 14, borderRadius: 10, marginTop: 8 },
  grayBtn: { backgroundColor: '#64748b', padding: 14, borderRadius: 10, marginTop: 8 },
  purpleBtn: { backgroundColor: '#8b5cf6', padding: 14, borderRadius: 10, marginTop: 8 },
});
