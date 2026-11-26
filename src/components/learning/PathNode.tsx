import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Check, Lock, Sparkles, Star } from 'lucide-react'
import type { ResumenSubtema } from '../../lib/hierarchy'
import { useNavigate } from 'react-router-dom'

const CONFIG: Record<string, { anillo: string; fondo: string; texto: string; borde: string }> = {
  completado: { anillo: 'bg-grass-bright', fondo: 'bg-white', texto: 'text-grass', borde: 'border-grass-bright' },
  dominado: { anillo: 'bg-grass', fondo: 'bg-white', texto: 'text-grass', borde: 'border-grass' },
  'en-progreso': { anillo: 'bg-grape', fondo: 'bg-white', texto: 'text-grape', borde: 'border-grape' },
  disponible: { anillo: 'bg-grape', fondo: 'bg-white', texto: 'text-grape', borde: 'border-grape' },
  bloqueado: { anillo: 'bg-stone/40', fondo: 'bg-cream', texto: 'text-stone', borde: 'border-line' },
}

export function PathNode({ resumen, indice, lado }: { resumen: ResumenSubtema; indice: number; lado: 'izq' | 'der' | 'centro' }) {
  const { subtema, estado, dominio, tarjetas, dominadas } = resumen
  const navigate = useNavigate()
  const cfg = CONFIG[estado] ?? CONFIG.disponible
  const bloqueado = estado === 'bloqueado'
  const completado = estado === 'completado' || estado === 'dominado'

  return (
    <div className={clsx('relative flex w-full items-center gap-3 sm:gap-4', lado === 'der' ? 'flex-row-reverse text-right' : 'flex-row text-left')}>
      <div className="relative shrink-0">
        <motion.button
          whileHover={bloqueado ? {} : { scale: 1.05 }}
          whileTap={bloqueado ? {} : { scale: 0.97 }}
          onClick={() => !bloqueado && navigate(`/aprender/subtema/${subtema.id}`)}
          disabled={bloqueado}
          aria-label={`${subtema.nombre}: ${estado}`}
          className={clsx(
            'relative grid h-[68px] w-[68px] place-items-center rounded-full border-[5px] bg-white shadow-card transition sm:h-[84px] sm:w-[84px]',
            cfg.borde,
            bloqueado && 'cursor-not-allowed opacity-80',
          )}
        >
          <span className={clsx('grid h-[50px] w-[50px] place-items-center rounded-full sm:h-[64px] sm:w-[64px]', completado ? cfg.anillo : 'bg-cream')}>
            {bloqueado ? (
              <Lock size={20} className="text-stone" />
            ) : completado ? (
              estado === 'dominado' ? <Star size={24} className="fill-white text-white" /> : <Check size={26} strokeWidth={3.2} className="text-white" />
            ) : (
              <span className={clsx('text-[18px] font-black sm:text-[20px]', cfg.texto)}>{String(indice + 1).padStart(2, '0')}</span>
            )}
          </span>
          {estado === 'en-progreso' && (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-grape px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wide text-white">
              En curso
            </span>
          )}
          {estado === 'disponible' && tarjetas > 0 && (
            <motion.span
              animate={{ scale: [1, 1.18, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-sun text-ink"
            >
              <Sparkles size={11} />
            </motion.span>
          )}
        </motion.button>
      </div>

      <div className={clsx('min-w-0 flex-1 rounded-2xl border border-line bg-white px-3.5 py-2.5 shadow-card', bloqueado && 'opacity-70')}>
        <div className={clsx('flex items-center gap-2', lado === 'der' && 'justify-end')}>
          <p className="truncate text-[13px] font-extrabold text-ink sm:text-[13.5px]">{subtema.nombre}</p>
        </div>
        {subtema.descripcion && <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-muted">{subtema.descripcion}</p>}
        <div className={clsx('mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5', lado === 'der' && 'justify-end')}>
          <span className={clsx('text-[10px] font-extrabold uppercase tracking-wide', cfg.texto)}>
            {bloqueado ? 'Bloqueado' : estado === 'dominado' ? 'Dominado' : estado === 'completado' ? 'Completado' : estado === 'en-progreso' ? 'En curso' : tarjetas ? 'Disponible' : 'Sin tarjetas'}
          </span>
          {!bloqueado && tarjetas > 0 && (
            <span className="text-[10px] font-bold text-stone">
              {completado ? `${dominadas}/${tarjetas} dominadas` : `${dominio}% dominio`}
            </span>
          )}
          {bloqueado && tarjetas > 0 && <span className="text-[10px] font-bold text-stone">{tarjetas} tarjetas</span>}
        </div>
        {!bloqueado && tarjetas > 0 && (
          <div className={clsx('mt-1.5 h-1.5 w-full max-w-[190px] overflow-hidden rounded-full bg-cream', lado === 'der' && 'ml-auto')}>
            <div
              className={clsx('h-full rounded-full', completado ? 'bg-grass-bright' : 'bg-grape')}
              style={{ width: `${Math.max(4, completado ? 100 : dominio)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
