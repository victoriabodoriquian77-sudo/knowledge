import { useCallback, useRef, useState } from 'react'
import { contarTarjetas, importarMaterial, type ResumenImportacion } from '../lib/ia/importar'
import { ErrorIA, generarMaterialDesdePdf, validarPdf, type MaterialGenerado } from '../lib/ia/gemini'
import type { Materia } from '../types/models'

export type FaseImportacion =
  | { nombre: 'inactiva' }
  | { nombre: 'leyendo'; mensaje: string }
  | { nombre: 'listo'; material: MaterialGenerado; archivo: string }
  | { nombre: 'importando' }
  | { nombre: 'hecho'; resumen: ResumenImportacion }
  | { nombre: 'error'; mensaje: string }

/**
 * Orquesta la importación de un PDF: valida, llama a la IA, deja revisar el
 * resultado y recién ahí escribe en la base. La separación importa: nadie
 * quiere que un PDF mal leído le ensucie la biblioteca sin poder verlo antes.
 */
export function useImportarPdf() {
  const [fase, setFase] = useState<FaseImportacion>({ nombre: 'inactiva' })
  const abortRef = useRef<AbortController | null>(null)

  const cancelar = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setFase({ nombre: 'inactiva' })
  }, [])

  const procesar = useCallback(
    async (archivo: File, opciones: { materiaSugerida?: string; instruccionExtra?: string } = {}) => {
      try {
        validarPdf(archivo)
      } catch (e) {
        setFase({ nombre: 'error', mensaje: e instanceof Error ? e.message : 'El archivo no sirve.' })
        return
      }
      const control = new AbortController()
      abortRef.current = control
      setFase({ nombre: 'leyendo', mensaje: 'Leyendo el documento…' })

      // Mensajes por tiempo: la lectura de un PDF grande puede tardar.
      const avisos = [
        { a: 6000, m: 'Interpretando el contenido…' },
        { a: 18000, m: 'Separando unidades y subtemas…' },
        { a: 35000, m: 'Redactando las tarjetas de estudio…' },
        { a: 60000, m: 'Casi listo, ordenando el material…' },
      ]
      const temporizadores = avisos.map(({ a, m }) =>
        setTimeout(() => setFase((f) => (f.nombre === 'leyendo' ? { nombre: 'leyendo', mensaje: m } : f)), a),
      )

      try {
        const material = await generarMaterialDesdePdf(archivo, { ...opciones, senal: control.signal })
        setFase({ nombre: 'listo', material, archivo: archivo.name })
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        const mensaje =
          e instanceof ErrorIA ? e.message : e instanceof Error ? e.message : 'No pudimos procesar el documento.'
        setFase({ nombre: 'error', mensaje })
      } finally {
        temporizadores.forEach(clearTimeout)
        abortRef.current = null
      }
    },
    [],
  )

  const confirmar = useCallback(
    async (opciones: { materiaExistente?: Materia; modo?: 'agregar' | 'reemplazar' } = {}) => {
      if (fase.nombre !== 'listo') return
      setFase({ nombre: 'importando' })
      try {
        const resumen = await importarMaterial(fase.material, { ...opciones, archivo: fase.archivo })
        setFase({ nombre: 'hecho', resumen })
      } catch (e) {
        setFase({ nombre: 'error', mensaje: e instanceof Error ? e.message : 'No pudimos guardar el material.' })
      }
    },
    [fase],
  )

  const reiniciar = useCallback(() => setFase({ nombre: 'inactiva' }), [])

  return {
    fase,
    procesar,
    confirmar,
    cancelar,
    reiniciar,
    totalTarjetas: fase.nombre === 'listo' ? contarTarjetas(fase.material) : 0,
  }
}
