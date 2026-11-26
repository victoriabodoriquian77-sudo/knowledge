import type { ProgresoTarjeta, Sesion, Subtema, Tarjeta } from '../types/models'
import { estaDominada } from './srs'

export type NivelPreparacion = 'dominado' | 'buen-nivel' | 'necesita-refuerzo' | 'pendiente'

export interface DiagnosticoSubtema {
  subtemaId: string
  nombre: string
  nivel: NivelPreparacion
  puntaje: number
  tarjetas: number
  dominadas: number
  precision: number
  escritas: number
  examenes: number
  retencion: number
  detalle: string[]
}

export const ETIQUETA_NIVEL: Record<NivelPreparacion, { texto: string; tono: string; barra: string }> = {
  dominado: { texto: 'Dominado', tono: 'bg-grass-tint text-grass', barra: 'bg-grass' },
  'buen-nivel': { texto: 'Buen nivel', tono: 'bg-sky-tint text-sky', barra: 'bg-sky' },
  'necesita-refuerzo': { texto: 'Necesita refuerzo', tono: 'bg-mango-tint text-mango', barra: 'bg-mango' },
  pendiente: { texto: 'Pendiente', tono: 'bg-cream text-muted', barra: 'bg-stone' },
}

export interface Preparacion {
  puntaje: number
  nivel: NivelPreparacion
  cobertura: number
  precision: number
  dominio: number
  aplicacion: number
  escritas: number
  examenes: number
  retencion: number
  subtemas: DiagnosticoSubtema[]
}

/**
 * Indicador de preparación para el examen.
 * No mide "cuánto avanzaste en el recorrido", sino cuánto podrías
 * responder hoy: dominio real, precisión, escritura, aplicación y retención.
 */
export function calcularPreparacion(
  subtemas: Subtema[],
  tarjetas: Tarjeta[],
  progresos: Map<string, ProgresoTarjeta>,
  sesiones: Sesion[],
): Preparacion {
  const porSubtema = new Map<string, Tarjeta[]>()
  for (const t of tarjetas) {
    if (!porSubtema.has(t.subtemaId)) porSubtema.set(t.subtemaId, [])
    porSubtema.get(t.subtemaId)!.push(t)
  }

  const examenes = sesiones.filter((s) => s.tipo === 'examen' && typeof s.nota === 'number' && s.nota! > 0)
  const escritas = sesiones.filter((s) => s.tipo === 'escrita' || s.tipo === 'explicar')

  const diagnosticos: DiagnosticoSubtema[] = subtemas.map((s) => {
    const lista = porSubtema.get(s.id) ?? []
    const prog = lista.map((t) => progresos.get(t.id)).filter(Boolean) as ProgresoTarjeta[]
    const dominadas = prog.filter(estaDominada).length
    const conHistorial = prog.filter((p) => p.repeticiones > 0)
    const aciertos = conHistorial.reduce((a, p) => a + p.aciertos, 0)
    const total = conHistorial.reduce((a, p) => a + p.aciertos + p.fallos, 0)
    const precision = total > 0 ? Math.round((aciertos / total) * 100) : 0
    const dominioProm = conHistorial.length ? Math.round(conHistorial.reduce((a, p) => a + p.dominio, 0) / conHistorial.length) : 0
    const retencion = conHistorial.length
      ? Math.round((conHistorial.filter((p) => p.repeticiones >= 3 && p.intervalo >= 3).length / conHistorial.length) * 100)
      : 0

    const esc = sesiones.filter((x) => x.tipo === 'escrita' || x.tipo === 'explicar').reduce((a, x) => a + (x.aciertos ?? 0), 0)
    const exam = examenes.filter((x) => s.id && x.nota !== undefined)

    const detalle: string[] = []
    if (lista.length === 0) detalle.push('Sin tarjetas cargadas')
    else if (dominadas === 0) detalle.push('Ninguna tarjeta dominada todavía')

    let puntaje = 0
    if (lista.length > 0) {
      const cobertura = Math.min(1, conHistorial.length / lista.length)
      puntaje =
        (dominadas / Math.max(1, lista.length)) * 34 +
        (dominioProm / 100) * 22 +
        (precision / 100) * 20 +
        (retencion / 100) * 12 +
        cobertura * 12
    }
    puntaje = Math.round(Math.min(100, puntaje))

    let nivel: NivelPreparacion
    if (lista.length === 0 || conHistorial.length === 0) nivel = 'pendiente'
    else if (puntaje >= 80 && precision >= 80 && dominadas >= Math.ceil(lista.length * 0.6)) nivel = 'dominado'
    else if (puntaje >= 55) nivel = 'buen-nivel'
    else nivel = 'necesita-refuerzo'

    if (nivel === 'necesita-refuerzo' && precision < 60) detalle.push('Precisión baja: conviene repetir los conceptos base')
    if (nivel !== 'pendiente' && retencion < 40) detalle.push('Todavía no se sostuvo en el tiempo')

    void esc
    void exam

    return {
      subtemaId: s.id,
      nombre: s.nombre,
      nivel,
      puntaje,
      tarjetas: lista.length,
      dominadas,
      precision,
      escritas: 0,
      examenes: 0,
      retencion,
      detalle,
    }
  })

  const conContenido = diagnosticos.filter((d) => d.tarjetas > 0)
  const puntaje = conContenido.length
    ? Math.round(conContenido.reduce((a, d) => a + d.puntaje, 0) / conContenido.length)
    : 0

  const totalProg = [...progresos.values()].filter((p) => p.repeticiones > 0)
  const aciertosTot = totalProg.reduce((a, p) => a + p.aciertos, 0)
  const intentosTot = totalProg.reduce((a, p) => a + p.aciertos + p.fallos, 0)

  const nivel: NivelPreparacion =
    conContenido.length === 0 || totalProg.length === 0
      ? 'pendiente'
      : puntaje >= 80
        ? 'dominado'
        : puntaje >= 55
          ? 'buen-nivel'
          : 'necesita-refuerzo'

  return {
    puntaje,
    nivel,
    cobertura: tarjetas.length ? Math.round((totalProg.length / tarjetas.length) * 100) : 0,
    precision: intentosTot ? Math.round((aciertosTot / intentosTot) * 100) : 0,
    dominio: totalProg.length ? Math.round(totalProg.reduce((a, p) => a + p.dominio, 0) / totalProg.length) : 0,
    aplicacion: totalProg.length
      ? Math.round(totalProg.reduce((a, p) => a + (p.dimensiones.aplicacion ?? 0), 0) / totalProg.length)
      : 0,
    escritas: escritas.length,
    examenes: examenes.length,
    retencion: totalProg.length
      ? Math.round((totalProg.filter((p) => p.repeticiones >= 3 && p.intervalo >= 3).length / totalProg.length) * 100)
      : 0,
    subtemas: diagnosticos,
  }
}
