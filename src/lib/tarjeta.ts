import type { ProgresoTarjeta } from '../types/models'
import { estaDominada } from './srs'

export const ESTADO_TARJETA = (p?: ProgresoTarjeta): { texto: string; tono: string } => {
  if (!p || p.repeticiones === 0) return { texto: 'Nueva', tono: 'bg-sky-tint text-sky' }
  if (estaDominada(p)) return { texto: 'Dominada', tono: 'bg-grass-tint text-grass' }
  if (p.dificil) return { texto: 'Reforzar', tono: 'bg-coral-tint text-coral' }
  return { texto: `${p.dominio}% · Aprendiendo`, tono: 'bg-grape-tint text-grape' }
}
