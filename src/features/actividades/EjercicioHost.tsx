import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { ArrowRight, Check, Lightbulb, RotateCcw, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Progress } from '../../components/ui/Primitives'
import { Lumi } from '../../components/mascot/Lumi'
import type { Ejercicio } from '../../lib/quiz'
import { compararCompletar, evaluarRespuestaAbierta, shuffle } from '../../lib/quiz'
import { conceptosDe } from '../../lib/quiz'
import { RichTextRenderer } from '../../components/ui/RichTextRenderer'

export interface ResultadoEjercicio {
  correcto: boolean
  puntaje: number
  conceptosPresentes?: string[]
  conceptosFaltantes?: string[]
}

interface Props {
  ejercicio: Ejercicio
  indice: number
  total: number
  onResponder: (r: ResultadoEjercicio) => void
  onSiguiente: () => void
  /** Modo examen: no muestra corrección hasta el final. */
  diferirCorreccion?: boolean
  segundosRestantes?: number
  racha?: number
  puntos?: number
}

export function EjercicioHost({
  ejercicio,
  indice,
  total,
  onResponder,
  onSiguiente,
  diferirCorreccion = false,
  segundosRestantes,
  racha = 0,
  puntos,
}: Props) {
  const [respuesta, setRespuesta] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [resultado, setResultado] = useState<ResultadoEjercicio | null>(null)
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [paresElegidos, setParesElegidos] = useState<Record<string, string>>({})
  const [izqSel, setIzqSel] = useState<string | null>(null)
  const [ordenActual, setOrdenActual] = useState<string[]>([])
  const [pistaVisible, setPistaVisible] = useState(false)
  const [autoeval, setAutoeval] = useState(false)
  const inicio = useRef(Date.now())

  useEffect(() => {
    setRespuesta('')
    setEnviado(false)
    setResultado(null)
    setSeleccion(null)
    setParesElegidos({})
    setIzqSel(null)
    setPistaVisible(false)
    setAutoeval(false)
    setOrdenActual(ejercicio.tipo === 'ordenar' ? ejercicio.elementos : [])
    inicio.current = Date.now()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejercicio])

  const tarjeta = 'tarjeta' in ejercicio ? ejercicio.tarjeta : null

  const enviar = (r: ResultadoEjercicio) => {
    if (enviado) return
    setEnviado(true)
    setResultado(r)
    onResponder(r)
  }

  const continuar = () => {
    if (!resultado) return
    if (diferirCorreccion) onSiguiente()
    else onSiguiente()
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Cabecera de progreso */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-extrabold uppercase tracking-wide text-muted">
            <span>Pregunta {indice + 1} de {total}</span>
            <span className="flex items-center gap-2">
              {racha > 1 && <span className="rounded-full bg-mango-tint px-2 py-0.5 text-mango">Racha {racha}</span>}
              {typeof puntos === 'number' && <span className="text-grape">{puntos} pts</span>}
              {typeof segundosRestantes === 'number' && (
                <span className={clsx('tabular-nums', segundosRestantes <= 5 ? 'text-coral' : 'text-ink')}>{segundosRestantes}s</span>
              )}
            </span>
          </div>
          <Progress value={((indice + (enviado ? 1 : 0)) / total) * 100} tono="bg-grape" alto="h-2" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={indice}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.22 }}
        >
          {ejercicio.tipo === 'multiple' && (
            <div>
              <Consigna>Elegí la opción correcta</Consigna>
              <TarjetaPregunta>{tarjeta && <RichTextRenderer html={tarjeta.pregunta} />}</TarjetaPregunta>
              <div className="mt-3 space-y-2">
                {ejercicio.opciones.map((o, i) => {
                  const elegida = seleccion === o.texto
                  const mostrar = enviado || !diferirCorreccion
                  const esCorrecta = o.correcta
                  return (
                    <button
                      key={i}
                      disabled={enviado}
                      onClick={() => {
                        setSeleccion(o.texto)
                        setEnviado(true)
                        setResultado({ correcto: esCorrecta, puntaje: esCorrecta ? 1 : 0 })
                        onResponder({ correcto: esCorrecta, puntaje: esCorrecta ? 1 : 0 })
                      }}
                      className={clsx(
                        'flex w-full items-center gap-3 rounded-2xl border-2 bg-white px-3.5 py-3 text-left transition',
                        !enviado && 'hover:border-grape/60 hover:bg-grape-tint/30',
                        enviado && esCorrecta && mostrar && !diferirCorreccion && 'border-grass-bright bg-grass-tint',
                        enviado && elegida && !esCorrecta && mostrar && !diferirCorreccion && 'border-coral bg-coral-tint',
                        enviado && diferirCorreccion && elegida && 'border-grape bg-grape-tint/60',
                        !enviado && elegida && 'border-grape bg-grape-tint/50',
                        !enviado && !elegida && 'border-line',
                        enviado && !esCorrecta && !elegida && 'border-line opacity-60',
                      )}
                    >
                      <span className={clsx('grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[12px] font-black', enviado && esCorrecta && mostrar ? 'bg-grass-bright text-white' : enviado && elegida && mostrar ? 'bg-coral text-white' : 'bg-cream text-muted')}>
                        {enviado && mostrar && esCorrecta ? <Check size={14} /> : enviado && mostrar && elegida ? <X size={14} /> : String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1 text-[13px] font-semibold leading-snug text-ink">{o.texto}</span>
                    </button>
                  )
                })}
              </div>
              {!enviado && (
                <p className="mt-2.5 text-center text-[11px] font-semibold text-stone">
                  Tocá la opción que creas correcta.
                </p>
              )}
            </div>
          )}

          {ejercicio.tipo === 'verdadero-falso' && (
            <div>
              <Consigna>¿La afirmación es verdadera o falsa?</Consigna>
              <TarjetaPregunta>
                <p className="whitespace-pre-line text-[13.5px] font-semibold leading-relaxed text-ink">{ejercicio.afirmacion}</p>
              </TarjetaPregunta>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {[true, false].map((valor) => {
                  const elegida = seleccion === (valor ? 'v' : 'f')
                  const acerto = enviado && ejercicio.esVerdadera === valor
                  const erro = enviado && elegida && ejercicio.esVerdadera !== valor
                  return (
                    <button
                      key={String(valor)}
                      disabled={enviado}
                      onClick={() => {
                        setSeleccion(valor ? 'v' : 'f')
                        setEnviado(true)
                        const ok = ejercicio.esVerdadera === valor
                        setResultado({ correcto: ok, puntaje: ok ? 1 : 0 })
                        onResponder({ correcto: ok, puntaje: ok ? 1 : 0 })
                      }}
                      className={clsx(
                        'rounded-2xl border-2 bg-white px-4 py-5 text-[15px] font-extrabold transition',
                        !enviado && 'hover:border-grape/60',
                        acerto && 'border-grass-bright bg-grass-tint text-grass',
                        erro && 'border-coral bg-coral-tint text-coral',
                        !enviado && elegida && 'border-grape',
                        !enviado && !elegida && 'border-line',
                      )}
                    >
                      {valor ? 'Verdadero' : 'Falso'}
                    </button>
                  )
                })}
              </div>
              {enviado && (
                <Explicacion tono={ejercicio.esVerdadera ? 'ok' : 'info'} titulo={ejercicio.esVerdadera ? 'Era verdadera' : 'Era falsa'}>
                  {ejercicio.explicacion}
                </Explicacion>
              )}
            </div>
          )}

          {ejercicio.tipo === 'completar' && (
            <div>
              <Consigna>Completá el espacio en blanco</Consigna>
              <TarjetaPregunta>
                <p className="text-[13.5px] font-semibold leading-relaxed text-ink">{ejercicio.oracion}</p>
              </TarjetaPregunta>
              <div className="mt-3">
                <input
                  className="field h-[52px] text-[15px]"
                  placeholder="Escribí el concepto faltante…"
                  value={respuesta}
                  disabled={enviado}
                  onChange={(e) => setRespuesta(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && respuesta.trim()) {
                      const ok = compararCompletar(respuesta, ejercicio.respuesta)
                      enviar({ correcto: ok, puntaje: ok ? 1 : 0 })
                    }
                  }}
                  autoFocus
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    disabled={!respuesta.trim() || enviado}
                    onClick={() => {
                      const ok = compararCompletar(respuesta, ejercicio.respuesta)
                      enviar({ correcto: ok, puntaje: ok ? 1 : 0 })
                    }}
                  >
                    Comprobar
                  </Button>
                  <button onClick={() => setPistaVisible(true)} className="inline-flex items-center gap-1 text-[11.5px] font-extrabold uppercase tracking-wide text-muted hover:text-ink">
                    <Lightbulb size={13} /> Pista
                  </button>
                </div>
                {pistaVisible && (
                  <p className="mt-2 rounded-xl bg-sun-tint px-3 py-2 text-[11.5px] font-semibold text-ink-soft">
                    La pregunta de origen: {ejercicio.pista}
                  </p>
                )}
              </div>
              {enviado && (
                <Explicacion tono={resultado?.correcto ? 'ok' : 'error'} titulo={resultado?.correcto ? '¡Correcto!' : 'Revisemos'}>
                  <p>
                    La respuesta esperada es <strong>{ejercicio.respuesta}</strong>.
                  </p>
                  <RichTextRenderer html={ejercicio.tarjeta.respuesta} className="mt-1 text-[12.5px]" />
                </Explicacion>
              )}
            </div>
          )}

          {ejercicio.tipo === 'escrita' && (
            <EjercicioAbierto
              ejercicio={ejercicio}
              enviado={enviado}
              respuesta={respuesta}
              setRespuesta={setRespuesta}
              resultado={resultado}
              autoeval={autoeval}
              setAutoeval={setAutoeval}
              onEnviar={(puntaje) => {
                const evaluacion = evaluarRespuestaAbierta(respuesta, ejercicio.tarjeta)
                const correcto = puntaje >= 0.6
                enviar({ correcto, puntaje, conceptosPresentes: evaluacion.presentes, conceptosFaltantes: evaluacion.faltantes })
              }}
              onAutoevaluar={(valor) => {
                const puntaje = valor === 'si' ? 1 : valor === 'parcial' ? 0.5 : 0
                const evaluacion = evaluarRespuestaAbierta(respuesta, ejercicio.tarjeta)
                enviar({ correcto: puntaje >= 0.6, puntaje, conceptosPresentes: evaluacion.presentes, conceptosFaltantes: evaluacion.faltantes })
              }}
            />
          )}

          {ejercicio.tipo === 'explicar' && (
            <div>
              <Consigna>Explicalo con tus propias palabras</Consigna>
              <div className="rounded-xl2 border border-line bg-white p-4">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-muted">Concepto a explicar</p>
                <RichTextRenderer html={ejercicio.tarjeta.pregunta} className="mt-1 text-[14px] font-bold" />
              </div>
              <p className="mt-2 text-[11.5px] font-semibold text-muted">
                Imaginá que se lo explicás a alguien que nunca estudió el tema. Usá tus palabras, no copies la respuesta.
              </p>
              <textarea
                className="field mt-2 min-h-[150px] resize-y text-[13.5px] leading-relaxed"
                placeholder="Escribí tu explicación…"
                value={respuesta}
                disabled={enviado}
                onChange={(e) => setRespuesta(e.target.value)}
              />
              {!enviado ? (
                <Button
                  className="mt-2.5"
                  disabled={respuesta.trim().split(/\s+/).length < 8}
                  onClick={() => {
                    const ev = evaluarRespuestaAbierta(respuesta, ejercicio.tarjeta)
                    const correcto = ev.puntaje >= 0.5
                    enviar({ correcto, puntaje: ev.puntaje, conceptosPresentes: ev.presentes, conceptosFaltantes: ev.faltantes })
                  }}
                >
                  Comparar mi explicación
                </Button>
              ) : (
                resultado && (
                  <PanelConceptos
                    presentes={resultado.conceptosPresentes ?? []}
                    faltantes={resultado.conceptosFaltantes ?? []}
                    puntaje={resultado.puntaje}
                    referencia={ejercicio.tarjeta.respuesta}
                    explicacion={ejercicio.tarjeta.explicacion}
                  />
                )
              )}
            </div>
          )}

          {ejercicio.tipo === 'relacionar' && (
            <div>
              <Consigna>Uní cada concepto con su definición</Consigna>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted">Conceptos</p>
                  {ejercicio.pares.map((p) => {
                    const unido = Object.keys(paresElegidos).includes(p.tarjetaId)
                    const activo = izqSel === p.tarjetaId
                    const correcto = enviado && unido && paresElegidos[p.tarjetaId] === p.derecha
                    return (
                      <button
                        key={p.tarjetaId}
                        disabled={enviado}
                        onClick={() => {
                          if (activo) return setIzqSel(null)
                          // Volver a tocar un concepto ya unido lo libera para corregirlo.
                          if (unido) {
                            const copia = { ...paresElegidos }
                            delete copia[p.tarjetaId]
                            setParesElegidos(copia)
                          }
                          setIzqSel(p.tarjetaId)
                        }}
                        className={clsx(
                          'w-full rounded-xl border-2 px-3 py-2.5 text-left text-[12px] font-bold leading-snug transition',
                          activo ? 'border-grape bg-grape-tint ring-2 ring-grape/30' : unido ? 'border-grass bg-grass-tint/60' : 'border-line bg-white hover:border-grape/50',
                          correcto && 'border-grass-bright bg-grass-tint',
                          enviado && unido && !correcto && 'border-coral bg-coral-tint',
                        )}
                      >
                        {p.izquierda}
                      </button>
                    )
                  })}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted">Definiciones</p>
                  {shuffleMemo(ejercicio.pares, indice).map((p) => {
                    const yaUsado = Object.values(paresElegidos).includes(p.derecha)
                    return (
                      <button
                        key={p.tarjetaId + '-def'}
                        disabled={enviado || yaUsado}
                        onClick={() => {
                          if (!izqSel) return
                          setParesElegidos({ ...paresElegidos, [izqSel]: p.derecha })
                          setIzqSel(null)
                        }}
                        className={clsx(
                          'w-full rounded-xl border-2 px-3 py-2.5 text-left text-[12px] font-semibold leading-snug transition',
                          yaUsado ? 'border-grass bg-grass-tint/40 opacity-70' : 'border-line bg-white hover:border-grape/50',
                        )}
                      >
                        {p.derecha}
                      </button>
                    )
                  })}
                </div>
              </div>
              {!enviado && (
                <Button
                  bloque
                  className="mt-3"
                  disabled={Object.keys(paresElegidos).length !== ejercicio.pares.length}
                  onClick={() => {
                    const aciertos = ejercicio.pares.filter((p) => paresElegidos[p.tarjetaId] === p.derecha).length
                    const puntaje = aciertos / ejercicio.pares.length
                    enviar({ correcto: puntaje >= 0.6, puntaje })
                  }}
                >
                  Comprobar relaciones ({Object.keys(paresElegidos).length}/{ejercicio.pares.length})
                </Button>
              )}
              {enviado && resultado && (
                <Explicacion tono={resultado.correcto ? 'ok' : 'error'} titulo={`${Math.round(resultado.puntaje * ejercicio.pares.length)} de ${ejercicio.pares.length} relaciones correctas`}>
                  <ul className="mt-1 space-y-1">
                    {ejercicio.pares.map((p) => (
                      <li key={p.tarjetaId} className="flex items-start gap-1.5 text-[12px]">
                        {paresElegidos[p.tarjetaId] === p.derecha ? <Check size={13} className="mt-0.5 shrink-0 text-grass" /> : <X size={13} className="mt-0.5 shrink-0 text-coral" />}
                        <span><strong>{p.izquierda}</strong> → {p.derecha}</span>
                      </li>
                    ))}
                  </ul>
                </Explicacion>
              )}
            </div>
          )}

          {ejercicio.tipo === 'ordenar' && (
            <div>
              <Consigna>Ordená los elementos de forma correcta</Consigna>
              <TarjetaPregunta>{ejercicio.tarjeta.pregunta && <RichTextRenderer html={ejercicio.tarjeta.pregunta} />}</TarjetaPregunta>
              <div className="mt-3 space-y-1.5">
                {ordenActual.map((el, i) => (
                  <div key={el + i} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-cream text-[11px] font-black text-muted">{i + 1}</span>
                    <p className="flex-1 text-[12px] font-semibold leading-snug text-ink">{el}</p>
                    <div className="flex shrink-0 gap-1">
                      <button disabled={i === 0 || enviado} onClick={() => mover(ordenActual, setOrdenActual, i, -1)} className="grid h-7 w-7 place-items-center rounded-md bg-cream text-muted hover:text-ink disabled:opacity-30" aria-label="Subir">↑</button>
                      <button disabled={i === ordenActual.length - 1 || enviado} onClick={() => mover(ordenActual, setOrdenActual, i, 1)} className="grid h-7 w-7 place-items-center rounded-md bg-cream text-muted hover:text-ink disabled:opacity-30" aria-label="Bajar">↓</button>
                    </div>
                  </div>
                ))}
              </div>
              {!enviado && (
                <div className="mt-3 flex gap-2">
                  <Button variante="secundario" onClick={() => setOrdenActual(shuffle(ejercicio.ordenCorrecto))}><RotateCcw size={14} /> Mezclar</Button>
                  <Button
                    onClick={() => {
                      const aciertos = ordenActual.filter((x, i) => x === ejercicio.ordenCorrecto[i]).length
                      const puntaje = aciertos / ejercicio.ordenCorrecto.length
                      enviar({ correcto: puntaje === 1, puntaje })
                    }}
                  >
                    Comprobar orden
                  </Button>
                </div>
              )}
              {enviado && resultado && (
                <Explicacion tono={resultado.correcto ? 'ok' : 'error'} titulo={resultado.correcto ? '¡Orden perfecto!' : 'El orden correcto es:'}>
                  <ol className="mt-1 list-decimal space-y-1 pl-4">
                    {ejercicio.ordenCorrecto.map((x) => <li key={x} className="text-[12px] font-semibold">{x}</li>)}
                  </ol>
                </Explicacion>
              )}
            </div>
          )}

          {ejercicio.tipo === 'detectar-error' && (
            <div>
              <Consigna>Esta explicación tiene un error. Encontralo y corregilo.</Consigna>
              <div className="rounded-xl2 border border-line bg-white p-4">
                <p className="whitespace-pre-line text-[13px] font-semibold leading-relaxed text-ink">{ejercicio.explicacionConError}</p>
              </div>
              <textarea
                className="field mt-2.5 min-h-[90px] resize-y text-[13px]"
                placeholder="¿Qué parte es incorrecta y por qué?"
                value={respuesta}
                disabled={enviado}
                onChange={(e) => setRespuesta(e.target.value)}
              />
              {!enviado ? (
                <Button
                  className="mt-2.5"
                  disabled={respuesta.trim().length < 4}
                  onClick={() => {
                    const normal = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    const ok = normal(respuesta).includes(normal(ejercicio.error).slice(0, Math.max(4, ejercicio.error.length / 2)))
                    enviar({ correcto: ok, puntaje: ok ? 1 : 0 })
                  }}
                >
                  Comprobar
                </Button>
              ) : (
                <Explicacion tono={resultado?.correcto ? 'ok' : 'error'} titulo={resultado?.correcto ? '¡Detectaste el error!' : `El error era: ${ejercicio.error}`}>
                  <p className="font-semibold">{ejercicio.correccion}</p>
                </Explicacion>
              )}
            </div>
          )}

          {ejercicio.tipo === 'caso-practico' && (
            <div>
              <Consigna>Aplicá la teoría a este caso</Consigna>
              <div className="rounded-xl2 border border-grape/30 bg-grape-tint/40 p-4">
                <p className="text-[13px] font-semibold leading-relaxed text-ink">{ejercicio.caso}</p>
              </div>
              <div className="mt-3 space-y-2">
                {ejercicio.opciones.map((o, i) => {
                  const elegida = seleccion === o.texto
                  return (
                    <button
                      key={i}
                      disabled={enviado}
                      onClick={() => {
                        setSeleccion(o.texto)
                        enviar({ correcto: o.correcta, puntaje: o.correcta ? 1 : 0 })
                      }}
                      className={clsx(
                        'flex w-full items-start gap-2.5 rounded-2xl border-2 bg-white px-3.5 py-3 text-left transition',
                        !enviado && 'hover:border-grape/60',
                        enviado && o.correcta && 'border-grass-bright bg-grass-tint',
                        enviado && elegida && !o.correcta && 'border-coral bg-coral-tint',
                        !enviado && 'border-line',
                        enviado && !o.correcta && !elegida && 'border-line opacity-60',
                      )}
                    >
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-cream text-[11px] font-black text-muted">{String.fromCharCode(65 + i)}</span>
                      <span className="flex-1 text-[12.5px] font-semibold leading-snug text-ink">{o.texto}</span>
                    </button>
                  )
                })}
              </div>
              {enviado && (
                <Explicacion tono={resultado?.correcto ? 'ok' : 'error'} titulo={resultado?.correcto ? 'Aplicación correcta' : 'Revisemos el fundamento'}>
                  <RichTextRenderer html={ejercicio.tarjeta.respuesta} className="text-[12.5px]" />
                  {ejercicio.tarjeta.ejemplo && (
                    <p className="mt-1.5 border-t border-line pt-1.5 text-[11.5px] text-muted">{ejercicio.tarjeta.ejemplo}</p>
                  )}
                </Explicacion>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Pie: siguiente */}
      {enviado && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lumi animo={diferirCorreccion ? 'pensativo' : resultado?.correcto ? 'celebrando' : 'pensativo'} tamano={44} />
            <p className={clsx('text-[12px] font-extrabold', diferirCorreccion ? 'text-grape' : resultado?.correcto ? 'text-grass' : 'text-coral')}>
              {diferirCorreccion
                ? 'Respuesta registrada'
                : resultado?.correcto
                  ? '¡Muy bien!'
                  : resultado && resultado.puntaje > 0
                    ? 'Parcialmente correcto'
                    : 'A seguir practicando'}
            </p>
          </div>
          <Button onClick={continuar} tam="md">
            {indice + 1 === total ? 'Ver resultados' : 'Siguiente'} <ArrowRight size={15} />
          </Button>
        </motion.div>
      )}
    </div>
  )
}

function Consigna({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.11em] text-grape">{children}</p>
}

function TarjetaPregunta({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl2 border border-line bg-white p-4 text-[14px] font-bold leading-snug text-ink">{children}</div>
}

function Explicacion({ children, tono, titulo }: { children: React.ReactNode; tono: 'ok' | 'error' | 'info'; titulo: string }) {
  const colores = {
    ok: 'border-grass bg-grass-tint/60 text-grass',
    error: 'border-coral bg-coral-tint/50 text-coral',
    info: 'border-sky bg-sky-tint/60 text-sky',
  }
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={clsx('mt-3 rounded-xl2 border-2 px-3.5 py-3', colores[tono])}>
      <p className="text-[11.5px] font-extrabold uppercase tracking-wide">{titulo}</p>
      <div className="mt-1 text-[12.5px] font-semibold leading-relaxed text-ink-soft">{children}</div>
    </motion.div>
  )
}

function PanelConceptos({ presentes, faltantes, puntaje, referencia, explicacion }: { presentes: string[]; faltantes: string[]; puntaje: number; referencia: string; explicacion: string }) {
  return (
    <div className="mt-3 space-y-2.5">
      <div className={clsx('rounded-xl2 border-2 p-3.5', puntaje >= 0.6 ? 'border-grass bg-grass-tint/50' : 'border-sun-deep/40 bg-sun-tint/60')}>
        <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-ink">
          {puntaje >= 0.8 ? 'Explicación sólida' : puntaje >= 0.5 ? 'Vas bien, falta profundizar' : 'Necesita más desarrollo'}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {presentes.map((c) => <span key={c} className="rounded-full bg-grass-tint px-2 py-0.5 text-[10.5px] font-extrabold text-grass">✓ {c}</span>)}
          {faltantes.map((c) => <span key={c} className="rounded-full bg-coral-tint px-2 py-0.5 text-[10.5px] font-extrabold text-coral">✗ {c}</span>)}
        </div>
        <p className="mt-2 text-[11px] font-semibold leading-snug text-muted">
          La comparación es por conceptos, no por redacción. Si tu respuesta dice lo mismo con otras palabras, cuenta.
        </p>
      </div>
      <div className="rounded-xl2 border border-line bg-white p-3.5">
        <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-muted">Respuesta de referencia</p>
        <RichTextRenderer html={referencia} className="mt-1 text-[12.5px]" />
        {explicacion && <RichTextRenderer html={explicacion} className="mt-2 border-t border-line pt-2 text-[12px] text-muted" />}
      </div>
    </div>
  )
}

function EjercicioAbierto({
  ejercicio,
  enviado,
  respuesta,
  setRespuesta,
  resultado,
  autoeval,
  setAutoeval,
  onEnviar,
  onAutoevaluar,
}: {
  ejercicio: Extract<Ejercicio, { tipo: 'escrita' }>
  enviado: boolean
  respuesta: string
  setRespuesta: (s: string) => void
  resultado: ResultadoEjercicio | null
  autoeval: boolean
  setAutoeval: (b: boolean) => void
  onEnviar: (puntaje: number) => void
  onAutoevaluar: (v: 'si' | 'parcial' | 'no') => void
}) {
  const evaluacion = useMemo(() => evaluarRespuestaAbierta(respuesta, ejercicio.tarjeta), [respuesta, ejercicio.tarjeta])
  const conceptos = useMemo(() => conceptosDe(ejercicio.tarjeta), [ejercicio.tarjeta])

  return (
    <div>
      <Consigna>Desarrollá la respuesta con tus palabras</Consigna>
      <TarjetaPregunta><RichTextRenderer html={ejercicio.tarjeta.pregunta} /></TarjetaPregunta>
      <textarea
        className="field mt-2.5 min-h-[160px] resize-y text-[13.5px] leading-relaxed"
        placeholder="Escribí todo lo que recuerdes. No importa la redacción: importan los conceptos."
        value={respuesta}
        disabled={enviado}
        onChange={(e) => setRespuesta(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-semibold text-stone">{respuesta.trim().split(/\s+/).filter(Boolean).length} palabras · {conceptos.length} conceptos clave</p>
        {!enviado && (
          <>
            <Button disabled={respuesta.trim().split(/\s+/).length < 5} onClick={() => onEnviar(evaluacion.puntaje)}>
              Evaluar mi respuesta
            </Button>
            <button onClick={() => setAutoeval(true)} className="text-[11.5px] font-extrabold uppercase tracking-wide text-muted hover:text-ink">
              Autoevaluarme
            </button>
          </>
        )}
      </div>
      {autoeval && !enviado && (
        <div className="mt-2.5 rounded-xl2 border border-line bg-white p-3.5">
          <p className="text-[11.5px] font-extrabold text-ink">Compará con la referencia y elegí con honestidad:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variante="exito" tam="sm" onClick={() => { setAutoeval(false); onAutoevaluar('si') }}>La sabía</Button>
            <Button variante="sol" tam="sm" onClick={() => { setAutoeval(false); onAutoevaluar('parcial') }}>Me costó</Button>
            <Button variante="peligro" tam="sm" onClick={() => { setAutoeval(false); onAutoevaluar('no') }}>No la sabía</Button>
          </div>
          <div className="mt-2"><RichTextRenderer html={ejercicio.tarjeta.respuesta} className="text-[12px] text-muted" /></div>
        </div>
      )}
      {enviado && resultado && (
        <PanelConceptos
          presentes={resultado.conceptosPresentes ?? []}
          faltantes={resultado.conceptosFaltantes ?? []}
          puntaje={resultado.puntaje}
          referencia={ejercicio.tarjeta.respuesta}
          explicacion={ejercicio.tarjeta.explicacion}
        />
      )}
    </div>
  )
}

function mover<T>(arr: T[], set: (a: T[]) => void, i: number, dir: number) {
  const copia = [...arr]
  const j = i + dir
  if (j < 0 || j >= copia.length) return
  ;[copia[i], copia[j]] = [copia[j], copia[i]]
  set(copia)
}

const memoCache = new Map<string, unknown>()
function shuffleMemo<T>(arr: T[], semilla: number): T[] {
  const clave = `s${semilla}-${arr.length}`
  if (!memoCache.has(clave)) memoCache.set(clave, shuffle(arr, (semilla + 1) / 17))
  return memoCache.get(clave) as T[]
}
