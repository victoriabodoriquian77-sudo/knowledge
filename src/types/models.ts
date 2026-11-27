/** Modelos de dominio de KNOWLEDGE. Todo se guarda localmente en IndexedDB. */

export type ID = string

export type EstadoSubtema = 'bloqueado' | 'disponible' | 'en-progreso' | 'completado' | 'dominado'

export type Dificultad = 'facil' | 'media' | 'dificil'

/** Nivel de dominio cognitivo que mide cada actividad. */
export type Dimension = 'reconocimiento' | 'recuperacion' | 'comprension' | 'aplicacion'

export type ClasificacionSrs = 'otra-vez' | 'dificil' | 'bien' | 'facil'

/** De dónde salió un material: cargado por el usuario o generado por la IA. */
export interface MaterialOrigen {
  tipo: 'pdf' | 'manual'
  archivo: string
  generadoEn: number
}

/** Marca de una tarjeta que armó la IA, para poder identificarla después. */
export interface OrigenIA {
  generada: boolean
  archivo: string
  generadoEn: number
}

export interface Materia {
  id: ID
  nombre: string
  descripcion: string
  color: string
  icono: string
  creadaEn: number
  orden: number
  archivada?: boolean
  /** Presente si la materia se creó importando un documento. */
  origen?: MaterialOrigen
}

export interface Unidad {
  id: ID
  materiaId: ID
  nombre: string
  descripcion: string
  orden: number
  creadaEn: number
  /** Objetivo de dominio (%) para considerar la unidad dominada. */
  metaDominio: number
}

export interface Subtema {
  id: ID
  unidadId: ID
  materiaId: ID
  nombre: string
  descripcion: string
  orden: number
  creadoEn: number
  /** Desbloqueo manual del usuario para poder estudiar sin completar el anterior. */
  desbloqueoForzado?: boolean
}

export interface Tarjeta {
  id: ID
  materiaId: ID
  unidadId: ID
  subtemaId: ID
  pregunta: string
  respuesta: string
  explicacion: string
  ejemplo: string
  palabrasClave: string[]
  capitulo: string
  pagina: string
  dificultad: Dificultad
  imagen?: string
  favorita: boolean
  creadaEn: number
  actualizadaEn: number
  /** Presente si la tarjeta la generó la IA a partir de un documento. */
  origenIA?: OrigenIA
}

/** Estado de aprendizaje por tarjeta (SRS tipo SM-2 simplificado + dimensiones). */
export interface ProgresoTarjeta {
  tarjetaId: ID
  /** Intervalo actual en días. */
  intervalo: number
  /** Factor de facilidad (1.3 a 2.8). */
  facilidad: number
  repeticiones: number
  fallos: number
  aciertos: number
  /** Fecha (ms) del próximo repaso. */
  proximoRepaso: number
  ultimoRepaso: number
  /** Fuerza de memoria 0..100 derivada de aciertos/fallos e intervalos. */
  dominio: number
  /** Precisión histórica 0..1. */
  precision: number
  /** Puntaje por dimensión cognitiva 0..100. */
  dimensiones: Record<Dimension, number>
  /** Racha de aciertos consecutivos. */
  racha: number
  dificil: boolean
  actualizadoEn: number
}

export type TipoActividad =
  | 'flashcards'
  | 'multiple'
  | 'verdadero-falso'
  | 'completar'
  | 'escrita'
  | 'examen'
  | 'kahoot'
  | 'relacionar'
  | 'ordenar'
  | 'detectar-error'
  | 'caso-practico'
  | 'explicar'
  | 'repaso'

export interface IntentoRespuesta {
  tarjetaId: ID
  tipo: TipoActividad
  correcto: boolean
  /** 0..1 — usado en respuestas abiertas autoevaluadas o parciales. */
  puntaje: number
  dimension: Dimension
  ms: number
  /** Calidad declarada por el usuario en flashcards clásicas. */
  clasificacion?: ClasificacionSrs
  /** Conceptos clave detectados / faltantes en respuestas abiertas. */
  conceptosPresentes?: string[]
  conceptosFaltantes?: string[]
}

export interface Sesion {
  id: ID
  tipo: TipoActividad
  materiaId?: ID
  unidadId?: ID
  subtemaIds: ID[]
  iniciadaEn: number
  finalizadaEn: number
  duracionMs: number
  intentos: IntentoRespuesta[]
  aciertos: number
  fallos: number
  omitidas: number
  xpGanada: number
  monedasGanadas: number
  /** Solo examen / kahoot. */
  nota?: number
  precision: number
  pausadaMs?: number
}

export interface EstadoJuego {
  id: string
  mejorPuntaje: number
  mejorRacha: number
  partidas: number
  actualizadoEn: number
}

export interface Logro {
  id: string
  titulo: string
  descripcion: string
  icono: string
  meta: number
  metrica: MetricaLogro
  recompensaXp: number
  recompensaMonedas: number
  secreto?: boolean
}

export type MetricaLogro =
  | 'tarjetasCreadas'
  | 'unidadesCompletadas'
  | 'respuestasCorrectas'
  | 'diasEstudio'
  | 'examenesAprobados'
  | 'tarjetasDominadas'
  | 'rachaPerfecta'
  | 'sesionesCompletadas'
  | 'monedasGanadas'
  | 'subtemaDominado'
  | 'practicasAplicadas'

export interface LogroDesbloqueado {
  logroId: string
  desbloqueadoEn: number
  visto: boolean
}

export interface Mision {
  id: string
  titulo: string
  descripcion: string
  metrica: MetricaMision
  meta: number
  recompensaXp: number
  recompensaMonedas: number
  icono: string
}

export type MetricaMision =
  | 'tarjetasEstudiadas'
  | 'respuestasCorrectas'
  | 'subtemaCompletado'
  | 'examenRealizado'
  | 'tarjetasDificiles'
  | 'minutosEstudio'

export interface ProgresoMision {
  /** Clave `${fechaLocal}:${misionId}` */
  id: string
  fecha: string
  misionId: string
  progreso: number
  completada: boolean
  reclamada: boolean
}

export interface Perfil {
  id: 'perfil'
  nombre: string
  xp: number
  monedas: number
  rachaActual: number
  mejorRacha: number
  ultimoDiaEstudio: string
  objetivoDiarioXp: number
  objetivoDiarioTarjetas: number
  tema: 'claro'
  onboardingCompletado: boolean
  creadoEn: number
  /** IDs de logros ya reclamados para no duplicar recompensas. */
  logrosReclamados: string[]
  avatar?: string
}

export interface EstadisticasGlobales {
  id: 'stats'
  respuestasCorrectas: number
  respuestasIncorrectas: number
  tarjetasEstudiadas: number
  sesionesCompletadas: number
  tiempoTotalMs: number
  xpHistorica: number
  monedasHistoricas: number
  rachaPerfectaMaxima: number
  examenesAprobados: number
  practicasAplicadas: number
  ultimaActividad: number
}

export interface ResumenDiario {
  /** YYYY-MM-DD local */
  fecha: string
  xp: number
  monedas: number
  tarjetas: number
  correctas: number
  incorrectas: number
  tiempoMs: number
  sesiones: number
  rachaMaximaDia: number
}

export interface Configuracion {
  id: 'config'
  nuevoLimiteDiario: number
  repasosMaximosPorSesion: number
  tamanioSesion: number
  permitirSaltear: boolean
  mostrarCronometroKahoot: boolean
  segundosPorPregunta: number
  preguntasExamen: number
  minutosExamen: number
  puntosPorAciertoKahoot: number
}

export interface BackupMeta {
  id: 'backup'
  ultimoBackup: number
}

/** Evento de gamificación efímero para animar la UI. */
export interface Recompensa {
  id: string
  tipo: 'xp' | 'moneda' | 'nivel' | 'logro' | 'mision' | 'racha'
  cantidad?: number
  titulo: string
  detalle?: string
}

export interface FiltroTarjetas {
  materiaId?: ID
  unidadId?: ID
  subtemaIds?: ID[]
  dificultad?: Dificultad | 'todas'
  soloFavoritas?: boolean
  soloPendientes?: boolean
  busqueda?: string
  estado?: 'todas' | 'nuevas' | 'aprendiendo' | 'dominadas' | 'dificiles'
}
