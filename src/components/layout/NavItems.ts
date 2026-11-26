import { Home, Route, Gamepad2, Layers, ChartNoAxesColumn, UserRound } from 'lucide-react'

export const NAV = [
  { ruta: '/', etiqueta: 'Inicio', corta: 'Inicio', icono: Home },
  { ruta: '/aprender', etiqueta: 'Aprender', corta: 'Aprender', icono: Route },
  { ruta: '/juegos', etiqueta: 'Juegos', corta: 'Juegos', icono: Gamepad2 },
  { ruta: '/tarjetas', etiqueta: 'Flashcards', corta: 'Tarjetas', icono: Layers },
  { ruta: '/estadisticas', etiqueta: 'Estadísticas', corta: 'Progreso', icono: ChartNoAxesColumn },
  { ruta: '/perfil', etiqueta: 'Perfil', corta: 'Perfil', icono: UserRound },
] as const

export const NAV_MOVIL = NAV.filter((n) => n.ruta !== '/perfil')
