import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/src/services/supabase';

export default function AdminAsamblea() {
  const { asambleaId } = useLocalSearchParams<{ asambleaId: string }>();

  const [asamblea, setAsamblea] = useState<any>(null);
  const [propuestas, setPropuestas] = useState<any[]>([]);
  const [propuestaAbierta, setPropuestaAbierta] = useState<any>(null);
  const [totalAsistentes, setTotalAsistentes] = useState(0);
  const [apoderadosPendientes, setApoderadosPendientes] = useState(0);
  const [tiempoRestante, setTiempoRestante] = useState('');

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

  const calcularTiempoRestante = () => {
    if (!asamblea?.hora_cierre_ingreso) {
      setTiempoRestante('');
      return;
    }

    const ahora = new Date();
    const horaCierre = new Date(asamblea.hora_cierre_ingreso);
    
    if (ahora >= horaCierre) {
      setTiempoRestante('CERRADO');
      return;
    }

    const diffMs = horaCierre.getTime() - ahora.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffSeg = Math.floor((diffMs % 60000) / 1000);
    setTiempoRestante(`ABIERTO - ${diffMin}:${diffSeg.toString().padStart(2, '0')} restantes`);
  };

  useEffect(() => {
    if (!asambleaId) return;

    // Carga inicial
    cargarTodo();

    // Suscripción a cambios en asambleas
    const asambleasSubscription = supabase
      .channel('asambleas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asambleas',
          filter: `id=eq.${asambleaId}`,
        },
        (payload) => {
          console.log('Cambio en asamblea:', payload);
          cargarTodo();
        }
      )
      .subscribe();

    // Suscripción a cambios en propuestas
    const propuestasSubscription = supabase
      .channel('propuestas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'propuestas',
          filter: `asamblea_id=eq.${asambleaId}`,
        },
        (payload) => {
          console.log('Cambio en propuestas:', payload);
          cargarTodo();
        }
      )
      .subscribe();

    // Suscripción a cambios en asistencias
    const asistenciasSubscription = supabase
      .channel('asistencias-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asistencias',
          filter: `asamblea_id=eq.${asambleaId}`,
        },
        (payload) => {
          console.log('Cambio en asistencias:', payload);
          cargarTodo();
        }
      )
      .subscribe();

    // Suscripción a cambios en votos (para actualizar propuestas)
    const votosSubscription = supabase
      .channel('votos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votos',
        },
        (payload) => {
          console.log('Cambio en votos:', payload);
          cargarTodo();
        }
      )
      .subscribe();

    // Timer para actualizar el contador de tiempo
    const timer = setInterval(() => {
      calcularTiempoRestante();
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(timer);
      supabase.removeChannel(asambleasSubscription);
      supabase.removeChannel(propuestasSubscription);
      supabase.removeChannel(asistenciasSubscription);
      supabase.removeChannel(votosSubscription);
    };
  }, [asambleaId, asamblea]);

  // Calcular tiempo restante cuando cambie la asamblea
  useEffect(() => {
    calcularTiempoRestante();
  }, [asamblea]);

  if (!asamblea) {
    return <View style={styles.center}><Text>Cargando…</Text></View>;
  }

  return (
    <LinearGradient
      colors={['#5fba8b', '#d9f3e2']}
      style={{ flex: 1 }}
    >
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
          <Text style={styles.infoText}>
            {!asamblea.hora_cierre_ingreso 
              ? 'ABIERTO' 
              : tiempoRestante || 'Calculando...'}
          </Text>

          {asamblea.hora_cierre_ingreso && tiempoRestante && tiempoRestante !== 'CERRADO' && (
            <TouchableOpacity
              style={styles.smallBtn}
              onPress={async () => {
                await supabase
                  .from('asambleas')
                  .update({ hora_cierre_ingreso: new Date().toISOString() })
                  .eq('id', asambleaId);
              }}
            >
              <Text style={styles.smallBtnText}>Cerrar ingreso ahora</Text>
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
              router.push({ pathname: '/admin/propuestas', params: { asambleaId } })
            }
          />

          <Action
            text="📋 Listado de propuestas"
            color="#2563eb"
            onPress={() =>
              router.push({ pathname: '/admin/propuestas', params: { asambleaId } })
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
            onPress={() => Alert.alert('Resultados', 'Funcionalidad en desarrollo')}
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
    </LinearGradient>
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
  infoText: { fontSize: 16, color: '#16a34a', fontWeight: '600' },

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
