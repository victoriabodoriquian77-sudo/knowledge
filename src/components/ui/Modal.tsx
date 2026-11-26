import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
  ancho = 'max-w-lg',
  pie,
}: {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: string
  children: ReactNode
  ancho?: string
  pie?: ReactNode
}) {
  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [abierto, onCerrar])

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCerrar}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={`relative z-10 w-full ${ancho} max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-cream p-5 shadow-float sm:rounded-xl3 sm:p-6`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[19px] font-extrabold leading-tight text-ink">{titulo}</h3>
                {descripcion && <p className="mt-1 text-[13px] leading-relaxed text-muted">{descripcion}</p>}
              </div>
              <button onClick={onCerrar} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-muted transition hover:text-ink" aria-label="Cerrar">
                <X size={17} />
              </button>
            </div>
            {children}
            {pie && <div className="mt-5 flex flex-wrap justify-end gap-2">{pie}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Confirm({
  abierto,
  titulo,
  detalle,
  onCancelar,
  onConfirmar,
  textoConfirmar = 'Eliminar',
  peligro = true,
}: {
  abierto: boolean
  titulo: string
  detalle?: string
  onCancelar: () => void
  onConfirmar: () => void
  textoConfirmar?: string
  peligro?: boolean
}) {
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCancelar}
      titulo={titulo}
      descripcion={detalle}
      ancho="max-w-md"
      pie={
        <>
          <button onClick={onCancelar} className="btn-3d h-11 rounded-2xl border-2 border-line bg-white px-5 text-[13px] font-extrabold uppercase text-ink">
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className={`btn-3d h-11 rounded-2xl px-5 text-[13px] font-extrabold uppercase text-white ${peligro ? 'bg-coral' : 'bg-grape'}`}
          >
            {textoConfirmar}
          </button>
        </>
      }
    >
      <div />
    </Modal>
  )
}
