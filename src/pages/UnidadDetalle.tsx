import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  BookOpen,
  ChevronRight,
  Layers,
  Lock,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { calcularEstadoSubtema } from '../lib/hierarchy'
import { PathNode } from '../components/learning/PathNode'
import { Button } from '../components/ui/Button'
import { Card, Chip, Eyebrow, Progress } from '../components/ui/Primitives'
import { Modal, Confirm } from '../components/ui/Modal'
import { useToast } from '../hooks/useToast'
import { crearSubtema, eliminarSubtema, reordenar } from '../lib/crud'
import { useContexto } from '../hooks/useDatos'
import { Lumi } from '../components/mascot/Lumi'

export function UnidadDetalle() {
  const { unidadId } = useParams<{ unidadId: string }>()
  const ctx = useContexto()
  const { toast } = useToast()
  const navigate = useNavigate()

  const unidad = ctx?.unidades.find((u) => u.id === unidadId)
  const materia = ctx?.materias.find((m) => m.id === unidad?.materiaId)

  const [modal, setModal] = useState<{ abierto: boolean; editandoId?: string }>({ abierto: false })
  const [form, setForm] = useState({ nombre: '', descripcion: '' })
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const subtemas = useLiveQuery(
    async () => (unidadId ? (await db.subtemas.where('unidadId').equals(unidadId).toArray()).sort((a, b) => a.orden - b.orden) : []),
    [unidadId],
    [],
  )

  const resumenes = useMemo(() => {
    if (!ctx || !unidad) return []
    const progresos = new Map(ctx.progresos.map((p) => [p.tarjetaId, p]))
    const ordenados = [...subtemas].sort((a, b) => a.orden - b.orden)
    let anteriorCompletado = true
    return ordenados.map((s) => {
      const r = calcularEstadoSubtema(s, ctx.tarjetas, progresos, anteriorCompletado)
      anteriorCompletado = r.estado === 'completado' || r.estado === 'dominado'
      return r
    })
  }, [ctx, subtemas, unidad])

  const totalTarjetas = resumenes.reduce((a, r) => a + r.tarjetas, 0)
  const completados = resumenes.filter((r) => r.estado === 'completado' || r.estado === 'dominado').length
  const dominio = resumenes.length ? Math.round(resumenes.reduce((a, r) => a + r.dominio, 0) / resumenes.length) : 0

  if (!unidad) {
    return (
      <Card className="p-8 text-center">
        <p className="text-[15px] font-extrabold text-ink">No encontramos esta unidad</p>
        <Button className="mt-4" onClick={() => navigate('/aprender')}>Volver a Aprender</Button>
      </Card>
    )
  }

  const abrirNuevo = () => {
    setForm({ nombre: '', descripcion: '' })
    setModal({ abierto: true })
  }

  const abrirEditar = (id: string) => {
    const s = subtemas.find((x) => x.id === id)
    if (!s) return
    setForm({ nombre: s.nombre, descripcion: s.descripcion })
    setModal({ abierto: true, editandoId: id })
  }

  const guardar = async () => {
    if (form.nombre.trim().length < 2) {
      toast('El subtema necesita un nombre.', 'error')
      return
    }
    setGuardando(true)
    try {
      if (modal.editandoId) {
        await db.subtemas.update(modal.editandoId, { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() })
        toast('Subtema actualizado.')
      } else {
        await crearSubtema({ unidadId: unidad.id, materiaId: unidad.materiaId, nombre: form.nombre, descripcion: form.descripcion })
        toast('Subtema creado. Ya podés cargar tarjetas.')
      }
      setModal({ abierto: false })
    } finally {
      setGuardando(false)
    }
  }

  const mover = async (index: number, dir: -1 | 1) => {
    const destino = index + dir
    if (destino < 0 || destino >= resumenes.length) return
    await reordenar('subtemas', subtemas, index, destino)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[11.5px] font-bold text-muted">
        <Link to="/aprender" className="inline-flex items-center gap-1 hover:text-ink">
          <ArrowLeft size={13} /> Aprender
        </Link>
        <ChevronRight size={12} />
        <Link to={`/aprender?materia=${materia?.id}`} className="hover:text-ink">{materia?.nombre}</Link>
        <ChevronRight size={12} />
        <span className="text-ink">{unidad.nombre}</span>
      </div>

      <Card className="relative overflow-hidden p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow color="text-grass">{materia?.nombre}</Eyebrow>
            <h1 className="mt-1 text-[23px] font-black leading-tight tracking-tight text-ink sm:text-[27px]">{unidad.nombre}</h1>
            <p className="mt-1.5 max-w-lg text-[13px] font-semibold leading-relaxed text-muted">
              {unidad.descripcion || 'Avanzá a tu ritmo. Siempre podés volver a practicar lo que ya completaste.'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Chip tono="bg-grass-tint text-grass">{completados} de {resumenes.length} completados</Chip>
              <Chip tono="bg-grape-tint text-grape">{totalTarjetas} tarjetas</Chip>
              <Chip tono="bg-sun-tint text-sun-deep">{dominio}% dominio</Chip>
            </div>
          </div>
          <div className="hidden sm:block">
            <Lumi animo={completados === resumenes.length && resumenes.length > 0 ? 'celebrando' : dominio > 40 ? 'animando' : 'feliz'} tamano={104} />
          </div>
        </div>
        <Progress value={resumenes.length ? (completados / resumenes.length) * 100 : 0} className="mt-4" tono="bg-grass-bright" alto="h-2.5" />
      </Card>

      {resumenes.length === 0 ? (
        <Card className="px-6 py-10 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-grape-tint text-grape">
            <BookOpen size={24} />
          </div>
          <p className="text-[15px] font-extrabold text-ink">Esta unidad todavía no tiene subtemas</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] font-semibold leading-relaxed text-muted">
            Dividí la unidad en temas concretos. Cada subtema será un círculo del recorrido y se desbloquea al completar el anterior.
          </p>
          <Button className="mt-4" onClick={abrirNuevo}><Plus size={16} /> Crear primer subtema</Button>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted">Recorrido de la unidad</p>
            <Button variante="secundario" tam="sm" onClick={abrirNuevo}><Plus size={14} /> Subtema</Button>
          </div>

          <div className="relative mx-auto max-w-[620px] px-1 py-2">
            {/* sendero */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#e8e5dc" strokeWidth="4" strokeDasharray="2 12" strokeLinecap="round" />
            </svg>

            <div className="relative space-y-4 sm:space-y-5">
              {resumenes.map((r, i) => (
                <motion.div
                  key={r.subtema.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative"
                >
                  <PathNode resumen={r} indice={i} lado={i % 2 === 0 ? 'izq' : 'der'} />
                  <div className={`mt-1.5 flex gap-1 ${i % 2 === 0 ? 'pl-[76px] sm:pl-[92px]' : 'justify-end pr-[76px] sm:pr-[92px]'}`}>
                    <button onClick={() => abrirEditar(r.subtema.id)} className="grid h-6 w-6 place-items-center rounded-md text-stone hover:bg-white hover:text-ink" aria-label="Editar subtema">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => mover(i, -1)} disabled={i === 0} className="grid h-6 w-6 place-items-center rounded-md text-stone hover:bg-white hover:text-ink disabled:opacity-30" aria-label="Mover arriba">
                      <ArrowUp size={12} />
                    </button>
                    <button onClick={() => mover(i, 1)} disabled={i === resumenes.length - 1} className="grid h-6 w-6 place-items-center rounded-md text-stone hover:bg-white hover:text-ink disabled:opacity-30" aria-label="Mover abajo">
                      <ArrowDown size={12} />
                    </button>
                    <button onClick={() => setConfirmar(r.subtema.id)} className="grid h-6 w-6 place-items-center rounded-md text-stone hover:bg-coral-tint hover:text-coral" aria-label="Eliminar subtema">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mx-auto flex max-w-[620px] items-start gap-3 rounded-2xl bg-grape-tint/50 px-4 py-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-grape"><Sparkles size={15} /></div>
            <p className="text-[11.5px] font-semibold leading-relaxed text-ink-soft">
              Un paso a la vez: completá una etapa para abrir la siguiente. Si te trabás, podés practicar las tarjetas de
              cualquier subtema desde Juegos.
            </p>
          </div>
        </>
      )}

      <Modal
        abierto={modal.abierto}
        onCerrar={() => setModal({ abierto: false })}
        titulo={modal.editandoId ? 'Editar subtema' : 'Nuevo subtema'}
        descripcion="Un subtema es un tema concreto que vas a poder estudiar y evaluar por separado."
        pie={
          <>
            <Button variante="secundario" onClick={() => setModal({ abierto: false })}>Cancelar</Button>
            <Button onClick={guardar} cargando={guardando}>{modal.editandoId ? 'Guardar' : 'Crear subtema'}</Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="label" htmlFor="s-nombre">Nombre del subtema</label>
            <input id="s-nombre" className="field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej.: Necesidad de protección" autoFocus maxLength={90} />
          </div>
          <div>
            <label className="label" htmlFor="s-desc">Descripción (opcional)</label>
            <textarea id="s-desc" className="field min-h-[80px] resize-y" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Qué vas a aprender en este subtema" maxLength={300} />
          </div>
          {modal.editandoId && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-cream p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-grape"
                checked={!!subtemas.find((s) => s.id === modal.editandoId)?.desbloqueoForzado}
                onChange={async (e) => {
                  if (!modal.editandoId) return
                  await db.subtemas.update(modal.editandoId, { desbloqueoForzado: e.target.checked })
                  toast(e.target.checked ? 'Subtema desbloqueado manualmente.' : 'Volviste al desbloqueo secuencial.')
                }}
              />
              <span className="text-[11.5px] font-semibold leading-snug text-ink-soft">
                <span className="block font-extrabold text-ink">Estudiar sin esperar</span>
                Ignora el orden y permite entrar a este subtema aunque el anterior no esté completo.
              </span>
            </label>
          )}
        </div>
      </Modal>

      <Confirm
        abierto={!!confirmar}
        titulo="¿Eliminar este subtema?"
        detalle="Se eliminarán sus tarjetas y el progreso asociado. Los subtemas siguientes vuelven a bloquearse si corresponde."
        onCancelar={() => setConfirmar(null)}
        onConfirmar={async () => {
          if (!confirmar) return
          await eliminarSubtema(confirmar)
          setConfirmar(null)
          toast('Subtema eliminado.')
        }}
      />

    </div>
  )
}
