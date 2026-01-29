import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '@/src/services/supabase';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(width * 0.35, 140);
const STROKE_WIDTH = 4;
const BUTTON_WIDTH = 260;

export default function Cronometro() {
  const { asambleaId } = useLocalSearchParams<{ asambleaId: string }>();

  const [asamblea, setAsamblea] = useState<any>(null);
  const [minutos, setMinutos] = useState(5);
  const [segundos, setSegundos] = useState(0);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [loading, setLoading] = useState(true);

  /* =======================
     CARGAR ASAMBLEA
  ======================= */
  const cargarAsamblea = async () => {
    const { data } = await supabase
      .from('asambleas')
      .select('*')
      .eq('id', asambleaId)
      .single();

    if (data) {
      setAsamblea(data);
      calcularTiempoRestante(data);
    }

    setLoading(false);
  };

  const calcularTiempoRestante = (a: any) => {
    if (a.cronometro_activo && !a.cronometro_pausado && a.cronometro_inicio) {
      const ahora = Date.now();
      const inicio = new Date(a.cronometro_inicio).getTime();
      const transcurrido = Math.floor((ahora - inicio) / 1000);
      setTiempoRestante(
        Math.max(0, a.cronometro_duracion_segundos - transcurrido)
      );
    } else if (a.cronometro_pausado) {
      setTiempoRestante(
        Math.max(
          0,
          a.cronometro_duracion_segundos - a.cronometro_tiempo_pausado
        )
      );
    } else {
      setTiempoRestante(a.cronometro_duracion_segundos || 0);
    }
  };

  /* =======================
     REALTIME
  ======================= */
  useEffect(() => {
    cargarAsamblea();

    const channel = supabase
      .channel('cronometro-asamblea')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'asambleas',
          filter: `id=eq.${asambleaId}`,
        },
        (payload) => {
          setAsamblea(payload.new);
          calcularTiempoRestante(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [asambleaId]);

  useEffect(() => {
    if (!asamblea || !asamblea.cronometro_activo || asamblea.cronometro_pausado)
      return;

    const interval = setInterval(() => {
      setTiempoRestante((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [asamblea]);

  /* =======================
     ACCIONES
  ======================= */
  const iniciarCronometro = async () => {
    const total = minutos * 60 + segundos;
    if (total <= 0) {
      Alert.alert('Error', 'Tiempo inválido');
      return;
    }

    await supabase.rpc('iniciar_cronometro_debate', {
      p_asamblea_id: asambleaId,
      p_duracion_segundos: total,
    });
  };

  const pausarCronometro = async () => {
    await supabase.rpc('pausar_cronometro', {
      p_asamblea_id: asambleaId,
    });
  };

  const reanudarCronometro = async () => {
    await supabase.rpc('reanudar_cronometro', {
      p_asamblea_id: asambleaId,
    });
  };

const detenerCronometro = async () => {
  Alert.alert(
    'Detener Cronómetro',
    '¿Finalizar el debate?',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Detener',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('detener_cronometro', {
            p_asamblea_id: asambleaId,
          });

          if (error) {
            Alert.alert('Error', 'No se pudo detener el cronómetro');
            return;
          }

          // 🔥 ESPERAMOS a que realtime actualice
          setTimeout(() => {
            router.replace({
              pathname: '/admin/asamblea',
              params: { asambleaId },
            });
          }, 500);
        },
      },
    ]
  );
};

    const mins = Math.floor(tiempoRestante / 60);
    const secs = tiempoRestante % 60;

    // ✅ ESTADOS DERIVADOS (ESTO ES CLAVE)
    const cronometroActivo =
    !!asamblea && asamblea.cronometro_activo && !asamblea.cronometro_pausado;

    const cronometroPausado =
    !!asamblea && asamblea.cronometro_activo && asamblea.cronometro_pausado;

    const cronometroDetenido =
    !!asamblea && !asamblea.cronometro_activo;

  /* =======================
     CÍRCULO
  ======================= */
  const Circulo = ({
    valor,
    max,
    label,
  }: {
    valor: number;
    max: number;
    label: string;
  }) => {
    const radius = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = max > 0 ? valor / max : 0;

    return (
      <View style={styles.circleContainer}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={radius}
            stroke="#bbf7d0"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={radius}
            stroke="#16a34a"
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            rotation="-90"
            origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.circleText}>
          <Text style={styles.circleValue}>{valor}</Text>
          <Text style={styles.circleLabel}>{label}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.estado}>
        Estado:{' '}
        {asamblea.cronometro_activo
          ? asamblea.cronometro_pausado
            ? 'PAUSADO'
            : 'ACTIVO'
          : 'DETENIDO'}
      </Text>

      {/* CÍRCULOS */}
      <View style={styles.circlesRow}>
        <Circulo valor={mins} max={60} label="MIN" />
        <Circulo valor={secs} max={59} label="SEG" />
      </View>

      {/* CONFIGURACIÓN */}
      {!asamblea.cronometro_activo && (
        <View style={styles.config}>
          <Text style={styles.configTitle}>Duración del debate</Text>

          <View style={styles.row}>
            <TouchableOpacity onPress={() => setMinutos(Math.max(0, minutos - 1))}>
              <Text style={styles.adjust}>−</Text>
            </TouchableOpacity>

            <Text style={styles.adjustValue}>{minutos} min</Text>

            <TouchableOpacity onPress={() => setMinutos(minutos + 1)}>
              <Text style={styles.adjust}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* BOTONES */}
      <View style={styles.actions}>
        {cronometroDetenido && (
        <TouchableOpacity
            style={[styles.btn, styles.start]}
            onPress={iniciarCronometro}
        >
            <Text style={styles.btnText}>Iniciar</Text>
        </TouchableOpacity>
        )}

        {cronometroActivo && !cronometroPausado && (
        <TouchableOpacity
            style={[styles.btn, styles.pause]}
            onPress={pausarCronometro}
        >
            <Text style={styles.btnText}>Pausar</Text>
        </TouchableOpacity>
        )}

        {cronometroPausado && (
        <TouchableOpacity
            style={[styles.btn, styles.start]}
            onPress={reanudarCronometro}
        >
            <Text style={styles.btnText}>Reanudar</Text>
        </TouchableOpacity>
        )}

        {cronometroActivo && (
        <TouchableOpacity
            style={[styles.btn, styles.stop]}
            onPress={detenerCronometro}
        >
            <Text style={styles.btnText}>⏹️ Detener</Text>
        </TouchableOpacity>
        )}


        {/* CONFIGURACIÓN */}
        {asamblea.cronometroDetenido && (
        <View style={styles.config}>
            <Text style={styles.configTitle}>Duración del debate</Text>

            <View style={styles.row}>
            <TouchableOpacity
                onPress={() => setMinutos(Math.max(0, minutos - 1))}
            >
                <Text style={styles.adjust}>−</Text>
            </TouchableOpacity>

            <Text style={styles.adjustValue}>{minutos} min</Text>

            <TouchableOpacity
                onPress={() => setMinutos(minutos + 1)}
            >
                <Text style={styles.adjust}>+</Text>
            </TouchableOpacity>
            </View>
        </View>
        )}
        

      </View>
    </ScrollView>
  );
}

/* =======================
   STYLES
======================= */
const styles = StyleSheet.create({
  content: {
    padding: 24,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  estado: {
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '600',
  },
  circlesRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 30,
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    position: 'absolute',
    alignItems: 'center',
  },
  circleValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#065f46',
  },
  circleLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  config: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    width: BUTTON_WIDTH,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  adjust: {
    fontSize: 28,
    color: '#16a34a',
    fontWeight: 'bold',
  },
  adjustValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  actions: {
    gap: 12,
  },
  btn: {
    width: BUTTON_WIDTH,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  start: {
    backgroundColor: '#16a34a',
  },
  pause: {
    backgroundColor: '#f59e0b',
  },
  stop: {
    backgroundColor: '#dc2626',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
