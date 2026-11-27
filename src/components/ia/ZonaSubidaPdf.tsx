import { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, FileText, Loader2, Sparkles, Upload, X } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '../ui/Button'
import { Lumi } from '../mascot/Lumi'
import type { FaseImportacion } from '../../hooks/useImportarPdf'

/**
 * Recuadro para subir un PDF. Acepta arrastre, clic y selección desde el
 * explorador. Muestra el progreso real del procesamiento, con la opción de
 * cancelar: un PDF grande puede tardar y el usuario tiene que poder cortarlo.
 */
export function ZonaSubidaPdf({
  fase,
  onArchivo,
  onCancelar,
  materiaSugerida,
  onCambiarMateria,
}: {
  fase: FaseImportacion
  onArchivo: (archivo: File) => void
  onCancelar: () => void
  materiaSugerida?: string
  onCambiarMateria?: (valor: string) => void
}) {
  const [arrastrando, setArrastrando] = useState(false)
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const ocupado = fase.nombre === 'leyendo' || fase.nombre === 'importando'

  const soltar = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setArrastrando(false)
      if (ocupado) return
      const archivo = e.dataTransfer.files?.[0]
      if (archivo) {
        setNombreArchivo(archivo.name)
        onArchivo(archivo)
      }
    },
    [ocupado, onArchivo],
  )

  const elegir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (archivo) {
      setNombreArchivo(archivo.name)
      onArchivo(archivo)
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!ocupado) setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={soltar}
        className={clsx(
          'relative overflow-hidden rounded-xl3 border-2 border-dashed p-6 text-center transition sm:p-8',
          arrastrando ? 'border-grape bg-grape-tint/70' : 'border-line bg-cream/60',
          ocupado && 'pointer-events-none opacity-90',
        )}
      >
        {/* Textura suave de fondo, sin ruido visual */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.5]" aria-hidden="true">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-grape-tint" />
          <div className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-sun-tint" />
        </div>

        <div className="relative">
          {fase.nombre === 'leyendo' ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2.5">
                <Lumi animo="pensativo" tamano={54} />
                <Loader2 size={20} className="animate-spin text-grape" aria-hidden="true" />
              </div>
              <p className="text-[15px] font-extrabold text-ink">{fase.mensaje}</p>
              {nombreArchivo && (
                <p className="max-w-full truncate text-[12px] font-semibold text-muted">{nombreArchivo}</p>
              )}
              <p className="text-[11.5px] font-semibold text-muted">
                La IA está leyendo el PDF completo. Puede tardar hasta un minuto.
              </p>
              <Button variante="secundario" tam="sm" onClick={onCancelar}>
                <X size={13} /> Cancelar
              </Button>
            </div>
          ) : (
            <>
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-grape shadow-card">
                <FileText size={26} />
              </div>
              <p className="mt-3 text-[15.5px] font-extrabold text-ink">Arrastrá tu PDF acá</p>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] font-semibold leading-relaxed text-muted">
                Apuntes, un capítulo, una ley o una guía. La IA lo lee entero y arma las unidades, los subtemas y las
                tarjetas por vos.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button onClick={() => inputRef.current?.click()} tam="md">
                  <Upload size={15} /> Elegir PDF
                </Button>
                <span className="text-[11px] font-bold uppercase tracking-wide text-stone">hasta 20 MB</span>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={elegir}
                aria-label="Elegir un archivo PDF"
              />
            </>
          )}
        </div>
      </div>

      {onCambiarMateria && !ocupado && (
        <label className="block">
          <span className="mb-1.5 block text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-muted">
            Nombre de la materia (opcional)
          </span>
          <input
            id="ia-materia"
            className="field h-11 text-[13.5px]"
            placeholder="Por ejemplo: Derecho — Contratos"
            defaultValue={materiaSugerida ?? ''}
            onChange={(e) => onCambiarMateria(e.target.value)}
          />
          <span className="mt-1 block text-[11px] font-semibold text-stone">
            Si lo dejás vacío, la IA propone el nombre según el contenido.
          </span>
        </label>
      )}

      {fase.nombre === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 rounded-2xl border border-coral/30 bg-coral-tint px-4 py-3"
          role="alert"
        >
          <X size={15} className="mt-0.5 shrink-0 text-coral" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-extrabold text-coral">No se pudo procesar</p>
            <p className="mt-0.5 text-[12px] font-semibold leading-relaxed text-ink-soft">{fase.mensaje}</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/** Bloque de resultado: qué entendió la IA y qué se va a crear. */
export function ResumenMaterial({
  material,
  totalTarjetas,
  onConfirmar,
  onDescartar,
  importando,
}: {
  material: { materia: { nombre: string; descripcion: string }; resumen: string; unidades: { nombre: string; subtemas: { nombre: string; tarjetas: unknown[] }[] }[] }
  totalTarjetas: number
  onConfirmar: () => void
  onDescartar: () => void
  importando: boolean
}) {
  const totalSubtemas = material.unidades.reduce((t, u) => t + u.subtemas.length, 0)
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-grass/25 bg-grass-tint px-4 py-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-grass shadow-card">
          <Sparkles size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-extrabold text-grass">Material listo para revisar</p>
          <p className="mt-0.5 text-[12px] font-semibold leading-relaxed text-ink-soft">
            {material.resumen || 'La IA terminó de leer el documento.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-white">
        {[
          { v: material.unidades.length, l: 'Unidades' },
          { v: totalSubtemas, l: 'Subtemas' },
          { v: totalTarjetas, l: 'Tarjetas' },
        ].map((s) => (
          <div key={s.l} className="px-3 py-3 text-center">
            <p className="text-[19px] font-extrabold leading-none text-ink">{s.v}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {material.unidades.map((u, i) => (
          <div key={u.nombre + i} className="rounded-xl border border-line bg-white p-3">
            <p className="text-[12.5px] font-extrabold text-ink">
              {String(i + 1).padStart(2, '0')} · {u.nombre}
            </p>
            <ul className="mt-1 space-y-0.5">
              {u.subtemas.map((s, j) => (
                <li key={s.nombre + j} className="flex items-baseline gap-2 text-[11.5px] font-semibold text-muted">
                  <Check size={11} className="mt-0.5 shrink-0 text-grass" />
                  <span className="min-w-0 flex-1 truncate">{s.nombre}</span>
                  <span className="shrink-0 text-stone">{s.tarjetas.length}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button onClick={onConfirmar} cargando={importando} bloque tam="md">
          <Check size={15} /> Crear material
        </Button>
        <Button variante="secundario" onClick={onDescartar} bloque tam="md">
          Descartar
        </Button>
      </div>
    </div>
  )
}
