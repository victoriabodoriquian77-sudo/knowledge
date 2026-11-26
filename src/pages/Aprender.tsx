import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Calculator,
  FlaskConical,
  Globe,
  HeartPulse,
  Layers,
  Pencil,
  Plus,
  Scale,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Card, Chip, Empty, Eyebrow, Progress } from '../components/ui/Primitives'
import { Button } from '../components/ui/Button'
import { Modal, Confirm } from '../components/ui/Modal'
import { useMaterias } from '../hooks/useDatos'
import { useToast } from '../hooks/useToast'
import { actualizarMateria, crearMateria, eliminarMateria } from '../lib/crud'
import { COLORES_MATERIA, ICONOS_MATERIA } from '../lib/constants'
import type { Materia } from '../types/models'

const ICONOS: Record<string, typeof Scale> = {
  scale: Scale,
  'book-open': BookOpen,
  briefcase: Briefcase,
  'flask-conical': FlaskConical,
  calculator: Calculator,
  globe: Globe,
  'heart-pulse': HeartPulse,
  atom: Sparkles,
}

export function Aprender() {
  const materias = useMaterias()
  const [params, setParams] = useSearchParams()
  const materiaActiva = params.get('materia') ?? undefined
  const [modal, setModal] = useState<{ abierto: boolean; editando?: Materia }>({ abierto: false })
  const [confirmar, setConfirmar] = useState<Materia | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [color, setColor] = useState(COLORES_MATERIA[0])
  const [icono, setIcono] = useState(ICONOS_MATERIA[0])
  const [guardando, setGuardando] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  const abrirCrear = () => {
    setNombre('')
    setDescripcion('')
    setColor(COLORES_MATERIA[(materias?.length ?? 0) % COLORES_MATERIA.length])
    setIcono(ICONOS_MATERIA[0])
    setModal({ abierto: true })
  }

  const abrirEditar = (m: Materia) => {
    setNombre(m.nombre)
    setDescripcion(m.descripcion)
    setColor(m.color)
    setIcono(m.icono)
    setModal({ abierto: true, editando: m })
  }

  const guardar = async () => {
    if (nombre.trim().length < 2) {
      toast('El nombre de la materia debe tener al menos 2 caracteres.', 'error')
      return
    }
    setGuardando(true)
    try {
      if (modal.editando) {
        await actualizarMateria(modal.editando.id, { nombre, descripcion, color, icono })
        toast('Materia actualizada.')
      } else {
        const nueva = await crearMateria({ nombre, descripcion, color, icono })
        toast('Materia creada. Ahora agregá una unidad.')
        setModal({ abierto: false })
        navigate(`/aprender?materia=${nueva.id}`)
        return
      }
      setModal({ abierto: false })
    } finally {
      setGuardando(false)
    }
  }

  const activa = materias?.find((m) => m.materia.id === materiaActiva) ?? materias?.[0]

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Tu recorrido</Eyebrow>
          <h1 className="mt-1 text-[24px] font-black leading-tight tracking-tight text-ink sm:text-[28px]">Aprender</h1>
          <p className="mt-1 max-w-xl text-[13px] font-semibold leading-relaxed text-muted">
            Organizá el contenido en materias, unidades y subtemas. Cada subtema se abre al completar el anterior.
          </p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus size={16} /> Nueva materia
        </Button>
      </header>

      {materias && materias.length === 0 && (
        <Empty
          titulo="Todavía no tenés materias"
          detalle="Creá la primera materia (por ejemplo, Derecho) y después agregá unidades y subtemas."
          icono={<BookOpen size={22} />}
          accion={<Button onClick={abrirCrear}><Plus size={16} /> Crear materia</Button>}
        />
      )}

      {materias && materias.length > 0 && (
        <>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {materias.map((m) => {
              const Icono = ICONOS[m.materia.icono] ?? BookOpen
              const activaTab = activa?.materia.id === m.materia.id
              return (
                <button
                  key={m.materia.id}
                  onClick={() => setParams({ materia: m.materia.id })}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl border-2 px-3.5 py-2 text-[12.5px] font-extrabold transition ${
                    activaTab ? 'border-transparent bg-ink text-white' : 'border-line bg-white text-ink hover:border-stone'
                  }`}
                >
                  <span className="grid h-6 w-6 place-items-center rounded-lg" style={{ backgroundColor: activaTab ? 'rgba(255,255,255,.16)' : `${m.materia.color}1f`, color: activaTab ? '#fff' : m.materia.color }}>
                    <Icono size={13} />
                  </span>
                  {m.materia.nombre}
                  <span className={`text-[10.5px] font-bold ${activaTab ? 'text-white/60' : 'text-stone'}`}>{m.dominio}%</span>
                </button>
              )
            })}
          </div>

          {activa && (
            <section className="space-y-4">
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activa.materia.color }} />
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.13em]" style={{ color: activa.materia.color }}>
                        {activa.materia.nombre}
                      </p>
                    </div>
                    <p className="mt-1 text-[13px] font-semibold leading-relaxed text-muted">
                      {activa.materia.descripcion || 'Sin descripción. Podés agregarla desde el lápiz.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => abrirEditar(activa.materia)} className="grid h-9 w-9 place-items-center rounded-xl bg-cream text-muted hover:text-ink" aria-label="Editar materia">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setConfirmar(activa.materia)} className="grid h-9 w-9 place-items-center rounded-xl bg-cream text-muted hover:text-coral" aria-label="Eliminar materia">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-line border-b border-line sm:grid-cols-4">
                  {[
                    { v: activa.unidades.length, l: 'Unidades' },
                    { v: activa.subtemas, l: 'Subtemas' },
                    { v: activa.tarjetas, l: 'Tarjetas' },
                    { v: `${activa.dominio}%`, l: 'Dominio' },
                  ].map((s) => (
                    <div key={s.l} className="px-4 py-3">
                      <p className="text-[18px] font-extrabold leading-none text-ink">{s.v}</p>
                      <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-muted">{s.l}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2.5 p-4">
                  {activa.unidades.length === 0 && (
                    <p className="rounded-2xl bg-cream px-4 py-5 text-center text-[12.5px] font-semibold text-muted">
                      Esta materia todavía no tiene unidades. Creá la primera abajo.
                    </p>
                  )}
                  {activa.unidades.map((u, i) => (
                    <motion.div key={u.unidad.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link
                        to={`/aprender/unidad/${u.unidad.id}`}
                        className="group flex items-center gap-3.5 rounded-2xl border border-line bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-grape/40 hover:shadow-card"
                      >
                        <div
                          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[15px] font-black"
                          style={{ backgroundColor: `${activa.materia.color}18`, color: activa.materia.color }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[14px] font-extrabold text-ink">{u.unidad.nombre}</p>
                            <EstadoChip estado={u.estado} />
                          </div>
                          <p className="mt-0.5 truncate text-[11.5px] font-semibold text-muted">
                            {u.completados} de {u.total} subtemas · {u.tarjetas} tarjetas · dominio {u.dominio}%
                          </p>
                          <Progress value={u.total ? (u.completados / u.total) * 100 : 0} className="mt-2" alto="h-1.5" />
                        </div>
                        <ArrowRight size={16} className="shrink-0 text-stone transition group-hover:text-grape" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </Card>

              {activa.unidades.length > 0 && (
                <p className="px-1 text-[11.5px] font-semibold text-muted">
                  Tip: las tarjetas creadas se pueden usar en los juegos aunque el recorrido no esté completo.
                </p>
              )}
            </section>
          )}
        </>
      )}

      <Modal
        abierto={modal.abierto}
        onCerrar={() => setModal({ abierto: false })}
        titulo={modal.editando ? 'Editar materia' : 'Nueva materia'}
        descripcion="La materia agrupa unidades, y cada unidad se divide en subtemas."
        pie={
          <>
            <Button variante="secundario" onClick={() => setModal({ abierto: false })}>Cancelar</Button>
            <Button onClick={guardar} cargando={guardando}>{modal.editando ? 'Guardar cambios' : 'Crear materia'}</Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="label" htmlFor="m-nombre">Nombre</label>
            <input id="m-nombre" className="field" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Derecho" autoFocus maxLength={60} />
          </div>
          <div>
            <label className="label" htmlFor="m-desc">Descripción (opcional)</label>
            <textarea id="m-desc" className="field min-h-[76px] resize-y" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Qué vas a estudiar en esta materia" maxLength={200} />
          </div>
          <div>
            <p className="label">Color</p>
            <div className="flex flex-wrap gap-2">
              {COLORES_MATERIA.map((c) => (
                <button key={c} onClick={() => setColor(c)} aria-label={`Color ${c}`} className={`h-8 w-8 rounded-full transition ${color === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-cream' : ''}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div>
            <p className="label">Ícono</p>
            <div className="flex flex-wrap gap-2">
              {ICONOS_MATERIA.map((ic) => {
                const Icono = ICONOS[ic] ?? BookOpen
                return (
                  <button key={ic} onClick={() => setIcono(ic)} aria-label={`Ícono ${ic}`} className={`grid h-9 w-9 place-items-center rounded-xl border-2 transition ${icono === ic ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:border-stone'}`}>
                    <Icono size={15} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Modal>

      <Confirm
        abierto={!!confirmar}
        titulo={`¿Eliminar «${confirmar?.nombre}»?`}
        detalle="Se eliminarán también sus unidades, subtemas, tarjetas y el progreso asociado. Esta acción no se puede deshacer."
        onCancelar={() => setConfirmar(null)}
        onConfirmar={async () => {
          if (!confirmar) return
          await eliminarMateria(confirmar.id)
          setConfirmar(null)
          setParams({})
          toast('Materia eliminada.')
        }}
      />
    </div>
  )
}

function EstadoChip({ estado }: { estado: string }) {
  const mapa: Record<string, { t: string; c: string }> = {
    completado: { t: 'Completada', c: 'bg-grass-tint text-grass' },
    dominado: { t: 'Dominada', c: 'bg-grass-tint text-grass' },
    'en-progreso': { t: 'En curso', c: 'bg-grape-tint text-grape' },
    disponible: { t: 'Nueva', c: 'bg-sky-tint text-sky' },
    bloqueado: { t: 'Bloqueada', c: 'bg-cream text-stone' },
  }
  const m = mapa[estado] ?? mapa.disponible
  return <Chip tono={m.c}>{m.t}</Chip>
}

export function MiniTarjetas({ n }: { n: number }) {
  return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted"><Layers size={12} /> {n}</span>
}
