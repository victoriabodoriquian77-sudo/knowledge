import { describe, expect, it } from 'vitest'
import { compararCompletar, evaluarRespuestaAbierta, generarMultiple, generarVerdaderoFalso } from '../quiz'
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
