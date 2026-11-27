import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Bot, Check, Sparkles } from 'lucide-react'
import { Card, Chip, Eyebrow } from '../components/ui/Primitives'
import { Button } from '../components/ui/Button'
import { Lumi } from '../components/mascot/Lumi'
import { ResumenMaterial, ZonaSubidaPdf } from '../components/ia/ZonaSubidaPdf'
import { useImportarPdf } from '../hooks/useImportarPdf'
import { useToast } from '../hooks/useToast'
import { useMaterias } from '../hooks/useDatos'
import { hayClave } from '../lib/ia/almacenClave'

/**
 * Página de importación: subís el PDF, la IA lo lee y arma la materia completa.
 * Si la clave de IA todavía no está cargada, se avisa acá mismo con el enlace
 * para configurarla, en vez de dejar que falle después de subir el archivo.
 */
export function ImportarIA() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const materias = useMaterias()
  const { fase, procesar, confirmar, cancelar, reiniciar, totalTarjetas } = useImportarPdf()

  const [claveLista, setClaveLista] = useState<boolean | null>(null)
  const [materiaSugerida, setMateriaSugerida] = useState('')
  /** Materia existente elegida para agregar el material ('' = crear nueva). */
  const [destino, setDestino] = useState<string>('')
  /** Al sumar a una materia existente: agregar al final o reemplazar lo anterior. */
  const [modo, setModo] = useState<'agregar' | 'reemplazar'>('agregar')

  const materiaParam = params.get('materia')

  useEffect(() => {
    void hayClave().then(setClaveLista)
  }, [])

  useEffect(() => {
    if (materiaParam && materias) {
      const m = materias.find((x) => x.materia.id === materiaParam)
      if (m) setDestino(m.materia.id)
    }
  }, [materiaParam, materias])

  useEffect(() => {
    if (fase.nombre === 'hecho') {
      toast(`Materia lista: ${fase.resumen.tarjetas} tarjetas en ${fase.resumen.subtemas} subtemas.`)
      const id = fase.resumen.materiaId
      const t = setTimeout(() => navigate(`/aprender?materia=${id}`), 1600)
      return () => clearTimeout(t)
    }
  }, [fase, navigate, toast])

  const materiaElegida = materias?.find((m) => m.materia.id === destino)?.materia

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>Estudiar con IA</Eyebrow>
          <h1 className="mt-1 text-[24px] font-black leading-tight tracking-tight text-ink sm:text-[28px]">
            De un PDF a tu recorrido
          </h1>
          <p className="mt-1 max-w-xl text-[13px] font-semibold leading-relaxed text-muted">
            Subí el material y la IA arma las unidades, los subtemas y las tarjetas. Después podés editar todo a mano.
          </p>
        </div>
        <Link to="/ia/chat" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[12.5px] font-extrabold text-ink shadow-card transition hover:text-grape">
          <Bot size={15} /> Consultar al tutor
        </Link>
      </header>

      {claveLista === false && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-sun/40 bg-sun-tint/60 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sun-deep shadow-card">
              <AlertTriangle size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-ink">Falta conectar la IA</p>
              <p className="mt-0.5 text-[12px] font-semibold leading-relaxed text-ink-soft">
                Cargá tu clave de Google Gemini en Ajustes. Es gratis y se guarda solo en este dispositivo.
              </p>
            </div>
          </div>
          <Link to="/perfil?tab=ia" className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-grape px-4 text-[12.5px] font-extrabold text-white transition hover:bg-grape-deep">
            Conectar IA <ArrowRight size={14} />
          </Link>
        </Card>
      )}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[1.45fr_1fr]">
        <Card className="min-w-0 p-4 sm:p-5">
          {fase.nombre === 'listo' ? (
            <ResumenMaterial
              material={fase.material}
              totalTarjetas={totalTarjetas}
              importando={false}
              onConfirmar={() =>
                void confirmar({ materiaExistente: materiaElegida, modo })
              }
              onDescartar={reiniciar}
            />
          ) : fase.nombre === 'hecho' ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex items-center gap-2">
                <Lumi animo="celebrando" tamano={64} />
                <span className="grid h-9 w-9 place-items-center rounded-full bg-grass-bright text-white">
                  <Check size={18} />
                </span>
              </div>
              <p className="text-[16px] font-extrabold text-ink">¡Material creado!</p>
              <p className="max-w-sm text-[12.5px] font-semibold leading-relaxed text-muted">
                {fase.resumen.unidades} unidades, {fase.resumen.subtemas} subtemas y {fase.resumen.tarjetas} tarjetas en
                «{fase.resumen.materia}». Te llevamos al recorrido…
              </p>
              <Button onClick={() => navigate(`/aprender?materia=${fase.resumen.materiaId}`)} tam="md">
                Ver el recorrido <ArrowRight size={15} />
              </Button>
            </div>
          ) : (
            <>
              <ZonaSubidaPdf
                fase={fase}
                onArchivo={(archivo) => void procesar(archivo, { materiaSugerida: materiaSugerida || undefined })}
                onCancelar={cancelar}
                materiaSugerida={materiaSugerida}
                onCambiarMateria={setMateriaSugerida}
              />

              {materias && materias.length > 0 && (
                <div className="mt-3 space-y-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-muted">
                      Dónde guardarlo
                    </span>
                    <select
                      id="ia-destino"
                      className="field h-11 text-[13px]"
                      value={destino}
                      onChange={(e) => setDestino(e.target.value)}
                    >
                      <option value="">Crear una materia nueva</option>
                      {materias.map((m) => (
                        <option key={m.materia.id} value={m.materia.id}>
                          Agregar a {m.materia.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  {materiaElegida && (
                    <div className="rounded-xl border border-line bg-cream/60 p-2.5">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-muted">
                        Qué hacer con lo que ya tiene
                      </p>
                      <div className="mt-1.5 flex flex-col gap-1.5 sm:flex-row">
                        {(
                          [
                            { v: 'agregar', t: 'Sumar al final', d: 'Ideal si subís el libro por capítulos.' },
                            { v: 'reemplazar', t: 'Reemplazar', d: 'Borra lo anterior de esa materia.' },
                          ] as const
                        ).map((o) => (
                          <button
                            key={o.v}
                            onClick={() => setModo(o.v)}
                            aria-pressed={modo === o.v}
                            className={
                              'flex-1 rounded-lg border-2 px-2.5 py-2 text-left transition ' +
                              (modo === o.v ? 'border-grape bg-white' : 'border-line bg-white/60 hover:border-grape/40')
                            }
                          >
                            <span className="block text-[11.5px] font-extrabold text-ink">{o.t}</span>
                            <span className="block text-[10px] font-semibold leading-snug text-muted">{o.d}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="min-w-0 p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-grape" />
              <p className="text-[13px] font-extrabold text-ink">Qué hace la IA</p>
            </div>
            <ul className="mt-2.5 space-y-2">
              {[
                'Lee el PDF completo, incluidas tablas y títulos.',
                'Separa el contenido en unidades y subtemas reales.',
                'Redacta tarjetas con pregunta, respuesta y palabras clave.',
                'Marca casos prácticos para los modos de aplicación.',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-[11.5px] font-semibold leading-relaxed text-muted">
                  <Check size={12} className="mt-0.5 shrink-0 text-grass" />
                  {t}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="min-w-0 p-4">
            <p className="text-[13px] font-extrabold text-ink">Un ejemplo</p>
            <p className="mt-1.5 text-[11.5px] font-semibold leading-relaxed text-muted">
              Subís un PDF de <Chip tono="bg-grape-tint text-grape">Derecho</Chip> con contratos, títulos cartulares y
              consumidores. La IA lo divide en esas tres unidades, arma los subtemas de cada una y carga las tarjetas.
              Todo queda editable y usable en los 13 modos de estudio.
            </p>
          </Card>

          <Card className="min-w-0 bg-cream/70 p-4">
            <p className="text-[12px] font-extrabold text-ink">Tu material se queda acá</p>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-muted">
              El PDF se envía solo a Google para leerlo. Las tarjetas quedan en tu navegador, nunca en un servidor
              nuestro.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
