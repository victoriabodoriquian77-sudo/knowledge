import type { ClasificacionSrs, Dimension, ProgresoTarjeta, Tarjeta } from '../types/models'
import { MS_DIA } from './constants'

export const DIMENSIONES: Dimension[] = ['reconocimiento', 'recuperacion', 'comprension', 'aplicacion']

export const ETIQUETA_DIMENSION: Record<Dimension, string> = {
  reconocimiento: 'Reconocimiento',
  recuperacion: 'Recuperación activa',
  comprension: 'Comprensión',
  aplicacion: 'Aplicación',
}

/** Progreso inicial de una tarjeta nunca estudiada. */
export const progresoInicial = (tarjetaId: string): ProgresoTarjeta => ({
  tarjetaId,
  intervalo: 0,
  facilidad: 2.3,
  repeticiones: 0,
  fallos: 0,
  aciertos: 0,
  proximoRepaso: 0,
  ultimoRepaso: 0,
  dominio: 0,
  precision: 0,
  dimensiones: { reconocimiento: 0, recuperacion: 0, comprension: 0, aplicacion: 0 },
  racha: 0,
  dificil: false,
  actualizadoEn: 0,
})

interface ResultadoSrs {
  progreso: ProgresoTarjeta
  intervaloDias: number
  proximoRepaso: number
}

/**
 * Motor adaptativo basado en SM-2 (SuperMemo) con correcciones propias:
 * - "otra-vez" reinicia racha y programa la tarjeta para dentro de la sesión.
 * - La facilidad baja más de lo que sube (castigo por olvido).
 * - El dominio combina intervalo, precisión histórica y amplitud de dimensiones.
 * Una tarjeta solo se considera dominada con repeticiones sostenidas en el tiempo
 * y evidencia en más de una dimensión cognitiva.
 */
export function calcularSrs(
  actual: ProgresoTarjeta,
  clasificacion: ClasificacionSrs,
  dimension: Dimension,
  correcto: boolean,
  puntaje = correcto ? 1 : 0,
): ResultadoSrs {
  const p: ProgresoTarjeta = {
    ...actual,
    dimensiones: { ...actual.dimensiones },
  }

  const calidad =
    clasificacion === 'otra-vez' ? 1 : clasificacion === 'dificil' ? 3 : clasificacion === 'bien' ? 4 : 5

  p.repeticiones = actual.repeticiones + 1
  p.ultimoRepaso = Date.now()
  p.aciertos = actual.aciertos + (correcto ? 1 : 0)
  p.fallos = actual.fallos + (correcto ? 0 : 1)
  p.racha = correcto ? actual.racha + 1 : 0

  // Facilidad: sube lento con facilidad, baja rápido con error.
  const deltaF = 0.1 - (5 - calidad) * (0.08 + (5 - calidad) * 0.02)
  p.facilidad = Math.max(1.3, Math.min(2.8, actual.facilidad + deltaF))

  let intervalo: number
  if (!correcto || clasificacion === 'otra-vez') {
    intervalo = 0
    p.repeticiones = Math.max(0, actual.repeticiones - 1)
  } else if (actual.intervalo === 0) {
    intervalo = clasificacion === 'dificil' ? 1 : 1
  } else if (actual.intervalo === 1) {
    intervalo = clasificacion === 'dificil' ? 2 : clasificacion === 'facil' ? 4 : 3
  } else {
    const factor = clasificacion === 'dificil' ? 1.25 : clasificacion === 'bien' ? p.facilidad : p.facilidad * 1.35
    intervalo = Math.min(365, Math.round(actual.intervalo * factor))
  }

  p.intervalo = intervalo
  // Con intervalo 0 se reintenta dentro de la misma sesión (10 min).
  p.proximoRepaso = intervalo === 0 ? Date.now() + 10 * 60 * 1000 : Date.now() + intervalo * MS_DIA

  const total = p.aciertos + p.fallos
  p.precision = total > 0 ? p.aciertos / total : 0

  // Dimensión: promedio móvil ponderado (la evidencia reciente pesa más).
  const previo = actual.dimensiones[dimension] ?? 0
  const aporte = Math.round(puntaje * 100)
  const nuevo = actual.repeticiones === 0 ? aporte : Math.round(previo * 0.62 + aporte * 0.38)
  p.dimensiones[dimension] = Math.max(0, Math.min(100, nuevo))

  p.dominio = calcularDominio(p)
  p.dificil = p.dominio < 45 || p.fallos > p.aciertos
  p.actualizadoEn = Date.now()

  return { progreso: p, intervaloDias: intervalo, proximoRepaso: p.proximoRepaso }
}

/**
 * Dominio 0..100. No premia un acierto aislado:
 * exige precisión, repeticiones espaciadas y cobertura de dimensiones.
 */
export function calcularDominio(p: ProgresoTarjeta): number {
  if (p.repeticiones === 0) return 0
  const precisionPts = p.precision * 42
  const repeticionesPts = Math.min(1, p.repeticiones / 5) * 16
  const intervaloPts = Math.min(1, p.intervalo / 21) * 14
  const dimensionesConEvidencia = DIMENSIONES.filter((d) => (p.dimensiones[d] ?? 0) > 0).length
  const coberturaPts = (dimensionesConEvidencia / DIMENSIONES.length) * 14
  const promedioDimensiones =
    DIMENSIONES.reduce((acc, d) => acc + (p.dimensiones[d] ?? 0), 0) / DIMENSIONES.length
  const profundidadPts = (promedioDimensiones / 100) * 14
  return Math.round(Math.max(0, Math.min(100, precisionPts + repeticionesPts + intervaloPts + coberturaPts + profundidadPts)))
}

export const estaDominada = (p?: ProgresoTarjeta): boolean =>
  !!p && p.dominio >= 80 && p.repeticiones >= 3 && p.dimensiones.recuperacion > 0

export const estaAprendiendo = (p?: ProgresoTarjeta): boolean =>
  !!p && p.repeticiones > 0 && !estaDominada(p)

export const esNueva = (p?: ProgresoTarjeta): boolean => !p || p.repeticiones === 0

/**
 * Pendiente = ya se estudió y su repaso vence hoy o antes.
 * Se compara contra el final del día y no contra el instante exacto: una
 * tarjeta fallada que vuelve en 10 minutos sigue siendo materia de hoy.
 * No se exige `repeticiones > 0` porque un error baja ese contador a 0 y,
 * aun así, la tarjeta tiene que volver a aparecer.
 */
export const pendienteHoy = (p?: ProgresoTarjeta): boolean => {
  if (!p || !p.ultimoRepaso) return false
  const finDeHoy = new Date()
  finDeHoy.setHours(23, 59, 59, 999)
  return p.proximoRepaso <= finDeHoy.getTime()
}

/** Prioridad de estudio adaptativa: vencidas, difíciles y nuevas primero. */
export function prioridadEstudio(t: Tarjeta, p?: ProgresoTarjeta): number {
  if (!p || p.repeticiones === 0) return 70
  const vencida = p.proximoRepaso <= Date.now()
  let prioridad = 100 - p.dominio * 0.6
  if (vencida) prioridad += 30 + Math.min(40, (Date.now() - p.proximoRepaso) / MS_DIA * 8)
  if (p.dificil) prioridad += 22
  if (p.fallos > 0) prioridad += Math.min(20, p.fallos * 4)
  if (t.dificultad === 'dificil') prioridad += 6
  if (t.dificultad === 'facil') prioridad -= 4
  return prioridad
}

export function estimarRepaso(p: ProgresoTarjeta): string {
  if (p.repeticiones === 0) return 'Sin estudiar'
  const diff = p.proximoRepaso - Date.now()
  if (diff <= 0) return 'Pendiente ahora'
  const dias = Math.ceil(diff / MS_DIA)
  if (dias <= 1) return 'Mañana'
  if (dias < 7) return `En ${dias} días`
  if (dias < 30) return `En ${Math.round(dias / 7)} semanas`
  return `En ${Math.round(dias / 30)} meses`
}

export const ETIQUETA_ESTADO_TARJETA = (p?: ProgresoTarjeta): { texto: string; tono: string } => {
  if (!p || p.repeticiones === 0) return { texto: 'Nueva', tono: 'bg-sky-tint text-sky' }
  if (estaDominada(p)) return { texto: 'Dominada', tono: 'bg-grass-tint text-grass' }
  if (p.dificil) return { texto: 'Reforzar', tono: 'bg-coral-tint text-coral' }
  return { texto: 'Aprendiendo', tono: 'bg-grape-tint text-grape' }
}
