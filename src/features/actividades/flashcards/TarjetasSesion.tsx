import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { ArrowRight, Eye, Flag, RotateCw, Star, Timer } from 'lucide-react'
import type { SesionEstudio } from '../../../lib/sesion'
import type { ProgresoTarjeta, Tarjeta, TipoActividad } from '../../../types/models'
import { Button } from '../../../components/ui/Button'
import { Card, Progress } from '../../../components/ui/Primitives'
import { Lumi } from '../../../components/mascot/Lumi'
import { RichTextRenderer } from '../../../components/ui/RichTextRenderer'
import { generarEjercicios } from '../motor'
import { DIMENSION_POR_TIPO } from '../../../lib/quiz'
import type { ResultadoFinal } from '../../../pages/Actividad'
import { Progress as Bar } from '../../../components/ui/Primitives'
import { estaDominada, estimarRepaso } from '../../../lib/srs'

/**
 * Flashcards clásicas: sin límite de tiempo, con giro de tarjeta y
 * autoevaluación honesta (No lo sabía / Me costó / Lo sabía).
 */
export function TarjetasSesion({
  sesion,
  tarjetas,
  pool,
  progresos,
  subtemasNombres,
  onFinalizar,
  onSalir,
}: {
  sesion: SesionEstudio
  tarjetas: Tarjeta[]
  pool: Tarjeta[]
  progresos: Map<string, ProgresoTarjeta>
  subtemasNombres: Record<string, string>
  onFinalizar: (r: ResultadoFinal) => void
  onSalir: () => void
  onToast: (m: string, t?: 'ok' | 'error' | 'info') => void
}) {
  const [indice, setIndice] = useState(0)
  const [girada, setGirada] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const inicio = useRef(Date.now())
  const inicioTarjeta = useRef(Date.now())

  const tarjetasSesion = useMemo(() => {
    const { tarjetas: sel } = generarEjercicios({
      tipo: 'flashcards',
      tarjetas,
      pool,
      progresos,
      cantidad: Math.min(tarjetas.length, 30),
    })
    return sel
  }, [tarjetas, pool, progresos])

  useEffect(() => {
    inicioTarjeta.current = Date.now()
  }, [indice])

  const t = tarjetasSesion[indice]

  const clasificar = async (clasificacion: 'otra-vez' | 'dificil' | 'facil') => {
    if (!t || finalizando) return
    const correcto = clasificacion !== 'otra-vez'
    const puntaje = clasificacion === 'facil' ? 1 : clasificacion === 'dificil' ? 0.7 : 0
    await sesion.responder({
      tarjeta: t,
      correcto,
      puntaje,
      clasificacion,
      dimension: 'recuperacion',
      ms: Date.now() - inicioTarjeta.current,
    })
    avanzar()
  }

  const avanzar = () => {
    if (indice + 1 >= tarjetasSesion.length) {
      void terminar()
    } else {
      setGirada(false)
      setIndice((i) => i + 1)
    }
  }

  const terminar = async () => {
    if (finalizando) return
    setFinalizando(true)
    await sesion.finalizar()
    const intentos = sesion.intentosActuales
    const aciertos = intentos.filter((i) => i.correcto).length
    onFinalizar({
      total: intentos.length,
      aciertos,
      fallos: intentos.length - aciertos,
      omitidas: 0,
      precision: intentos.length ? Math.round((aciertos / intentos.length) * 100) : 0,
      xp: sesion.xpAcumulada,
      monedas: sesion.monedasAcumuladas,
      duracionMs: Date.now() - inicio.current,
      porSubtema: {},
      rachaMaxima: sesion.rachaMaximaSesion,
    })
  }

  if (!t) {
    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <Lumi animo="pensativo" tamano={100} className="mx-auto" />
        <p className="mt-2 text-[14px] font-extrabold text-ink">No hay tarjetas para estudiar</p>
        <Button className="mt-4" onClick={onSalir}>Volver</Button>
      </Card>
    )
  }

  const progreso = progresos.get(t.id)

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={async () => {
            if (sesion.cantidad > 0 && !finalizando) {
              setFinalizando(true)
              await sesion.finalizar()
            }
            onSalir()
          }}
          className="text-[11.5px] font-extrabold uppercase tracking-wide text-muted hover:text-ink"
        >
          Salir
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-muted shadow-card">
            <Timer size={11} /> Sin límite
          </span>
          <span className="text-[11.5px] font-extrabold text-ink">{indice + 1} / {tarjetasSesion.length}</span>
        </div>
      </div>
      <Progress value={((indice) / tarjetasSesion.length) * 100} tono="bg-grape" alto="h-2" className="mb-4" />

      <AnimatePresence mode="wait">
        <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
          <Card className="relative overflow-hidden p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-muted">
                {subtemasNombres[t.subtemaId] ?? 'Subtema'}
              </span>
              {t.favorita && <Star size={12} className="fill-sun-deep text-sun-deep" />}
              {progreso?.repeticiones ? (
                <span className="rounded-full bg-sky-tint px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-sky">
                  {estimarRepaso(progreso)}
                </span>
              ) : (
                <span className="rounded-full bg-sun-tint px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-sun-deep">Nueva</span>
              )}
            </div>

            <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-grape">Pregunta</p>
            <RichTextRenderer html={t.pregunta} className="mt-1.5 min-h-[70px] text-[15.5px] font-bold leading-snug text-ink" />

            <AnimatePresence>
              {girada && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                  <div className="mt-4 border-t border-dashed border-line pt-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-grass">Respuesta</p>
                    <RichTextRenderer html={t.respuesta} className="mt-1.5 text-[14px] leading-relaxed text-ink" />
                    {t.explicacion && (
                      <div className="mt-3 rounded-xl bg-cream px-3 py-2.5">
                        <p className="text-[9.5px] font-extrabold uppercase tracking-wide text-muted">Explicación</p>
                        <RichTextRenderer html={t.explicacion} className="mt-1 text-[12.5px] text-ink-soft" />
                      </div>
                    )}
                    {t.ejemplo && (
                      <div className="mt-2 rounded-xl bg-sky-tint/50 px-3 py-2.5">
                        <p className="text-[9.5px] font-extrabold uppercase tracking-wide text-sky">Ejemplo</p>
                        <RichTextRenderer html={t.ejemplo} className="mt-1 text-[12.5px] text-ink-soft" />
                      </div>
                    )}
                    {t.imagen && <img src={t.imagen} alt="Apoyo visual" className="mt-3 max-h-56 rounded-xl border border-line object-contain" />}
                    {(t.capitulo || t.pagina) && (
                      <p className="mt-2 text-[10.5px] font-semibold text-stone">
                        {t.capitulo}{t.capitulo && t.pagina ? ' · ' : ''}{t.pagina ? `pág. ${t.pagina}` : ''}
                      </p>
                    )}
                    {t.palabrasClave.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.palabrasClave.map((c) => (
                          <span key={c} className="rounded-full bg-grape-tint px-2 py-0.5 text-[10px] font-extrabold text-grape">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </AnimatePresence>

      {!girada ? (
        <div className="mt-4">
          <Button bloque tam="lg" onClick={() => setGirada(true)}>
            <Eye size={17} /> Mostrar respuesta
          </Button>
          <p className="mt-2 text-center text-[11px] font-semibold text-muted">
            Pensá la respuesta antes de girar. Ese esfuerzo es el que construye memoria.
          </p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <p className="mb-2 text-center text-[11px] font-extrabold uppercase tracking-wide text-muted">¿Qué tan bien la sabías?</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => clasificar('otra-vez')} className="rounded-2xl border-2 border-coral bg-coral-tint/60 px-2 py-3 text-[12px] font-extrabold text-coral transition hover:bg-coral-tint">
              No lo sabía
            </button>
            <button onClick={() => clasificar('dificil')} className="rounded-2xl border-2 border-sun-deep/50 bg-sun-tint px-2 py-3 text-[12px] font-extrabold text-sun-deep transition hover:bg-sun-tint/80">
              Me costó
            </button>
            <button onClick={() => clasificar('facil')} className="rounded-2xl border-2 border-grass-bright bg-grass-tint px-2 py-3 text-[12px] font-extrabold text-grass transition hover:bg-grass-tint/80">
              Lo sabía
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={() => setGirada(false)} className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-muted hover:text-ink">
              <RotateCw size={12} /> Volver a la pregunta
            </button>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-stone"><Flag size={11} /> Guardado automático</span>
          </div>
        </motion.div>
      )}

      <p className="mt-4 text-center text-[10.5px] font-semibold text-stone">
        Se guarda el rendimiento individual de cada tarjeta y se reprograma el próximo repaso.
      </p>
      <Bar value={0} className="hidden" />
    </div>
  )
}
