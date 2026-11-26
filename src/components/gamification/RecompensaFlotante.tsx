import { AnimatePresence, motion } from 'framer-motion'

export function RecompensaFlotante({ xp, monedas }: { xp: number; monedas: number }) {
  return (
    <AnimatePresence>
      {(xp > 0 || monedas > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: -18, scale: 1 }}
          exit={{ opacity: 0, y: -34 }}
          transition={{ duration: 0.7 }}
          className="pointer-events-none absolute -top-2 right-4 z-10 flex gap-2"
        >
          {xp > 0 && <span className="rounded-full bg-grape px-2.5 py-1 text-[12px] font-extrabold text-white shadow-card">+{xp} XP</span>}
          {monedas > 0 && <span className="rounded-full bg-sun px-2.5 py-1 text-[12px] font-extrabold text-ink shadow-card">+{monedas}</span>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
