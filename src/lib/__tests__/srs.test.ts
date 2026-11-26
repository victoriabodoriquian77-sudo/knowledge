import { describe, expect, it } from 'vitest'
import { calcularDominio, calcularSrs, esNueva, estaAprendiendo, estaDominada, pendienteHoy, progresoInicial } from '../srs'

const base = progresoInicial('t1')

describe('motor de repaso espaciado', () => {
  it('una tarjeta nueva no está dominada y arranca en cero', () => {
    expect(esNueva(base)).toBe(true)
    expect(estaDominada(base)).toBe(false)
    expect(calcularDominio(base)).toBe(0)
  })

  it('un solo acierto no alcanza para dominar la tarjeta', () => {
    const { progreso } = calcularSrs(base, 'bien', 'recuperacion', true)
    expect(progreso.repeticiones).toBe(1)
    expect(estaDominada(progreso)).toBe(false)
    expect(calcularDominio(progreso)).toBeLessThan(80)
  })

  it('el dominio crece con aciertos repetidos y espaciados', () => {
    let p = base
    const dominios: number[] = []
    for (let i = 0; i < 5; i++) {
      p = calcularSrs(p, 'bien', 'recuperacion', true).progreso
      dominios.push(calcularDominio(p))
    }
    expect(dominios[4]).toBeGreaterThan(dominios[0])
  })

  it('fallar reinicia la racha y marca la tarjeta como difícil', () => {
    let p = calcularSrs(base, 'facil', 'recuperacion', true).progreso
    p = calcularSrs(p, 'otra-vez', 'recuperacion', false, 0).progreso
    expect(p.racha).toBe(0)
    expect(p.dificil).toBe(true)
    expect(p.fallos).toBe(1)
    expect(p.intervalo).toBe(0)
  })

  it('una tarjeta fallada vuelve a estar pendiente casi enseguida', () => {
    const { progreso } = calcularSrs(base, 'otra-vez', 'recuperacion', false, 0)
    expect(pendienteHoy(progreso)).toBe(true)
    expect(progreso.proximoRepaso - Date.now()).toBeLessThan(15 * 60 * 1000)
  })

  it('los intervalos se alargan a medida que se acierta', () => {
    let p = base
    let anterior = 0
    for (let i = 0; i < 4; i++) {
      p = calcularSrs(p, 'facil', 'recuperacion', true).progreso
      expect(p.intervalo).toBeGreaterThanOrEqual(anterior)
      anterior = p.intervalo
    }
    expect(anterior).toBeGreaterThanOrEqual(3)
  })

  it('la facilidad nunca baja de 1.3 ni sube de 2.8', () => {
    let p = base
    for (let i = 0; i < 12; i++) p = calcularSrs(p, 'otra-vez', 'recuperacion', false, 0).progreso
    expect(p.facilidad).toBeGreaterThanOrEqual(1.3)
    for (let i = 0; i < 12; i++) p = calcularSrs(p, 'facil', 'recuperacion', true).progreso
    expect(p.facilidad).toBeLessThanOrEqual(2.8)
  })

  it('la precisión refleja aciertos sobre intentos reales', () => {
    let p = calcularSrs(base, 'bien', 'recuperacion', true).progreso
    p = calcularSrs(p, 'bien', 'recuperacion', true).progreso
    p = calcularSrs(p, 'otra-vez', 'recuperacion', false, 0).progreso
    expect(p.aciertos).toBe(2)
    expect(p.fallos).toBe(1)
    expect(p.precision).toBeCloseTo(2 / 3, 1)
  })

  it('para dominar hace falta evidencia de recuperación, no solo reconocimiento', () => {
    let p = base
    for (let i = 0; i < 6; i++) p = calcularSrs(p, 'facil', 'reconocimiento', true).progreso
    expect(p.dimensiones.recuperacion).toBe(0)
    expect(estaDominada(p)).toBe(false)
    p = calcularSrs(p, 'facil', 'recuperacion', true).progreso
    expect(p.dimensiones.recuperacion).toBeGreaterThan(0)
  })

  it('una tarjeta en curso se distingue de una dominada', () => {
    const { progreso } = calcularSrs(base, 'bien', 'recuperacion', true)
    expect(estaAprendiendo(progreso)).toBe(true)
  })
})
