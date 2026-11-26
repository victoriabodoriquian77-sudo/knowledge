import type { Ejercicio } from '../../lib/quiz'
import {
  generarCasoPractico,
  generarCompletar,
  generarDetectarError,
  generarEscrita,
  generarExplicar,
  generarMultiple,
  generarOrdenar,
  generarRelacionar,
  generarVerdaderoFalso,
  puedeOrdenar,
} from '../../lib/quiz'
import { prioridadEstudio } from '../../lib/srs'
import type { ProgresoTarjeta, Tarjeta, TipoActividad } from '../../types/models'
import { pendienteHoy } from '../../lib/srs'

const mezclar = <T,>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function ordenarPorPrioridad(tarjetas: Tarjeta[], progresos: Map<string, ProgresoTarjeta>): Tarjeta[] {
  return [...tarjetas].sort((a, b) => prioridadEstudio(b, progresos.get(b.id)) - prioridadEstudio(a, progresos.get(a.id)))
}

/** Tarjetas pendientes de repaso hoy, más difíciles primero. */
export function tarjetasPendientes(tarjetas: Tarjeta[], progresos: Map<string, ProgresoTarjeta>): Tarjeta[] {
  return ordenarPorPrioridad(
    tarjetas.filter((t) => pendienteHoy(progresos.get(t.id))),
    progresos,
  )
}

export interface OpcionesGeneracion {
  tipo: TipoActividad
  tarjetas: Tarjeta[]
  pool: Tarjeta[]
  progresos: Map<string, ProgresoTarjeta>
  cantidad: number
  /** Modo examen: mezcla tipos de pregunta. */
  mezclarTipos?: boolean
  /** Tipos permitidos en examen. */
  tiposExamen?: TipoActividad[]
  /** Tarjetas de repaso: respeta el orden de vencimiento. */
  modoRepaso?: boolean
}

/**
 * Genera la secuencia de ejercicios de una actividad.
 * Reglas:
 * - Nunca repite la misma tarjeta dos veces seguidas si hay alternativas.
 * - En repaso espaciado prioriza vencidas y difíciles.
 * - En examen mezcla tipos de pregunta para medir dimensiones distintas.
 */
export function generarEjercicios(opts: OpcionesGeneracion): { ejercicios: Ejercicio[]; tarjetas: Tarjeta[] } {
  const { tipo, progresos, cantidad, mezclarTipos, tiposExamen, modoRepaso } = opts
  let seleccion = modoRepaso ? tarjetasPendientes(opts.tarjetas, progresos) : ordenarPorPrioridad(opts.tarjetas, progresos)
  if (modoRepaso && seleccion.length === 0) seleccion = ordenarPorPrioridad(opts.tarjetas, progresos)
  const pool = opts.pool.length ? opts.pool : opts.tarjetas

  const limite = Math.min(cantidad, seleccion.length)
  const base = seleccion.slice(0, limite)

  if (tipo === 'relacionar') {
    // Relacionar trabaja en bloques de hasta 4 conceptos.
    const ejercicios: Ejercicio[] = []
    for (let i = 0; i < base.length; i += 4) {
      const bloque = base.slice(i, i + 4)
      if (bloque.length >= 2) ejercicios.push(generarRelacionar(bloque, 4))
    }
    return { ejercicios, tarjetas: base }
  }

  const construidos: Ejercicio[] = []
  base.forEach((t, i) => {
    let tipoEfectivo: TipoActividad = tipo
    if (mezclarTipos) {
      const disponibles = (tiposExamen && tiposExamen.length ? tiposExamen : (['multiple', 'verdadero-falso', 'completar', 'escrita', 'relacionar', 'detectar-error', 'caso-practico'] as TipoActividad[])).filter(
        (x) => x !== 'ordenar' || puedeOrdenar(t),
      )
      tipoEfectivo = disponibles[i % disponibles.length]
    }
    construidos.push(construir(tipoEfectivo, t, pool, i))
  })
  return { ejercicios: construidos, tarjetas: base }
}

function construir(tipo: TipoActividad, t: Tarjeta, pool: Tarjeta[], i: number): Ejercicio {
  switch (tipo) {
    case 'multiple':
      return generarMultiple(t, pool)
    case 'verdadero-falso':
      return generarVerdaderoFalso(t, pool)
    case 'completar':
      return generarCompletar(t)
    case 'escrita':
      return generarEscrita(t)
    case 'ordenar':
      return puedeOrdenar(t) ? generarOrdenar(t) : generarMultiple(t, pool)
    case 'detectar-error':
      return generarDetectarError(t, pool)
    case 'caso-practico':
      return generarCasoPractico(t, pool)
    case 'explicar':
      return generarExplicar(t)
    case 'kahoot':
      return generarMultiple(t, pool)
    case 'examen':
      return i % 2 === 0 ? generarMultiple(t, pool) : generarEscrita(t)
    default:
      return generarMultiple(t, pool)
  }
}

/** Puntaje estilo Kahoot: rapidez + racha. */
export function puntajeKahoot(correcto: boolean, ms: number, segundosLimite: number, racha: number, base = 100): number {
  if (!correcto) return 0
  const restante = Math.max(0, segundosLimite - ms / 1000 / 1000)
  void restante
  const proporcion = Math.max(0, 1 - ms / (segundosLimite * 10_000))
  const multiplicador = racha >= 8 ? 3 : racha >= 5 ? 2.5 : racha >= 3 ? 2 : racha >= 1 ? 1.5 : 1
  return Math.round(base * (0.5 + proporcion * 0.5) * multiplicador)
}

export { mezclar }
