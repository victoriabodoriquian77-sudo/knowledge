import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  ChevronRight,
  ClipboardCheck,
  Gamepad2,
  Layers,
  Lock,
  Plus,
  Repeat,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { Button } from '../components/ui/Button'
import { Card, Chip, Empty, Eyebrow, Progress } from '../components/ui/Primitives'
import { Confirm } from '../components/ui/Modal'
import { useContexto } from '../hooks/useDatos'
import { calcularEstadoSubtema } from '../lib/hierarchy'
import { Lumi } from '../components/mascot/Lumi'
import { ETIQUETA_DIMENSION, DIMENSIONES, estaDominada } from '../lib/srs'
import { useToast } from '../hooks/useToast'
import { eliminarTarjeta, toggleFavorita } from '../lib/crud'
import { recortar } from '../lib/format'
import { Star } from 'lucide-react'
import type { Dimension } from '../types/models'

const DESTACADOS = [
  { tipo: 'flashcards', titulo: 'Tarjetas clásicas', detalle: 'Leé, pensá y girá', icono: Layers, tono: 'bg-grape-tint text-grape' },
  { tipo: 'multiple', titulo: 'Opción múltiple', detalle: 'Elegí la correcta', icono: Target, tono: 'bg-sky-tint text-sky' },
  { tipo: 'escrita', titulo: 'Respuesta escrita', detalle: 'Desarrollá con tus palabras', icono: Brain, tono: 'bg-grass-tint text-grass' },
  { tipo: 'caso-practico', titulo: 'Casos prácticos', detalle: 'Aplicá la teoría', icono: ClipboardCheck, tono: 'bg-mango-tint text-mango' },
]

export function SubtemaDetalle() {
  const { subtemaId } = useParams<{ subtemaId: string }>()
  const ctx = useContexto()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [confirmar, setConfirmar] = useState<string | null>(null)

  const subtema = ctx?.subtemas.find((s) => s.id === subtemaId)
  const unidad = ctx?.unidades.find((u) => u.id === subtema?.unidadId)
  const materia = ctx?.materias.find((m) => m.id === subtema?.materiaId)

  const resumen = useMemo(() => {
    if (!ctx || !subtema) return null
    const progresos = new Map(ctx.progresos.map((p) => [p.tarjetaId, p]))
    const hermanos = ctx.subtemas.filter((s) => s.unidadId === subtema.unidadId).sort((a, b) => a.orden - b.orden)
    let anteriorCompletado = true
    for (const s of hermanos) {
      const r = calcularEstadoSubtema(s, ctx.tarjetas, progresos, anteriorCompletado)
      if (s.id === subtema.id) return r
      anteriorCompletado = r.estado === 'completado' || r.estado === 'dominado'
    }
    return null
  }, [ctx, subtema])

  const tarjetas = useLiveQuery(
    async () => (subtemaId ? (await db.tarjetas.where('subtemaId').equals(subtemaId).toArray()).sort((a, b) => b.creadaEn - a.creadaEn) : []),
    [subtemaId],
    [],
  )

  const progresoPorTarjeta = useMemo(() => new Map((ctx?.progresos ?? []).map((p) => [p.tarjetaId, p])), [ctx])

  if (!subtema || !resumen) {
    return (
      <Card className="p-8 text-center">
        <p className="text-[15px] font-extrabold text-ink">No encontramos este subtema</p>
        <Button className="mt-4" onClick={() => navigate('/aprender')}>Volver</Button>
      </Card>
    )
  }

  const bloqueado = resumen.estado === 'bloqueado'
  const dominadas = resumen.dominadas
  const dimensiones = DIMENSIONES.map((d) => {
    const propias = tarjetas.map((t) => progresoPorTarjeta.get(t.id)).filter(Boolean)
    const conValor = propias.filter((p) => (p?.dimensiones[d] ?? 0) > 0)
    const valor = conValor.length ? Math.round(conValor.reduce((a, p) => a + (p?.dimensiones[d] ?? 0), 0) / conValor.length) : 0
    return { dimension: d as Dimension, valor }
  })

  if (bloqueado) {
    return (
      <div className="space-y-4">
        <Card className="mx-auto max-w-lg p-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-cream text-stone">
            <Lock size={28} />
          </div>
          <h1 className="text-[20px] font-black text-ink">{subtema.nombre}</h1>
          <p className="mx-auto mt-2 max-w-sm text-[13px] font-semibold leading-relaxed text-muted">
            Este subtema se abre cuando completes el anterior de la unidad. Igual podés practicar sus tarjetas desde Juegos
            si ya las cargaste.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variante="secundario" onClick={() => navigate(`/aprender/unidad/${subtema.unidadId}`)}>
              <ArrowLeft size={15} /> Volver al recorrido
            </Button>
            <Button onClick={() => navigate(`/tarjetas?subtema=${subtema.id}`)}>
              <Layers size={15} /> Ver tarjetas
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[11.5px] font-bold text-muted">
        <Link to="/aprender" className="inline-flex items-center gap-1 hover:text-ink"><ArrowLeft size={13} /> Aprender</Link>
        <ChevronRight size={12} />
        <Link to={`/aprender/unidad/${unidad?.id}`} className="hover:text-ink">{unidad?.nombre}</Link>
        <ChevronRight size={12} />
        <span className="text-ink">{subtema.nombre}</span>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow color="text-grape">{materia?.nombre} · {unidad?.nombre}</Eyebrow>
            <h1 className="mt-1 text-[23px] font-black leading-tight tracking-tight text-ink sm:text-[27px]">{subtema.nombre}</h1>
            {subtema.descripcion && <p className="mt-1.5 max-w-lg text-[13px] font-semibold leading-relaxed text-muted">{subtema.descripcion}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tono={resumen.estado === 'completado' ? 'bg-grass-tint text-grass' : resumen.estado === 'dominado' ? 'bg-grass-tint text-grass' : 'bg-grape-tint text-grape'}>
                {resumen.estado === 'dominado' ? 'Dominado' : resumen.estado === 'completado' ? 'Completado' : resumen.estado === 'en-progreso' ? 'En curso' : 'Disponible'}
              </Chip>
              <Chip tono="bg-cream text-muted">{tarjetas.length} tarjetas</Chip>
              <Chip tono="bg-sun-tint text-sun-deep">{dominadas} dominadas</Chip>
            </div>
          </div>
          <Lumi animo={dominadas > 0 && dominadas === tarjetas.length ? 'celebrando' : resumen.dominio > 50 ? 'animando' : 'pensativo'} tamano={104} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={resumen.dominio} tono="bg-grape" alto="h-2.5" className="flex-1" />
          <span className="shrink-0 text-[12px] font-extrabold text-ink">{resumen.dominio}% dominio</span>
        </div>
      </Card>

      {tarjetas.length === 0 ? (
        <Empty
          titulo="Este subtema no tiene tarjetas"
          detalle="Cargá la teoría como tarjetas: pregunta, respuesta, explicación, ejemplo y fuente. Con eso se desbloquean todos los juegos."
          icono={<Layers size={22} />}
          accion={<Button onClick={() => navigate(`/tarjetas/nueva?subtema=${subtema.id}`)}><Plus size={16} /> Crear tarjeta</Button>}
        />
      ) : (
        <>
          <section>
            <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted">Estudiar este subtema</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {DESTACADOS.map(({ tipo, titulo, detalle, icono: Icono, tono }, i) => (
                <motion.button
                  key={tipo}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/actividad/${tipo}?subtema=${subtema.id}`)}
                  className="flex flex-col items-start gap-2 rounded-xl2 border border-line bg-white p-3.5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-float"
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${tono}`}><Icono size={17} /></span>
                  <span>
                    <span className="block text-[12.5px] font-extrabold leading-tight text-ink">{titulo}</span>
                    <span className="mt-0.5 block text-[10.5px] font-semibold leading-snug text-muted">{detalle}</span>
                  </span>
                </motion.button>
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button variante="secundario" tam="sm" onClick={() => navigate(`/actividad/kahoot?subtema=${subtema.id}`)}><Gamepad2 size={14} /> Desafío rápido</Button>
              <Button variante="secundario" tam="sm" onClick={() => navigate(`/actividad/explicar?subtema=${subtema.id}`)}><Brain size={14} /> Explicárselo a alguien</Button>
              <Button variante="secundario" tam="sm" onClick={() => navigate(`/repaso?subtema=${subtema.id}`)}><Repeat size={14} /> Repaso espaciado</Button>
            </div>
          </section>

          <section>
            <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted">Competencias de este subtema</p>
            <Card className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
              {dimensiones.map(({ dimension, valor }) => (
                <div key={dimension}>
                  <div className="flex items-baseline justify-between">
                    <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-muted">{ETIQUETA_DIMENSION[dimension].split(' ')[0]}</p>
                    <p className="text-[11px] font-extrabold text-ink">{valor}%</p>
                  </div>
                  <Progress value={valor} tono={valor >= 70 ? 'bg-grass-bright' : valor > 0 ? 'bg-grape' : 'bg-line'} alto="h-1.5" className="mt-1.5" />
                </div>
              ))}
            </Card>
            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-stone">
              Una tarjeta solo se considera dominada cuando hay precisión sostenida, repasos espaciados y evidencia en más de una dimensión.
            </p>
          </section>

          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted">Tarjetas del subtema</p>
              <Button variante="secundario" tam="sm" onClick={() => navigate(`/tarjetas/nueva?subtema=${subtema.id}`)}><Plus size={14} /> Nueva</Button>
            </div>
            <div className="space-y-2">
              {tarjetas.map((t) => {
                const p = progresoPorTarjeta.get(t.id)
                return (
                  <Card key={t.id} className="group flex items-start gap-3 p-3.5">
                    <button
                      onClick={async () => { await toggleFavorita(t.id); toast(t.favorita ? 'Quitada de favoritas.' : 'Marcada como favorita.', 'info') }}
                      className={`mt-0.5 shrink-0 ${t.favorita ? 'text-sun-deep' : 'text-stone hover:text-sun-deep'}`}
                      aria-label="Marcar favorita"
                    >
                      <Star size={15} className={t.favorita ? 'fill-sun-deep' : ''} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-extrabold leading-snug text-ink">{recortar(t.pregunta.replace(/<[^>]+>/g, ''), 110)}</p>
                      <p className="mt-0.5 line-clamp-1 text-[11.5px] font-semibold text-muted">{recortar(t.respuesta.replace(/<[^>]+>/g, ''), 120)}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Chip tono={estaDominada(p) ? 'bg-grass-tint text-grass' : p && p.dificil ? 'bg-coral-tint text-coral' : 'bg-sky-tint text-sky'}>
                          {estaDominada(p) ? 'Dominada' : p?.repeticiones ? `${p.dominio}%` : 'Nueva'}
                        </Chip>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-stone">{t.dificultad}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => navigate(`/tarjetas/${t.id}`)} className="grid h-8 w-8 place-items-center rounded-lg text-stone hover:bg-cream hover:text-ink" aria-label="Editar tarjeta">
                        <ArrowRight size={14} />
                      </button>
                      <button onClick={() => setConfirmar(t.id)} className="grid h-8 w-8 place-items-center rounded-lg text-stone hover:bg-coral-tint hover:text-coral" aria-label="Eliminar tarjeta">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>
        </>
      )}

      <div className="flex flex-wrap gap-2 rounded-2xl bg-grape-tint/50 p-4">
        <Sparkles size={15} className="mt-0.5 text-grape" />
        <p className="flex-1 text-[11.5px] font-semibold leading-relaxed text-ink-soft">
          Cuando termines de estudiar este subtema, el siguiente se desbloquea solo. No hace falta marcar nada a mano.
        </p>
      </div>

      <Confirm
        abierto={!!confirmar}
        titulo="¿Eliminar esta tarjeta?"
        detalle="También se borra su historial de repaso."
        onCancelar={() => setConfirmar(null)}
        onConfirmar={async () => {
          if (!confirmar) return
          await eliminarTarjeta(confirmar)
          setConfirmar(null)
          toast('Tarjeta eliminada.')
        }}
      />
    </div>
  )
}
