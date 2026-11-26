import { db } from '../db/database'
import type { EstadoSubtema, Materia, Subtema, Tarjeta, Unidad, ProgresoTarjeta } from '../types/models'
import { estaDominada } from './srs'

export interface ResumenSubtema {
  subtema: Subtema
  tarjetas: number
  dominadas: number
  estudiadas: number
  dominio: number
  estado: EstadoSubtema
  desbloqueado: boolean
}

export interface ResumenUnidad {
  unidad: Unidad
  subtemas: ResumenSubtema[]
  tarjetas: number
  dominio: number
  completados: number
  total: number
  estado: EstadoSubtema
}

export interface ResumenMateria {
  materia: Materia
  unidades: ResumenUnidad[]
  tarjetas: number
  dominio: number
  subtemas: number
}

const progresoMap = (progresos: ProgresoTarjeta[]) => new Map(progresos.map((p) => [p.tarjetaId, p]))

export interface ContextoEstudio {
  materias: Materia[]
  unidades: Unidad[]
  subtemas: Subtema[]
  tarjetas: Tarjeta[]
  progresos: ProgresoTarjeta[]
}

export async function cargarContexto(): Promise<ContextoEstudio> {
  const [materias, unidades, subtemas, tarjetas, progresos] = await Promise.all([
    db.materias.orderBy('orden').toArray(),
    db.unidades.toArray(),
    db.subtemas.toArray(),
    db.tarjetas.toArray(),
    db.progreso.toArray(),
  ])
  return {
    materias: materias.filter((m) => !m.archivada),
    unidades: unidades.sort((a, b) => a.orden - b.orden),
    subtemas: subtemas.sort((a, b) => a.orden - b.orden),
    tarjetas,
    progresos,
  }
}

/**
 * Estado de un subtema:
 * - completado: todas sus tarjetas fueron estudiadas al menos una vez
 *   y la mayoría alcanzó un dominio aceptable.
 * - dominado: todas sus tarjetas dominadas (dominio >= 80, repeticiones >= 3).
 * - en-progreso: al menos una tarjeta estudiada.
 * - bloqueado: existe un subtema anterior sin completar y no hay desbloqueo manual.
 */
export function calcularEstadoSubtema(
  subtema: Subtema,
  tarjetas: Tarjeta[],
  progresos: Map<string, ProgresoTarjeta>,
  anteriorCompletado: boolean,
): ResumenSubtema {
  const propias = tarjetas.filter((t) => t.subtemaId === subtema.id)
  const conProgreso = propias.map((t) => progresos.get(t.id))
  // "Estudiada" = hubo intento real, aunque haya sido un error que dejó
  // `repeticiones` en 0. Si no, un subtema trabajado seguiría figurando
  // como no iniciado y bloquearía el avance sin motivo.
  const estudiadas = conProgreso.filter((p) => p && (p.repeticiones > 0 || p.aciertos + p.fallos > 0)).length
  const dominadas = conProgreso.filter((p) => p && estaDominada(p)).length
  const dominio = propias.length
    ? Math.round(conProgreso.reduce((acc, p) => acc + (p?.dominio ?? 0), 0) / propias.length)
    : 0
  const completo = propias.length > 0 && estudiadas === propias.length && dominio >= 60
  const dominado = propias.length > 0 && dominadas === propias.length

  let estado: EstadoSubtema
  if (dominado) estado = 'dominado'
  else if (completo) estado = 'completado'
  else if (estudiadas > 0) estado = 'en-progreso'
  else estado = 'disponible'

  const desbloqueado = anteriorCompletado || !!subtema.desbloqueoForzado || estado === 'en-progreso' || estado === 'completado' || estado === 'dominado'
  if (!desbloqueado) estado = 'bloqueado'

  return {
    subtema,
    tarjetas: propias.length,
    dominadas,
    estudiadas,
    dominio,
    estado,
    desbloqueado,
  }
}

export function calcularUnidades(ctx: ContextoEstudio, materiaId?: string): ResumenUnidad[] {
  const map = progresoMap(ctx.progresos)
  const unidades = materiaId ? ctx.unidades.filter((u) => u.materiaId === materiaId) : ctx.unidades
  return unidades.map((unidad) => {
    const subs = ctx.subtemas.filter((s) => s.unidadId === unidad.id)
    let anteriorCompletado = true
    const resumenes: ResumenSubtema[] = []
    for (const s of subs) {
      const r = calcularEstadoSubtema(s, ctx.tarjetas, map, anteriorCompletado)
      resumenes.push(r)
      anteriorCompletado = r.estado === 'completado' || r.estado === 'dominado'
    }
    const total = resumenes.length
    const completados = resumenes.filter((r) => r.estado === 'completado' || r.estado === 'dominado').length
    const tarjetas = resumenes.reduce((acc, r) => acc + r.tarjetas, 0)
    const dominio = total
      ? Math.round(resumenes.reduce((acc, r) => acc + r.dominio, 0) / total)
      : 0
    const estado: EstadoSubtema =
      total === 0
        ? 'disponible'
        : completados === total
          ? resumenes.every((r) => r.estado === 'dominado')
            ? 'dominado'
            : 'completado'
          : completados > 0 || resumenes.some((r) => r.estado === 'en-progreso')
            ? 'en-progreso'
            : 'disponible'
    return { unidad, subtemas: resumenes, tarjetas, dominio, completados, total, estado }
  })
}

export function calcularMaterias(ctx: ContextoEstudio): ResumenMateria[] {
  return ctx.materias.map((materia) => {
    const unidades = calcularUnidades(ctx, materia.id)
    const tarjetas = ctx.tarjetas.filter((t) => t.materiaId === materia.id).length
    const subtemas = unidades.reduce((acc, u) => acc + u.total, 0)
    const dominio = unidades.length
      ? Math.round(unidades.reduce((acc, u) => acc + u.dominio, 0) / unidades.length)
      : 0
    return { materia, unidades, tarjetas, dominio, subtemas }
  })
}

export function progresoGeneral(ctx: ContextoEstudio): { dominio: number; completados: number; total: number } {
  const unidades = calcularUnidades(ctx)
  const total = unidades.reduce((acc, u) => acc + u.total, 0)
  const completados = unidades.reduce((acc, u) => acc + u.completados, 0)
  const dominio = unidades.length
    ? Math.round(unidades.reduce((acc, u) => acc + u.dominio, 0) / unidades.length)
    : 0
  return { dominio, completados, total }
}

/** Próximo subtema recomendado: el primero desbloqueado no completado. */
export function siguientePaso(ctx: ContextoEstudio): { unidad: ResumenUnidad; subtema: ResumenSubtema } | null {
  const unidades = calcularUnidades(ctx)
  for (const unidad of unidades) {
    for (const s of unidad.subtemas) {
      if (s.estado !== 'completado' && s.estado !== 'dominado' && s.estado !== 'bloqueado') {
        return { unidad, subtema: s }
      }
    }
  }
  return null
}
