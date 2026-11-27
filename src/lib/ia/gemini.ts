/**
 * Cliente de Google Gemini: lee el PDF completo y devuelve el material de
 * estudio ya estructurado (unidades, subtemas, tarjetas y casos prácticos).
 *
 * Gemini Flash se eligió por tres razones concretas: entiende el PDF tal cual
 * (no hace falta extraer texto ni perder tablas e imágenes), es el más rápido
 * de su familia y su capa gratuita permite procesar documentos sin costo.
 */
import { leerClave } from './almacenClave'
import { convieneReintentar, MODELOS } from './modelos'

export { MODELO } from './modelos'

const BASE = 'https://generativelanguage.googleapis.com/v1beta'
const LIMITE_BYTES = 20 * 1024 * 1024

export class ErrorIA extends Error {
  constructor(
    mensaje: string,
    readonly tipo: 'sin-clave' | 'clave-invalida' | 'limite' | 'red' | 'documento' | 'formato' | 'desconocido',
  ) {
    super(mensaje)
  }
}

export interface TarjetaGenerada {
  pregunta: string
  respuesta: string
  explicacion: string
  ejemplo: string
  palabrasClave: string[]
  dificultad: 'facil' | 'media' | 'dificil'
  /** Caso aplicado: si viene, se usa para el modo de casos prácticos. */
  caso?: string
}

export interface SubtemaGenerado {
  nombre: string
  descripcion: string
  tarjetas: TarjetaGenerada[]
}

export interface UnidadGenerada {
  nombre: string
  descripcion: string
  subtemas: SubtemaGenerado[]
}

export interface MaterialGenerado {
  materia: { nombre: string; descripcion: string }
  unidades: UnidadGenerada[]
  /** Resumen del documento, para mostrar qué entendió la IA. */
  resumen: string
}

/** Lee un archivo como base64 sin el prefijo data: */
export function archivoABase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => {
      const r = String(lector.result)
      resolve(r.slice(r.indexOf(',') + 1))
    }
    lector.onerror = () => reject(new ErrorIA('No pudimos leer el archivo.', 'documento'))
    lector.readAsDataURL(archivo)
  })
}

/**
 * Detecta el caso más común de un libro en PDF: páginas que en realidad son
 * imágenes escaneadas. La IA las lee igual, pero conviene avisarlo porque el
 * resultado depende de la calidad del escaneo.
 */
export async function esPdfEscaneado(archivo: File): Promise<boolean> {
  try {
    const buffer = await archivo.slice(0, 4096).arrayBuffer()
    const cabecera = new TextDecoder('latin1').decode(buffer)
    // Un PDF con texto real incluye fuentes embebidas o texto; uno escaneado
    // tiene solo imágenes. Esta heurística es barata y solo orientativa.
    return !/\/Font|\/Text/i.test(cabecera)
  } catch {
    return false
  }
}

export function validarPdf(archivo: File): void {
  const esPdf = archivo.type === 'application/pdf' || /\.pdf$/i.test(archivo.name)
  if (!esPdf) throw new ErrorIA('El archivo tiene que ser un PDF.', 'documento')
  if (archivo.size > LIMITE_BYTES) {
    throw new ErrorIA('El PDF supera los 20 MB. Probá con uno más chico o dividilo.', 'limite')
  }
  if (archivo.size < 200) throw new ErrorIA('El PDF parece estar vacío.', 'documento')
}

async function pedir(cuerpo: unknown, senal?: AbortSignal): Promise<unknown> {
  const clave = await leerClave()
  if (!clave) throw new ErrorIA('Falta la clave de IA. Cargala en Ajustes para usar esta función.', 'sin-clave')

  let ultimoError: ErrorIA | null = null

  for (const modelo of MODELOS) {
    let respuesta: Response
    try {
      respuesta = await fetch(`${BASE}/models/${modelo}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify(cuerpo),
        signal: senal,
      })
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      throw new ErrorIA('No pudimos conectar con la IA. Revisá tu conexión.', 'red')
    }

    if (respuesta.ok) return respuesta.json()

    const detalle = await respuesta.text().catch(() => '')
    if (respuesta.status === 400 || respuesta.status === 403) {
      // La clave está mal: no tiene sentido probar otro modelo.
      throw new ErrorIA('La clave de IA no es válida o no tiene permiso. Revisala en Ajustes.', 'clave-invalida')
    }
    if (respuesta.status === 429) {
      throw new ErrorIA('Se alcanzó el límite gratuito por ahora. Esperá un minuto y reintentá.', 'limite')
    }
    if (convieneReintentar(respuesta.status)) {
      // Modelo saturado o renombrado: se prueba el siguiente y se recuerda el error.
      ultimoError = new ErrorIA(
        respuesta.status === 503
          ? 'La IA está saturada en este momento. Probá de nuevo en un minuto.'
          : `La IA respondió con un error (${respuesta.status}). ${detalle.slice(0, 100)}`,
        respuesta.status === 503 ? 'red' : 'desconocido',
      )
      continue
    }
    throw new ErrorIA(`La IA respondió con un error (${respuesta.status}). ${detalle.slice(0, 120)}`, 'desconocido')
  }

  throw ultimoError ?? new ErrorIA('Ningún modelo de IA respondió. Probá de nuevo en un momento.', 'red')
}

/** Extrae el texto de la respuesta del modelo. */
function textoDe(respuesta: unknown): string {
  const r = respuesta as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] }
  const candidato = r.candidates?.[0]
  if (candidato?.finishReason === 'SAFETY') {
    throw new ErrorIA('La IA bloqueó el contenido del documento. Probá con otro archivo.', 'documento')
  }
  if (candidato?.finishReason === 'MAX_TOKENS') {
    // El libro tenía tanto contenido que el material no entraba en una respuesta.
    throw new ErrorIA(
      'Este documento es muy largo para procesarlo de una vez. Dividí el PDF en partes de unas 40 páginas (o por capítulo) y subilas por separado: la app las va sumando a la misma materia.',
      'limite',
    )
  }
  const texto = (candidato?.content?.parts ?? []).map((p) => p.text ?? '').join('')
  if (!texto.trim()) throw new ErrorIA('La IA no devolvió contenido. Probá de nuevo.', 'formato')
  return texto
}

/** Quita los fences de markdown que a veces envuelven el JSON. */
function limpiarJson(texto: string): string {
  let t = texto.trim()
  const bloque = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (bloque) t = bloque[1].trim()
  const inicio = t.indexOf('{')
  const fin = t.lastIndexOf('}')
  if (inicio >= 0 && fin > inicio) t = t.slice(inicio, fin + 1)
  return t
}

const ESQUEMA_MATERIAL = {
  type: 'object',
  properties: {
    materia: {
      type: 'object',
      properties: { nombre: { type: 'string' }, descripcion: { type: 'string' } },
      required: ['nombre', 'descripcion'],
    },
    resumen: { type: 'string' },
    unidades: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          descripcion: { type: 'string' },
          subtemas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nombre: { type: 'string' },
                descripcion: { type: 'string' },
                tarjetas: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      pregunta: { type: 'string' },
                      respuesta: { type: 'string' },
                      explicacion: { type: 'string' },
                      ejemplo: { type: 'string' },
                      palabrasClave: { type: 'array', items: { type: 'string' } },
                      dificultad: { type: 'string', enum: ['facil', 'media', 'dificil'] },
                      caso: { type: 'string' },
                    },
                    required: ['pregunta', 'respuesta', 'explicacion', 'palabrasClave', 'dificultad'],
                  },
                },
              },
              required: ['nombre', 'descripcion', 'tarjetas'],
            },
          },
        },
        required: ['nombre', 'descripcion', 'subtemas'],
      },
    },
  },
  required: ['materia', 'resumen', 'unidades'],
} as const

const INSTRUCCIONES = `Sos un experto en diseño de material de estudio y en pedagogía. Recibís un documento PDF (apuntes, un capítulo, una ley, una guía) y tenés que convertirlo en material de estudio listo para memorizar y practicar.

Reglas estrictas:
1. Usá SOLO la información del documento. No inventes datos, artículos, plazos ni nombres que no estén en el texto. Si algo está incompleto, no lo completes de memoria.
2. Organizá el contenido en unidades y subtemas según la estructura real del documento (sus capítulos, títulos o bloques temáticos). No fuerces una cantidad: si el documento tiene 3 bloques, hacé 3 unidades.
3. Por cada subtema, creá entre 4 y 10 tarjetas. Cada tarjeta es UNA idea evaluable: una pregunta concreta y una respuesta clara.
4. La pregunta debe poder responderse sin ver el documento. Evitá "¿Qué dice el texto sobre...?".
5. La respuesta va en 1 a 3 oraciones completas, con el concepto y su explicación. Nada de respuestas de una sola palabra salvo que el concepto lo sea.
6. En "explicacion" agregá el porqué o el detalle que ayuda a entender; en "ejemplo" un caso corto y concreto cuando aporte.
7. "palabrasClave": 2 a 5 conceptos que DEBEN aparecer en una respuesta correcta. Son las que después se usan para evaluar si el alumno entendió, así que tienen que ser específicas del tema.
8. En "caso" escribí, cuando el tema lo permita, un caso práctico breve y aplicado (2 o 3 oraciones) que obligue a usar el concepto para resolverlo. Si no aplica, dejalo vacío.
9. "dificultad": facil si es definición directa, media si requiere relacionar, dificil si exige aplicar o distinguir matices.
10. Español rioplatense neutro, en segunda persona ("vos"), sin markdown ni viñetas dentro de los campos.
11. El nombre de la materia debe reflejar el tema del documento, corto y claro.

Devolvé únicamente el JSON que cumple el esquema pedido.`

/** Procesa el PDF y devuelve el material estructurado. */
export async function generarMaterialDesdePdf(
  archivo: File,
  opciones: { materiaSugerida?: string; instruccionExtra?: string; senal?: AbortSignal } = {},
): Promise<MaterialGenerado> {
  validarPdf(archivo)
  const base64 = await archivoABase64(archivo)

  const contexto = opciones.materiaSugerida
    ? `\n\nLa materia se va a llamar "${opciones.materiaSugerida}". Usá ese nombre exacto en el campo materia.nombre.`
    : ''
  const extra = opciones.instruccionExtra ? `\n\nIndicación adicional del usuario: ${opciones.instruccionExtra}` : ''

  const respuesta = await pedir(
    {
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: 'application/pdf', data: base64 } },
            { text: `${INSTRUCCIONES}${contexto}${extra}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: 'application/json',
        responseSchema: ESQUEMA_MATERIAL,
        maxOutputTokens: 32768,
      },
    },
    opciones.senal,
  )

  const texto = textoDe(respuesta)
  let datos: MaterialGenerado
  try {
    datos = JSON.parse(limpiarJson(texto)) as MaterialGenerado
  } catch {
    throw new ErrorIA('La IA devolvió un formato inesperado. Probá de nuevo.', 'formato')
  }
  return normalizarMaterial(datos)
}

/** Deja el material en una forma segura: sin campos vacíos raros ni listas rotas. */
export function normalizarMaterial(datos: MaterialGenerado): MaterialGenerado {
  const limpiar = (s: unknown, max = 2000): string => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  const unidades = (Array.isArray(datos.unidades) ? datos.unidades : [])
    .map((u) => ({
      nombre: limpiar(u.nombre, 120) || 'Unidad',
      descripcion: limpiar(u.descripcion, 400),
      subtemas: (Array.isArray(u.subtemas) ? u.subtemas : [])
        .map((s) => ({
          nombre: limpiar(s.nombre, 120) || 'Subtema',
          descripcion: limpiar(s.descripcion, 400),
          tarjetas: (Array.isArray(s.tarjetas) ? s.tarjetas : [])
            .filter((t) => limpiar(t.pregunta) && limpiar(t.respuesta))
            .map((t) => ({
              pregunta: limpiar(t.pregunta, 400),
              respuesta: limpiar(t.respuesta, 1200),
              explicacion: limpiar(t.explicacion, 800),
              ejemplo: limpiar(t.ejemplo, 400),
              palabrasClave: (Array.isArray(t.palabrasClave) ? t.palabrasClave : [])
                .map((p) => limpiar(p, 60))
                .filter(Boolean)
                .slice(0, 6),
              dificultad: (['facil', 'media', 'dificil'] as const).includes(t.dificultad) ? t.dificultad : 'media',
              caso: limpiar(t.caso, 600) || undefined,
            })),
        }))
        .filter((s) => s.tarjetas.length > 0),
    }))
    .filter((u) => u.subtemas.length > 0)

  if (!unidades.length) {
    throw new ErrorIA(
      'La IA no encontró contenido de estudio en ese PDF. Verificá que tenga texto (no solo imágenes escaneadas).',
      'documento',
    )
  }

  return {
    materia: {
      nombre: limpiar(datos.materia?.nombre, 80) || 'Materia nueva',
      descripcion: limpiar(datos.materia?.descripcion, 300),
    },
    resumen: limpiar(datos.resumen, 600),
    unidades,
  }
}
