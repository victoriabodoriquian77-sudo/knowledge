import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import {
  ArrowDownUp,
  Copy,
  Download,
  Filter,
  Layers,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { db } from '../db/database'
import { Card, Chip, Empty, Eyebrow } from '../components/ui/Primitives'
import { Button } from '../components/ui/Button'
import { Confirm } from '../components/ui/Modal'
import { useToast } from '../hooks/useToast'
import { useContexto } from '../hooks/useDatos'
import { duplicarTarjeta, eliminarTarjeta, toggleFavorita } from '../lib/crud'
import { ESTADO_TARJETA } from '../lib/tarjeta'
import { recortar } from '../lib/format'
import { exportarCSV } from '../lib/export'
import { RichTextRenderer } from '../components/ui/RichTextRenderer'
import type { Dificultad, Tarjeta } from '../types/models'

export function Flashcards() {
  const ctx = useContexto()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [busqueda, setBusqueda] = useState('')
  const [materiaId, setMateriaId] = useState('')
  const [unidadId, setUnidadId] = useState('')
  const [subtemaId, setSubtemaId] = useState(params.get('subtema') ?? '')
  const [dificultad, setDificultad] = useState<Dificultad | 'todas'>('todas')
  const [favoritas, setFavoritas] = useState(false)
  const [confirmar, setConfirmar] = useState<Tarjeta | null>(null)
  const [expandida, setExpandida] = useState<string | null>(null)
  const [orden, setOrden] = useState<'recientes' | 'antiguas' | 'dificultad' | 'alfabetico'>('recientes')

  const tarjetas = useLiveQuery(() => db.tarjetas.orderBy('creadaEn').reverse().toArray(), [], [])

  const progresos = useMemo(() => new Map((ctx?.progresos ?? []).map((p) => [p.tarjetaId, p])), [ctx])
  const unidades = useMemo(() => (ctx?.unidades ?? []).filter((u) => !materiaId || u.materiaId === materiaId), [ctx, materiaId])
  const subtemas = useMemo(
    () => (ctx?.subtemas ?? []).filter((s) => (!materiaId || s.materiaId === materiaId) && (!unidadId || s.unidadId === unidadId)),
    [ctx, materiaId, unidadId],
  )

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const arr = tarjetas.filter((t) => {
      if (materiaId && t.materiaId !== materiaId) return false
      if (unidadId && t.unidadId !== unidadId) return false
      if (subtemaId && t.subtemaId !== subtemaId) return false
      if (dificultad !== 'todas' && t.dificultad !== dificultad) return false
      if (favoritas && !t.favorita) return false
      if (q) {
        const txt = [t.pregunta, t.respuesta, t.explicacion, t.palabrasClave.join(' ')].join(' ').replace(/<[^>]+>/g, ' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        if (!txt.includes(q)) return false
      }
      return true
    })
    const ordenadas = [...arr]
    if (orden === 'antiguas') ordenadas.sort((a, b) => a.creadaEn - b.creadaEn)
    if (orden === 'alfabetico') ordenadas.sort((a, b) => a.pregunta.localeCompare(b.pregunta))
    if (orden === 'dificultad') {
      const peso = { dificil: 0, media: 1, facil: 2 }
      ordenadas.sort((a, b) => peso[a.dificultad] - peso[b.dificultad])
    }
    return ordenadas
  }, [tarjetas, materiaId, unidadId, subtemaId, dificultad, favoritas, busqueda, orden])

  const hayFiltros = materiaId || unidadId || subtemaId || dificultad !== 'todas' || favoritas || busqueda
  const subtemaNombre = (id: string) => ctx?.subtemas.find((s) => s.id === id)?.nombre ?? ''

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Mis materiales</Eyebrow>
          <h1 className="mt-1 text-[24px] font-black leading-tight tracking-tight text-ink sm:text-[28px]">Biblioteca de tarjetas</h1>
          <p className="mt-1 text-[13px] font-semibold text-muted">
            {tarjetas.length} {tarjetas.length === 1 ? 'tarjeta' : 'tarjetas'} · buscá, filtrá y organizá tu contenido.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variante="secundario" onClick={() => exportarCSV(tarjetas, ctx)} disabled={!tarjetas.length}>
            <Download size={15} /> CSV
          </Button>
          <Button onClick={() => navigate('/tarjetas/nueva')}><Plus size={16} /> Nueva tarjeta</Button>
        </div>
      </header>

      <Card className="p-3.5">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
          <input
            className="field h-11 pl-9 pr-9"
            placeholder="Buscar por concepto, palabra clave o fuente…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone hover:text-ink" aria-label="Limpiar búsqueda">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wide text-stone"><Filter size={12} /> Filtrar</span>
          <select className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-ink" value={materiaId} onChange={(e) => { setMateriaId(e.target.value); setUnidadId(''); setSubtemaId('') }}>
            <option value="">Toda materia</option>
            {(ctx?.materias ?? []).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          <select className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-ink" value={unidadId} onChange={(e) => { setUnidadId(e.target.value); setSubtemaId('') }} disabled={!materiaId}>
            <option value="">Toda unidad</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
          <select className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-ink" value={subtemaId} onChange={(e) => setSubtemaId(e.target.value)} disabled={!unidadId}>
            <option value="">Todo subtema</option>
            {subtemas.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <select className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-ink" value={dificultad} onChange={(e) => setDificultad(e.target.value as Dificultad | 'todas')}>
            <option value="todas">Dificultad</option>
            <option value="facil">Fácil</option>
            <option value="media">Media</option>
            <option value="dificil">Difícil</option>
          </select>
          <button
            onClick={() => setFavoritas((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${favoritas ? 'border-sun-deep bg-sun-tint text-sun-deep' : 'border-line bg-white text-muted hover:border-stone'}`}
          >
            <Star size={11} className={favoritas ? 'fill-sun-deep' : ''} /> Favoritas
          </button>
          <span className="flex-1" />
          <label className="inline-flex items-center gap-1 text-[10.5px] font-bold text-muted">
            <ArrowDownUp size={12} />
            <select className="rounded-full border border-line bg-white px-2 py-1 text-[11px] font-bold text-ink" value={orden} onChange={(e) => setOrden(e.target.value as typeof orden)}>
              <option value="recientes">Recientes</option>
              <option value="antiguas">Antiguas</option>
              <option value="dificultad">Dificultad</option>
              <option value="alfabetico">A–Z</option>
            </select>
          </label>
          {hayFiltros && (
            <button onClick={() => { setMateriaId(''); setUnidadId(''); setSubtemaId(''); setDificultad('todas'); setFavoritas(false); setBusqueda('') }} className="text-[10.5px] font-extrabold uppercase text-coral hover:underline">
              Limpiar
            </button>
          )}
        </div>
      </Card>

      {filtradas.length === 0 ? (
        <Empty
          titulo={tarjetas.length === 0 ? 'Tu biblioteca está vacía' : 'No hay tarjetas con esos filtros'}
          detalle={tarjetas.length === 0 ? 'Creá tu primera tarjeta con pregunta, respuesta, explicación y fuente.' : 'Probá cambiar la búsqueda o quitar filtros.'}
          icono={<Layers size={22} />}
          accion={tarjetas.length === 0 ? <Button onClick={() => navigate('/tarjetas/nueva')}><Plus size={15} /> Crear tarjeta</Button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtradas.map((t, i) => {
            const p = progresos.get(t.id)
            const estado = ESTADO_TARJETA(p)
            const abierta = expandida === t.id
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.2) }}>
                <Card className="p-3.5">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={async () => { await toggleFavorita(t.id); toast(t.favorita ? 'Quitada de favoritas.' : 'Agregada a favoritas.', 'info') }}
                      className={`mt-0.5 shrink-0 ${t.favorita ? 'text-sun-deep' : 'text-stone hover:text-sun-deep'}`}
                      aria-label="Favorita"
                    >
                      <Star size={16} className={t.favorita ? 'fill-sun-deep' : ''} />
                    </button>
                    <button onClick={() => setExpandida(abierta ? null : t.id)} className="min-w-0 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Chip tono={estado.tono}>{estado.texto}</Chip>
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-stone">{subtemaNombre(t.subtemaId)}</span>
                      </div>
                      <p className="mt-1 text-[13px] font-extrabold leading-snug text-ink">{recortar(t.pregunta.replace(/<[^>]+>/g, ''), 140)}</p>
                      <p className={`mt-0.5 text-[11.5px] font-semibold leading-snug text-muted ${abierta ? '' : 'line-clamp-1'}`}>
                        {t.respuesta.replace(/<[^>]+>/g, '').slice(0, 180)}
                      </p>
                      {abierta && (
                        <div className="mt-2.5 space-y-2 border-t border-line pt-2.5">
                          <RichTextRenderer html={t.respuesta} className="text-[12.5px] text-ink-soft" />
                          {t.explicacion && (
                            <div className="rounded-xl bg-cream p-2.5">
                              <p className="text-[9.5px] font-extrabold uppercase tracking-wide text-muted">Explicación</p>
                              <RichTextRenderer html={t.explicacion} className="mt-1 text-[12px]" />
                            </div>
                          )}
                          {t.ejemplo && (
                            <div className="rounded-xl bg-sky-tint/50 p-2.5">
                              <p className="text-[9.5px] font-extrabold uppercase tracking-wide text-sky">Ejemplo</p>
                              <RichTextRenderer html={t.ejemplo} className="mt-1 text-[12px]" />
                            </div>
                          )}
                          {t.imagen && <img src={t.imagen} alt="Apoyo" className="max-h-40 rounded-lg border border-line" />}
                          <div className="flex flex-wrap gap-1.5">
                            {t.palabrasClave.map((c) => <span key={c} className="rounded-full bg-grape-tint px-2 py-0.5 text-[10px] font-extrabold text-grape">{c}</span>)}
                          </div>
                          {(t.capitulo || t.pagina) && (
                            <p className="text-[10.5px] font-semibold text-stone">Fuente: {t.capitulo} {t.pagina && `· pág. ${t.pagina}`}</p>
                          )}
                        </div>
                      )}
                    </button>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button onClick={() => navigate(`/tarjetas/${t.id}`)} className="grid h-8 w-8 place-items-center rounded-lg text-stone hover:bg-cream hover:text-ink" aria-label="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={async () => { await duplicarTarjeta(t.id); toast('Tarjeta duplicada.') }} className="grid h-8 w-8 place-items-center rounded-lg text-stone hover:bg-cream hover:text-ink" aria-label="Duplicar">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => setConfirmar(t)} className="grid h-8 w-8 place-items-center rounded-lg text-stone hover:bg-coral-tint hover:text-coral" aria-label="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3.5">
        <p className="text-[11.5px] font-semibold text-muted">
          ¿Querés estudiar todo junto? <Link to="/juegos" className="font-extrabold text-grape hover:underline">Abrí el centro de juegos</Link>.
        </p>
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-stone">{filtradas.length} mostradas</span>
      </div>

      <Confirm
        abierto={!!confirmar}
        titulo="¿Eliminar esta tarjeta?"
        detalle="Se elimina junto con su historial de repaso."
        onCancelar={() => setConfirmar(null)}
        onConfirmar={async () => {
          if (!confirmar) return
          await eliminarTarjeta(confirmar.id)
          setConfirmar(null)
          toast('Tarjeta eliminada.')
        }}
      />
    </div>
  )
}
