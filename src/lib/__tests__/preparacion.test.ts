import { describe, expect, it } from 'vitest'
import { calcularPreparacion } from '../preparacion'
import { calcularSrs, progresoInicial } from '../srs'
import type { ProgresoTarjeta, Sesion, Subtema, Tarjeta } from '../../types/models'

const subtema: Subtema = {
  id: 'sub_1',
  materiaId: 'mat_1',
  unidadId: 'uni_1',
  nombre: 'Relación de consumo',
  descripcion: '',
  orden: 0,
  creadoEn: 0,
}

const tarjeta = (id: string): Tarjeta => ({
  id,
  materiaId: 'mat_1',
  unidadId: 'uni_1',
  subtemaId: 'sub_1',
  pregunta: 'p',
  respuesta: 'r',
  explicacion: '',
  ejemplo: '',
  palabrasClave: [],
  capitulo: '',
  pagina: '',
  dificultad: 'media',
  favorita: false,
  creadaEn: 0,
  actualizadaEn: 0,
})

describe('indicador de preparación para el examen', () => {
  it('sin tarjetas estudiadas el subtema queda pendiente y el puntaje en cero', () => {
    const r = calcularPreparacion([subtema], [tarjeta('t1')], new Map(), [])
    expect(r.puntaje).toBe(0)
    expect(r.nivel).toBe('pendiente')
    expect(r.subtemas[0].nivel).toBe('pendiente')
  })

  it('completar el recorrido no equivale a estar preparado', () => {
    // 4 tarjetas con un solo acierto cada una: hay actividad pero no dominio.
    const progresos = new Map<string, ProgresoTarjeta>()
    const tarjetas = ['t1', 't2', 't3', 't4'].map(tarjeta)
    tarjetas.forEach((t) => {
      progresos.set(t.id, calcularSrs(progresoInicial(t.id), 'bien', 'recuperacion', true).progreso)
    })
    const r = calcularPreparacion([subtema], tarjetas, progresos, [])
    expect(r.cobertura).toBe(100)
    expect(r.puntaje).toBeLessThan(70)
    expect(r.nivel).not.toBe('dominado')
  })

  it('un dominio sostenido eleva el puntaje y el nivel', () => {
    const progresos = new Map<string, ProgresoTarjeta>()
    const tarjetas = ['t1', 't2', 't3'].map(tarjeta)
    tarjetas.forEach((t) => {
      let p = progresoInicial(t.id)
      for (const dim of ['reconocimiento', 'recuperacion', 'comprension', 'aplicacion'] as const) {
        for (let i = 0; i < 6; i++) p = calcularSrs(p, 'facil', dim, true, 1).progreso
      }
      progresos.set(t.id, p)
    })
    const r = calcularPreparacion([subtema], tarjetas, progresos, [])
    expect(r.puntaje).toBeGreaterThan(60)
    expect(['buen-nivel', 'dominado']).toContain(r.subtemas[0].nivel)
  })

  it('cuenta exámenes y respuestas escritas como evidencia', () => {
    const sesiones: Sesion[] = [
      { id: 's1', tipo: 'examen', subtemaIds: ['sub_1'], iniciadaEn: 0, finalizadaEn: 1, duracionMs: 1000, intentos: [], aciertos: 15, fallos: 5, omitidas: 0, xpGanada: 50, monedasGanadas: 5, nota: 75, precision: 75 },
      { id: 's2', tipo: 'escrita', subtemaIds: ['sub_1'], iniciadaEn: 0, finalizadaEn: 1, duracionMs: 1000, intentos: [], aciertos: 4, fallos: 1, omitidas: 0, xpGanada: 20, monedasGanadas: 2, precision: 80 },
    ]
    const r = calcularPreparacion([subtema], [], new Map(), sesiones)
    expect(r.examenes).toBe(1)
    expect(r.escritas).toBe(1)
  })

  it('el puntaje nunca sale del rango 0..100', () => {
    const progresos = new Map<string, ProgresoTarjeta>()
    let p = progresoInicial('t1')
    for (const dim of ['reconocimiento', 'recuperacion', 'comprension', 'aplicacion'] as const) {
      for (let i = 0; i < 20; i++) p = calcularSrs(p, 'facil', dim, true, 1).progreso
    }
    progresos.set('t1', p)
    const r = calcularPreparacion([subtema], [tarjeta('t1')], progresos, [])
    expect(r.puntaje).toBeGreaterThanOrEqual(0)
    expect(r.puntaje).toBeLessThanOrEqual(100)
  })
})
