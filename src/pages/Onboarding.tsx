import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Scale, Sparkles } from 'lucide-react'
import { Lumi } from '../components/mascot/Lumi'
import { Logo } from '../components/layout/Logo'
import { Button } from '../components/ui/Button'
import { db } from '../db/database'
import { crearMateriaDerecho } from '../db/seed'
import { useToast } from '../hooks/useToast'

type Paso = 0 | 1 | 2

export function Onboarding({ onCompletado }: { onCompletado: () => void }) {
  const [paso, setPaso] = useState<Paso>(0)
  const [nombre, setNombre] = useState('')
  const [objetivo, setObjetivo] = useState(15)
  const [crearDerecho, setCrearDerecho] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const { toast } = useToast()

  const finalizar = async () => {
    setGuardando(true)
    try {
      if (nombre.trim().length < 2) {
        toast('Escribí tu nombre para personalizar la experiencia.', 'error')
        setGuardando(false)
        return
      }
      await db.perfil.update('perfil', {
        nombre: nombre.trim(),
        objetivoDiarioTarjetas: objetivo,
        objetivoDiarioXp: objetivo * 4,
        onboardingCompletado: true,
      })
      if (crearDerecho) await crearMateriaDerecho()
      toast(`¡Bienvenido/a, ${nombre.trim()}! Lumi ya te está esperando.`)
      onCompletado()
    } catch {
      toast('No pudimos guardar tus datos. Probá de nuevo.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-7 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="rounded-full bg-white px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-muted shadow-card">
            Paso {paso + 1} de 3
          </span>
        </div>

        <div className="mt-3 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= paso ? 'bg-grape' : 'bg-line'}`} />
          ))}
        </div>

        <motion.div key={paso} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col justify-center py-8">
          {paso === 0 && (
            <div className="text-center">
              <div className="mb-2 flex justify-center">
                <Lumi animo="celebrando" tamano={190} />
              </div>
              <h1 className="text-[30px] font-black leading-[1.1] tracking-tight text-ink sm:text-[38px]">
                Hola, soy <span className="text-grape">Lumi</span>.
              </h1>
              <p className="mx-auto mt-3 max-w-md text-[15px] font-semibold leading-relaxed text-muted">
                Te voy a acompañar a convertir apuntes en conocimiento que se queda. Sin sonidos, sin ruido: solo vos, tus
                tarjetas y un camino claro.
              </p>
              <div className="mx-auto mt-6 grid max-w-md gap-2.5 text-left">
                {[
                  { icono: Sparkles, texto: 'Creá tus propias tarjetas con la teoría completa.' },
                  { icono: BookOpen, texto: 'Estudiá con 13 dinámicas distintas y repaso inteligente.' },
                  { icono: Scale, texto: 'Empezá con Derecho y sumá cualquier otra materia.' },
                ].map(({ icono: Icono, texto }) => (
                  <div key={texto} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-card">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-grape-tint text-grape">
                      <Icono size={16} />
                    </span>
                    <p className="text-[13px] font-bold leading-snug text-ink-soft">{texto}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {paso === 1 && (
            <div className="mx-auto w-full max-w-md">
              <h1 className="text-center text-[27px] font-black leading-tight tracking-tight text-ink">¿Cómo te llamás?</h1>
              <p className="mt-2 text-center text-[14px] font-semibold text-muted">
                Así puedo saludarte bien y celebrar tus logros por su nombre.
              </p>
              <div className="mt-7">
                <label className="label" htmlFor="nombre">Tu nombre</label>
                <input
                  id="nombre"
                  className="field h-[52px] text-[16px]"
                  placeholder="Ej.: Vicky"
                  value={nombre}
                  maxLength={40}
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && nombre.trim().length >= 2 && setPaso(2)}
                  autoFocus
                />
              </div>
              <div className="mt-5">
                <p className="label">Objetivo diario</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { t: '10', v: 10, d: 'Tranquilo' },
                    { t: '15', v: 15, d: 'Constante' },
                    { t: '25', v: 25, d: 'Intenso' },
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setObjetivo(o.v)}
                      className={`rounded-2xl border-2 px-3 py-3 text-center transition ${
                        objetivo === o.v ? 'border-grape bg-grape-tint' : 'border-line bg-white hover:border-stone'
                      }`}
                    >
                      <p className="text-[19px] font-black text-ink">{o.t}</p>
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-muted">tarjetas</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-stone">{o.d}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="mx-auto w-full max-w-md">
              <div className="mb-1 flex justify-center">
                <Lumi animo="feliz" tamano={110} />
              </div>
              <h1 className="text-center text-[27px] font-black leading-tight tracking-tight text-ink">Todo listo</h1>
              <p className="mt-2 text-center text-[14px] font-semibold leading-relaxed text-muted">
                Tus datos se guardan en este dispositivo, sin cuentas ni internet. Podés exportar una copia cuando quieras.
              </p>
              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-line bg-white p-4">
                <input type="checkbox" checked={crearDerecho} onChange={(e) => setCrearDerecho(e.target.checked)} className="mt-0.5 h-4 w-4 accent-grape" />
                <span>
                  <span className="block text-[13.5px] font-extrabold text-ink">Empezar con Derecho → Unidad 1: Consumidores</span>
                  <span className="mt-0.5 block text-[12px] font-semibold leading-snug text-muted">
                    Se crea la materia, la unidad y su temario. Las tarjetas las cargás vos.
                  </span>
                </span>
              </label>
            </div>
          )}
        </motion.div>

        <div className="flex items-center justify-between gap-3">
          {paso > 0 ? (
            <button onClick={() => setPaso((p) => (p - 1) as Paso)} className="text-[12.5px] font-extrabold uppercase tracking-wide text-muted hover:text-ink">
              Atrás
            </button>
          ) : (
            <span />
          )}
          {paso < 2 ? (
            <Button
              tam="lg"
              onClick={() => {
                if (paso === 1 && nombre.trim().length < 2) {
                  toast('Necesitamos tu nombre para continuar.', 'error')
                  return
                }
                setPaso((p) => (p + 1) as Paso)
              }}
            >
              Continuar <ArrowRight size={17} />
            </Button>
          ) : (
            <Button tam="lg" onClick={finalizar} cargando={guardando}>
              Empezar a estudiar <ArrowRight size={17} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
