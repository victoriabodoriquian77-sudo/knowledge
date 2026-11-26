import { db, uid } from '../db/database'
import type { Materia, Subtema, Tarjeta, Unidad } from '../types/models'
import { COLORES_MATERIA } from './constants'

export async function crearMateria(datos: { nombre: string; descripcion?: string; color?: string; icono?: string }): Promise<Materia> {
  const orden = (await db.materias.count()) as number
  const materia: Materia = {
    id: uid('mat_'),
    nombre: datos.nombre.trim(),
    descripcion: (datos.descripcion ?? '').trim(),
    color: datos.color ?? COLORES_MATERIA[orden % COLORES_MATERIA.length],
    icono: datos.icono ?? 'book-open',
    creadaEn: Date.now(),
    orden,
  }
  await db.materias.add(materia)
  return materia
}

export async function actualizarMateria(id: string, cambios: Partial<Materia>): Promise<void> {
  await db.materias.update(id, { ...cambios, nombre: cambios.nombre?.trim() })
}

/** Elimina en cascada: materia → unidades → subtemas → tarjetas → progreso. */
export async function eliminarMateria(id: string): Promise<void> {
  await db.transaction('rw', [db.materias, db.unidades, db.subtemas, db.tarjetas, db.progreso, db.sesiones], async () => {
    const unidades = await db.unidades.where('materiaId').equals(id).toArray()
    const subtemas = await db.subtemas.where('materiaId').equals(id).toArray()
    const tarjetas = await db.tarjetas.where('materiaId').equals(id).toArray()
    await db.progreso.bulkDelete(tarjetas.map((t) => t.id))
    await db.tarjetas.where('materiaId').equals(id).delete()
    await db.subtemas.where('materiaId').equals(id).delete()
    await db.unidades.bulkDelete(unidades.map((u) => u.id))
    await db.materias.delete(id)
    void subtemas
  })
}

export async function crearUnidad(datos: { materiaId: string; nombre: string; descripcion?: string; metaDominio?: number }): Promise<Unidad> {
  const existentes = await db.unidades.where('materiaId').equals(datos.materiaId).toArray()
  const unidad: Unidad = {
    id: uid('uni_'),
    materiaId: datos.materiaId,
    nombre: datos.nombre.trim(),
    descripcion: (datos.descripcion ?? '').trim(),
    orden: existentes.length,
    creadaEn: Date.now(),
    metaDominio: datos.metaDominio ?? 80,
  }
  await db.unidades.add(unidad)
  return unidad
}

export async function eliminarUnidad(id: string): Promise<void> {
  await db.transaction('rw', [db.unidades, db.subtemas, db.tarjetas, db.progreso], async () => {
    const subtemas = await db.subtemas.where('unidadId').equals(id).toArray()
    const tarjetas = await db.tarjetas.where('unidadId').equals(id).toArray()
    await db.progreso.bulkDelete(tarjetas.map((t) => t.id))
    await db.tarjetas.where('unidadId').equals(id).delete()
    await db.subtemas.where('unidadId').equals(id).delete()
    await db.unidades.delete(id)
    void subtemas
  })
}

export async function crearSubtema(datos: { unidadId: string; materiaId: string; nombre: string; descripcion?: string }): Promise<Subtema> {
  const existentes = await db.subtemas.where('unidadId').equals(datos.unidadId).toArray()
  const subtema: Subtema = {
    id: uid('sub_'),
    unidadId: datos.unidadId,
    materiaId: datos.materiaId,
    nombre: datos.nombre.trim(),
    descripcion: (datos.descripcion ?? '').trim(),
    orden: existentes.length,
    creadoEn: Date.now(),
  }
  await db.subtemas.add(subtema)
  return subtema
}

export async function eliminarSubtema(id: string): Promise<void> {
  await db.transaction('rw', [db.subtemas, db.tarjetas, db.progreso], async () => {
    const tarjetas = await db.tarjetas.where('subtemaId').equals(id).toArray()
    await db.progreso.bulkDelete(tarjetas.map((t) => t.id))
    await db.tarjetas.where('subtemaId').equals(id).delete()
    await db.subtemas.delete(id)
  })
}

export async function reordenar<T extends { id: string; orden: number }>(
  tabla: 'unidades' | 'subtemas',
  items: T[],
  desde: number,
  hacia: number,
): Promise<void> {
  const copia = [...items].sort((a, b) => a.orden - b.orden)
  const [movido] = copia.splice(desde, 1)
  copia.splice(hacia, 0, movido)
  await db.transaction('rw', tabla === 'unidades' ? db.unidades : db.subtemas, async () => {
    await Promise.all(copia.map((item, i) => (tabla === 'unidades' ? db.unidades.update(item.id, { orden: i }) : db.subtemas.update(item.id, { orden: i }))))
  })
}

export async function duplicarTarjeta(id: string): Promise<Tarjeta | null> {
  const original = await db.tarjetas.get(id)
  if (!original) return null
  const copia: Tarjeta = {
    ...original,
    id: uid('tar_'),
    pregunta: `${original.pregunta} (copia)`,
    creadaEn: Date.now(),
    actualizadaEn: Date.now(),
  }
  await db.tarjetas.add(copia)
  return copia
}

export async function eliminarTarjeta(id: string): Promise<void> {
  await db.transaction('rw', [db.tarjetas, db.progreso], async () => {
    await db.tarjetas.delete(id)
    await db.progreso.delete(id)
  })
}

export async function toggleFavorita(id: string): Promise<void> {
  const t = await db.tarjetas.get(id)
  if (!t) return
  await db.tarjetas.update(id, { favorita: !t.favorita })
}

/** Cuenta tarjetas por subtema, para avisos de borrado. */
export async function contarTarjetasDeSubtema(id: string): Promise<number> {
  return db.tarjetas.where('subtemaId').equals(id).count()
}
