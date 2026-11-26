import Dexie, { type Table } from 'dexie'
import type {
  Materia,
  Unidad,
  Subtema,
  Tarjeta,
  ProgresoTarjeta,
  Sesion,
  EstadoJuego,
  LogroDesbloqueado,
  ProgresoMision,
  Perfil,
  EstadisticasGlobales,
  ResumenDiario,
  Configuracion,
  BackupMeta,
} from '../types/models'

/**
 * Base de datos local de KNOWLEDGE.
 * Todo vive en IndexedDB: no hay backend ni cuenta.
 */
export class KnowledgeDB extends Dexie {
  materias!: Table<Materia, string>
  unidades!: Table<Unidad, string>
  subtemas!: Table<Subtema, string>
  tarjetas!: Table<Tarjeta, string>
  progreso!: Table<ProgresoTarjeta, string>
  sesiones!: Table<Sesion, string>
  juegos!: Table<EstadoJuego, string>
  logros!: Table<LogroDesbloqueado, string>
  misiones!: Table<ProgresoMision, string>
  perfil!: Table<Perfil, string>
  stats!: Table<EstadisticasGlobales, string>
  diario!: Table<ResumenDiario, string>
  config!: Table<Configuracion, string>
  meta!: Table<BackupMeta, string>

  constructor() {
    super('knowledge')
    this.version(1).stores({
      materias: 'id, nombre, orden, archivada',
      unidades: 'id, materiaId, orden',
      subtemas: 'id, unidadId, materiaId, orden',
      tarjetas: 'id, materiaId, unidadId, subtemaId, favorita, dificultad, creadaEn',
      progreso: 'tarjetaId, proximoRepaso, dificil, dominio',
      sesiones: 'id, tipo, iniciadaEn, finalizadaEn, materiaId',
      juegos: 'id, mejorPuntaje',
      logros: 'logroId, desbloqueadoEn',
      misiones: 'id, fecha, misionId',
      perfil: 'id',
      stats: 'id',
      diario: 'fecha',
      config: 'id',
      meta: 'id',
    })
  }
}

export const db = new KnowledgeDB()

export const uid = (prefijo = ''): string =>
  prefijo + Date.now().toString(36) + Math.random().toString(36).slice(2, 9)

export const TABLAS = [
  'materias',
  'unidades',
  'subtemas',
  'tarjetas',
  'progreso',
  'sesiones',
  'juegos',
  'logros',
  'misiones',
  'perfil',
  'stats',
  'diario',
  'config',
  'meta',
] as const
