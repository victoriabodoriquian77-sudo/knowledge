import type { Dimension, Tarjeta, TipoActividad, Dificultad } from '../types/models'

export interface OpcionMultiple {
  texto: string
  correcta: boolean
}

export type Ejercicio =
  | { tipo: 'multiple'; tarjeta: Tarjeta; opciones: OpcionMultiple[]; consigna: string }
  | { tipo: 'verdadero-falso'; tarjeta: Tarjeta; afirmacion: string; esVerdadera: boolean; explicacion: string }
  | { tipo: 'completar'; tarjeta: Tarjeta; oracion: string; respuesta: string; pista: string }
  | { tipo: 'escrita'; tarjeta: Tarjeta; consigna: string }
  | { tipo: 'relacionar'; pares: { izquierda: string; derecha: string; tarjetaId: string }[]; tarjetas: Tarjeta[] }
  | { tipo: 'ordenar'; tarjeta: Tarjeta; elementos: string[]; ordenCorrecto: string[] }
  | { tipo: 'detectar-error'; tarjeta: Tarjeta; explicacionConError: string; error: string; correccion: string }
  | { tipo: 'caso-practico'; tarjeta: Tarjeta; caso: string; opciones: OpcionMultiple[]; consigna: string }
  | { tipo: 'explicar'; tarjeta: Tarjeta }

export const DIMENSION_POR_TIPO: Record<TipoActividad, Dimension> = {
  flashcards: 'recuperacion',
  multiple: 'reconocimiento',
  'verdadero-falso': 'reconocimiento',
  completar: 'recuperacion',
  escrita: 'comprension',
  examen: 'comprension',
  kahoot: 'reconocimiento',
  relacionar: 'reconocimiento',
  ordenar: 'comprension',
  'detectar-error': 'comprension',
  'caso-practico': 'aplicacion',
  explicar: 'aplicacion',
  repaso: 'recuperacion',
}

const shuffle = <T,>(arr: T[], seed = Math.random()): T[] => {
  const a = [...arr]
  let s = Math.floor(seed * 1e9) || 1
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export { shuffle }

const limpiar = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

const acortar = (s: string, max = 140) => (s.length <= max ? s : s.slice(0, max - 1).trim() + '…')

/** Extrae términos candidatos: palabras clave o conceptos en negrita. */
export function conceptosDe(t: Tarjeta): string[] {
  const deClaves = t.palabrasClave.map((p) => p.trim()).filter(Boolean)
  const enNegrita = [...t.respuesta.matchAll(/<strong>(.*?)<\/strong>/gi)].map((m) => limpiar(m[1]))
  const base = deClaves.length ? deClaves : enNegrita
  if (base.length) return [...new Set(base.map((b) => b.trim()))].filter((b) => b.length > 2)
  const palabras = limpiar(t.respuesta)
    .split(/[,.;:()]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4)
  return palabras.slice(0, 5)
}

export function generarOpciones(tarjeta: Tarjeta, pool: Tarjeta[], cantidad = 4, campo: 'respuesta' | 'pregunta' = 'respuesta'): OpcionMultiple[] {
  const correcta = limpiar(campo === 'respuesta' ? tarjeta.respuesta : tarjeta.pregunta)
  const mismos = pool.filter((t) => t.id !== tarjeta.id && t.subtemaId === tarjeta.subtemaId)
  const otros = pool.filter((t) => t.id !== tarjeta.id && t.subtemaId !== tarjeta.subtemaId)
  const candidatos = [...shuffle(mismos), ...shuffle(otros)]
  const vistos = new Set([correcta.toLowerCase()])
  const distractores: string[] = []
  for (const c of candidatos) {
    const texto = limpiar(campo === 'respuesta' ? c.respuesta : c.pregunta)
    const clave = texto.toLowerCase()
    if (texto.length < 3 || vistos.has(clave)) continue
    vistos.add(clave)
    distractores.push(acortar(texto, 170))
    if (distractores.length >= cantidad - 1) break
  }
  while (distractores.length < cantidad - 1) {
    distractores.push(`Ninguna de las otras opciones (${distractores.length + 1})`)
  }
  return shuffle([
    { texto: acortar(correcta, 170), correcta: true },
    ...distractores.map((d) => ({ texto: d, correcta: false })),
  ])
}

export function generarMultiple(t: Tarjeta, pool: Tarjeta[]): Ejercicio {
  return {
    tipo: 'multiple',
    tarjeta: t,
    opciones: generarOpciones(t, pool),
    consigna: 'Elegí la respuesta correcta',
  }
}

export function generarVerdaderoFalso(t: Tarjeta, pool: Tarjeta[]): Ejercicio {
  const esVerdadera = Math.random() > 0.5
  if (esVerdadera) {
    return {
      tipo: 'verdadero-falso',
      tarjeta: t,
      afirmacion: `${limpiar(t.pregunta)}\n\n→ ${limpiar(t.respuesta)}`,
      esVerdadera: true,
      explicacion: t.explicacion ? limpiar(t.explicacion) : 'La afirmación coincide con tu tarjeta.',
    }
  }
  const otros = pool.filter((x) => x.id !== t.id)
  const falso = otros.length ? shuffle(otros)[0] : null
  const respuestaFalsa = falso ? limpiar(falso.respuesta) : 'Una afirmación que no corresponde al concepto.'
  return {
    tipo: 'verdadero-falso',
    tarjeta: t,
    afirmacion: `${limpiar(t.pregunta)}\n\n→ ${acortar(respuestaFalsa, 220)}`,
    esVerdadera: false,
    explicacion: `La respuesta correcta es: ${limpiar(t.respuesta)}${falso ? ` (La opción mostrada pertenece a otra tarjeta: «${limpiar(falso.pregunta)}»)` : ''}`,
  }
}

export function generarCompletar(t: Tarjeta): Ejercicio {
  const conceptos = conceptosDe(t)
  const respuestaTexto = limpiar(t.respuesta)
  const pista = limpiar(t.pregunta)

  // Una respuesta corta ("Consumidor", "Trato digno") no da oración: borrarla
  // dejaría solo "__________" sin nada que leer. En ese caso usamos la pregunta
  // como oración y se completa con la respuesta.
  const palabrasRespuesta = respuestaTexto.split(/\s+/).filter(Boolean)
  const esCorta = palabrasRespuesta.length <= 3 || respuestaTexto.length < 25

  if (esCorta) {
    return {
      tipo: 'completar',
      tarjeta: t,
      // La pregunta ya viene con su propio "?" o ":" ; conservamos el signo de
      // cierre y agregamos el hueco después, sin comérnoslo.
      oracion: /[?:]\s*$/.test(pista) ? `${pista} __________` : `${pista}: __________`,
      respuesta: respuestaTexto,
      pista: `Empieza con «${respuestaTexto.slice(0, 1).toUpperCase()}»`,
    }
  }

  // Respuesta larga: elegimos un concepto concreto y lo tapamos dentro de la frase.
  const palabraSuelta = (): string => {
    const candidatas = palabrasRespuesta.filter((p) => p.length > 5 && !/^(porque|cuando|donde|mientras|aunque)$/i.test(p))
    return candidatas.sort((a, b) => b.length - a.length)[0] ?? palabrasRespuesta[0] ?? respuestaTexto.slice(0, 20)
  }

  let objetivo = conceptos.find((c) => respuestaTexto.toLowerCase().includes(c.toLowerCase())) ?? palabraSuelta()
  const tapar = (palabra: string) =>
    respuestaTexto.replace(new RegExp(palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '__________')

  let oracion = tapar(objetivo)
  if (oracion.replace(/_+/g, '').replace(/[^\p{L}]/gu, '').length < 8) {
    objetivo = palabraSuelta()
    oracion = tapar(objetivo)
    if (oracion === respuestaTexto) oracion = `${respuestaTexto} → __________`
  }
  return {
    tipo: 'completar',
    tarjeta: t,
    oracion,
    respuesta: objetivo,
    pista,
  }
}

export function generarEscrita(t: Tarjeta): Ejercicio {
  return { tipo: 'escrita', tarjeta: t, consigna: 'Desarrollá la respuesta con tus palabras' }
}

/** Etiqueta corta para la columna de conceptos: palabra clave o frase nominal. */
function etiquetaCorta(t: Tarjeta): string {
  if (t.palabrasClave.length) {
    const clave = t.palabrasClave[0]
    return clave.charAt(0).toUpperCase() + clave.slice(1)
  }
  const base = limpiar(t.pregunta).replace(/^¿/, '').replace(/\?$/, '')
  const corte = base.split(/[,;:]|\bque\b/i)[0].trim()
  const texto = corte.length > 4 ? corte : base
  return texto.length > 62 ? texto.slice(0, 61).trimEnd() + '…' : texto
}

/** Definición breve: primera oración con contenido real, recortada con criterio. */
function definicionCorta(t: Tarjeta): string {
  const texto = limpiar(t.respuesta)
  const oraciones = texto.split(/(?<=\.)\s+/)
  // "No." o "Sí." solas no sirven como definición: se busca la primera con cuerpo.
  const elegida = oraciones.find((o) => o.replace(/[^\p{L}\p{N}]/gu, '').length > 24) ?? oraciones[0] ?? texto
  return elegida.length > 180 ? elegida.slice(0, 179).trimEnd() + '…' : elegida
}

export function generarRelacionar(tarjetas: Tarjeta[], cantidad = 4): Ejercicio {
  const objetivo = Math.max(3, Math.min(cantidad, tarjetas.length))

  // Dos tarjetas con la misma pregunta (o la misma definición) darían etiquetas
  // idénticas: en pantalla no se podría saber cuál es cuál y el par quedaría
  // imposible de armar. Se eligen solo tarjetas que aporten algo distinto.
  const usadasIzq = new Set<string>()
  const usadasDer = new Set<string>()
  const elegidas: Tarjeta[] = []
  for (const t of shuffle(tarjetas)) {
    if (elegidas.length >= objetivo) break
    const izq = etiquetaCorta(t).toLowerCase()
    const der = definicionCorta(t).toLowerCase()
    if (usadasIzq.has(izq) || usadasDer.has(der)) continue
    usadasIzq.add(izq)
    usadasDer.add(der)
    elegidas.push(t)
  }
  // Si no alcanzan las distintas, se completa con las que haya (mejor eso que menos pares).
  if (elegidas.length < Math.min(3, tarjetas.length)) {
    for (const t of tarjetas) {
      if (elegidas.length >= Math.min(3, tarjetas.length)) break
      if (!elegidas.some((x) => x.id === t.id)) elegidas.push(t)
    }
  }

  return {
    tipo: 'relacionar',
    tarjetas: elegidas,
    pares: elegidas.map((t) => ({
      izquierda: etiquetaCorta(t),
      derecha: definicionCorta(t),
      tarjetaId: t.id,
    })),
  }
}

/**
 * Ordenar usa el orden natural de ideas dentro de la respuesta ampliada
 * (separadas por saltos de línea, números o viñetas). Si la tarjeta no tiene
 * una secuencia explícita, se usa la pregunta como ancla y se ofrecen los
 * conceptos clave de la respuesta para reconstruir.
 */
export function puedeOrdenar(t: Tarjeta): boolean {
  const lineas = t.respuesta
    .split(/\n|(?:^|\s)(?:\d+[).]\s|[-•*]\s)/)
    .map((l) => limpiar(l))
    .filter((l) => l.length > 3)
  return lineas.length >= 3
}

export function generarOrdenar(t: Tarjeta): Ejercicio {
  const lineas = t.respuesta
    .split(/\n|(?:^|\s)(?:\d+[).]\s|[-•*]\s)/)
    .map((l) => limpiar(l))
    .filter((l) => l.length > 3)
  const elementos = shuffle(lineas)
  return { tipo: 'ordenar', tarjeta: t, elementos, ordenCorrecto: lineas }
}

export function generarDetectarError(t: Tarjeta, pool: Tarjeta[]): Ejercicio {
  const propia = conceptosDe(t)
  const otros = pool.filter((x) => x.id !== t.id)
  const intruso = otros.length ? conceptosDe(shuffle(otros)[0])[0] : 'un concepto ajeno al tema'
  const clave = propia[0] ?? limpiar(t.respuesta).split(' ').slice(0, 3).join(' ')
  const explicacionConError = `${limpiar(t.respuesta)}\n\nAdemás, este concepto se relaciona directamente con ${intruso}, que forma parte del mismo instituto jurídico.`
  return {
    tipo: 'detectar-error',
    tarjeta: t,
    explicacionConError,
    error: intruso,
    correccion: `El agregado sobre «${intruso}» no corresponde. Lo correcto es: ${limpiar(t.respuesta)}${clave ? ` (concepto central: ${clave})` : ''}`,
  }
}

export function generarCasoPractico(t: Tarjeta, pool: Tarjeta[]): Ejercicio {
  const caso = `Situación: se presenta un conflicto donde entra en juego «${limpiar(t.pregunta)}». ¿Qué respuesta refleja mejor el marco teórico que estudiaste?`
  return {
    tipo: 'caso-practico',
    tarjeta: t,
    caso,
    opciones: generarOpciones(t, pool),
    consigna: 'Aplicá el concepto al caso',
  }
}

export function generarExplicar(t: Tarjeta): Ejercicio {
  return { tipo: 'explicar', tarjeta: t }
}

/** Normaliza para comparar respuestas abiertas. */
const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9áéíóúñü\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Raíz aproximada de una palabra: recorta plurales y sufijos derivativos
 * frecuentes en español, para que "vínculo", "vinculación" y "vinculante"
 * cuenten como la misma idea. Comparar redacción exacta sería castigar al
 * estudiante por escribir bien.
 */
const raiz = (p: string): string => {
  let r = p.replace(/(es|s)$/i, '')
  r = r.replace(/(cion|ciones|miento|mientos|dad|dades|ivo|iva|ivos|ivas|ante|antes|ar|er|ir)$/i, '')
  return r.length >= 4 ? r : p.replace(/(es|s)$/i, '')
}

/** Dos palabras son equivalentes si comparten una raíz suficientemente larga. */
const mismaFamilia = (a: string, b: string): boolean => {
  if (a === b) return true
  const [corto, largo] = a.length <= b.length ? [a, b] : [b, a]
  if (corto.length < 4) return false
  if (largo.startsWith(corto) && corto.length >= 5) return true
  let prefijo = 0
  while (prefijo < corto.length && corto[prefijo] === largo[prefijo]) prefijo++
  return prefijo >= Math.min(6, corto.length)
}

export interface EvaluacionAbierta {
  presentes: string[]
  faltantes: string[]
  puntaje: number
}

/**
 * Evalúa una respuesta libre comparando conceptos clave con tolerancia:
 * coincidencia por raíz de palabra, no por redacción exacta.
 * Nunca castiga por sinónimos ni por estilo: devuelve conceptos presentes/faltantes.
 */
export function evaluarRespuestaAbierta(respuestaUsuario: string, tarjeta: Tarjeta): EvaluacionAbierta {
  const conceptos = conceptosDe(tarjeta)
  const texto = normalizar(respuestaUsuario)
  const palabras = new Set(texto.split(' ').filter(Boolean).map(raiz))
  const presentes: string[] = []
  const faltantes: string[] = []
  const lista = [...palabras]
  for (const c of conceptos) {
    const partes = normalizar(c).split(' ').filter((p) => p.length > 3)
    const coincide = (p: string) => lista.some((w) => mismaFamilia(raiz(p), w))
    const encontrado = partes.length
      ? partes.filter(coincide).length / partes.length >= 0.6
      : coincide(normalizar(c))
    if (encontrado) presentes.push(c)
    else faltantes.push(c)
  }
  const cobertura = conceptos.length ? presentes.length / conceptos.length : 0
  const extension = Math.min(1, texto.split(' ').length / 25)
  const puntaje = Math.round(Math.max(0, Math.min(1, cobertura * 0.8 + extension * 0.2) * 100) / 100)
  return { presentes, faltantes, puntaje }
}

export function compararCompletar(respuesta: string, esperada: string): boolean {
  const a = normalizar(respuesta)
  const b = normalizar(esperada)
  if (!a) return false
  return a === b || a.includes(b) || b.includes(a)
}

export interface SeleccionTarjetas {
  tarjetas: Tarjeta[]
  pool: Tarjeta[]
}

export function filtrarPorDificultad(tarjetas: Tarjeta[], dificultad?: Dificultad | 'todas'): Tarjeta[] {
  if (!dificultad || dificultad === 'todas') return tarjetas
  return tarjetas.filter((t) => t.dificultad === dificultad)
}
