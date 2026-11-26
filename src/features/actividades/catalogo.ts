import type { TipoActividad } from '../../types/models'
import {
  Brain,
  ClipboardCheck,
  Gamepad2,
  Layers,
  ListOrdered,
  MessageSquareQuote,
  PenLine,
  Repeat,
  SearchX,
  Shuffle,
  Sparkles,
  Target,
  ToggleLeft,
} from 'lucide-react'

export interface FichaActividad {
  tipo: TipoActividad
  titulo: string
  subtitulo: string
  descripcion: string
  icono: typeof Layers
  tono: string
  color: string
  /** Necesita al menos N tarjetas para funcionar bien. */
  minimo: number
  cronometro: boolean
  etiqueta?: string
}

export const ACTIVIDADES: FichaActividad[] = [
  {
    tipo: 'flashcards',
    titulo: 'Tarjetas clásicas',
    subtitulo: 'Pregunta y respuesta a tu ritmo',
    descripcion: 'Leés la pregunta, pensás la respuesta, girás la tarjeta y declarás qué tan bien la sabías. Sin límite de tiempo.',
    icono: Layers,
    tono: 'bg-grape-tint text-grape',
    color: '#7961d8',
    minimo: 1,
    cronometro: false,
  },
  {
    tipo: 'multiple',
    titulo: 'Opción múltiple',
    subtitulo: 'Elegí la respuesta correcta',
    descripcion: 'Cuatro opciones, una correcta. Los distractores salen de tus propias tarjetas para que no sea obvio.',
    icono: Target,
    tono: 'bg-sky-tint text-sky',
    color: '#56b8d9',
    minimo: 4,
    cronometro: false,
  },
  {
    tipo: 'verdadero-falso',
    titulo: 'Verdadero o falso',
    subtitulo: 'Evaluá afirmaciones',
    descripcion: 'Afirmaciones construidas desde tus tarjetas, con explicación de por qué son verdaderas o falsas.',
    icono: ToggleLeft,
    tono: 'bg-mango-tint text-mango',
    color: '#f39a48',
    minimo: 2,
    cronometro: false,
  },
  {
    tipo: 'completar',
    titulo: 'Completar espacios',
    subtitulo: 'Recuperá conceptos clave',
    descripcion: 'Una definición con una palabra faltante. Escribís la respuesta y el sistema la compara con tolerancia.',
    icono: PenLine,
    tono: 'bg-coral-tint text-coral',
    color: '#f17d78',
    minimo: 1,
    cronometro: false,
  },
  {
    tipo: 'escrita',
    titulo: 'Respuesta escrita',
    subtitulo: 'Explicá con tus palabras',
    descripcion: 'Desarrollás la respuesta libremente. Ves conceptos presentes y faltantes, y podés autoevaluarte.',
    icono: Brain,
    tono: 'bg-grass-tint text-grass',
    color: '#23885c',
    minimo: 1,
    cronometro: false,
  },
  {
    tipo: 'examen',
    titulo: 'Modo examen',
    subtitulo: 'Simulá una evaluación',
    descripcion: 'Mezcla de preguntas con tiempo configurable. Al final: nota, precisión, temas a reforzar y recomendaciones.',
    icono: ClipboardCheck,
    tono: 'bg-grape-tint text-grape',
    color: '#7961d8',
    minimo: 4,
    cronometro: true,
  },
  {
    tipo: 'kahoot',
    titulo: 'Desafío individual',
    subtitulo: 'Tiempo, puntos y rachas',
    descripcion: 'Preguntas rápidas con cronómetro, multiplicadores por racha y récord personal. Jugás contra tu mejor marca.',
    icono: Gamepad2,
    tono: 'bg-mango-tint text-mango',
    color: '#f39a48',
    minimo: 4,
    cronometro: true,
    etiqueta: 'Popular',
  },
  {
    tipo: 'relacionar',
    titulo: 'Uní los conceptos',
    subtitulo: 'Encontrá las relaciones',
    descripcion: 'Dos columnas: conceptos y definiciones. Tocás un par para unirlo y verificás al instante.',
    icono: Shuffle,
    tono: 'bg-sky-tint text-sky',
    color: '#56b8d9',
    minimo: 3,
    cronometro: false,
  },
  {
    tipo: 'ordenar',
    titulo: 'Ordená la información',
    subtitulo: 'Reconstruí una secuencia',
    descripcion: 'Reordenás etapas, requisitos o procedimientos tomados del orden real de tu respuesta.',
    icono: ListOrdered,
    tono: 'bg-coral-tint text-coral',
    color: '#f17d78',
    minimo: 1,
    cronometro: false,
  },
  {
    tipo: 'detectar-error',
    titulo: 'Detectá el error',
    subtitulo: 'Encontrá qué no encaja',
    descripcion: 'Una explicación con un error intencional. Marcás el error y después ves la corrección completa.',
    icono: SearchX,
    tono: 'bg-grass-tint text-grass',
    color: '#35b779',
    minimo: 2,
    cronometro: false,
  },
  {
    tipo: 'caso-practico',
    titulo: 'Casos prácticos',
    subtitulo: 'Llevá la teoría a situaciones',
    descripcion: 'Una situación ficticia y opciones de resolución. También podés justificar por escrito.',
    icono: ClipboardCheck,
    tono: 'bg-grape-tint text-grape',
    color: '#7961d8',
    minimo: 4,
    cronometro: false,
  },
  {
    tipo: 'explicar',
    titulo: 'Explicárselo a alguien',
    subtitulo: 'Enseñá para comprobar que sabés',
    descripcion: 'Explicás el concepto como si se lo contaras a otra persona. El sistema compara con tus conceptos esenciales.',
    icono: MessageSquareQuote,
    tono: 'bg-mango-tint text-mango',
    color: '#f39a48',
    minimo: 1,
    cronometro: false,
  },
  {
    tipo: 'repaso',
    titulo: 'Repaso espaciado',
    subtitulo: 'Volvé en el momento justo',
    descripcion: 'Solo las tarjetas que el sistema programó para hoy. Las difíciles aparecen antes; las dominadas, menos.',
    icono: Repeat,
    tono: 'bg-sun-tint text-sun-deep',
    color: '#f6c84a',
    minimo: 1,
    cronometro: false,
  },
]

export const FICHA = (tipo: TipoActividad): FichaActividad =>
  ACTIVIDADES.find((a) => a.tipo === tipo) ?? ACTIVIDADES[0]

export const IconoSparks = Sparkles
