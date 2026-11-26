import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Coins,
  Flame,
  Gamepad2,
  Layers,
  Route,
  Sparkles,
  Target,
  Timer,
  Wand2,
} from 'lucide-react'
import { Lumi } from '../components/mascot/Lumi'
import { Card, Chip, Eyebrow, Progress, SectionTitle } from '../components/ui/Primitives'
import { Button } from '../components/ui/Button'
import { useMaterias, useMisionesHoy, useNivel, usePerfil, useProgresoGeneral, useResumenDiario, useSiguientePaso } from '../hooks/useDatos'
import { fmt, saludo } from '../lib/format'
import { db } from '../db/database'
import { reclamarMision } from '../lib/gamification'
import { useToast } from '../hooks/useToast'
import { fechaLocal } from '../lib/constants'
import { useLiveQuery } from 'dexie-react-hooks'
import { pendienteHoy } from '../lib/srs'

const ACCESOS = [
  { ruta: '/juegos', titulo: 'Juegos', detalle: 'Practicá jugando', icono: Gamepad2, tono: 'bg-grape-tint text-grape' },
  { ruta: '/repaso', titulo: 'Repaso', detalle: 'Reforzá lo pendiente', icono: Timer, tono: 'bg-sun-tint text-sun-deep' },
  { ruta: '/juegos/examen', titulo: 'Evaluación', detalle: 'Medí lo que sabés', icono: Target, tono: 'bg-coral-tint text-coral' },
  { ruta: '/tarjetas', titulo: 'Tarjetas', detalle: 'Recordá y comprendé', icono: Layers, tono: 'bg-sky-tint text-sky' },
]

export function Inicio() {
  const perfil = usePerfil()
  const nivel = useNivel()
  const materias = useMaterias()
  const progreso = useProgresoGeneral()
  const siguiente = useSiguientePaso()
  const misiones = useMisionesHoy()
  const diario = useResumenDiario(7)
  const navigate = useNavigate()
  const { toast } = useToast()

  const hoy = fechaLocal()
  const resumenHoy = diario.find((d) => d.fecha === hoy)
  const objetivoPct = perfil ? Math.min(100, Math.round(((resumenHoy?.tarjetas ?? 0) / Math.max(1, perfil.objetivoDiarioTarjetas)) * 100)) : 0

  const pendientesHoy = useLiveQuery(async () => {
    const progresos = await db.progreso.toArray()
    return progresos.filter(pendienteHoy).length
  }, [], 0)

  const tarjetasTotales = useLiveQuery(() => db.tarjetas.count(), [], 0)

  const animo = useMemo(() => {
    const pct = progreso?.dominio ?? 0
    if (objetivoPct >= 100) return 'celebrando' as const
    if (pct >= 60) return 'orgulloso' as const
    if (pct > 0) return 'animando' as const
    return 'feliz' as const
  }, [objetivoPct, progreso?.dominio])

  const mensajeLumi = useMemo(() => {
    if (!tarjetasTotales) return 'Tu biblioteca está vacía. Creá tu primera tarjeta y arrancamos.'
    if (objetivoPct >= 100) return '¡Objetivo del día cumplido! Lo que repasás hoy, mañana no se olvida.'
    if (pendientesHoy > 0) return `Tenés ${pendientesHoy} ${pendientesHoy === 1 ? 'tarjeta' : 'tarjetas'} para repasar hoy. Vamos de a poco.`
    if (siguiente) return `Seguimos con «${siguiente.subtema.subtema.nombre}». Un paso a la vez.`
    return 'Todo al día. Podés adelantar contenido nuevo o practicar por diversión.'
  }, [tarjetasTotales, objetivoPct, pendientesHoy, siguiente])

  const misionDestacada = misiones.find((m) => m.completada && !m.reclamada) ?? misiones.find((m) => !m.completada)

  return (
    <div className="space-y-5">
      {/* Bienvenida + mascota */}
      <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.13em] text-grass">
                {saludo()}, {perfil?.nombre || 'estudiante'}
              </p>
              <h1 className="mt-1.5 text-[24px] font-black leading-[1.15] tracking-tight text-ink sm:text-[29px]">
                {tarjetasTotales === 0 ? 'Empecemos tu biblioteca.' : 'Tu próximo paso está claro.'}
              </h1>
              <p className="mt-1.5 max-w-md text-[13.5px] font-semibold leading-relaxed text-muted">
                {tarjetasTotales === 0
                  ? 'Creá una materia, dividila en unidades y subtemas, y cargá tus tarjetas con toda la teoría.'
                  : mensajeLumi}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {siguiente ? (
                  <Button onClick={() => navigate(`/aprender/subtema/${siguiente.subtema.subtema.id}`)}>
                    Continuar <ArrowRight size={16} />
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/tarjetas/nueva')}>
                    Crear tarjeta <Sparkles size={16} />
                  </Button>
                )}
                <Button variante="secundario" onClick={() => navigate('/repaso')}>
                  <Timer size={16} /> Repasar {pendientesHoy > 0 ? `(${pendientesHoy})` : ''}
                </Button>
              </div>
            </div>
            <div className="hidden shrink-0 sm:block">
              <Lumi animo={animo} tamano={132} flotando />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat icono={<Sparkles size={14} />} valor={fmt(perfil?.xp ?? 0)} etiqueta="XP acumulados" />
            <MiniStat icono={<Coins size={14} />} valor={fmt(perfil?.monedas ?? 0)} etiqueta="Monedas" />
            <MiniStat icono={<Flame size={14} />} valor={`${perfil?.rachaActual ?? 0} ${perfil?.rachaActual === 1 ? 'día' : 'días'}`} etiqueta="Racha actual" />
            <MiniStat icono={<Target size={14} />} valor={`${progreso?.dominio ?? 0}%`} etiqueta="Dominio general" />
          </div>
        </Card>

        {/* Misión del día */}
        <Card className="relative overflow-hidden bg-ink p-5 text-white">
          <div className="flex items-center justify-between">
            <Eyebrow color="text-sun">Misión de hoy</Eyebrow>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-wide">
              {misiones.filter((m) => m.completada).length}/{misiones.length}
            </span>
          </div>
          {misionDestacada ? (
            <>
              <p className="mt-2.5 text-[16.5px] font-extrabold leading-snug">{misionDestacada.mision.titulo}</p>
              <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-white/70">{misionDestacada.mision.descripcion}</p>
              <div className="mt-3.5">
                <div className="mb-1.5 flex justify-between text-[11px] font-extrabold text-white/70">
                  <span>{Math.min(misionDestacada.progreso, misionDestacada.mision.meta)} / {misionDestacada.mision.meta}</span>
                  <span>+{misionDestacada.mision.recompensaXp} XP · +{misionDestacada.mision.recompensaMonedas}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-sun transition-all duration-500" style={{ width: `${Math.min(100, (misionDestacada.progreso / misionDestacada.mision.meta) * 100)}%` }} />
                </div>
              </div>
              {misionDestacada.completada && !misionDestacada.reclamada ? (
                <Button
                  variante="sol"
                  tam="sm"
                  className="mt-4"
                  onClick={async () => {
                    const r = await reclamarMision(misionDestacada.mision.id)
                    if (r) toast(`Recompensa reclamada: +${r.xp} XP y +${r.monedas} monedas`)
                  }}
                >
                  Reclamar recompensa
                </Button>
              ) : (
                <Link to="/perfil" className="mt-4 inline-flex items-center gap-1 text-[12px] font-extrabold uppercase tracking-wide text-white/80 hover:text-white">
                  Ver todas las misiones <ChevronRight size={14} />
                </Link>
              )}
            </>
          ) : (
            <p className="mt-3 text-[13px] font-semibold text-white/70">No hay misiones activas. Volvé mañana.</p>
          )}

          <div className="mt-4 rounded-2xl bg-white/10 p-3">
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wide text-white/80">
              <span>Objetivo diario</span>
              <span>{resumenHoy?.tarjetas ?? 0}/{perfil?.objetivoDiarioTarjetas ?? 15} tarjetas</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-grass-bright transition-all duration-500" style={{ width: `${objetivoPct}%` }} />
            </div>
          </div>
        </Card>
      </section>

      {/* Recorrido actual */}
      <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <Eyebrow color="text-grass">Tu recorrido</Eyebrow>
            <Link to="/aprender" className="inline-flex items-center gap-1 text-[11.5px] font-extrabold uppercase tracking-wide text-muted hover:text-ink">
              Ver todo <ChevronRight size={13} />
            </Link>
          </div>

          {materias && materias.length > 0 ? (
            <div className="mt-3 space-y-3.5">
              {materias.slice(0, 2).map((m) => {
                const unidad = m.unidades.find((u) => u.completados < u.total) ?? m.unidades[0]
                return (
                  <div key={m.materia.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-extrabold text-ink">
                          {m.materia.nombre} <span className="text-stone">/</span>{' '}
                          {unidad ? unidad.unidad.nombre : 'Sin unidades'}
                        </p>
                        <p className="mt-0.5 text-[11.5px] font-semibold text-muted">
                          {unidad
                            ? `${unidad.completados} de ${unidad.total} subtemas completados · ${unidad.tarjetas} tarjetas`
                            : 'Creá una unidad para empezar'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-grass-tint px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-grass">
                        {m.dominio}%
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2.5">
                      <Progress value={unidad ? (unidad.completados / Math.max(1, unidad.total)) * 100 : 0} className="flex-1" />
                      {unidad && unidad.subtemas.length > 0 && (
                        <Link
                          to={`/aprender/unidad/${unidad.unidad.id}`}
                          className="shrink-0 text-[11.5px] font-extrabold uppercase tracking-wide text-grape hover:text-grape-deep"
                        >
                          Abrir
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border-2 border-dashed border-line px-4 py-6 text-center">
              <p className="text-[13.5px] font-extrabold text-ink">Todavía no hay materias</p>
              <p className="mt-1 text-[12.5px] font-semibold text-muted">Creá tu primera materia para armar el recorrido.</p>
              <Button tam="sm" className="mt-3" onClick={() => navigate('/aprender')}>
                Crear materia
              </Button>
            </div>
          )}
        </Card>

        <Card className="flex flex-col justify-between gap-3 bg-grape-tint/60 p-5">
          <div>
            <Eyebrow>Tu progreso</Eyebrow>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-[34px] font-black leading-none tracking-tight text-ink">{progreso?.dominio ?? 0}%</p>
              <p className="pb-1 text-[12px] font-bold text-muted">de dominio real</p>
            </div>
            <Progress value={progreso?.dominio ?? 0} className="mt-2.5" tono="bg-grape" alto="h-2.5" />
            <p className="mt-2 text-[11.5px] font-semibold leading-relaxed text-muted">
              {progreso?.completados ?? 0} de {progreso?.total ?? 0} subtemas completados. El dominio sube con repasos
              espaciados, no con un solo acierto.
            </p>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {diario.map((d) => (
              <div key={d.fecha} className="text-center">
                <div className={`mx-auto h-8 w-full max-w-[22px] rounded-md ${d.tarjetas > 0 ? 'bg-grape' : 'bg-white'}`} title={`${d.tarjetas} tarjetas`} />
                <p className="mt-1 text-[9px] font-extrabold uppercase text-muted">{new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'narrow' })}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Misiones */}
      <section>
        <SectionTitle accion={<span className="text-[11.5px] font-bold text-muted">{misiones.filter((m) => m.completada).length} completadas</span>}>
          Misiones de hoy
        </SectionTitle>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {misiones.map(({ mision, progreso: p, completada, reclamada }) => (
            <Card key={mision.id} className="flex items-center gap-3 p-3.5">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${completada ? 'bg-grass-tint text-grass' : 'bg-cream text-stone'}`}>
                {mision.metrica === 'respuestasCorrectas' && <Target size={17} />}
                {mision.metrica === 'tarjetasEstudiadas' && <Layers size={17} />}
                {mision.metrica === 'subtemaCompletado' && <Route size={17} />}
                {mision.metrica === 'examenRealizado' && <BookOpen size={17} />}
                {mision.metrica === 'tarjetasDificiles' && <Flame size={17} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-extrabold text-ink">{mision.titulo}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Progress value={(p / mision.meta) * 100} tono={completada ? 'bg-grass-bright' : 'bg-mango'} alto="h-1.5" className="flex-1" />
                  <span className="shrink-0 text-[10.5px] font-extrabold text-muted">{Math.min(p, mision.meta)}/{mision.meta}</span>
                </div>
              </div>
              {completada && !reclamada ? (
                <button
                  onClick={async () => {
                    const r = await reclamarMision(mision.id)
                    if (r) toast(`+${r.xp} XP · +${r.monedas} monedas`)
                  }}
                  className="shrink-0 rounded-xl bg-grass-bright px-2.5 py-1.5 text-[10.5px] font-extrabold uppercase text-white"
                >
                  Reclamar
                </button>
              ) : (
                <span className="shrink-0 text-[10.5px] font-extrabold uppercase text-sun-deep">+{mision.recompensaMonedas}</span>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Accesos rápidos */}
      <section>
        <SectionTitle>Elegí cómo querés estudiar</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {ACCESOS.map(({ ruta, titulo, detalle, icono: Icono, tono }, i) => (
            <motion.div key={ruta} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={ruta} className="group flex h-full flex-col gap-2 rounded-xl2 border border-line bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-float">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${tono}`}>
                  <Icono size={18} />
                </span>
                <span>
                  <span className="block text-[13.5px] font-extrabold text-ink">{titulo}</span>
                  <span className="mt-0.5 block text-[11.5px] font-semibold leading-snug text-muted">{detalle}</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recomendado */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <Eyebrow color="text-grape">Repaso inteligente</Eyebrow>
          <p className="mt-1.5 text-[15px] font-extrabold text-ink">
            {pendientesHoy > 0 ? `${pendientesHoy} tarjetas te esperan hoy` : 'No tenés repasos pendientes'}
          </p>
          <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-muted">
            {pendientesHoy > 0
              ? 'Las tarjetas difíciles vuelven antes. Las que dominás aparecen cada vez menos.'
              : 'Cuando estudies, el sistema programa cada tarjeta según cómo la recordaste.'}
          </p>
          <Button variante="secundario" tam="sm" className="mt-3.5" onClick={() => navigate('/repaso')}>
            <Timer size={15} /> Abrir repaso
          </Button>
        </Card>
        <Card className="p-5">
          <Eyebrow color="text-coral">Preparación para examen</Eyebrow>
          <div className="mt-2 flex items-end gap-2">
            <p className="text-[30px] font-black leading-none tracking-tight text-ink">{progreso?.dominio ?? 0}%</p>
            <p className="pb-1 text-[12px] font-bold text-muted">estimado</p>
          </div>
          <p className="mt-2 text-[12.5px] font-semibold leading-relaxed text-muted">
            Se calcula con retención, respuestas escritas, precisión y resolución de casos. Recorrer el camino no alcanza.
          </p>
          <div className="mt-3 flex gap-2">
            <Button tam="sm" variante="secundario" onClick={() => navigate('/juegos/examen')}>
              <Wand2 size={15} /> Simular examen
            </Button>
            <Button tam="sm" variante="fantasma" onClick={() => navigate('/estadisticas')}>
              Ver diagnóstico
            </Button>
          </div>
        </Card>
      </section>

      {nivel && nivel.restante <= 60 && (
        <Card className="flex items-center gap-3 bg-sun-tint/70 p-4">
          <Lumi animo="animando" tamano={56} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold text-ink">Estás a {nivel.restante} XP del nivel {nivel.nivel + 1}</p>
            <Progress value={nivel.progreso * 100} tono="bg-sun-deep" alto="h-1.5" className="mt-1.5" />
          </div>
        </Card>
      )}

      <div className="h-1" />
      <Chip className="hidden">{tarjetasTotales} tarjetas</Chip>
    </div>
  )
}

function MiniStat({ icono, valor, etiqueta }: { icono: React.ReactNode; valor: string; etiqueta: string }) {
  return (
    <div className="rounded-2xl bg-cream/80 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-grape">{icono}
        <p className="text-[16px] font-extrabold leading-none tracking-tight text-ink">{valor}</p>
      </div>
      <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-muted">{etiqueta}</p>
    </div>
  )
}
