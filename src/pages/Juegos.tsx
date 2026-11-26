import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, Flame, Layers, Star, Trophy, Zap } from 'lucide-react'
import { Card, Chip, Eyebrow } from '../components/ui/Primitives'
import { Button } from '../components/ui/Button'
import { ACTIVIDADES } from '../features/actividades/catalogo'
import { SeleccionTemas, seleccionInicial, type Seleccion } from '../components/study/SeleccionTemas'
import { useContexto } from '../hooks/useDatos'
import { db } from '../db/database'
import { aplicarFiltro } from '../lib/filtros'
import { pendienteHoy } from '../lib/srs'
import { Lumi } from '../components/mascot/Lumi'
import type { TipoActividad } from '../types/models'

export function Juegos() {
  const ctx = useContexto()
  const navigate = useNavigate()
  const [seleccion, setSeleccion] = useState<Seleccion>(seleccionInicial())
  const juegos = useLiveQuery(() => db.juegos.toArray(), [], [])

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

  const pendientes = useMemo(() => tarjetas.filter((t) => pendienteHoy(progresos.get(t.id))).length, [tarjetas, progresos])
  const difíciles = useMemo(() => tarjetas.filter((t) => progresos.get(t.id)?.dificil).length, [tarjetas, progresos])

  const iniciar = (tipo: TipoActividad) => {
    const qs = new URLSearchParams()
    if (seleccion.materiaId) qs.set('materia', seleccion.materiaId)
    if (seleccion.subtemaIds.length === 1) qs.set('subtema', seleccion.subtemaIds[0])
    else if (seleccion.unidadIds.length === 1) qs.set('unidad', seleccion.unidadIds[0])
    navigate(`/actividad/${tipo}${qs.toString() ? `?${qs}` : ''}`)
  }

  return (
    <div className="space-y-5">
      <header>
        <Eyebrow>Centro de práctica</Eyebrow>
        <h1 className="mt-1 text-[24px] font-black leading-tight tracking-tight text-ink sm:text-[28px]">Una misma idea, muchas formas de aprenderla</h1>
        <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-muted">
          Elegí qué entrenar: recordar, relacionar, aplicar o explicar. Cada modo alimenta el mismo sistema de dominio.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="order-2 space-y-4 lg:order-1">
          {/* Estado rápido */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { icono: <Layers size={15} />, v: tarjetas.length, l: 'Tarjetas', tono: 'text-grape' },
              { icono: <Zap size={15} />, v: pendientes, l: 'Para repasar', tono: 'text-mango' },
              { icono: <Flame size={15} />, v: difíciles, l: 'Difíciles', tono: 'text-coral' },
              { icono: <Trophy size={15} />, v: juegos.find((j) => j.id === 'kahoot')?.mejorPuntaje ?? 0, l: 'Récord desafío', tono: 'text-sun-deep' },
            ].map((s) => (
              <Card key={s.l} className="px-3.5 py-3">
                <div className={`flex items-center gap-1.5 ${s.tono}`}>
                  {s.icono}
                  <p className="text-[19px] font-extrabold leading-none text-ink">{s.v}</p>
                </div>
                <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-muted">{s.l}</p>
              </Card>
            ))}
          </div>

          {tarjetas.length === 0 && (
            <Card className="p-6 text-center">
              <Lumi animo="pensativo" tamano={104} className="mx-auto" />
              <p className="mt-2 text-[15px] font-extrabold text-ink">Todavía no hay tarjetas para jugar</p>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] font-semibold leading-relaxed text-muted">
                Los juegos se construyen con tu propio material. Creá algunas tarjetas y volvé.
              </p>
              <Button className="mt-4" onClick={() => navigate('/tarjetas/nueva')}>Crear tarjeta</Button>
            </Card>
          )}

          {/* Destacado */}
          {tarjetas.length >= 4 && (
            <Card className="relative overflow-hidden bg-ink p-5 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <Eyebrow color="text-sun">Desafío destacado</Eyebrow>
                  <p className="mt-1 text-[19px] font-black leading-tight">Reto de conceptos</p>
                  <p className="mt-1 max-w-sm text-[12.5px] font-semibold text-white/70">
                    {Math.min(12, filtradas.length)} preguntas con cronómetro, multiplicadores por racha y puntos extra por precisión.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button variante="sol" tam="sm" onClick={() => iniciar('kahoot')}>
                      Jugar ahora <ArrowRight size={14} />
                    </Button>
                    <Link to="/repaso" className="text-[11px] font-extrabold uppercase tracking-wide text-white/70 hover:text-white">
                      Repaso: {pendientes} pendientes
                    </Link>
                  </div>
                </div>
                <Lumi animo="celebrando" tamano={116} className="hidden sm:block" />
              </div>
            </Card>
          )}

          {/* Grilla de actividades */}
          <div>
            <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted">Todas las dinámicas</p>
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {ACTIVIDADES.map((a, i) => {
                const disponible = tarjetas.length >= a.minimo
                const esRepaso = a.tipo === 'repaso'
                const contra = esRepaso ? pendientes : filtradas.length
                return (
                  <motion.button
                    key={a.tipo}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    onClick={() => {
                      if (!disponible) return
                      if (esRepaso) navigate('/repaso')
                      else if (a.tipo === 'examen') navigate('/juegos/examen')
                      else iniciar(a.tipo)
                    }}
                    disabled={!disponible}
                    className="group flex flex-col gap-2 rounded-xl2 border border-line bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-float disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex items-start justify-between">
                      <span className={`grid h-10 w-10 place-items-center rounded-xl ${a.tono}`}>
                        <a.icono size={18} />
                      </span>
                      {a.etiqueta && <Chip tono="bg-mango-tint text-mango">{a.etiqueta}</Chip>}
                      {!disponible && <span className="text-[10px] font-extrabold uppercase text-stone">Min. {a.minimo}</span>}
                    </div>
                    <div>
                      <p className="text-[13.5px] font-extrabold leading-tight text-ink">{a.titulo}</p>
                      <p className="mt-0.5 text-[11.5px] font-bold text-muted">{a.subtitulo}</p>
                      <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-snug text-stone">{a.descripcion}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-1">
                      <span className="text-[10.5px] font-extrabold text-muted">
                        {esRepaso ? `${contra} pendientes` : `${contra} tarjetas`}
                      </span>
                      <ArrowRight size={14} className="text-stone transition group-hover:translate-x-0.5 group-hover:text-grape" />
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          <Card className="flex items-start gap-3 bg-sun-tint/60 p-4">
            <Star size={16} className="mt-0.5 shrink-0 text-sun-deep" />
            <p className="text-[11.5px] font-semibold leading-relaxed text-ink-soft">
              <span className="font-extrabold">Saber aplicado, no solo reconocido:</span> los modos de aplicación (casos y
              explicación) pesan más en el dominio que un multiple choice, porque exigen recuperar y reorganizar el concepto.
            </p>
          </Card>
        </div>

        <aside className="order-1 self-start lg:sticky lg:top-[74px] lg:order-2">
          <SeleccionTemas seleccion={seleccion} onChange={setSeleccion} tarjetas={tarjetas} compacto />
          <p className="mt-2 px-1 text-[10.5px] font-semibold leading-relaxed text-stone">
            La selección define qué tarjetas usan los juegos. En el recorrido, los subtemas siguen bloqueados por progreso.
          </p>
        </aside>
      </div>
    </div>
  )
}
