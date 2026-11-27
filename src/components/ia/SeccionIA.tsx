import { useEffect, useState } from 'react'
import { Check, ExternalLink, Eye, EyeOff, KeyRound, Loader2, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Primitives'
import { borrarClave, guardarClave, leerClave, pistaClave } from '../../lib/ia/almacenClave'
import { ErrorIA, MODELO } from '../../lib/ia/gemini'
import { useToast } from '../../hooks/useToast'

/**
 * Conexión de la IA. La clave se guarda cifrada en este navegador y solo se usa
 * para hablar con Google. El botón de probar hace una llamada real y mínima:
 * así el usuario se entera de un error de clave acá, no a mitad de un PDF.
 */
export function SeccionIA() {
  const { toast } = useToast()
  const [cargada, setCargada] = useState<string | null>(null)
  const [entrada, setEntrada] = useState('')
  const [ver, setVer] = useState(false)
  const [probando, setProbando] = useState(false)
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    void leerClave().then(setCargada)
  }, [])

  const guardar = async () => {
    const limpia = entrada.trim()
    if (limpia.length < 20) {
      toast('Esa clave parece incompleta. Copiala de nuevo desde Google AI Studio.', 'error')
      return
    }
    await guardarClave(limpia)
    setCargada(limpia)
    setEntrada('')
    setOk(null)
    toast('Clave guardada. Ya podés importar PDF y consultar al tutor.')
  }

  const probar = async () => {
    setProbando(true)
    setOk(null)
    try {
      const clave = await leerClave()
      if (!clave) throw new ErrorIA('No hay clave guardada.', 'sin-clave')
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Respondé solo: ok' }] }] }),
        },
      )
      if (!r.ok) {
        if (r.status === 400 || r.status === 403) {
          throw new ErrorIA('La clave no es válida o no tiene permiso para Gemini.', 'clave-invalida')
        }
        if (r.status === 429) throw new ErrorIA('La clave funciona, pero alcanzaste el límite gratuito por ahora.', 'limite')
        throw new ErrorIA(`Google respondió ${r.status}.`, 'desconocido')
      }
      setOk(true)
      toast('La IA responde correctamente.')
    } catch (e) {
      setOk(false)
      toast(e instanceof Error ? e.message : 'No se pudo probar la clave.', 'error')
    } finally {
      setProbando(false)
    }
  }

  const quitar = async () => {
    await borrarClave()
    setCargada(null)
    setOk(null)
    toast('Clave eliminada de este dispositivo.')
  }

  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-grape-tint text-grape">
          <KeyRound size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-extrabold text-ink">Inteligencia artificial</p>
          <p className="mt-0.5 text-[12px] font-semibold leading-relaxed text-muted">
            Conectá Google Gemini para importar PDF y consultar al tutor. Es gratis y la clave queda solo en este
            dispositivo.
          </p>
        </div>
      </div>

      {cargada ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-grass/25 bg-grass-tint px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Check size={14} className="text-grass" />
              <span className="text-[12.5px] font-extrabold text-grass">IA conectada</span>
              <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-muted">
                {pistaClave(cargada)}
              </span>
            </div>
            <div className="flex gap-1.5">
              <Button variante="secundario" tam="sm" onClick={() => void probar()} cargando={probando}>
                Probar
              </Button>
              <Button variante="fantasma" tam="sm" onClick={() => void quitar()} aria-label="Quitar la clave">
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
          {ok === false && (
            <p className="text-[11.5px] font-bold text-coral">
              La prueba falló. Revisá que la clave esté completa y que la API de Gemini esté habilitada.
            </p>
          )}
          <details className="rounded-xl border border-line bg-cream/50 px-3.5 py-2.5">
            <summary className="cursor-pointer text-[12px] font-extrabold text-ink-soft">Cambiar la clave</summary>
            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
              <input
                type={ver ? 'text' : 'password'}
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                placeholder="Nueva clave"
                className="field h-10 flex-1 font-mono text-[12px]"
                aria-label="Nueva clave de API"
              />
              <Button onClick={() => void guardar()} tam="sm">
                Guardar
              </Button>
            </div>
          </details>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-muted">
              Clave de API
            </span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={ver ? 'text' : 'password'}
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  placeholder="AIza…"
                  className="field h-11 w-full pr-10 font-mono text-[12.5px]"
                  aria-label="Clave de API de Gemini"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setVer((v) => !v)}
                  className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-cream hover:text-ink"
                  aria-label={ver ? 'Ocultar la clave' : 'Mostrar la clave'}
                >
                  {ver ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <Button onClick={() => void guardar()} disabled={!entrada.trim()} tam="md">
                Guardar
              </Button>
            </div>
          </label>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold text-grape hover:underline"
          >
            Conseguir una clave gratis <ExternalLink size={12} />
          </a>
          <p className="text-[11px] font-semibold leading-relaxed text-stone">
            Se guarda cifrada en este navegador y solo se envía a Google cuando usás la IA. No se incluye en los
            respaldos.
          </p>
        </div>
      )}

      {probando && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-muted">
          <Loader2 size={11} className="animate-spin" /> Probando la conexión…
        </p>
      )}
    </Card>
  )
}
