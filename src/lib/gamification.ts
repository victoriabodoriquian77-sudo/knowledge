import { db } from '../db/database'
import { LOGROS, MISIONES_DIARIAS, MS_DIA, fechaLocal, nivelDesdeXp } from './constants'
import type {
  Mision,
  MetricaMision,
  Logro,
  Recompensa,
  Sesion,
  ProgresoMision,
  Unidad,
  Subtema,
  ProgresoTarjeta,
} from '../types/models'

/** Emisor de recompensas visuales para la UI (sin sonidos). */
type Listener = (r: Recompensa) => void
const listeners = new Set<Listener>()
export const onRecompensa = (fn: Listener) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const emitir = (r: Omit<Recompensa, 'id'>) => {
  const recompensa: Recompensa = { ...r, id: Math.random().toString(36).slice(2) }
  listeners.forEach((fn) => fn(recompensa))
  return recompensa
}
export const emitirRecompensa = emitir

const multiplicadorRacha = (racha: number): number => {
  if (racha >= 10) return 1.6
  if (racha >= 6) return 1.35
  if (racha >= 3) return 1.15
  return 1
}

/** Recompensa base por respuesta, según dimensión cognitiva y resultado. */
export const calcularRecompensaRespuesta = (
  correcto: boolean,
  dimension: 'reconocimiento' | 'recuperacion' | 'comprension' | 'aplicacion',
  racha: number,
  dificultadTarjeta: 'facil' | 'media' | 'dificil',
) => {
  const pesosDimension = { reconocimiento: 0.7, recuperacion: 1, comprension: 1.25, aplicacion: 1.45 }
  const pesoDif = dificultadTarjeta === 'dificil' ? 1.25 : dificultadTarjeta === 'facil' ? 0.85 : 1
  const base = 8 * pesosDimension[dimension] * pesoDif
  if (!correcto) return { xp: 1, monedas: 0 }
  const mult = multiplicadorRacha(racha)
  return {
    xp: Math.round(base * mult),
    monedas: Math.round(2 * pesosDimension[dimension] * mult),
  }
}

export interface ResultadoSesion {
  xp: number
  monedas: number
  nivelSubido: boolean
  nuevoNivel: number
  rachaActualizada: number
  rachaIncrementada: boolean
  logrosNuevos: Logro[]
  misionesCompletadas: Mision[]
  misionesReclamables: Mision[]
}

/**
 * Registra una sesión completa: XP, monedas, racha, estadísticas diarias,
 * logros y misiones. Es idempotente por id de sesión (no duplica recompensas).
 */
export async function registrarSesion(sesion: Sesion): Promise<ResultadoSesion> {
  const yaExiste = await db.sesiones.get(sesion.id)
  if (yaExiste) {
    return {
      xp: 0,
      monedas: 0,
      nivelSubido: false,
      nuevoNivel: nivelDesdeXp((await db.perfil.get('perfil'))?.xp ?? 0).nivel,
      rachaActualizada: (await db.perfil.get('perfil'))?.rachaActual ?? 0,
      rachaIncrementada: false,
      logrosNuevos: [],
      misionesCompletadas: [],
      misionesReclamables: [],
    }
  }

  const hoy = fechaLocal()
  const resultado: ResultadoSesion = {
    xp: sesion.xpGanada,
    monedas: sesion.monedasGanadas,
    nivelSubido: false,
    nuevoNivel: 1,
    rachaActualizada: 0,
    rachaIncrementada: false,
    logrosNuevos: [],
    misionesCompletadas: [],
    misionesReclamables: [],
  }

  await db.transaction(
    'rw',
    [db.sesiones, db.perfil, db.stats, db.diario],
    async () => {
      await db.sesiones.add(sesion)

      const perfil = (await db.perfil.get('perfil'))!
      const stats = (await db.stats.get('stats'))!
      const nivelAntes = nivelDesdeXp(perfil.xp).nivel

      // Racha diaria: solo cambia la primera sesión del día.
      let racha = perfil.rachaActual
      let ultimoDia = perfil.ultimoDiaEstudio
      if (ultimoDia !== hoy) {
        const dif = ultimoDia ? Math.round((new Date(hoy).getTime() - new Date(ultimoDia).getTime()) / MS_DIA) : null
        racha = dif === 1 ? perfil.rachaActual + 1 : 1
        ultimoDia = hoy
        resultado.rachaIncrementada = true
      }

      const nuevoXp = perfil.xp + sesion.xpGanada
      const nivelDespues = nivelDesdeXp(nuevoXp).nivel
      resultado.nivelSubido = nivelDespues > nivelAntes
      resultado.nuevoNivel = nivelDespues
      resultado.rachaActualizada = racha

      await db.perfil.update('perfil', {
        xp: nuevoXp,
        monedas: perfil.monedas + sesion.monedasGanadas,
        rachaActual: racha,
        mejorRacha: Math.max(perfil.mejorRacha, racha),
        ultimoDiaEstudio: ultimoDia,
      })

      const rachaMaxSesion = sesion.intentos.reduce((max, i, idx, arr) => {
        let actual = 0
        let mejor = 0
        for (let k = 0; k <= idx; k++) {
          if (arr[k].correcto) {
            actual++
            mejor = Math.max(mejor, actual)
          } else actual = 0
        }
        return Math.max(max, mejor)
      }, 0)

      await db.stats.update('stats', {
        respuestasCorrectas: stats.respuestasCorrectas + sesion.aciertos,
        respuestasIncorrectas: stats.respuestasIncorrectas + sesion.fallos,
        tarjetasEstudiadas: stats.tarjetasEstudiadas + sesion.intentos.length,
        sesionesCompletadas: stats.sesionesCompletadas + 1,
        tiempoTotalMs: stats.tiempoTotalMs + sesion.duracionMs,
        xpHistorica: stats.xpHistorica + sesion.xpGanada,
        monedasHistoricas: stats.monedasHistoricas + sesion.monedasGanadas,
        rachaPerfectaMaxima: Math.max(stats.rachaPerfectaMaxima, rachaMaxSesion),
        examenesAprobados:
          stats.examenesAprobados + (sesion.tipo === 'examen' && (sesion.nota ?? 0) >= 60 ? 1 : 0),
        practicasAplicadas:
          stats.practicasAplicadas +
          (sesion.tipo === 'caso-practico' || sesion.tipo === 'explicar' || sesion.tipo === 'detectar-error'
            ? 1
            : 0),
        ultimaActividad: Date.now(),
      })

      const diario = (await db.diario.get(hoy)) ?? {
        fecha: hoy,
        xp: 0,
        monedas: 0,
        tarjetas: 0,
        correctas: 0,
        incorrectas: 0,
        tiempoMs: 0,
        sesiones: 0,
        rachaMaximaDia: 0,
      }
      await db.diario.put({
        ...diario,
        xp: diario.xp + sesion.xpGanada,
        monedas: diario.monedas + sesion.monedasGanadas,
        tarjetas: diario.tarjetas + sesion.intentos.length,
        correctas: diario.correctas + sesion.aciertos,
        incorrectas: diario.incorrectas + sesion.fallos,
        tiempoMs: diario.tiempoMs + sesion.duracionMs,
        sesiones: diario.sesiones + 1,
        rachaMaximaDia: Math.max(diario.rachaMaximaDia, rachaMaxSesion),
      })

    },
  )

  // Misiones y logros se calculan FUERA de la transacción: leen tablas
  // (materias, unidades, subtemas, tarjetas) que no forman parte de este
  // ámbito y Dexie no permite consultarlas dentro.
  const misiones = await actualizarMisiones(sesion, hoy)
  resultado.misionesCompletadas = misiones.completadas
  resultado.misionesReclamables = misiones.reclamables
  resultado.logrosNuevos = await evaluarLogros()

  if (resultado.nivelSubido) {
    emitir({ tipo: 'nivel', titulo: `¡Nivel ${resultado.nuevoNivel}!`, detalle: 'Tu esfuerzo está dando frutos.' })
  }
  if (resultado.rachaIncrementada) {
    emitir({ tipo: 'racha', cantidad: resultado.rachaActualizada, titulo: `Racha de ${resultado.rachaActualizada} días` })
  }
  return resultado
}

async function actualizarMisiones(sesion: Sesion, hoy: string) {
  const completadas: Mision[] = []
  const reclamables: Mision[] = []
  const dificilesEstudiadas = sesion.intentos.filter((i) => i.clasificacion === 'otra-vez' || i.clasificacion === 'dificil').length

  const aportes: Record<MetricaMision, number> = {
    tarjetasEstudiadas: sesion.intentos.length,
    respuestasCorrectas: sesion.aciertos,
    subtemaCompletado: 0,
    examenRealizado: sesion.tipo === 'examen' ? 1 : 0,
    tarjetasDificiles: dificilesEstudiadas,
    minutosEstudio: Math.round(sesion.duracionMs / 60000),
  }

  for (const mision of MISIONES_DIARIAS) {
    const aporte = aportes[mision.metrica]
    if (!aporte) continue
    const id = `${hoy}:${mision.id}`
    const prev = await db.misiones.get(id)
    const progreso = Math.min(mision.meta, (prev?.progreso ?? 0) + aporte)
    const completada = progreso >= mision.meta
    const registro: ProgresoMision = {
      id,
      fecha: hoy,
      misionId: mision.id,
      progreso,
      completada,
      reclamada: prev?.reclamada ?? false,
    }
    await db.misiones.put(registro)
    if (completada && !prev?.completada) completadas.push(mision)
    if (completada && !registro.reclamada) reclamables.push(mision)
  }

  // Misión de completar subtema: se marca aparte cuando el usuario completa uno.
  return { completadas, reclamables }
}

/** Marca la misión "completá un subtema" cuando corresponde. */
export async function registrarSubtemaCompletado(): Promise<void> {
  const hoy = fechaLocal()
  const mision = MISIONES_DIARIAS.find((m) => m.metrica === 'subtemaCompletado')
  if (!mision) return
  const id = `${hoy}:${mision.id}`
  const prev = await db.misiones.get(id)
  await db.misiones.put({
    id,
    fecha: hoy,
    misionId: mision.id,
    progreso: mision.meta,
    completada: true,
    reclamada: prev?.reclamada ?? false,
  })
}

export async function reclamarMision(misionId: string): Promise<{ xp: number; monedas: number } | null> {
  const hoy = fechaLocal()
  const id = `${hoy}:${misionId}`
  const mision = MISIONES_DIARIAS.find((m) => m.id === misionId)
  const registro = await db.misiones.get(id)
  if (!mision || !registro || !registro.completada || registro.reclamada) return null
  await db.misiones.update(id, { reclamada: true })
  await sumarRecompensa(mision.recompensaXp, mision.recompensaMonedas)
  emitir({ tipo: 'mision', titulo: mision.titulo, detalle: `+${mision.recompensaXp} XP · +${mision.recompensaMonedas} monedas` })
  return { xp: mision.recompensaXp, monedas: mision.recompensaMonedas }
}

/** Suma XP/monedas sin sesión (misiones, logros). */
export async function sumarRecompensa(xp: number, monedas: number): Promise<void> {
  await db.transaction('rw', [db.perfil, db.stats, db.diario], async () => {
    const perfil = (await db.perfil.get('perfil'))!
    const nivelAntes = nivelDesdeXp(perfil.xp).nivel
    const nuevoXp = perfil.xp + xp
    await db.perfil.update('perfil', { xp: nuevoXp, monedas: perfil.monedas + monedas })
    const stats = (await db.stats.get('stats'))!
    await db.stats.update('stats', {
      xpHistorica: stats.xpHistorica + xp,
      monedasHistoricas: stats.monedasHistoricas + monedas,
    })
    const hoy = fechaLocal()
    const diario = (await db.diario.get(hoy)) ?? {
      fecha: hoy, xp: 0, monedas: 0, tarjetas: 0, correctas: 0, incorrectas: 0, tiempoMs: 0, sesiones: 0, rachaMaximaDia: 0,
    }
    await db.diario.put({ ...diario, xp: diario.xp + xp, monedas: diario.monedas + monedas })
    const nivelDespues = nivelDesdeXp(nuevoXp).nivel
    if (nivelDespues > nivelAntes) {
      emitir({ tipo: 'nivel', titulo: `¡Nivel ${nivelDespues}!`, detalle: 'Seguí así.' })
    }
  })
}

/** Evalúa todos los logros contra el estado real y desbloquea los nuevos. */
export async function evaluarLogros(): Promise<Logro[]> {
  const [perfil, stats, tarjetas, progresos, unidades, subtemas, sesiones] = await Promise.all([
    db.perfil.get('perfil'),
    db.stats.get('stats'),
    db.tarjetas.count(),
    db.progreso.toArray(),
    db.unidades.toArray(),
    db.subtemas.toArray(),
    db.sesiones.toArray(),
  ])
  if (!perfil || !stats) return []

  const dominadas = progresos.filter((p) => p.dominio >= 80 && p.repeticiones >= 3).length
  const diasEstudio = new Set(sesiones.map((s) => fechaLocal(new Date(s.iniciadaEn)))).size
  const unidadesCompletadas = await contarUnidadesCompletadas(unidades, subtemas, progresos, tarjetas)
  const subtemasDominados = await contarSubtemasDominados(subtemas, progresos, tarjetas)

  const valores: Record<string, number> = {
    tarjetasCreadas: tarjetas,
    unidadesCompletadas,
    respuestasCorrectas: stats.respuestasCorrectas,
    diasEstudio,
    examenesAprobados: stats.examenesAprobados,
    tarjetasDominadas: dominadas,
    rachaPerfecta: stats.rachaPerfectaMaxima,
    sesionesCompletadas: stats.sesionesCompletadas,
    monedasGanadas: stats.monedasHistoricas,
    subtemaDominado: subtemasDominados,
    practicasAplicadas: stats.practicasAplicadas,
  }

  const desbloqueados = await db.logros.toArray()
  const ids = new Set(desbloqueados.map((l) => l.logroId))
  const nuevos: Logro[] = []
  for (const logro of LOGROS) {
    if (ids.has(logro.id)) continue
    if ((valores[logro.metrica] ?? 0) >= logro.meta) {
      await db.logros.put({ logroId: logro.id, desbloqueadoEn: Date.now(), visto: false })
      nuevos.push(logro)
    }
  }
  if (nuevos.length) {
    const perfilActual = (await db.perfil.get('perfil'))!
    await db.perfil.update('perfil', {
      logrosReclamados: [...new Set([...perfilActual.logrosReclamados, ...nuevos.map((n) => n.id)])],
    })
    emitir({ tipo: 'logro', titulo: nuevos[0].titulo, detalle: nuevos[0].descripcion })
  }
  return nuevos
}

async function contarUnidadesCompletadas(unidades: Unidad[], subtemas: Subtema[], progresos: ProgresoTarjeta[], tarjetasCount: number) {
  void tarjetasCount
  const progresoPorTarjeta = new Map(progresos.map((p) => [p.tarjetaId, p]))
  const tarjetas = await db.tarjetas.toArray()
  let count = 0
  for (const u of unidades) {
    const subs = subtemas.filter((s) => s.unidadId === u.id)
    if (!subs.length) continue
    const todas = subs.every((s) => {
      const t = tarjetas.filter((x) => x.subtemaId === s.id)
      if (!t.length) return false
      return t.every((x) => {
        const p = progresoPorTarjeta.get(x.id)
        return !!p && p.dominio >= 80 && p.repeticiones >= 3
      })
    })
    if (todas) count++
  }
  return count
}

async function contarSubtemasDominados(subtemas: Subtema[], progresos: ProgresoTarjeta[], tarjetasCount: number) {
  void tarjetasCount
  const progresoPorTarjeta = new Map(progresos.map((p) => [p.tarjetaId, p]))
  const tarjetas = await db.tarjetas.toArray()
  let count = 0
  for (const s of subtemas) {
    const t = tarjetas.filter((x) => x.subtemaId === s.id)
    if (!t.length) continue
    if (t.every((x) => {
      const p = progresoPorTarjeta.get(x.id)
      return !!p && p.dominio >= 80 && p.repeticiones >= 3
    })) count++
  }
  return count
}
