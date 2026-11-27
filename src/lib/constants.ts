import type { Mision, Logro } from '../types/models'

export const HOY = () => new Date()
export const MS_DIA = 86_400_000

export const fechaLocal = (d: Date = new Date()): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const diasEntre = (a: string, b: string): number => {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.round((db.getTime() - da.getTime()) / MS_DIA)
}

/** XP necesaria para pasar del nivel n al n+1. Curva progresiva pero amable. */
export const xpParaNivel = (nivel: number): number => Math.round(120 * Math.pow(nivel, 1.32))

export const nivelDesdeXp = (xp: number): { nivel: number; xpNivel: number; xpSiguiente: number; restante: number; progreso: number } => {
  let nivel = 1
  let acumulado = 0
  while (nivel < 999) {
    const req = xpParaNivel(nivel)
    if (xp < acumulado + req) {
      const xpNivel = xp - acumulado
      return { nivel, xpNivel, xpSiguiente: req, restante: req - xpNivel, progreso: Math.min(1, xpNivel / req) }
    }
    acumulado += req
    nivel++
  }
  return { nivel, xpNivel: 0, xpSiguiente: 0, restante: 0, progreso: 1 }
}

export const MISIONES_DIARIAS: Mision[] = [
  { id: 'm-tarjetas-15', titulo: 'Estudia 15 tarjetas', descripcion: 'Completá 15 tarjetas en cualquier actividad.', metrica: 'tarjetasEstudiadas', meta: 15, recompensaXp: 30, recompensaMonedas: 15, icono: 'layers' },
  { id: 'm-aciertos-20', titulo: 'Acertá 20 respuestas', descripcion: 'Conseguí 20 respuestas correctas hoy.', metrica: 'respuestasCorrectas', meta: 20, recompensaXp: 40, recompensaMonedas: 20, icono: 'target' },
  { id: 'm-subtema-1', titulo: 'Completá un subtema', descripcion: 'Terminá todas las actividades de un subtema.', metrica: 'subtemaCompletado', meta: 1, recompensaXp: 50, recompensaMonedas: 30, icono: 'flag' },
  { id: 'm-examen-1', titulo: 'Hacé un simulacro', descripcion: 'Completá un examen de práctica.', metrica: 'examenRealizado', meta: 1, recompensaXp: 45, recompensaMonedas: 25, icono: 'clipboard-check' },
  { id: 'm-dificiles-5', titulo: 'Repasá 5 difíciles', descripcion: 'Practicá 5 tarjetas marcadas como difíciles.', metrica: 'tarjetasDificiles', meta: 5, recompensaXp: 35, recompensaMonedas: 18, icono: 'flame' },
]

export const LOGROS: Logro[] = [
  { id: 'l-primera-tarjeta', titulo: 'Primera tarjeta', descripcion: 'Creá tu primera tarjeta de estudio.', icono: 'sparkles', meta: 1, metrica: 'tarjetasCreadas', recompensaXp: 20, recompensaMonedas: 10 },
  { id: 'l-10-tarjetas', titulo: 'Coleccionista', descripcion: 'Creá 10 tarjetas.', icono: 'library', meta: 10, metrica: 'tarjetasCreadas', recompensaXp: 40, recompensaMonedas: 20 },
  { id: 'l-50-tarjetas', titulo: 'Biblioteca propia', descripcion: 'Creá 50 tarjetas.', icono: 'book-open', meta: 50, metrica: 'tarjetasCreadas', recompensaXp: 120, recompensaMonedas: 60 },
  { id: 'l-100-correctas', titulo: 'Cien aciertos', descripcion: 'Acumulá 100 respuestas correctas.', icono: 'target', meta: 100, metrica: 'respuestasCorrectas', recompensaXp: 100, recompensaMonedas: 50 },
  { id: 'l-500-correctas', titulo: 'Memoria entrenada', descripcion: 'Acumulá 500 respuestas correctas.', icono: 'brain', meta: 500, metrica: 'respuestasCorrectas', recompensaXp: 250, recompensaMonedas: 120 },
  { id: 'l-3-dias', titulo: 'Tres días seguidos', descripcion: 'Estudiá 3 días consecutivos.', icono: 'flame', meta: 3, metrica: 'diasEstudio', recompensaXp: 60, recompensaMonedas: 30 },
  { id: 'l-10-dias', titulo: 'Constancia real', descripcion: 'Estudiá 10 días consecutivos.', icono: 'calendar-check', meta: 10, metrica: 'diasEstudio', recompensaXp: 180, recompensaMonedas: 90 },
  { id: 'l-primer-examen', titulo: 'Primer simulacro', descripcion: 'Aprobá tu primer examen con 60% o más.', icono: 'clipboard-check', meta: 1, metrica: 'examenesAprobados', recompensaXp: 80, recompensaMonedas: 40 },
  { id: 'l-50-dominadas', titulo: 'Cincuenta dominadas', descripcion: 'Dominá 50 tarjetas.', icono: 'crown', meta: 50, metrica: 'tarjetasDominadas', recompensaXp: 300, recompensaMonedas: 150 },
  { id: 'l-racha-10', titulo: 'Racha perfecta', descripcion: 'Encadená 10 respuestas correctas seguidas.', icono: 'zap', meta: 10, metrica: 'rachaPerfecta', recompensaXp: 70, recompensaMonedas: 35 },
  { id: 'l-unidad-completa', titulo: 'Primera unidad', descripcion: 'Completá una unidad entera.', icono: 'trophy', meta: 1, metrica: 'unidadesCompletadas', recompensaXp: 150, recompensaMonedas: 80 },
  { id: 'l-dominio-subtema', titulo: 'Tema dominado', descripcion: 'Dominá un subtema completo.', icono: 'gem', meta: 1, metrica: 'subtemaDominado', recompensaXp: 120, recompensaMonedas: 60 },
  { id: 'l-aplicacion', titulo: 'Saber aplicar', descripcion: 'Completá 10 prácticas de aplicación (casos o explicación).', icono: 'scale', meta: 10, metrica: 'practicasAplicadas', recompensaXp: 120, recompensaMonedas: 60 },
  { id: 'l-sesiones-25', titulo: 'Hábito instalado', descripcion: 'Completá 25 sesiones de estudio.', icono: 'repeat', meta: 25, metrica: 'sesionesCompletadas', recompensaXp: 160, recompensaMonedas: 80 },
]

export const CONFIG_DEFAULT = {
  id: 'config' as const,
  nuevoLimiteDiario: 40,
  repasosMaximosPorSesion: 30,
  tamanioSesion: 15,
  permitirSaltear: true,
  mostrarCronometroKahoot: true,
  segundosPorPregunta: 20,
  preguntasExamen: 20,
  minutosExamen: 25,
  puntosPorAciertoKahoot: 100,
}

export const COLORES_MATERIA = ['#6a51c4', '#1c7350', '#9a570f', '#1a7291', '#b83e37', '#f6c84a', '#35b779', '#8b6f47']
export const ICONOS_MATERIA = ['scale', 'book-open', 'briefcase', 'flask-conical', 'calculator', 'globe', 'heart-pulse', 'atom']
