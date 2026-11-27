/**
 * Chat de consulta por materia.
 *
 * Responde dudas usando como fuente el material que el usuario ya cargó en esa
 * materia (sus tarjetas, explicaciones y ejemplos). La regla es no inventar: si
 * el material no alcanza, lo dice en vez de rellenar con conocimiento general.
 */
import { db } from '../../db/database'
import type { Materia, Subtema, Tarjeta, Unidad } from '../../types/models'
import { ErrorIA } from './gemini'
import { convieneReintentar, MODELOS } from './modelos'
import { leerClave } from './almacenClave'

const BASE = 'https://generativelanguage.googleapis.com/v1beta'
/** Cuántos caracteres de material se mandan como contexto (entra sobrado en la ventana). */
const LIMITE_CONTEXTO = 120_000

export interface MensajeChat {
  rol: 'usuario' | 'tutor'
  texto: string
  en: number
}

export interface ContextoMateria {
  materia: Materia
  unidades: Unidad[]
  subtemas: Subtema[]
  tarjetas: Tarjeta[]
}

/** Junta todo el material de una materia para usarlo como fuente. */
export async function contextoDeMateria(materiaId: string): Promise<ContextoMateria | null> {
  const materia = await db.materias.get(materiaId)
  if (!materia) return null
  const [unidades, subtemas, tarjetas] = await Promise.all([
    db.unidades.where('materiaId').equals(materiaId).toArray(),
    db.subtemas.where('materiaId').equals(materiaId).toArray(),
    db.tarjetas.where('materiaId').equals(materiaId).toArray(),
  ])
  return {
    materia,
    unidades: unidades.sort((a, b) => a.orden - b.orden),
    subtemas: subtemas.sort((a, b) => a.orden - b.orden),
    tarjetas,
  }
}

/** Arma el texto de contexto que ve la IA, agrupado por subtema. */
export function textoDeContexto(ctx: ContextoMateria): string {
  const partes: string[] = [`Materia: ${ctx.materia.nombre}`, ctx.materia.descripcion]
  let total = 0

  for (const unidad of ctx.unidades) {
    const bloque: string[] = [`\n## ${unidad.nombre}`, unidad.descripcion]
    const subs = ctx.subtemas.filter((s) => s.unidadId === unidad.id)
    for (const sub of subs) {
      bloque.push(`\n### ${sub.nombre}`, sub.descripcion)
      const tarjetas = ctx.tarjetas.filter((t) => t.subtemaId === sub.id)
      for (const t of tarjetas) {
        const linea = [
          `- Pregunta: ${t.pregunta}`,
          `  Respuesta: ${t.respuesta}`,
          t.explicacion ? `  Explicación: ${t.explicacion}` : '',
          t.ejemplo ? `  Ejemplo: ${t.ejemplo}` : '',
          t.palabrasClave.length ? `  Conceptos clave: ${t.palabrasClave.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join('\n')
        if (total + linea.length > LIMITE_CONTEXTO) break
        bloque.push(linea)
        total += linea.length
      }
    }
    partes.push(bloque.join('\n'))
  }
  return partes.filter(Boolean).join('\n').slice(0, LIMITE_CONTEXTO)
}

const INSTRUCCIONES = `Sos el tutor de estudio de esta materia dentro de KNOWLEDGE. Ayudás a entender, no a aprobar sin estudiar.

Cómo respondés:
- Usá como fuente principal el MATERIAL de abajo. Si la respuesta está ahí, apoyate en él.
- Si el material no alcanza, decilo con claridad ("esto no está en tu material") y recién entonces podés aportar conocimiento general, avisando que es un agregado tuyo.
- Cuando el alumno te pide validar algo que estudió, decile si está correcto, qué falta y cuál es la formulación precisa. No des por bueno algo incompleto solo por no contradecirlo.
- Explicá con un ejemplo concreto cuando ayude; usá el material del alumno antes que ejemplos inventados.
- Español rioplatense, en segunda persona ("vos"), tono cercano y directo. Sin markdown: texto plano, párrafos cortos.
- Sé breve: 2 a 5 oraciones salvo que el alumno pida desarrollo.
- Si te preguntan algo de otra materia, aclaralo y ofrecé volver al tema.`

/** Envía una consulta y devuelve la respuesta del tutor. */
export async function preguntarAlTutor(
  ctx: ContextoMateria,
  historial: MensajeChat[],
  consulta: string,
  senal?: AbortSignal,
): Promise<string> {
  const clave = await leerClave()
  if (!clave) throw new ErrorIA('Falta la clave de IA. Cargala en Ajustes para consultar al tutor.', 'sin-clave')

  // El historial se manda recortado: alcanza con los últimos intercambios.
  const recientes = historial.slice(-8)
  const contents = [
    ...recientes.map((m) => ({ role: m.rol === 'usuario' ? 'user' : 'model', parts: [{ text: m.texto }] })),
    { role: 'user', parts: [{ text: consulta }] },
  ]

  const cuerpo = {
    systemInstruction: {
      parts: [{ text: `${INSTRUCCIONES}\n\nMATERIAL DEL ALUMNO:\n${textoDeContexto(ctx)}` }],
    },
    contents,
    generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
  }

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
      throw new ErrorIA('No pudimos conectar con el tutor. Revisá tu conexión.', 'red')
    }

    if (respuesta.ok) {
      const datos = (await respuesta.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
      }
      const texto = (datos.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim()
      if (!texto) throw new ErrorIA('El tutor no devolvió respuesta. Probá de nuevo.', 'formato')
      return texto
    }

    if (respuesta.status === 400 || respuesta.status === 403) {
      throw new ErrorIA('La clave de IA no es válida. Revisala en Ajustes.', 'clave-invalida')
    }
    if (respuesta.status === 429) throw new ErrorIA('Límite gratuito alcanzado. Esperá un minuto.', 'limite')
    if (convieneReintentar(respuesta.status)) {
      ultimoError = new ErrorIA('El tutor está saturado ahora. Probá en un minuto.', 'red')
      continue
    }
    throw new ErrorIA('El tutor no pudo responder ahora. Probá de nuevo.', 'desconocido')
  }
  throw ultimoError ?? new ErrorIA('El tutor no pudo responder. Probá de nuevo.', 'red')
}
