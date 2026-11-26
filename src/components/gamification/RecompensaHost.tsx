import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Coins, Flame, Sparkles, Trophy, Zap } from 'lucide-react'
import { onRecompensa } from '../../lib/gamification'
import { Lumi } from '../mascot/Lumi'
import type { Recompensa } from '../../types/models'

/**
 * Capa visual de recompensas. Sin sonidos: todo se comunica con
 * animaciones, color y texto.
 */
export function RecompensaHost() {
  const [cola, setCola] = useState<Recompensa[]>([])

  useEffect(() => {
    const off = onRecompensa((r) => {
      setCola((prev) => [...prev, r])
      setTimeout(() => setCola((prev) => prev.filter((x) => x.id !== r.id)), 3200)
    })
    return () => {
      off()
    }
  }, [])

  const actual = cola[0]

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[95] flex justify-center px-4">
      <AnimatePresence mode="wait">
        {actual && (
          <motion.div
            key={actual.id}
            initial={{ y: -60, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="pointer-events-auto flex max-w-[92vw] items-center gap-3 rounded-2xl border border-line bg-white px-4 py-2.5 shadow-float"
            role="status"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream">
              {actual.tipo === 'nivel' && <Sparkles size={19} className="text-grape" />}
              {actual.tipo === 'logro' && <Trophy size={19} className="text-sun-deep" />}
              {actual.tipo === 'mision' && <Coins size={19} className="text-mango" />}
              {actual.tipo === 'racha' && <Flame size={19} className="text-coral" />}
              {actual.tipo === 'xp' && <Zap size={19} className="text-grape" />}
              {actual.tipo === 'moneda' && <Coins size={19} className="text-sun-deep" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-extrabold text-ink">{actual.titulo}</p>
              {actual.detalle && <p className="truncate text-[11.5px] font-semibold text-muted">{actual.detalle}</p>}
            </div>
            {actual.tipo === 'logro' && <Lumi animo="celebrando" tamano={44} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
