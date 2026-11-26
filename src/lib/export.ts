import { db, TABLAS } from '../db/database'
import type { ContextoEstudio } from './hierarchy'
import type { Tarjeta } from '../types/models'

const limpiar = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

const escapeCSV = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`

/** Exporta las tarjetas a CSV compatible con Excel/Sheets. */
export function exportarCSV(tarjetas: Tarjeta[], ctx?: ContextoEstudio) {
  const nombreMateria = (id: string) => ctx?.materias.find((m) => m.id === id)?.nombre ?? ''
  const nombreUnidad = (id: string) => ctx?.unidades.find((u) => u.id === id)?.nombre ?? ''
  const nombreSubtema = (id: string) => ctx?.subtemas.find((s) => s.id === id)?.nombre ?? ''

  const cabecera = ['Materia', 'Unidad', 'Subtema', 'Pregunta', 'Respuesta', 'Explicacion', 'Ejemplo', 'Palabras clave', 'Dificultad', 'Capitulo', 'Pagina', 'Favorita']
  const filas = tarjetas.map((t) => [
    nombreMateria(t.materiaId),
    nombreUnidad(t.unidadId),
    nombreSubtema(t.subtemaId),
    limpiar(t.pregunta),
    limpiar(t.respuesta),
    limpiar(t.explicacion),
    limpiar(t.ejemplo),
    t.palabrasClave.join(' | '),
    t.dificultad,
    t.capitulo,
    t.pagina,
    t.favorita ? 'si' : 'no',
  ])

  const contenido = [cabecera, ...filas].map((f) => f.map(escapeCSV).join(',')).join('\r\n')
  descargar(new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' }), `knowledge-tarjetas-${fechaArchivo()}.csv`)
}

function fechaArchivo() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Backup completo de la base, en JSON. */
export async function exportarBackup(): Promise<number> {
  const datos: Record<string, unknown> = { __formato: 'knowledge-backup', __version: 1, __fecha: new Date().toISOString() }
  let total = 0
  for (const tabla of TABLAS) {
    const filas = await (db as unknown as Record<string, { toArray: () => Promise<unknown[]> }>)[tabla].toArray()
    datos[tabla] = filas
    total += filas.length
  }
  descargar(new Blob([JSON.stringify(datos)], { type: 'application/json' }), `knowledge-backup-${fechaArchivo()}.json`)
  await db.meta.put({ id: 'backup', ultimoBackup: Date.now() })
  return total
}

/** Importa un backup validando el formato antes de tocar la base. */
export async function importarBackup(archivo: File, modo: 'reemplazar' | 'fusionar' = 'reemplazar'): Promise<{ importadas: number }> {
  const texto = await archivo.text()
  let datos: Record<string, unknown>
  try {
    datos = JSON.parse(texto)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  if (!datos || datos.__formato !== 'knowledge-backup') {
    throw new Error('El archivo no es un backup de KNOWLEDGE.')
  }

  let importadas = 0
  await db.transaction('rw', db.tables, async () => {
    for (const tabla of TABLAS) {
      const filas = datos[tabla]
      if (!Array.isArray(filas)) continue
      if (modo === 'reemplazar') await (db as unknown as Record<string, { clear: () => Promise<void> }>)[tabla].clear()
      // Se cargan de a bloques para no saturar la transacción.
      for (let i = 0; i < filas.length; i += 200) {
        const bloque = filas.slice(i, i + 200) as object[]
        await (db as unknown as Record<string, { bulkPut: (f: object[]) => Promise<unknown> }>)[tabla].bulkPut(bloque)
      }
      importadas += filas.length
    }
  })
  return { importadas }
}

/** Vista imprimible: abre una ventana limpia y lanza el diálogo de impresión. */
export async function exportarPDF(tarjetas: Tarjeta[], ctx?: ContextoEstudio, opciones?: { conRespuesta?: boolean; titulo?: string }) {
  const conRespuesta = opciones?.conRespuesta ?? true
  const nombreMateria = (id: string) => ctx?.materias.find((m) => m.id === id)?.nombre ?? ''
  const nombreSubtema = (id: string) => ctx?.subtemas.find((s) => s.id === id)?.nombre ?? ''

  const grupos = new Map<string, Tarjeta[]>()
  for (const t of tarjetas) {
    const clave = nombreSubtema(t.subtemaId) || nombreMateria(t.materiaId) || 'General'
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave)!.push(t)
  }

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>${opciones?.titulo ?? 'Tarjetas de estudio'}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif; color: #24334a; margin: 0; font-size: 10.5pt; }
  h1 { font-size: 18pt; margin: 0 0 2mm; letter-spacing: -0.02em; }
  .sub { font-size: 9pt; color: #718096; margin: 0 0 7mm; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 0.08em; color: #7961d8;
       border-bottom: 0.6pt solid #e8e5dc; padding-bottom: 1.5mm; margin: 7mm 0 3mm; page-break-after: avoid; }
  .tarjeta { border: 0.6pt solid #e8e5dc; border-radius: 3mm; padding: 3.5mm 4mm; margin-bottom: 3mm; page-break-inside: avoid; }
  .preg { font-weight: 700; font-size: 10.5pt; margin: 0 0 1.5mm; }
  .resp { font-size: 9.5pt; color: #30445f; margin: 0; white-space: pre-line; }
  .meta { font-size: 7.5pt; color: #aeb7c4; margin-top: 1.5mm; text-transform: uppercase; letter-spacing: 0.06em; }
  .teclas { margin-top: 1.5mm; font-size: 8pt; color: #7961d8; }
  .lineas { margin-top: 2mm; border-top: 0.4pt dashed #cfd6df; height: 12mm; }
  .pie { position: fixed; bottom: 0; left: 0; right: 0; font-size: 7.5pt; color: #aeb7c4; text-align: center; }
  @media print { .no-print { display: none; } }
</style></head><body>
<h1>${opciones?.titulo ?? 'Tarjetas de estudio'}</h1>
<p class="sub">KNOWLEDGE · ${tarjetas.length} tarjetas · ${new Date().toLocaleDateString('es-AR')}</p>
${[...grupos.entries()]
  .map(
    ([grupo, lista]) => `<h2>${grupo}</h2>
${lista
  .map(
    (t) => `<div class="tarjeta">
  <p class="preg">${limpiar(t.pregunta)}</p>
  ${conRespuesta ? `<p class="resp">${limpiar(t.respuesta)}</p>` : '<div class="lineas"></div>'}
  ${conRespuesta && t.palabrasClave.length ? `<p class="teclas">${t.palabrasClave.join(' · ')}</p>` : ''}
  ${t.capitulo || t.pagina ? `<p class="meta">${t.capitulo}${t.pagina ? ` · pág. ${t.pagina}` : ''}</p>` : ''}
</div>`,
  )
  .join('\n')}`,
  )
  .join('\n')}
<div class="pie">KNOWLEDGE — material de estudio personal</div>
</body></html>`

  const ventana = window.open('', '_blank')
  if (!ventana) throw new Error('El navegador bloqueó la ventana. Permití las ventanas emergentes para exportar el PDF.')
  ventana.document.write(html)
  ventana.document.close()
  ventana.focus()
  setTimeout(() => ventana.print(), 450)
}
