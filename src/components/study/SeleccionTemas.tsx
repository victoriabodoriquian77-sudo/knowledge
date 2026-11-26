import { useMemo, useState } from 'react'
import { Check, ChevronDown, Filter, Layers, Search, X } from 'lucide-react'
import clsx from 'clsx'
import { Card, Chip, Eyebrow } from '../ui/Primitives'
import { Button } from '../ui/Button'
import type { Dificultad, Tarjeta } from '../../types/models'
import { useContexto } from '../../hooks/useDatos'
import { aplicarFiltro } from '../../lib/filtros'
import type { FiltroTarjetas } from '../../types/models'

export interface Seleccion {
  materiaId: string
  unidadIds: string[]
  subtemaIds: string[]
  dificultad: Dificultad | 'todas'
  soloFavoritas: boolean
  soloPendientes: boolean
  busqueda: string
  estado: 'todas' | 'nuevas' | 'aprendiendo' | 'dominadas' | 'dificiles'
}

export const seleccionInicial = (opts?: Partial<Seleccion>): Seleccion => ({
  materiaId: '',
  unidadIds: [],
  subtemaIds: [],
  dificultad: 'todas',
  soloFavoritas: false,
  soloPendientes: false,
  busqueda: '',
  estado: 'todas',
  ...opts,
})

/**
 * Selector de temas: permite elegir exactamente qué tarjetas entran
 * en la actividad. Nunca mezcla materias sin que el usuario lo pida.
 */
export function SeleccionTemas({
  seleccion,
  onChange,
  tarjetas,
  compacto = false,
}: {
  seleccion: Seleccion
  onChange: (s: Seleccion) => void
  tarjetas: Tarjeta[]
  compacto?: boolean
}) {
  const ctx = useContexto()
  const [abierto, setAbierto] = useState(false)
  const progresos = useMemo(() => new Map((ctx?.progresos ?? []).map((p) => [p.tarjetaId, p])), [ctx])

  const materias = ctx?.materias ?? []
  const unidades = useMemo(
    () => (ctx?.unidades ?? []).filter((u) => !seleccion.materiaId || u.materiaId === seleccion.materiaId),
    [ctx, seleccion.materiaId],
  )
  const subtemas = useMemo(
    () =>
      (ctx?.subtemas ?? []).filter(
        (s) =>
          (!seleccion.materiaId || s.materiaId === seleccion.materiaId) &&
          (!seleccion.unidadIds.length || seleccion.unidadIds.includes(s.unidadId)),
      ),
    [ctx, seleccion.materiaId, seleccion.unidadIds],
  )

  const filtro: FiltroTarjetas = {
    materiaId: seleccion.materiaId || undefined,
    subtemaIds: seleccion.subtemaIds.length ? seleccion.subtemaIds : undefined,
    unidadId: !seleccion.subtemaIds.length && seleccion.unidadIds.length === 1 ? seleccion.unidadIds[0] : undefined,
    dificultad: seleccion.dificultad,
    soloFavoritas: seleccion.soloFavoritas,
    soloPendientes: seleccion.soloPendientes,
    busqueda: seleccion.busqueda,
    estado: seleccion.estado,
  }
  const resultado = aplicarFiltro(tarjetas, filtro, progresos)

  const toggleUnidad = (id: string) => {
    const existe = seleccion.unidadIds.includes(id)
    const nuevas = existe ? seleccion.unidadIds.filter((x) => x !== id) : [...seleccion.unidadIds, id]
    const subtemasValidos = seleccion.subtemaIds.filter((s) => {
      const sub = ctx?.subtemas.find((x) => x.id === s)
      return sub && (!nuevas.length || nuevas.includes(sub.unidadId))
    })
    onChange({ ...seleccion, unidadIds: nuevas, subtemaIds: subtemasValidos })
  }

  const toggleSubtema = (id: string) => {
    const existe = seleccion.subtemaIds.includes(id)
    onChange({ ...seleccion, subtemaIds: existe ? seleccion.subtemaIds.filter((x) => x !== id) : [...seleccion.subtemaIds, id] })
  }

  const resumen = [
    seleccion.materiaId ? materias.find((m) => m.id === seleccion.materiaId)?.nombre : 'Todas las materias',
    seleccion.subtemaIds.length
      ? `${seleccion.subtemaIds.length} subtemas`
      : seleccion.unidadIds.length
        ? `${seleccion.unidadIds.length} unidades`
        : 'Todo',
  ].filter(Boolean)

  if (compacto) {
    return (
      <div className="rounded-xl2 border border-line bg-white p-3.5">
        <button onClick={() => setAbierto((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
          <div className="flex min-w-0 items-center gap-2">
            <Filter size={14} className="shrink-0 text-grape" />
            <p className="truncate text-[12px] font-extrabold text-ink">{resumen.join(' · ')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-grape-tint px-2 py-0.5 text-[11px] font-extrabold text-grape">{resultado.length}</span>
            <ChevronDown size={14} className={clsx('text-stone transition', abierto && 'rotate-180')} />
          </div>
        </button>
        {abierto && (
          <div className="mt-3 border-t border-line pt-3">
            <FiltrosContenido
              seleccion={seleccion}
              onChange={onChange}
              materias={materias}
              unidades={unidades}
              subtemas={subtemas}
              toggleUnidad={toggleUnidad}
              toggleSubtema={toggleSubtema}
              tarjetas={resultado}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <Eyebrow>Qué vas a estudiar</Eyebrow>
        <Chip tono="bg-grape-tint text-grape"><Layers size={11} /> {resultado.length} tarjetas</Chip>
      </div>
      <FiltrosContenido
        seleccion={seleccion}
        onChange={onChange}
        materias={materias}
        unidades={unidades}
        subtemas={subtemas}
        toggleUnidad={toggleUnidad}
        toggleSubtema={toggleSubtema}
        tarjetas={resultado}
      />
    </Card>
  )
}

function FiltrosContenido({
  seleccion,
  onChange,
  materias,
  unidades,
  subtemas,
  toggleUnidad,
  toggleSubtema,
  tarjetas,
}: {
  seleccion: Seleccion
  onChange: (s: Seleccion) => void
  materias: { id: string; nombre: string }[]
  unidades: { id: string; nombre: string }[]
  subtemas: { id: string; nombre: string }[]
  toggleUnidad: (id: string) => void
  toggleSubtema: (id: string) => void
  tarjetas: Tarjeta[]
}) {
  const estados: { v: Seleccion['estado']; t: string }[] = [
    { v: 'todas', t: 'Todas' },
    { v: 'nuevas', t: 'Nuevas' },
    { v: 'aprendiendo', t: 'Aprendiendo' },
    { v: 'dificiles', t: 'Difíciles' },
    { v: 'dominadas', t: 'Dominadas' },
  ]

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="sel-materia">Materia</label>
        <select
          id="sel-materia"
          className="field"
          value={seleccion.materiaId}
          onChange={(e) => onChange({ ...seleccion, materiaId: e.target.value, unidadIds: [], subtemaIds: [] })}
        >
          <option value="">Todas las materias</option>
          {materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </div>

      {unidades.length > 0 && (
        <div>
          <p className="label">Unidades</p>
          <div className="flex flex-wrap gap-1.5">
            {unidades.map((u) => {
              const activo = seleccion.unidadIds.includes(u.id)
              return (
                <button
                  key={u.id}
                  onClick={() => toggleUnidad(u.id)}
                  className={clsx(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-extrabold transition',
                    activo ? 'border-grape bg-grape text-white' : 'border-line bg-white text-muted hover:border-stone',
                  )}
                >
                  {activo && <Check size={11} />} {u.nombre}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {subtemas.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <p className="label">Subtemas</p>
            {seleccion.subtemaIds.length > 0 && (
              <button onClick={() => onChange({ ...seleccion, subtemaIds: [] })} className="mb-1 inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase text-muted hover:text-ink">
                <X size={10} /> Limpiar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {subtemas.map((s) => {
              const activo = seleccion.subtemaIds.includes(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSubtema(s.id)}
                  className={clsx(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-bold transition',
                    activo ? 'border-grass bg-grass-tint text-grass' : 'border-line bg-white text-muted hover:border-stone',
                  )}
                >
                  {activo && <Check size={11} />} {s.nombre}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="label" htmlFor="sel-dif">Dificultad</label>
          <select id="sel-dif" className="field py-2 text-[12.5px]" value={seleccion.dificultad} onChange={(e) => onChange({ ...seleccion, dificultad: e.target.value as Seleccion['dificultad'] })}>
            <option value="todas">Todas</option>
            <option value="facil">Fácil</option>
            <option value="media">Media</option>
            <option value="dificil">Difícil</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sel-estado">Estado</label>
          <select id="sel-estado" className="field py-2 text-[12.5px]" value={seleccion.estado} onChange={(e) => onChange({ ...seleccion, estado: e.target.value as Seleccion['estado'] })}>
            {estados.map((e) => <option key={e.v} value={e.v}>{e.t}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Toggle activo={seleccion.soloFavoritas} onClick={() => onChange({ ...seleccion, soloFavoritas: !seleccion.soloFavoritas })}>★ Favoritas</Toggle>
        <Toggle activo={seleccion.soloPendientes} onClick={() => onChange({ ...seleccion, soloPendientes: !seleccion.soloPendientes })}>Pendientes de repaso</Toggle>
      </div>

      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
        <input
          className="field pl-9 text-[12.5px]"
          placeholder="Buscar por concepto o palabra…"
          value={seleccion.busqueda}
          onChange={(e) => onChange({ ...seleccion, busqueda: e.target.value })}
        />
      </div>

      <p className="text-[11px] font-semibold text-muted">
        {tarjetas.length === 0
          ? 'No hay tarjetas con estos filtros. Probá ampliar la selección.'
          : `${tarjetas.length} ${tarjetas.length === 1 ? 'tarjeta lista' : 'tarjetas listas'} para practicar.`}
      </p>
    </div>
  )
}

function Toggle({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-full border px-2.5 py-1 text-[11px] font-extrabold transition',
        activo ? 'border-sun-deep bg-sun-tint text-sun-deep' : 'border-line bg-white text-muted hover:border-stone',
      )}
    >
      {children}
    </button>
  )
}

export function BotonIniciar({ cantidad, onClick, etiqueta = 'Comenzar' }: { cantidad: number; onClick: () => void; etiqueta?: string }) {
  return (
    <Button onClick={onClick} disabled={cantidad === 0} tam="lg" bloque>
      {cantidad === 0 ? 'Sin tarjetas para practicar' : `${etiqueta} (${cantidad})`}
    </Button>
  )
}
