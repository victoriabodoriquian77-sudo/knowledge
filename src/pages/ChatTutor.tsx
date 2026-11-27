import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowUp, Bot, Loader2, Sparkles, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { Card, Chip, Eyebrow } from '../components/ui/Primitives'
import { Button } from '../components/ui/Button'
import { Lumi } from '../components/mascot/Lumi'
import { useMaterias } from '../hooks/useDatos'
import { hayClave } from '../lib/ia/almacenClave'
import { contextoDeMateria, preguntarAlTutor, type ContextoMateria, type MensajeChat } from '../lib/ia/tutor'

/** Clave para recordar el historial por materia en este dispositivo. */
const almacenHistorial = (materiaId: string) => `knowledge-chat-${materiaId}`

function leerHistorial(materiaId: string): MensajeChat[] {
  try {
    const crudo = localStorage.getItem(almacenHistorial(materiaId))
    return crudo ? (JSON.parse(crudo) as MensajeChat[]) : []
  } catch {
    return []
  }
}

/**
 * Tutor por materia: responde usando como fuente el material cargado en esa
 * materia. Cada materia tiene su propio historial, así no se mezclan temas.
 */
export function ChatTutor() {
  const materias = useMaterias()
  const [materiaId, setMateriaId] = useState<string>('')
  const [ctx, setCtx] = useState<ContextoMateria | null>(null)
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claveLista, setClaveLista] = useState<boolean | null>(null)
  const finRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Elegir la primera materia con contenido apenas carga.
  useEffect(() => {
    if (!materiaId && materias?.length) {
      const conTarjetas = materias.find((m) => m.tarjetas > 0) ?? materias[0]
      setMateriaId(conTarjetas.materia.id)
    }
  }, [materias, materiaId])

  useEffect(() => {
    void hayClave().then(setClaveLista)
  }, [])

  useEffect(() => {
    if (!materiaId) return
    setMensajes(leerHistorial(materiaId))
    setError(null)
    void contextoDeMateria(materiaId).then(setCtx)
  }, [materiaId])

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' })
  }, [mensajes, pensando])

  const materia = useMemo(
    () => materias?.find((m) => m.materia.id === materiaId)?.materia,
    [materias, materiaId],
  )

  const enviar = async () => {
    const consulta = texto.trim()
    if (!consulta || pensando || !ctx) return
    setTexto('')
    setError(null)
    const conUsuario: MensajeChat[] = [...mensajes, { rol: 'usuario', texto: consulta, en: Date.now() }]
    setMensajes(conUsuario)
    setPensando(true)

    const control = new AbortController()
    abortRef.current = control
    try {
      const respuesta = await preguntarAlTutor(ctx, mensajes, consulta, control.signal)
      const completo: MensajeChat[] = [...conUsuario, { rol: 'tutor', texto: respuesta, en: Date.now() }]
      setMensajes(completo)
      try {
        localStorage.setItem(almacenHistorial(materiaId), JSON.stringify(completo.slice(-40)))
      } catch {
        /* sin espacio: el historial sigue en memoria */
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(e instanceof Error ? e.message : 'No pudimos obtener respuesta.')
      }
    } finally {
      setPensando(false)
      abortRef.current = null
    }
  }

  const borrarHistorial = () => {
    localStorage.removeItem(almacenHistorial(materiaId))
    setMensajes([])
    setError(null)
  }

  const sinMaterial = ctx && ctx.tarjetas.length === 0

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>Estudiar con IA</Eyebrow>
          <h1 className="mt-1 text-[24px] font-black leading-tight tracking-tight text-ink sm:text-[28px]">
            Tu tutor
          </h1>
          <p className="mt-1 max-w-xl text-[13px] font-semibold leading-relaxed text-muted">
            Preguntale lo que no te cierra. Responde con tu propio material, no con la internet.
          </p>
        </div>
        {materias && materias.length > 1 && (
          <select
            id="chat-materia"
            className="field h-10 w-auto min-w-[170px] text-[12.5px] font-extrabold"
            value={materiaId}
            onChange={(e) => setMateriaId(e.target.value)}
            aria-label="Materia del tutor"
          >
            {materias.map((m) => (
              <option key={m.materia.id} value={m.materia.id}>
                {m.materia.nombre} · {m.tarjetas} tarjetas
              </option>
            ))}
          </select>
        )}
      </header>

      {claveLista === false && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-sun/40 bg-sun-tint/60 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sun-deep shadow-card">
              <AlertTriangle size={16} />
            </span>
            <div>
              <p className="text-[13px] font-extrabold text-ink">Falta conectar la IA</p>
              <p className="mt-0.5 text-[12px] font-semibold text-ink-soft">
                Cargá tu clave de Gemini para hablar con el tutor.
              </p>
            </div>
          </div>
          <Link
            to="/perfil?tab=ia"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-grape px-4 text-[12.5px] font-extrabold text-white transition hover:bg-grape-deep"
          >
            Conectar IA
          </Link>
        </Card>
      )}

      {!materias || materias.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <Lumi animo="pensativo" tamano={78} />
          <p className="text-[15px] font-extrabold text-ink">Todavía no hay material</p>
          <p className="max-w-sm text-[12.5px] font-semibold leading-relaxed text-muted">
            El tutor estudia de tus tarjetas. Subí un PDF para que tenga de dónde responder.
          </p>
          <Link to="/ia">
            <Button tam="md">
              <Sparkles size={15} /> Subir un PDF
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="flex min-w-0 flex-col overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 border-b border-line bg-cream/60 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-grape-tint text-grape">
                <Bot size={15} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-extrabold text-ink">{materia?.nombre ?? 'Tutor'}</p>
                <p className="text-[10.5px] font-bold text-muted">
                  {ctx ? `${ctx.tarjetas.length} tarjetas · ${ctx.subtemas.length} subtemas` : 'Cargando…'}
                </p>
              </div>
            </div>
            {mensajes.length > 0 && (
              <button
                onClick={borrarHistorial}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-extrabold text-muted transition hover:bg-white hover:text-coral"
              >
                <Trash2 size={12} /> Limpiar
              </button>
            )}
          </div>

          <div className="min-h-[320px] flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {mensajes.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Lumi animo="feliz" tamano={62} />
                <p className="text-[13px] font-extrabold text-ink">¿Qué querés entender mejor?</p>
                <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                  {[
                    '¿Está bien si digo que…?',
                    'Explicame la diferencia entre…',
                    'Dame un ejemplo de…',
                    '¿Qué me conviene repasar primero?',
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setTexto(s)}
                      className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-ink-soft transition hover:border-grape hover:text-grape"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mensajes.map((m, i) => (
              <div key={i} className={clsx('flex', m.rol === 'usuario' ? 'justify-end' : 'justify-start')}>
                <div
                  className={clsx(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] font-semibold leading-relaxed',
                    m.rol === 'usuario'
                      ? 'rounded-br-md bg-grape text-white'
                      : 'rounded-bl-md border border-line bg-white text-ink-soft',
                  )}
                >
                  {m.texto}
                </div>
              </div>
            ))}

            {pensando && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-2.5">
                  <Loader2 size={13} className="animate-spin text-grape" />
                  <span className="text-[12px] font-bold text-muted">Pensando…</span>
                </div>
              </div>
            )}
            <div ref={finRef} />
          </div>

          {error && (
            <div className="mx-4 mb-2 rounded-xl border border-coral/30 bg-coral-tint px-3 py-2 text-[11.5px] font-bold text-coral" role="alert">
              {error}
            </div>
          )}
          {sinMaterial && (
            <div className="mx-4 mb-2 rounded-xl border border-sun/40 bg-sun-tint/70 px-3 py-2 text-[11.5px] font-bold text-sun-deep">
              Esta materia todavía no tiene tarjetas: el tutor va a responder con conocimiento general.
            </div>
          )}

          <div className="border-t border-line p-2.5">
            <div className="flex items-end gap-2">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void enviar()
                  }
                }}
                rows={1}
                placeholder="Escribí tu duda…"
                aria-label="Tu pregunta"
                className="field max-h-32 min-h-[44px] flex-1 resize-none py-2.5 text-[13px]"
              />
              <Button
                onClick={() => void enviar()}
                disabled={!texto.trim() || pensando || claveLista === false}
                aria-label="Enviar pregunta"
                className="h-11 w-11 shrink-0 px-0"
              >
                <ArrowUp size={17} />
              </Button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] font-semibold text-stone">
              Enter envía · Shift+Enter hace un salto de línea
            </p>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Chip tono="bg-grape-tint text-grape">Responde con tu material</Chip>
        <Chip tono="bg-grass-tint text-grass">Avisa cuando algo no está en el PDF</Chip>
        <Chip tono="bg-sun-tint text-sun-deep">Historial guardado por materia</Chip>
      </div>
    </div>
  )
}
