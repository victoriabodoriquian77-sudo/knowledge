import { describe, expect, it } from 'vitest'
import { compararCompletar, evaluarRespuestaAbierta, generarCompletar, generarMultiple, generarRelacionar, generarVerdaderoFalso } from '../quiz'
import type { Ejercicio } from '../quiz'

// El generador devuelve una unión: estos ayudantes la estrechan para poder leer
// los campos propios de cada modo sin ensuciar las pruebas con casts.
function completarDe(t: Parameters<typeof generarCompletar>[0]): Extract<Ejercicio, { tipo: 'completar' }> {
  return generarCompletar(t) as Extract<Ejercicio, { tipo: 'completar' }>
}
function relacionarDe(ts: Parameters<typeof generarRelacionar>[0], n?: number): Extract<Ejercicio, { tipo: 'relacionar' }> {
  return generarRelacionar(ts, n) as Extract<Ejercicio, { tipo: 'relacionar' }>
}
import type { Tarjeta } from '../../types/models'

const tarjeta: Tarjeta = {
  id: 'tar_1',
  materiaId: 'mat_1',
  unidadId: 'uni_1',
  subtemaId: 'sub_1',
  pregunta: '¿Qué es la relación de consumo?',
  respuesta: 'Es el vínculo jurídico entre un proveedor y un consumidor que tiene por objeto bienes o servicios.',
  explicacion: 'Surge del artículo 3 de la Ley 24.240.',
  ejemplo: '',
  palabrasClave: ['vínculo jurídico', 'proveedor', 'consumidor', 'bienes', 'servicios'],
  capitulo: '',
  pagina: '',
  dificultad: 'media',
  favorita: false,
  creadaEn: 0,
  actualizadaEn: 0,
}

const pool: Tarjeta[] = [
  tarjeta,
  { ...tarjeta, id: 'tar_2', pregunta: '¿Qué es una cláusula abusiva?', respuesta: 'Es la que perjudica desproporcionadamente al consumidor.', palabrasClave: ['cláusula', 'abusiva'] },
  { ...tarjeta, id: 'tar_3', pregunta: '¿Qué es la garantía legal?', respuesta: 'Es la obligación de responder por defectos del producto.', palabrasClave: ['garantía', 'defecto'] },
  { ...tarjeta, id: 'tar_4', pregunta: '¿Qué es un proveedor?', respuesta: 'Es quien comercializa bienes o presta servicios de forma profesional.', palabrasClave: ['proveedor', 'profesional'] },
  { ...tarjeta, id: 'tar_5', pregunta: '¿Qué es el consumo?', respuesta: 'Es la utilización de bienes o servicios como destinatario final.', palabrasClave: ['consumo', 'destinatario'] },
]

describe('evaluación de respuestas abiertas', () => {
  it('acepta una respuesta con los conceptos, aunque use otras palabras', () => {
    const r = evaluarRespuestaAbierta(
      'Es el vinculo juridico que une al proveedor con el consumidor y que tiene como objeto bienes o servicios.',
      tarjeta,
    )
    expect(r.presentes.length).toBeGreaterThanOrEqual(3)
    expect(r.puntaje).toBeGreaterThan(0.5)
  })

  it('ignora acentos y mayúsculas', () => {
    const conAcentos = evaluarRespuestaAbierta('VINCULO JURIDICO entre PROVEEDOR y CONSUMIDOR sobre bienes y servicios', tarjeta)
    const sinAcentos = evaluarRespuestaAbierta('vinculo juridico entre proveedor y consumidor sobre bienes y servicios', tarjeta)
    expect(conAcentos.puntaje).toBe(sinAcentos.puntaje)
  })

  it('detecta los conceptos que faltan', () => {
    const r = evaluarRespuestaAbierta('Es un vínculo.', tarjeta)
    expect(r.faltantes.length).toBeGreaterThan(0)
    expect(r.puntaje).toBeLessThan(0.6)
  })

  it('no falla por redacción distinta si están los conceptos', () => {
    const r = evaluarRespuestaAbierta(
      'Se trata de la vinculación jurídica que se da entre quien provee y quien consume, respecto de bienes y de servicios.',
      tarjeta,
    )
    expect(r.puntaje).toBeGreaterThan(0.4)
    expect(r.faltantes.length).toBeLessThan(tarjeta.palabrasClave.length)
  })

  it('una respuesta vacía puntúa cero', () => {
    const r = evaluarRespuestaAbierta('', tarjeta)
    expect(r.puntaje).toBe(0)
    expect(r.presentes).toHaveLength(0)
  })
})

describe('completar espacios', () => {
  it('tolera acentos, mayúsculas y sufijos', () => {
    expect(compararCompletar('Vínculo', 'vinculo')).toBe(true)
    expect(compararCompletar('proveedores', 'proveedor')).toBe(true)
  })

  it('rechaza respuestas vacías o sin relación', () => {
    expect(compararCompletar('', 'proveedor')).toBe(false)
    expect(compararCompletar('banana', 'proveedor')).toBe(false)
  })
})

describe('generación de preguntas', () => {
  it('opción múltiple: 4 opciones, una sola correcta, sin repetir textos', () => {
    const e = generarMultiple(tarjeta, pool)
    expect(e.tipo).toBe('multiple')
    if (e.tipo !== 'multiple') return
    expect(e.opciones).toHaveLength(4)
    expect(e.opciones.filter((o) => o.correcta)).toHaveLength(1)
    const textos = new Set(e.opciones.map((o) => o.texto))
    expect(textos.size).toBe(4)
    expect(e.opciones.find((o) => o.correcta)!.texto).toBe(tarjeta.respuesta)
  })

  it('verdadero o falso siempre incluye explicación', () => {
    const e = generarVerdaderoFalso(tarjeta, pool)
    expect(e.tipo).toBe('verdadero-falso')
    if (e.tipo !== 'verdadero-falso') return
    expect(typeof e.esVerdadera).toBe('boolean')
    expect(e.explicacion.length).toBeGreaterThan(0)
    expect(e.afirmacion.length).toBeGreaterThan(10)
  })
})

describe('completar espacios', () => {
  const letras = (t: string) => t.replace(/_+/g, '').match(/\p{L}/gu)?.length ?? 0

  it('nunca deja una oración vacía: siempre hay contexto para leer', () => {
    const casos = [
      tarjeta,
      { ...tarjeta, respuesta: 'Consumidor', palabrasClave: ['consumidor'] },
      { ...tarjeta, respuesta: 'Trato digno', palabrasClave: ['trato'] },
      { ...tarjeta, respuesta: 'La obligación del proveedor de dar datos ciertos y claros.' },
    ]
    for (const t of casos) {
      const e = completarDe(t)
      // Siempre queda texto legible además del hueco y una respuesta que lo llena.
      expect(letras(e.oracion)).toBeGreaterThan(0)
      expect(e.respuesta.trim().length).toBeGreaterThan(0)
      expect(e.oracion).toContain('__________')
    }
  })

  it('con una respuesta corta usa la pregunta como contexto', () => {
    const e = completarDe({ ...tarjeta, pregunta: '¿Quién es consumidor?', respuesta: 'Consumidor' })
    expect(e.oracion).toContain('¿Quién es consumidor?')
    expect(e.respuesta).toBe('Consumidor')
  })

  it('con una respuesta larga tapa un concepto dentro de la frase', () => {
    const e = completarDe(tarjeta)
    // Queda texto de la propia respuesta rodeando el hueco.
    expect(e.oracion).not.toBe('__________')
    expect(letras(e.oracion)).toBeGreaterThan(10)
    // Lo que hay que escribir sale de la respuesta original.
    const limpio = (t: string) => t.toLowerCase().replace(/[.,;:]/g, '')
    expect(limpio(tarjeta.respuesta)).toContain(limpio(e.respuesta))
  })
})

describe('relacionar conceptos', () => {
  it('no repite etiquetas: cada par se puede distinguir en pantalla', () => {
    // Dos tarjetas con la misma pregunta (caso real al duplicar tarjetas)
    const repetidas: Tarjeta[] = [
      tarjeta,
      { ...tarjeta, id: 'tar_dup' },
      { ...pool[1], id: 'tar_b' },
      { ...pool[2], id: 'tar_c' },
    ]
    const e = relacionarDe(repetidas, 4)
    const izquierdas: string[] = e.pares.map((p: { izquierda: string }) => p.izquierda.toLowerCase())
    const derechas: string[] = e.pares.map((p: { derecha: string }) => p.derecha.toLowerCase())
    expect(new Set(izquierdas).size).toBe(izquierdas.length)
    expect(new Set(derechas).size).toBe(derechas.length)
    expect(e.pares.length).toBeGreaterThanOrEqual(3)
  })

  it('cada par apunta a una tarjeta real y trae ambos lados', () => {
    const e = relacionarDe(pool, 4)
    for (const p of e.pares) {
      expect(pool.some((t) => t.id === p.tarjetaId)).toBe(true)
      expect(p.izquierda.trim().length).toBeGreaterThan(0)
      expect(p.derecha.trim().length).toBeGreaterThan(0)
    }
  })
})
