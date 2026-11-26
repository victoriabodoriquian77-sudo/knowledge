import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

type Tipo = 'ok' | 'error' | 'info'
interface Toast {
  id: string
  mensaje: string
  tipo: Tipo
}

interface Ctx {
  toast: (mensaje: string, tipo?: Tipo) => void
}

const ToastCtx = createContext<Ctx>({ toast: () => {} })
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((mensaje: string, tipo: Tipo = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev.slice(-2), { id, mensaje, tipo }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3800)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-8">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-2xl bg-ink px-4 py-3 text-white shadow-float"
              role="status"
            >
              {t.tipo === 'ok' && <CheckCircle2 size={18} className="shrink-0 text-grass-bright" />}
              {t.tipo === 'error' && <TriangleAlert size={18} className="shrink-0 text-coral" />}
              {t.tipo === 'info' && <Info size={18} className="shrink-0 text-sky" />}
              <p className="flex-1 text-[13px] font-bold leading-snug">{t.mensaje}</p>
              <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} aria-label="Cerrar aviso" className="text-white/60 hover:text-white">
                <X size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
