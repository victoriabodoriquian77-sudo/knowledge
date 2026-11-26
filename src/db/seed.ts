import { db, uid } from './database'
import { CONFIG_DEFAULT, fechaLocal } from '../lib/constants'
import type {
  Perfil,
  EstadisticasGlobales,
  Configuracion,
  ResumenDiario,
} from '../types/models'

export const perfilInicial = (nombre = ''): Perfil => ({
  id: 'perfil',
  nombre,
  xp: 0,
  monedas: 0,
  rachaActual: 0,
  mejorRacha: 0,
  ultimoDiaEstudio: '',
  objetivoDiarioXp: 60,
  objetivoDiarioTarjetas: 15,
  tema: 'claro',
  onboardingCompletado: false,
  creadoEn: Date.now(),
  logrosReclamados: [],
})

export const statsIniciales = (): EstadisticasGlobales => ({
  id: 'stats',
  respuestasCorrectas: 0,
  respuestasIncorrectas: 0,
  tarjetasEstudiadas: 0,
  sesionesCompletadas: 0,
  tiempoTotalMs: 0,
  xpHistorica: 0,
  monedasHistoricas: 0,
  rachaPerfectaMaxima: 0,
  examenesAprobados: 0,
  practicasAplicadas: 0,
  ultimaActividad: 0,
})

export const diarioVacio = (fecha = fechaLocal()): ResumenDiario => ({
  fecha,
  xp: 0,
  monedas: 0,
  tarjetas: 0,
  correctas: 0,
  incorrectas: 0,
  tiempoMs: 0,
  sesiones: 0,
  rachaMaximaDia: 0,
})

/** Inicializa filas únicas si no existen. Nunca pisa datos del usuario. */
export async function asegurarBase(): Promise<void> {
  await db.transaction('rw', [db.perfil, db.stats, db.config, db.meta], async () => {
    if (!(await db.perfil.get('perfil'))) await db.perfil.add(perfilInicial())
    if (!(await db.stats.get('stats'))) await db.stats.add(statsIniciales())
    if (!(await db.config.get('config'))) await db.config.add({ ...CONFIG_DEFAULT } as Configuracion)
    if (!(await db.meta.get('backup'))) await db.meta.add({ id: 'backup', ultimoBackup: 0 })
  })
}

/** Crea la materia Derecho con la Unidad 1 vacía, sin tarjetas inventadas. */
export async function crearMateriaDerecho(): Promise<string> {
  const materiaId = uid('mat_')
  const unidadId = uid('uni_')
  const ahora = Date.now()
  await db.transaction('rw', [db.materias, db.unidades], async () => {
    await db.materias.add({
      id: materiaId,
      nombre: 'Derecho',
      descripcion: 'Estudio del ordenamiento jurídico y sus aplicaciones.',
      color: '#7961d8',
      icono: 'scale',
      creadaEn: ahora,
      orden: 0,
    })
    await db.unidades.add({
      id: unidadId,
      materiaId,
      nombre: 'Consumidores',
      descripcion: 'Protección jurídica de las personas consumidoras.',
      orden: 0,
      creadaEn: ahora,
      metaDominio: 80,
    })
  })
  return materiaId
}
