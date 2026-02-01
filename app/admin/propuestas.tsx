import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/src/services/supabase';

type Propuesta = {
  id: string;
  titulo: string;
  descripcion: string;
  estado: string;
  orden: number;
  votos_si: number;
  votos_no: number;
  total_votos: number;
};

export default function PropuestasScreen() {
  const { asambleaId, modo } = useLocalSearchParams<{ 
    asambleaId: string;
    modo?: string;
  }>();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [cargando, setCargando] = useState(true);

  const modoCrear = modo === 'crear';

  // Cargar propuestas
  useEffect(() => {
    if (!modoCrear) {
      cargarPropuestas();
    }
  }, [asambleaId, modoCrear]);

  const cargarPropuestas = async () => {
    setCargando(true);
    const { data } = await supabase
      .from('propuestas')
      .select('*')
      .eq('asamblea_id', asambleaId)
      .order('orden', { ascending: true });

    if (data) {
      setPropuestas(data);
    }
    setCargando(false);
  };

  const guardarPropuesta = async () => {
    if (!titulo.trim()) {
      Alert.alert('Error', 'Debes ingresar un título para la propuesta');
      return;
    }

    setGuardando(true);

    // Obtener el siguiente número de orden
    const { data: propuestasExistentes } = await supabase
      .from('propuestas')
      .select('orden')
      .eq('asamblea_id', asambleaId)
      .order('orden', { ascending: false })
      .limit(1);

    const siguienteOrden = propuestasExistentes && propuestasExistentes.length > 0
      ? propuestasExistentes[0].orden + 1
      : 1;

    // Insertar la propuesta
    const { data, error } = await supabase
      .from('propuestas')
      .insert({
        asamblea_id: asambleaId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        estado: 'BORRADOR',
        orden: siguienteOrden,
      })
      .select()
      .single();

    setGuardando(false);

    if (error || !data) {
      Alert.alert('Error', 'No se pudo guardar la propuesta');
      console.error('Error al guardar propuesta:', error);
      return;
    }

    // Limpiar campos
    setTitulo('');
    setDescripcion('');

    // Mostrar alerta
    Alert.alert('✅ ¡Excelente!', 'Su propuesta fue creada correctamente');
    
    // Redirigir después de un breve momento para que se vea la alerta
    setTimeout(() => {
      router.push({
        pathname: '/admin/propuestas',
        params: { asambleaId }
      });
    }, 100);
  };

  return (
    <LinearGradient
      colors={['#5fba8b', '#d9f3e2']}
      style={styles.container}
    >
      {modoCrear ? (
        // MODO CREAR PROPUESTA
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              {/* Botón de volver */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.push({
                  pathname: '/admin/propuestas',
                  params: { asambleaId }
                })}
              >
                <Text style={styles.backButtonText}>← Volver al listado</Text>
              </TouchableOpacity>

              <Text style={styles.title}>Crear Propuesta</Text>

              {/* Campo Propuesta (Título) */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Propuesta *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Aprobación del presupuesto 2026"
                  value={titulo}
                  onChangeText={setTitulo}
                  maxLength={500}
                  multiline
                />
                <Text style={styles.charCount}>{titulo.length}/500</Text>
              </View>

              {/* Campo Descripción */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Descripción de la propuesta</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Detalla la propuesta y sus implicaciones..."
                  value={descripcion}
                  onChangeText={setDescripcion}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Botón Guardar */}
              <TouchableOpacity
                style={[styles.saveButton, guardando && styles.saveButtonDisabled]}
                onPress={guardarPropuesta}
                disabled={guardando}
              >
                <Text style={styles.saveButtonText}>
                  {guardando ? 'Guardando...' : '💾 Guardar propuesta'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.hint}>
                * La propuesta se guardará como borrador y podrás abrirla cuando lo desees.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        // MODO LISTADO
        <View style={styles.container}>
          <View style={styles.listHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push({
                pathname: '/admin/asamblea',
                params: { asambleaId }
              })}
            >
              <Text style={styles.backButtonText}>← Volver</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Propuestas</Text>

            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push({
                pathname: '/admin/propuestas',
                params: { asambleaId, modo: 'crear' }
              })}
            >
              <Text style={styles.createButtonText}>➕ Nueva</Text>
            </TouchableOpacity>
          </View>

          {cargando ? (
            <View style={styles.centerContent}>
              <Text style={styles.loadingText}>Cargando propuestas...</Text>
            </View>
          ) : propuestas.length === 0 ? (
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>No hay propuestas creadas</Text>
              <Text style={styles.emptySubtext}>Presiona "➕ Nueva" para crear una</Text>
            </View>
          ) : (
            <FlatList
              data={propuestas}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item, index }) => (
                <View style={styles.propuestaCard}>
                  <View style={styles.propuestaHeader}>
                    <Text style={styles.propuestaNumero}>#{item.orden}</Text>
                    <View style={[
                      styles.estadoBadge,
                      item.estado === 'ABIERTA' && styles.estadoAbierta,
                      item.estado === 'CERRADA' && styles.estadoCerrada,
                    ]}>
                      <Text style={styles.estadoText}>{item.estado}</Text>
                    </View>
                  </View>

                  <Text style={styles.propuestaTitulo}>{item.titulo}</Text>
                  
                  {item.descripcion && (
                    <Text style={styles.propuestaDescripcion} numberOfLines={2}>
                      {item.descripcion}
                    </Text>
                  )}

                  {item.total_votos > 0 && (
                    <View style={styles.votosContainer}>
                      <Text style={styles.votosText}>
                        ✅ {item.votos_si} | ❌ {item.votos_no} | Total: {item.total_votos}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            />
          )}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },

  backButtonText: {
    fontSize: 15,
    color: '#065f46',
    fontWeight: '600',
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 24,
    textAlign: 'center',
  },

  fieldContainer: {
    marginBottom: 20,
  },

  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    color: '#111827',
  },

  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },

  charCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },

  saveButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  hint: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Estilos del listado
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
  },

  createButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  loadingText: {
    fontSize: 16,
    color: '#065f46',
    fontWeight: '500',
  },

  emptyText: {
    fontSize: 18,
    color: '#065f46',
    fontWeight: '600',
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
  },

  listContent: {
    padding: 20,
    paddingTop: 0,
  },

  propuestaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  propuestaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  propuestaNumero: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065f46',
  },

  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },

  estadoAbierta: {
    backgroundColor: '#bbf7d0',
  },

  estadoCerrada: {
    backgroundColor: '#fecaca',
  },

  estadoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },

  propuestaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },

  propuestaDescripcion: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },

  votosContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },

  votosText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
});
