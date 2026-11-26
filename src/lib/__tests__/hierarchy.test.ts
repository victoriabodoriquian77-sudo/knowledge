import { describe, expect, it } from 'vitest'
import { calcularEstadoSubtema } from '../hierarchy'
import { calcularSrs, progresoInicial } from '../srs'
import type { ProgresoTarjeta, Subtema, Tarjeta } from '../../types/models'

const subtema = (id: string, orden: number, forzado = false): Subtema => ({
  id,
  materiaId: 'mat_1',
  unidadId: 'uni_1',
  nombre: `Subtema ${orden}`,
  descripcion: '',
  orden,
  creadoEn: 0,
  desbloqueoForzado: forzado,
})

const tarjeta = (id: string, subtemaId: string): Tarjeta => ({
  id,
  materiaId: 'mat_1',
  unidadId: 'uni_1',
  subtemaId,
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

/** Deja una tarjeta con dominio alto (varias pasadas por todas las dimensiones). */
function dominar(t: Tarjeta): ProgresoTarjeta {
  let p = progresoInicial(t.id)
  for (const dim of ['reconocimiento', 'recuperacion', 'comprension', 'aplicacion'] as const) {
    for (let i = 0; i < 6; i++) p = calcularSrs(p, 'facil', dim, true, 1).progreso
  }
  return p
}

describe('desbloqueo secuencial del recorrido', () => {
  it('el primer subtema está disponible y el siguiente bloqueado', () => {
    const s1 = subtema('s1', 0)
    const s2 = subtema('s2', 1)
    const tarjetas = [tarjeta('t1', 's1'), tarjeta('t2', 's2')]
    const progresos = new Map<string, ProgresoTarjeta>()

    const r1 = calcularEstadoSubtema(s1, tarjetas, progresos, true)
    expect(r1.estado).toBe('disponible')
    expect(r1.desbloqueado).toBe(true)

    const r2 = calcularEstadoSubtema(s2, tarjetas, progresos, false)
    expect(r2.estado).toBe('bloqueado')
    expect(r2.desbloqueado).toBe(false)
  })

  it('completar el anterior desbloquea el siguiente', () => {
    const s1 = subtema('s1', 0)
    const s2 = subtema('s2', 1)
    const t1 = tarjeta('t1', 's1')
    const tarjetas = [t1, tarjeta('t2', 's2')]
    const progresos = new Map([[t1.id, dominar(t1)]])

    const r1 = calcularEstadoSubtema(s1, tarjetas, progresos, true)
    expect(['completado', 'dominado']).toContain(r1.estado)

    const r2 = calcularEstadoSubtema(s2, tarjetas, progresos, true)
    expect(r2.desbloqueado).toBe(true)
    expect(r2.estado).not.toBe('bloqueado')
  })

  it('un subtema sin tarjetas no se considera completado', () => {
    const s1 = subtema('s1', 0)
    const r = calcularEstadoSubtema(s1, [], new Map(), true)
    expect(r.estado).toBe('disponible')
    expect(r.tarjetas).toBe(0)
  })

  it('se puede forzar el desbloqueo manual de un subtema', () => {
    const s2 = subtema('s2', 1, true)
    const r = calcularEstadoSubtema(s2, [tarjeta('t2', 's2')], new Map(), false)
    expect(r.desbloqueado).toBe(true)
    expect(r.estado).not.toBe('bloqueado')
  })

  it('un subtema a medio estudiar queda en progreso y sigue accesible', () => {
    const s1 = subtema('s1', 0)
    const t1 = tarjeta('t1', 's1')
    const t2 = tarjeta('t2', 's1')
    const p1 = calcularSrs(progresoInicial('t1'), 'otra-vez', 'recuperacion', false, 0).progreso
    const r = calcularEstadoSubtema(s1, [t1, t2], new Map([['t1', p1]]), true)
    expect(r.estado).toBe('en-progreso')
    expect(r.desbloqueado).toBe(true)
    expect(r.estudiadas).toBe(1)
  })
})
