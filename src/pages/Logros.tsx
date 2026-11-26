import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Lock, Trophy } from 'lucide-react'
import { Card, Eyebrow, Progress } from '../components/ui/Primitives'
import { Button } from '../components/ui/Button'
import { Lumi } from '../components/mascot/Lumi'
import { useLogros, usePerfil } from '../hooks/useDatos'
import { LOGROS, xpParaNivel, nivelDesdeXp } from '../lib/constants'

export function Logros() {
  const logros = useLogros()
  const perfil = usePerfil()
  const navigate = useNavigate()

  const lista = logros ?? []
  const desbloqueados = useMemo(() => new Set(lista.filter((l) => l.desbloqueadoEn).map((l) => l.logro.id)), [lista])
  const total = LOGROS.length
  const hechos = desbloqueados.size
  const pct = Math.round((hechos / total) * 100)

  const info = perfil ? nivelDesdeXp(perfil.xp) : { nivel: 1, xpNivel: 0, xpSiguiente: xpParaNivel(1), restante: xpParaNivel(1), progreso: 0 }
  const nivel = info.nivel
  const xpSig = info.xpSiguiente
  const avance = Math.round(info.progreso * 100)

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-muted hover:text-ink">
        <ArrowLeft size={14} /> Volver
      </button>

      <Card className="relative overflow-hidden bg-ink p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Eyebrow color="text-sun">Tus logros</Eyebrow>
            <p className="mt-1 text-[24px] font-black leading-tight sm:text-[28px]">{hechos} de {total}</p>
            <p className="mt-1 max-w-md text-[12.5px] font-semibold text-white/70">
              Los logros se desbloquean con acciones reales: no hay atajos, no hay puntos regalados.
            </p>
            <div className="mt-3 max-w-xs">
              <div className="mb-1 flex justify-between text-[10.5px] font-extrabold uppercase tracking-wide text-white/60">
                <span>Nivel {nivel}</span><span>{perfil?.xp ?? 0} / {xpSig} XP</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <motion.div initial={{ width: 0 }} animate={{ width: `${avance}%` }} className="h-full rounded-full bg-sun" />
              </div>
            </div>
          </div>
          <Lumi animo={hechos > 0 ? 'orgulloso' : 'animando'} tamano={120} className="hidden sm:block" />
        </div>
      </Card>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {LOGROS.map((logro, i) => {
          const hecho = desbloqueados.has(logro.id)
          const registro = lista.find((x) => x.logro.id === logro.id)?.desbloqueadoEn
          return (
            <motion.div
              key={logro.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <Card className={`flex h-full items-start gap-3 p-4 ${hecho ? '' : 'opacity-80'}`}>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${hecho ? 'bg-sun-tint text-sun-deep' : 'bg-cream text-stone'}`}>
                  {hecho ? <Trophy size={19} /> : <Lock size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-extrabold leading-tight text-ink">{logro.titulo}</p>
                  <p className="mt-0.5 text-[11px] font-semibold leading-snug text-muted">{logro.descripcion}</p>
                  <div className="mt-2">
                    {hecho ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-grass-tint px-2 py-0.5 text-[10px] font-extrabold text-grass">
                        Desbloqueado {registro ? `· ${new Date(registro).toLocaleDateString('es-AR')}` : ''}
                      </span>
                    ) : (
                      <>
                        <Progress value={0} tono="bg-stone" alto="h-1" />
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-stone">
                          +{logro.recompensaXp} XP · {logro.recompensaMonedas} monedas
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="rounded-2xl bg-white p-4 text-center">
        <p className="text-[11.5px] font-semibold text-muted">
          Faltan {total - hechos} logros. Muchos se desbloquean solos con constancia diaria.
        </p>
        <Button variante="secundario" className="mt-2.5" onClick={() => navigate('/juegos')}>Seguir practicando</Button>
      </div>
      <p className="pb-3 text-center text-[10px] font-semibold text-stone">{pct}% completado</p>
    </div>
  )
}
