import type { ProgresoTarjeta, Tarjeta, FiltroTarjetas, Dificultad } from '../types/models'
import { estaAprendiendo, estaDominada, esNueva, pendienteHoy } from './srs'

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function aplicarFiltro(
  tarjetas: Tarjeta[],
  filtro: FiltroTarjetas,
  progresos: Map<string, ProgresoTarjeta>,
): Tarjeta[] {
  const q = filtro.busqueda ? normalizar(filtro.busqueda.replace(/<[^>]+>/g, '')) : ''
  return tarjetas.filter((t) => {
    if (filtro.materiaId && t.materiaId !== filtro.materiaId) return false
    if (filtro.unidadId && t.unidadId !== filtro.unidadId) return false
    if (filtro.subtemaIds && filtro.subtemaIds.length && !filtro.subtemaIds.includes(t.subtemaId)) return false
    if (filtro.dificultad && filtro.dificultad !== 'todas' && t.dificultad !== (filtro.dificultad as Dificultad)) return false
    if (filtro.soloFavoritas && !t.favorita) return false
    const p = progresos.get(t.id)
    if (filtro.soloPendientes && !pendienteHoy(p)) return false
    if (filtro.estado && filtro.estado !== 'todas') {
      if (filtro.estado === 'nuevas' && !esNueva(p)) return false
      if (filtro.estado === 'aprendiendo' && !estaAprendiendo(p)) return false
      if (filtro.estado === 'dominadas' && !estaDominada(p)) return false
      if (filtro.estado === 'dificiles' && !p?.dificil) return false
    }
    if (q) {
      const texto = normalizar(
        [t.pregunta, t.respuesta, t.explicacion, t.ejemplo, t.palabrasClave.join(' '), t.capitulo].join(' ').replace(/<[^>]+>/g, ' '),
      )
      if (!texto.includes(q)) return false
    }
    return true
  })
}

/** Ordena según prioridad adaptativa (lo que necesita refuerzo primero). */
export function ordenarParaEstudio(tarjetas: Tarjeta[], progresos: Map<string, ProgresoTarjeta>, prioridad: (t: Tarjeta, p?: ProgresoTarjeta) => number): Tarjeta[] {
  return [...tarjetas].sort((a, b) => prioridad(b, progresos.get(b.id)) - prioridad(a, progresos.get(a.id)))
}
