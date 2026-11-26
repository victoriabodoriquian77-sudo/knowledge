import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { useMemo } from 'react'
import { cargarContexto, calcularMaterias, calcularUnidades, progresoGeneral, siguientePaso } from '../lib/hierarchy'
import { MISIONES_DIARIAS, LOGROS, fechaLocal, nivelDesdeXp } from '../lib/constants'
import type { Tarjeta } from '../types/models'

export function usePerfil() {
  return useLiveQuery(() => db.perfil.get('perfil'), [], undefined)
}

export function useConfig() {
  return useLiveQuery(() => db.config.get('config'), [], undefined)
}

export function useContexto() {
  return useLiveQuery(() => cargarContexto(), [], undefined)
}

export function useMaterias() {
  const ctx = useContexto()
  return useMemo(() => (ctx ? calcularMaterias(ctx) : undefined), [ctx])
}

export function useUnidades(materiaId?: string) {
  const ctx = useContexto()
  return useMemo(() => (ctx ? calcularUnidades(ctx, materiaId) : undefined), [ctx, materiaId])
}

export function useProgresoGeneral() {
  const ctx = useContexto()
  return useMemo(() => (ctx ? progresoGeneral(ctx) : undefined), [ctx])
}

export function useSiguientePaso() {
  const ctx = useContexto()
  return useMemo(() => (ctx ? siguientePaso(ctx) : undefined), [ctx])
}

export function useMisionesHoy() {
  const hoy = fechaLocal()
  return useLiveQuery(async () => {
    const registros = await db.misiones.where('fecha').equals(hoy).toArray()
    return MISIONES_DIARIAS.map((m) => {
      const r = registros.find((x) => x.misionId === m.id)
      return { mision: m, progreso: r?.progreso ?? 0, completada: r?.completada ?? false, reclamada: r?.reclamada ?? false }
    })
  }, [hoy], [])
}

export function useLogros() {
  const desbloqueados = useLiveQuery(() => db.logros.toArray(), [], [])
  return useMemo(
    () =>
      LOGROS.map((l) => ({
        logro: l,
        desbloqueadoEn: desbloqueados.find((d) => d.logroId === l.id)?.desbloqueadoEn,
      })),
    [desbloqueados],
  )
}

export function useNivel() {
  const perfil = usePerfil()
  return useMemo(() => (perfil ? nivelDesdeXp(perfil.xp) : undefined), [perfil])
}

export function useTarjetas(filtro?: { materiaId?: string; unidadId?: string; subtemaId?: string }) {
  const materiaId = filtro?.materiaId
  const unidadId = filtro?.unidadId
  const subtemaId = filtro?.subtemaId
  return useLiveQuery(async () => {
    const arr = await db.tarjetas.orderBy('creadaEn').reverse().toArray()
    return arr.filter(
      (t) =>
        (!materiaId || t.materiaId === materiaId) &&
        (!unidadId || t.unidadId === unidadId) &&
        (!subtemaId || t.subtemaId === subtemaId),
    )
  }, [materiaId, unidadId, subtemaId], [] as Tarjeta[])
}

export function useResumenDiario(dias = 14) {
  return useLiveQuery(async () => {
    const todos = await db.diario.toArray()
    const mapa = new Map(todos.map((d) => [d.fecha, d]))
    const out = []
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = fechaLocal(d)
      out.push(mapa.get(key) ?? { fecha: key, xp: 0, monedas: 0, tarjetas: 0, correctas: 0, incorrectas: 0, tiempoMs: 0, sesiones: 0, rachaMaximaDia: 0 })
    }
    return out
  }, [dias], [])
}
