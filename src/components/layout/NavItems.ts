import { Home, Route, Gamepad2, Layers, ChartNoAxesColumn, UserRound, Sparkles } from 'lucide-react'

export const NAV = [
  { ruta: '/', etiqueta: 'Inicio', corta: 'Inicio', icono: Home },
  { ruta: '/aprender', etiqueta: 'Aprender', corta: 'Aprender', icono: Route },
  { ruta: '/ia', etiqueta: 'IA', corta: 'IA', icono: Sparkles },
  { ruta: '/juegos', etiqueta: 'Juegos', corta: 'Juegos', icono: Gamepad2 },
  { ruta: '/tarjetas', etiqueta: 'Flashcards', corta: 'Tarjetas', icono: Layers },
  { ruta: '/estadisticas', etiqueta: 'Estadísticas', corta: 'Progreso', icono: ChartNoAxesColumn },
  { ruta: '/perfil', etiqueta: 'Perfil', corta: 'Perfil', icono: UserRound },
] as const

/**
 * En el teléfono entran seis: Inicio, Aprender, IA, Juegos, Tarjetas y Progreso.
 * Perfil queda en el escritorio y en el menú de cuenta, porque es de uso
 * esporádico. Seis es el máximo que mantiene cada toque por encima de 60 px.
 */
export const NAV_MOVIL = NAV.filter((n) => n.ruta !== '/perfil')
