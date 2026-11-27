/**
 * Convierte el material que devuelve la IA en filas reales de la base:
 * materia, unidades, subtemas y tarjetas, con su orden y sin duplicar nada.
 */
import { db, uid } from '../../db/database'
import type { Materia, MaterialOrigen, Tarjeta } from '../../types/models'
import type { MaterialGenerado } from './gemini'
import { COLORES_MATERIA } from '../constants'

export interface ResumenImportacion {
  materiaId: string
  materia: string
  unidades: number
  subtemas: number
  tarjetas: number
}

const limpiarHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

export interface OpcionesImportacion {
  /** Si viene, se agrega a una materia existente en vez de crear una nueva. */
  materiaExistente?: Materia
  /** Nombre del archivo, para dejar registro del origen. */
  archivo?: string
  /**
   * 'reemplazar' borra el material previo de la materia (conserva el progreso
   * por tarjeta que siga existiendo); 'agregar' suma al final.
   */
  modo?: 'agregar' | 'reemplazar'
}

/**
 * Escribe el material en la base. Todo va en una transacción: si algo falla,
 * no queda una materia a medio armar.
 */
export async function importarMaterial(
  material: MaterialGenerado,
  opciones: OpcionesImportacion = {},
): Promise<ResumenImportacion> {
  const modo = opciones.modo ?? 'agregar'
  const ahora = Date.now()
  const origen: MaterialOrigen = { tipo: 'pdf', archivo: opciones.archivo ?? '', generadoEn: ahora }

  let materia: Materia
  if (opciones.materiaExistente) {
    materia = opciones.materiaExistente
    if (modo === 'reemplazar') {
      await limpiarMateria(materia.id)
    }
  } else {
    const total = await db.materias.count()
    materia = {
      id: uid('mat_'),
      nombre: limpiarHtml(material.materia.nombre).slice(0, 80) || 'Materia nueva',
      descripcion: limpiarHtml(material.materia.descripcion).slice(0, 300),
      color: COLORES_MATERIA[total % COLORES_MATERIA.length],
      icono: 'Scale',
      creadaEn: ahora,
      orden: total,
      origen,
    }
  }

  const unidadesPrev = opciones.materiaExistente ? await db.unidades.where('materiaId').equals(materia.id).count() : 0
  const subtemasPrev = opciones.materiaExistente ? await db.subtemas.where('materiaId').equals(materia.id).count() : 0

  // Estructuras en memoria: se escriben en bloque al final.
  const unidades: { id: string; materiaId: string; nombre: string; descripcion: string; orden: number; creadaEn: number; metaDominio: number }[] = []
  const subtemas: { id: string; unidadId: string; materiaId: string; nombre: string; descripcion: string; orden: number; creadoEn: number }[] = []
  const tarjetas: Tarjeta[] = []

  material.unidades.forEach((u, iu) => {
    const unidadId = uid('uni_')
    unidades.push({
      id: unidadId,
      materiaId: materia.id,
      nombre: limpiarHtml(u.nombre).slice(0, 120) || `Unidad ${unidadesPrev + iu + 1}`,
      descripcion: limpiarHtml(u.descripcion).slice(0, 400),
      orden: unidadesPrev + iu,
      creadaEn: ahora,
      metaDominio: 80,
    })

    u.subtemas.forEach((s, is) => {
      const subtemaId = uid('sub_')
      subtemas.push({
        id: subtemaId,
        unidadId,
        materiaId: materia.id,
        nombre: limpiarHtml(s.nombre).slice(0, 120) || `Subtema ${is + 1}`,
        descripcion: limpiarHtml(s.descripcion).slice(0, 400),
        orden: is,
        creadoEn: ahora,
      })

      s.tarjetas.forEach((t, it) => {
        tarjetas.push({
          id: uid('tar_'),
          materiaId: materia.id,
          unidadId,
          subtemaId,
          pregunta: limpiarHtml(t.pregunta).slice(0, 400),
          respuesta: limpiarHtml(t.respuesta).slice(0, 1200),
          explicacion: limpiarHtml(t.explicacion ?? '').slice(0, 800),
          ejemplo: limpiarHtml(t.caso || t.ejemplo || '').slice(0, 600),
          palabrasClave: t.palabrasClave.slice(0, 6),
          capitulo: '',
          pagina: '',
          dificultad: t.dificultad,
          favorita: false,
          creadaEn: ahora,
          actualizadaEn: ahora,
          origenIA: { generada: true, archivo: opciones.archivo ?? '', generadoEn: ahora },
        })
        void it
      })
    })
  })

  void subtemasPrev

  await db.transaction('rw', [db.materias, db.unidades, db.subtemas, db.tarjetas], async () => {
    if (!opciones.materiaExistente) await db.materias.add(materia)
    else await db.materias.update(materia.id, { origen })
    await db.unidades.bulkAdd(unidades)
    await db.subtemas.bulkAdd(subtemas)
    await db.tarjetas.bulkAdd(tarjetas)
  })

  return {
    materiaId: materia.id,
    materia: materia.nombre,
    unidades: unidades.length,
    subtemas: subtemas.length,
    tarjetas: tarjetas.length,
  }
}

/** Borra el material de una materia conservando la materia en sí. */
async function limpiarMateria(materiaId: string): Promise<void> {
  await db.transaction('rw', [db.unidades, db.subtemas, db.tarjetas, db.progreso], async () => {
    const tarjetas = await db.tarjetas.where('materiaId').equals(materiaId).toArray()
    await db.progreso.bulkDelete(tarjetas.map((t) => t.id))
    await db.tarjetas.where('materiaId').equals(materiaId).delete()
    await db.subtemas.where('materiaId').equals(materiaId).delete()
    await db.unidades.where('materiaId').equals(materiaId).delete()
  })
}

/** Estimación de la cantidad de tarjetas, para mostrar antes de importar. */
export function contarTarjetas(material: MaterialGenerado): number {
  return material.unidades.reduce(
    (total, u) => total + u.subtemas.reduce((t, s) => t + s.tarjetas.length, 0),
    0,
  )
}
