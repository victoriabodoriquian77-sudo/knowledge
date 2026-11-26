import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { Flame, Timer, Trophy, X } from 'lucide-react'
import type { SesionEstudio } from '../../../lib/sesion'
import { db } from '../../../db/database'
import type { ProgresoTarjeta, Tarjeta } from '../../../types/models'
import type { ResultadoFinal } from '../../../pages/Actividad'
import { generarEjercicios } from '../motor'
import { Card, Progress } from '../../../components/ui/Primitives'
import { Button } from '../../../components/ui/Button'
import { Lumi } from '../../../components/mascot/Lumi'
import { Check } from 'lucide-react'
import { useConfig } from '../../../hooks/useDatos'

/**
 * Desafío individual estilo Kahoot: cronómetro por pregunta,
 * puntaje por rapidez, multiplicadores por racha y récord personal.
 */
export function KahootSesion({
  sesion,
  tarjetas,
  pool,
  progresos,
  onFinalizar,
  onSalir,
}: {
  sesion: SesionEstudio
  tarjetas: Tarjeta[]
  pool: Tarjeta[]
  progresos: Map<string, ProgresoTarjeta>
  onFinalizar: (r: ResultadoFinal) => void
  onSalir: () => void
  onToast: (m: string, t?: 'ok' | 'error' | 'info') => void
}) {
  const config = useConfig()
  const segundos = config?.segundosPorPregunta ?? 20
  const base = config?.puntosPorAciertoKahoot ?? 100

  const [indice, setIndice] = useState(0)
  const [restante, setRestante] = useState(segundos)
  const [elegida, setElegida] = useState<number | null>(null)
  const [bloqueado, setBloqueado] = useState(false)
  const [puntos, setPuntos] = useState(0)
  const [racha, setRacha] = useState(0)
  const [aciertos, setAciertos] = useState(0)
  const [finalizando, setFinalizando] = useState(false)
  const inicio = useRef(Date.now())
  const inicioPregunta = useRef(Date.now())

  const { ejercicios } = useMemo(
    () => generarEjercicios({ tipo: 'kahoot', tarjetas, pool, progresos, cantidad: Math.min(12, tarjetas.length) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tarjetas.length],
  )

  const actual = ejercicios[indice]

  useEffect(() => {
    if (bloqueado) return
    if (restante <= 0) {
      void responder(null)
      return
    }
    const t = setTimeout(() => setRestante((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restante, bloqueado])

  useEffect(() => {
    setRestante(segundos)
    inicioPregunta.current = Date.now()
  }, [indice, segundos])

  const responder = async (opcion: number | null) => {
    if (bloqueado || !actual || actual.tipo !== 'multiple') return
    setBloqueado(true)
    setElegida(opcion)
    const correcta = opcion !== null && actual.opciones[opcion]?.correcta
    const ms = Date.now() - inicioPregunta.current
    const rapidez = Math.max(0.35, 1 - ms / (segundos * 1000))
    const multiplicador = racha >= 8 ? 3 : racha >= 5 ? 2.5 : racha >= 3 ? 2 : racha >= 1 ? 1.5 : 1
    const ganados = correcta ? Math.round(base * rapidez * multiplicador) : 0
    setPuntos((p) => p + ganados)
    setRacha((r) => (correcta ? r + 1 : 0))
    if (correcta) setAciertos((a) => a + 1)

    await sesion.responder({
      tarjeta: actual.tarjeta,
      correcto: !!correcta,
      puntaje: correcta ? 1 : 0,
      dimension: 'reconocimiento',
      ms,
    })

    setTimeout(() => {
      if (indice + 1 >= ejercicios.length) {
        void terminar()
      } else {
        setBloqueado(false)
        setElegida(null)
        setIndice((i) => i + 1)
      }
    }, correcta ? 900 : 1700)
  }

  const terminar = async () => {
    if (finalizando) return
    setFinalizando(true)
    const precisionKahoot = Math.round((sesion.intentosActuales.filter((i) => i.correcto).length / Math.max(1, sesion.intentosActuales.length)) * 100)
    await sesion.finalizar({ nota: precisionKahoot })

    // Récord personal del desafío: se guarda de verdad, por eso se puede superar.
    const previo = await db.juegos.get('kahoot')
    await db.juegos.put({
      id: 'kahoot',
      mejorPuntaje: Math.max(previo?.mejorPuntaje ?? 0, puntos),
      mejorRacha: Math.max(previo?.mejorRacha ?? 0, sesion.rachaMaximaSesion),
      partidas: (previo?.partidas ?? 0) + 1,
      actualizadoEn: Date.now(),
    })

    const intentos = sesion.intentosActuales
    const ok = intentos.filter((i) => i.correcto).length
    onFinalizar({
      total: intentos.length,
      aciertos: ok,
      fallos: intentos.length - ok,
      omitidas: 0,
      precision: intentos.length ? Math.round((ok / intentos.length) * 100) : 0,
      xp: sesion.xpAcumulada,
      monedas: sesion.monedasAcumuladas,
      duracionMs: Date.now() - inicio.current,
      porSubtema: {},
      rachaMaxima: sesion.rachaMaximaSesion,
      nota: Math.round((ok / Math.max(1, intentos.length)) * 100),
    })
  }

  if (!actual || actual.tipo !== 'multiple') {
    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <Lumi animo="pensativo" tamano={100} className="mx-auto" />
        <p className="mt-2 text-[14px] font-extrabold text-ink">Necesitás al menos 4 tarjetas para el desafío</p>
        <Button className="mt-4" onClick={onSalir}>Volver</Button>
      </Card>
    )
  }

  const pct = (restante / segundos) * 100
  const colorTiempo = restante <= 5 ? 'bg-coral' : restante <= 10 ? 'bg-mango' : 'bg-grass-bright'

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onSalir} className="inline-flex items-center gap-1 text-[11.5px] font-extrabold uppercase tracking-wide text-muted hover:text-ink">
          <X size={13} /> Salir
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-mango-tint px-2.5 py-1 text-[11px] font-extrabold text-mango">
            <Trophy size={12} /> {puntos} pts
          </span>
          {racha > 1 && (
            <motion.span key={racha} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="inline-flex items-center gap-1 rounded-full bg-coral-tint px-2.5 py-1 text-[11px] font-extrabold text-coral">
              <Flame size={12} /> x{racha >= 8 ? 3 : racha >= 5 ? 2.5 : racha >= 3 ? 2 : 1.5}
            </motion.span>
          )}
          <span className="text-[11px] font-extrabold text-muted">{indice + 1}/{ejercicios.length}</span>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Progress value={((indice + 1) / ejercicios.length) * 100} tono="bg-grape" alto="h-1.5" className="flex-1" />
        <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums', restante <= 5 ? 'bg-coral-tint text-coral' : 'bg-cream text-ink')}>
          <Timer size={11} /> {restante}s
        </span>
      </div>
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-line">
        <motion.div className={clsx('h-full rounded-full', colorTiempo)} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'linear' }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={indice} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
          <Card className="p-5 text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-grape">Pregunta {indice + 1}</p>
            <p className="mx-auto mt-2 max-w-xl text-[17px] font-extrabold leading-snug text-ink">{actual.tarjeta.pregunta.replace(/<[^>]+>/g, '')}</p>
          </Card>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {actual.opciones.map((o, i) => {
              const esCorrecta = o.correcta
              const mostrar = bloqueado
              return (
                <motion.button
                  key={i}
                  disabled={bloqueado}
                  onClick={() => responder(i)}
                  whileTap={{ scale: 0.98 }}
                  className={clsx(
                    'flex min-h-[76px] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition',
                    ['border-grape/40 bg-grape-tint/40', 'border-sky/40 bg-sky-tint/50', 'border-mango/50 bg-mango-tint/60', 'border-grass-bright/50 bg-grass-tint/50'][i % 4],
                    mostrar && esCorrecta && 'border-grass-bright bg-grass-tint ring-2 ring-grass-bright',
                    mostrar && elegida === i && !esCorrecta && 'border-coral bg-coral-tint',
                    mostrar && !esCorrecta && elegida !== i && 'opacity-50',
                    !bloqueado && 'hover:brightness-[0.98]',
                  )}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[12px] font-black text-ink shadow-sm">
                    {mostrar && esCorrecta ? <Check size={15} className="text-grass" /> : mostrar && elegida === i ? <X size={15} className="text-coral" /> : String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 text-[13px] font-extrabold leading-snug text-ink">{o.texto}</span>
                </motion.button>
              )
            })}
          </div>

          <AnimatePresence>
            {bloqueado && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card">
                <Lumi animo={elegida !== null && actual.opciones[elegida]?.correcta ? 'celebrando' : 'pensativo'} tamano={48} />
                <div className="min-w-0">
                  <p className={clsx('text-[12.5px] font-extrabold', elegida !== null && actual.opciones[elegida]?.correcta ? 'text-grass' : 'text-coral')}>
                    {elegida !== null && actual.opciones[elegida]?.correcta ? '¡Correcto!' : elegida === null ? 'Se terminó el tiempo' : 'Incorrecto'}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] font-semibold text-muted">{actual.tarjeta.respuesta.replace(/<[^>]+>/g, '').slice(0, 130)}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
