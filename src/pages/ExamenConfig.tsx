import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, Clock, ListChecks, Layers, Sparkles } from 'lucide-react'
import { Card, Chip, Eyebrow, Progress } from '../components/ui/Primitives'
import { Button } from '../components/ui/Button'
import { SeleccionTemas, seleccionInicial, type Seleccion } from '../components/study/SeleccionTemas'
import { useContexto } from '../hooks/useDatos'
import { aplicarFiltro } from '../lib/filtros'
import { Lumi } from '../components/mascot/Lumi'
import type { TipoActividad } from '../types/models'

const TIPOS: { v: TipoActividad; t: string }[] = [
  { v: 'multiple', t: 'Opción múltiple' },
  { v: 'verdadero-falso', t: 'Verdadero o falso' },
  { v: 'completar', t: 'Completar espacios' },
  { v: 'escrita', t: 'Respuesta escrita' },
  { v: 'caso-practico', t: 'Casos prácticos' },
]

export function ExamenConfig() {
  const ctx = useContexto()
  const navigate = useNavigate()
  const [seleccion, setSeleccion] = useState<Seleccion>(seleccionInicial())
  const [cantidad, setCantidad] = useState(20)
  const [minutos, setMinutos] = useState(25)

  const progresos = useMemo(() => new Map((ctx?.progresos ?? []).map((p) => [p.tarjetaId, p])), [ctx])
  const tarjetas = ctx?.tarjetas ?? []
  const filtradas = useMemo(
    () =>
      aplicarFiltro(
        tarjetas,
        {
          materiaId: seleccion.materiaId || undefined,
          subtemaIds: seleccion.subtemaIds.length ? seleccion.subtemaIds : undefined,
          unidadId: !seleccion.subtemaIds.length && seleccion.unidadIds.length === 1 ? seleccion.unidadIds[0] : undefined,
          dificultad: seleccion.dificultad,
          soloFavoritas: seleccion.soloFavoritas,
          soloPendientes: seleccion.soloPendientes,
          busqueda: seleccion.busqueda,
          estado: seleccion.estado,
        },
        progresos,
      ),
    [tarjetas, progresos, seleccion],
  )

  const disponible = filtradas.length
  const preguntas = Math.min(cantidad, disponible)
  const puede = disponible >= 4

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-muted hover:text-ink">
        <ArrowLeft size={14} /> Volver
      </button>

      <header>
        <Eyebrow>Evaluación</Eyebrow>
        <h1 className="mt-1 text-[24px] font-black leading-tight tracking-tight text-ink sm:text-[28px]">Armá tu simulacro</h1>
        <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-muted">
          Configurá cantidad, tiempo y temas. Al entregar vas a ver nota, precisión y qué temas necesitan refuerzo.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-grape-tint text-grape"><ListChecks size={15} /></span>
              <p className="text-[12.5px] font-extrabold text-ink">Cantidad de preguntas</p>
              <span className="ml-auto text-[15px] font-black text-grape">{preguntas}</span>
            </div>
            <input
              type="range"
              min={4}
              max={Math.max(4, Math.min(60, Math.max(disponible, 4)))}
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              className="mt-3 w-full accent-grape"
            />
            <div className="mt-1 flex justify-between text-[10px] font-bold text-stone">
              <span>4</span><span>{Math.min(60, Math.max(disponible, 4))}</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {[10, 20, 30].map((n) => (
                <button key={n} onClick={() => setCantidad(n)} className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${cantidad === n ? 'border-grape bg-grape text-white' : 'border-line bg-white text-muted'}`}>
                  {n} preguntas
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-mango-tint text-mango"><Clock size={15} /></span>
              <p className="text-[12.5px] font-extrabold text-ink">Tiempo límite</p>
              <span className="ml-auto text-[15px] font-black text-mango">{minutos} min</span>
            </div>
            <input type="range" min={5} max={60} step={5} value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} className="mt-3 w-full accent-mango" />
            <div className="mt-1 flex justify-between text-[10px] font-bold text-stone"><span>5 min</span><span>60 min</span></div>
            <p className="mt-2 text-[11px] font-semibold text-muted">
              El cronómetro solo corre durante el examen. {preguntas > 0 && `≈ ${Math.round((minutos * 60) / preguntas)}s por pregunta.`}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-tint text-sky"><Layers size={15} /></span>
              <p className="text-[12.5px] font-extrabold text-ink">Tipos de pregunta incluidos</p>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {TIPOS.map((t) => (
                <Chip key={t.v} tono="bg-cream text-ink-soft">{t.t}</Chip>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-muted">
              Los tipos se combinan automáticamente para medir reconocimiento, recuperación y aplicación. Así el resultado no depende de una sola destreza.
            </p>
          </Card>

          <Card className="p-4">
            <Eyebrow>Qué entra en el examen</Eyebrow>
            <div className="mt-2.5">
              <SeleccionTemas seleccion={seleccion} onChange={setSeleccion} tarjetas={tarjetas} />
            </div>
          </Card>
        </div>

        <aside className="self-start lg:sticky lg:top-[74px]">
          <Card className="overflow-hidden p-5 text-center">
            <Lumi animo={puede ? 'animando' : 'pensativo'} tamano={112} className="mx-auto" />
            <p className="mt-1 text-[15px] font-extrabold text-ink">{puede ? 'Todo listo' : 'Faltan tarjetas'}</p>
            <p className="mt-1 text-[11.5px] font-semibold leading-relaxed text-muted">
              {puede
                ? `${preguntas} preguntas · ${minutos} minutos · ${disponible} tarjetas disponibles.`
                : 'Necesitás al menos 4 tarjetas en la selección para generar un examen.'}
            </p>

            <div className="mt-3 space-y-1.5 text-left">
              <div className="flex justify-between text-[11px] font-bold"><span className="text-muted">Preguntas</span><span className="text-ink">{preguntas}</span></div>
              <Progress value={disponible ? (preguntas / Math.max(disponible, 1)) * 100 : 0} tono="bg-grape" alto="h-1.5" />
              <div className="flex justify-between text-[11px] font-bold"><span className="text-muted">Duración</span><span className="text-ink">{minutos} min</span></div>
              <Progress value={(minutos / 60) * 100} tono="bg-mango" alto="h-1.5" />
            </div>

            <Button
              bloque
              className="mt-4"
              disabled={!puede}
              onClick={() => {
                const qs = new URLSearchParams()
                if (seleccion.materiaId) qs.set('materia', seleccion.materiaId)
                if (seleccion.subtemaIds.length === 1) qs.set('subtema', seleccion.subtemaIds[0])
                else if (seleccion.unidadIds.length === 1) qs.set('unidad', seleccion.unidadIds[0])
                navigate(`/actividad/examen${qs.toString() ? `?${qs}` : ''}`)
              }}
            >
              <ClipboardCheck size={16} /> Comenzar examen
            </Button>
            <p className="mt-2 flex items-center justify-center gap-1 text-[10px] font-bold text-stone">
              <Sparkles size={11} /> Se guarda como intento real
            </p>
          </Card>
        </aside>
      </div>
    </div>
  )
}
