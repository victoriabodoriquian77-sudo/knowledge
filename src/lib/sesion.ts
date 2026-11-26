import { db } from '../db/database'
import { uid } from '../db/database'
import { calcularSrs, progresoInicial } from './srs'
import { calcularRecompensaRespuesta, registrarSesion, type ResultadoSesion } from './gamification'
import { evaluarLogros } from './gamification'
import type {
  ClasificacionSrs,
  Dimension,
  IntentoRespuesta,
  ProgresoTarjeta,
  Sesion,
  Tarjeta,
  TipoActividad,
} from '../types/models'

/**
 * Sesión de estudio en curso. Acumula intentos en memoria y persiste
 * una sola vez al finalizar, para que un refresco no duplique XP ni monedas
 * (la persistencia usa el id de sesión como candado de idempotencia).
 */
export class SesionEstudio {
  readonly id: string
  readonly tipo: TipoActividad
  readonly materiaId?: string
  readonly unidadId?: string
  readonly subtemaIds: string[]
  readonly iniciadaEn: number
  private intentos: IntentoRespuesta[] = []
  private pausadaMs = 0
  private rachaActual = 0
  private rachaMaxima = 0
  private xp = 0
  private monedas = 0
  finalizada = false
  resultado?: ResultadoSesion

  constructor(opts: {
    tipo: TipoActividad
    materiaId?: string
    unidadId?: string
    subtemaIds?: string[]
  }) {
    this.id = uid('ses_')
    this.tipo = opts.tipo
    this.materiaId = opts.materiaId
    this.unidadId = opts.unidadId
    this.subtemaIds = opts.subtemaIds ?? []
    this.iniciadaEn = Date.now()
  }

  get aciertos() {
    return this.intentos.filter((i) => i.correcto).length
  }
  get fallos() {
    return this.intentos.length - this.aciertos
  }
  get cantidad() {
    return this.intentos.length
  }
  get racha() {
    return this.rachaActual
  }
  get xpAcumulada() {
    return this.xp
  }
  get monedasAcumuladas() {
    return this.monedas
  }
  get intentosActuales() {
    return this.intentos
  }

  pausar(ms: number) {
    this.pausadaMs += ms
  }

  /**
   * Registra una respuesta: actualiza el progreso SRS de la tarjeta y
   * acumula recompensas. Devuelve lo ganado para animar la UI.
   */
  async responder(params: {
    tarjeta: Tarjeta
    correcto: boolean
    puntaje?: number
    clasificacion?: ClasificacionSrs
    dimension: Dimension
    ms: number
    conceptosPresentes?: string[]
    conceptosFaltantes?: string[]
    /** Si es false, no altera el SRS (ej.: respuesta de prueba). */
    afectarProgreso?: boolean
  }): Promise<{ xp: number; monedas: number; progreso: ProgresoTarjeta }> {
    const { tarjeta, correcto, dimension, ms, clasificacion } = params
    const puntaje = params.puntaje ?? (correcto ? 1 : 0)
    this.rachaActual = correcto ? this.rachaActual + 1 : 0
    this.rachaMaxima = Math.max(this.rachaMaxima, this.rachaActual)

    const intento: IntentoRespuesta = {
      tarjetaId: tarjeta.id,
      tipo: this.tipo,
      correcto,
      puntaje,
      dimension,
      ms,
      clasificacion,
      conceptosPresentes: params.conceptosPresentes,
      conceptosFaltantes: params.conceptosFaltantes,
    }
    this.intentos.push(intento)

    const previo = (await db.progreso.get(tarjeta.id)) ?? progresoInicial(tarjeta.id)
    let progreso = previo
    if (params.afectarProgreso !== false) {
      const clasif: ClasificacionSrs =
        clasificacion ?? (!correcto ? 'otra-vez' : puntaje >= 0.85 ? 'bien' : puntaje >= 0.5 ? 'dificil' : 'otra-vez')
      const { progreso: nuevo } = calcularSrs(previo, clasif, dimension, correcto, puntaje)
      progreso = nuevo
      await db.progreso.put(nuevo)
    }

    const ganancia = calcularRecompensaRespuesta(correcto, dimension, this.rachaActual, tarjeta.dificultad)
    this.xp += ganancia.xp
    this.monedas += ganancia.monedas
    return { ...ganancia, progreso }
  }

  omitir() {
    this.intentos.push({
      tarjetaId: '',
      tipo: this.tipo,
      correcto: false,
      puntaje: 0,
      dimension: 'recuperacion',
      ms: 0,
    })
    this.rachaActual = 0
  }

  /** Persiste la sesión y devuelve el resultado de gamificación. */
  async finalizar(extra?: { nota?: number }): Promise<ResultadoSesion> {
    if (this.finalizada && this.resultado) return this.resultado
    const finalizadaEn = Date.now()
    const validos = this.intentos.filter((i) => i.tarjetaId)
    const sesion: Sesion = {
      id: this.id,
      tipo: this.tipo,
      materiaId: this.materiaId,
      unidadId: this.unidadId,
      subtemaIds: this.subtemaIds,
      iniciadaEn: this.iniciadaEn,
      finalizadaEn,
      duracionMs: finalizadaEn - this.iniciadaEn - this.pausadaMs,
      intentos: this.intentos,
      aciertos: validos.filter((i) => i.correcto).length,
      fallos: validos.filter((i) => !i.correcto).length,
      omitidas: this.intentos.length - validos.length,
      xpGanada: this.xp,
      monedasGanadas: this.monedas,
      nota: extra?.nota,
      precision: validos.length ? Math.round((validos.filter((i) => i.correcto).length / validos.length) * 100) : 0,
      pausadaMs: this.pausadaMs,
    }
    this.resultado = await registrarSesion(sesion)
    await evaluarLogros()
    this.finalizada = true
    return this.resultado
  }

  get rachaMaximaSesion() {
    return this.rachaMaxima
  }
}
