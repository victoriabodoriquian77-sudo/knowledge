// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { normalizarMaterial, type MaterialGenerado } from '../ia/gemini'
import { contarTarjetas } from '../ia/importar'
import { textoDeContexto, type ContextoMateria } from '../ia/tutor'
import type { Materia, Subtema, Tarjeta, Unidad } from '../../types/models'

const tarjeta = (id: string, pregunta: string, respuesta: string): Tarjeta => ({
  id,
  materiaId: 'mat_1',
  unidadId: 'uni_1',
  subtemaId: 'sub_1',
  pregunta,
  respuesta,
  explicacion: 'Porque sí.',
  ejemplo: '',
  palabrasClave: ['consentimiento', 'objeto'],
  capitulo: '',
  pagina: '',
  dificultad: 'media',
  favorita: false,
  creadaEn: 1,
  actualizadaEn: 1,
})

describe('normalizarMaterial', () => {
  it('deja el material en una forma segura y sin campos raros', () => {
    const crudo = {
      materia: { nombre: '  Derecho   Civil ', descripcion: 'Contratos' },
      resumen: 'Resumen',
      unidades: [
        {
          nombre: ' Contratos ',
          descripcion: '',
          subtemas: [
            {
              nombre: 'Requisitos',
              descripcion: '',
              tarjetas: [
                {
                  pregunta: '¿Qué es un contrato?',
                  respuesta: 'Un acuerdo de voluntades.',
                  explicacion: 'Tiene efectos jurídicos.',
                  ejemplo: '',
                  palabrasClave: ['contrato', 'voluntades', 'acuerdo', 'a', 'b', 'c', 'd'],
                  dificultad: 'facil',
                },
              ],
            },
          ],
        },
      ],
    } as unknown as MaterialGenerado

    const m = normalizarMaterial(crudo)
    expect(m.materia.nombre).toBe('Derecho Civil')
    expect(m.unidades).toHaveLength(1)
    expect(m.unidades[0].subtemas[0].tarjetas[0].palabrasClave).toHaveLength(6)
    expect(m.unidades[0].subtemas[0].tarjetas[0].dificultad).toBe('facil')
  })

  it('descarta subtemas y unidades sin tarjetas en vez de dejar huecos', () => {
    const crudo = {
      materia: { nombre: 'X', descripcion: '' },
      resumen: '',
      unidades: [
        { nombre: 'Vacía', descripcion: '', subtemas: [] },
        {
          nombre: 'Con algo',
          descripcion: '',
          subtemas: [
            { nombre: 'Sin tarjetas', descripcion: '', tarjetas: [] },
            {
              nombre: 'Con tarjetas',
              descripcion: '',
              tarjetas: [{ pregunta: 'P', respuesta: 'R', explicacion: '', palabrasClave: [], dificultad: 'media' }],
            },
          ],
        },
      ],
    } as unknown as MaterialGenerado

    const m = normalizarMaterial(crudo)
    expect(m.unidades).toHaveLength(1)
    expect(m.unidades[0].nombre).toBe('Con algo')
    expect(m.unidades[0].subtemas).toHaveLength(1)
    expect(m.unidades[0].subtemas[0].nombre).toBe('Con tarjetas')
  })

  it('falla con un mensaje claro si el PDF no tenía texto de estudio', () => {
    const vacio = { materia: { nombre: '', descripcion: '' }, resumen: '', unidades: [] } as unknown as MaterialGenerado
    expect(() => normalizarMaterial(vacio)).toThrow(/no encontró contenido/i)
  })

  it('una dificultad desconocida cae en media en vez de romper la tarjeta', () => {
    const crudo = {
      materia: { nombre: 'X', descripcion: '' },
      resumen: '',
      unidades: [
        {
          nombre: 'U',
          descripcion: '',
          subtemas: [
            {
              nombre: 'S',
              descripcion: '',
              tarjetas: [{ pregunta: 'P', respuesta: 'R', explicacion: '', palabrasClave: [], dificultad: 'imposible' }],
            },
          ],
        },
      ],
    } as unknown as MaterialGenerado
    expect(normalizarMaterial(crudo).unidades[0].subtemas[0].tarjetas[0].dificultad).toBe('media')
  })
})

describe('contarTarjetas', () => {
  it('suma todas las tarjetas de todas las unidades', () => {
    const m = {
      materia: { nombre: 'X', descripcion: '' },
      resumen: '',
      unidades: [
        {
          nombre: 'A',
          descripcion: '',
          subtemas: [
            { nombre: 'a1', descripcion: '', tarjetas: [{ pregunta: 'p', respuesta: 'r', explicacion: '', palabrasClave: [], dificultad: 'facil' }] },
            { nombre: 'a2', descripcion: '', tarjetas: [{ pregunta: 'p', respuesta: 'r', explicacion: '', palabrasClave: [], dificultad: 'facil' }] },
          ],
        },
        {
          nombre: 'B',
          descripcion: '',
          subtemas: [{ nombre: 'b1', descripcion: '', tarjetas: [{ pregunta: 'p', respuesta: 'r', explicacion: '', palabrasClave: [], dificultad: 'facil' }] }],
        },
      ],
    } as unknown as MaterialGenerado
    expect(contarTarjetas(m)).toBe(3)
  })
})

describe('contexto del tutor', () => {
  const materia: Materia = { id: 'mat_1', nombre: 'Derecho', descripcion: 'Consumidores', color: '#000', icono: 'Scale', creadaEn: 1, orden: 0 }
  const unidad: Unidad = { id: 'uni_1', materiaId: 'mat_1', nombre: 'Consumidores', descripcion: '', orden: 0, creadaEn: 1, metaDominio: 80 }
  const subtema: Subtema = { id: 'sub_1', unidadId: 'uni_1', materiaId: 'mat_1', nombre: 'Definición', descripcion: '', orden: 0, creadoEn: 1 }
  const ctx: ContextoMateria = {
    materia,
    unidades: [unidad],
    subtemas: [subtema],
    tarjetas: [tarjeta('t1', '¿Quién es consumidor?', 'La persona que adquiere como destinatario final.')],
  }

  it('incluye el material real, agrupado por unidad y subtema', () => {
    const texto = textoDeContexto(ctx)
    expect(texto).toContain('Derecho')
    expect(texto).toContain('Consumidores')
    expect(texto).toContain('¿Quién es consumidor?')
    expect(texto).toContain('destinatario final')
    expect(texto).toContain('consentimiento')
  })

  it('no se rompe si una materia todavía no tiene tarjetas', () => {
    const texto = textoDeContexto({ ...ctx, tarjetas: [] })
    expect(texto).toContain('Derecho')
    expect(texto.length).toBeGreaterThan(10)
  })

  it('recorta el contexto para no exceder la ventana del modelo', () => {
    const muchas = Array.from({ length: 900 }, (_, i) =>
      tarjeta(`t${i}`, `Pregunta ${i} ${'x'.repeat(80)}`, `Respuesta ${i} ${'y'.repeat(200)}`),
    )
    const texto = textoDeContexto({ ...ctx, tarjetas: muchas })
    expect(texto.length).toBeLessThanOrEqual(120_000)
  })
})

describe('almacén de la clave', () => {
  it('guarda cifrada y recupera igual, sin dejar el texto plano', async () => {
    vi.stubGlobal('crypto', globalThis.crypto)
    const { guardarClave, leerClave, pistaClave } = await import('../ia/almacenClave')
    const clave = 'AQ.Ab8RN6PRUEBA1234567890abcdef'
    await guardarClave(clave)

    const crudo = localStorage.getItem('knowledge-ia-clave') ?? ''
    expect(crudo).not.toContain(clave)
    expect(crudo).toContain('datos')

    await expect(leerClave()).resolves.toBe(clave)
    expect(pistaClave(clave)).toContain('cdef')
    expect(pistaClave(clave)).not.toContain('AQ.Ab8RN6')
  })

  it('borrar deja el almacenamiento limpio', async () => {
    const { guardarClave, borrarClave, leerClave } = await import('../ia/almacenClave')
    await guardarClave('clave-de-prueba-larga-123456')
    borrarClave()
    await expect(leerClave()).resolves.toBeNull()
  })

  it('un dato corrupto se descarta en vez de romper la app', async () => {
    const { leerClave } = await import('../ia/almacenClave')
    localStorage.setItem('knowledge-ia-clave', '{"iv":"no","datos":"sirve"}')
    await expect(leerClave()).resolves.toBeNull()
    expect(localStorage.getItem('knowledge-ia-clave')).toBeNull()
  })
})
