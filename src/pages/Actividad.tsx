import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Clock, Info, Sparkles, X } from 'lucide-react'
import { db } from '../db/database'
import { SesionEstudio } from '../lib/sesion'
import { useContexto } from '../hooks/useDatos'
import { FICHA } from '../features/actividades/catalogo'
import { TarjetasSesion } from '../features/actividades/flashcards/TarjetasSesion'
import { KahootSesion } from '../features/actividades/kahoot/KahootSesion'
import { ExamenSesion } from '../features/actividades/examen/ExamenSesion'
import { EjerciciosSesion } from '../features/actividades/EjerciciosSesion'
import { Button } from '../components/ui/Button'
import { Card, Progress } from '../components/ui/Primitives'
import { useToast } from '../hooks/useToast'
import type { TipoActividad } from '../types/models'
import { DIMENSION_POR_TIPO } from '../lib/quiz'
import { SeleccionTemas, seleccionInicial, BotonIniciar, type Seleccion } from '../components/study/SeleccionTemas'
import { aplicarFiltro } from '../lib/filtros'

export interface ResultadoFinal {
  total: number
  aciertos: number
  fallos: number
  omitidas: number
  precision: number
  xp: number
  monedas: number
  nota?: number
  duracionMs: number
  porSubtema: Record<string, { aciertos: number; total: number }>
  rachaMaxima: number
}

const VALIDOS: TipoActividad[] = ['flashcards', 'multiple', 'verdadero-falso', 'completar', 'escrita', 'examen', 'kahoot', 'relacionar', 'ordenar', 'detectar-error', 'caso-practico', 'explicar', 'repaso']

export function Actividad() {
  const { tipo } = useParams<{ tipo: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const ctx = useContexto()
  const { toast } = useToast()
  const [iniciada, setIniciada] = useState(false)
  const [error, setError] = useState('')
  const sessionRef = useRef<SesionEstudio | null>(null)
  const [subtemasNombres, setSubtemasNombres] = useState<Record<string, string>>({})

  const tipoValido = (VALIDOS.includes(tipo as TipoActividad) ? tipo : 'flashcards') as TipoActividad
  const ficha = FICHA(tipoValido)

  const subtemaParam = params.get('subtema')
  const unidadParam = params.get('unidad')
  const materiaParam = params.get('materia')
  const tarjetaParam = params.get('tarjeta')

  // Si se llega sin tema en la URL, se elige antes de empezar: nunca se
  // practica a ciegas ni se mezclan materias sin que el usuario lo pida.
  const conTemaFijado = !!(subtemaParam || unidadParam || materiaParam || tarjetaParam)
  const [eligiendo, setEligiendo] = useState(!conTemaFijado)
  const [seleccion, setSeleccion] = useState<Seleccion>(() =>
    seleccionInicial({
      materiaId: materiaParam ?? '',
      unidadIds: unidadParam ? [unidadParam] : [],
      subtemaIds: subtemaParam ? [subtemaParam] : [],
    }),
  )

  const tarjetasFiltradas = useMemo(() => {
    if (!ctx) return []
    if (tarjetaParam) return ctx.tarjetas.filter((x) => x.id === tarjetaParam)
    if (eligiendo) {
      return aplicarFiltro(ctx.tarjetas, {
        materiaId: seleccion.materiaId || undefined,
        subtemaIds: seleccion.subtemaIds.length ? seleccion.subtemaIds : undefined,
        dificultad: seleccion.dificultad === 'todas' ? undefined : seleccion.dificultad,
        soloFavoritas: seleccion.soloFavoritas || undefined,
        soloPendientes: seleccion.soloPendientes || undefined,
        busqueda: seleccion.busqueda || undefined,
        estado: seleccion.estado === 'todas' ? undefined : seleccion.estado,
      }, new Map(ctx.progresos.map((p) => [p.tarjetaId, p])))
    }
    let t = ctx.tarjetas
    if (subtemaParam) t = t.filter((x) => x.subtemaId === subtemaParam)
    else if (unidadParam) t = t.filter((x) => x.unidadId === unidadParam)
    else if (materiaParam) t = t.filter((x) => x.materiaId === materiaParam)
    return t
  }, [ctx, eligiendo, seleccion, subtemaParam, unidadParam, materiaParam, tarjetaParam])

  useEffect(() => {
    if (!ctx) return
    const nombres: Record<string, string> = {}
    ctx.subtemas.forEach((s) => (nombres[s.id] = s.nombre))
    setSubtemasNombres(nombres)
  }, [ctx])

  useEffect(() => {
    if (!ctx || sessionRef.current || eligiendo) return
    if (tarjetasFiltradas.length === 0) {
      setError('No hay tarjetas para esta actividad. Cargá contenido o cambiá los filtros.')
      return
    }
    if (tarjetasFiltradas.length < ficha.minimo) {
      setError(`Esta actividad necesita al menos ${ficha.minimo} tarjetas. Tenés ${tarjetasFiltradas.length}.`)
      return
    }
    sessionRef.current = new SesionEstudio({
      tipo: tipoValido,
      materiaId: materiaParam ?? undefined,
      unidadId: unidadParam ?? undefined,
      subtemaIds: subtemaParam ? [subtemaParam] : [],
    })
    setIniciada(true)
  }, [ctx, tarjetasFiltradas, ficha.minimo, tipoValido, materiaParam, unidadParam, subtemaParam, eligiendo])

  /** Salir a mitad de sesión guarda lo respondido: no se pierde el avance. */
  const salir = async () => {
    const s = sessionRef.current
    if (s && s.cantidad > 0 && !s.finalizada) {
      try {
        await s.finalizar()
      } catch {
        /* si falla el guardado parcial, igual salimos */
      }
    }
    navigate(-1)
  }

  const finalizar = async (datos: ResultadoFinal) => {
    navigate('/resultado', {
      replace: true,
      state: {
        ...datos,
        tipo: tipoValido,
        subtemasNombres,
        id: sessionRef.current?.id,
      },
    })
  }

  if (!ctx) return null

  if (error) {
    return (
      <Card className="mx-auto max-w-lg p-6 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-sun-tint text-sun-deep">
          <Info size={22} />
        </div>
        <p className="text-[15px] font-extrabold text-ink">{error}</p>
        <p className="mt-1.5 text-[12.5px] font-semibold leading-relaxed text-muted">
          Podés crear tarjetas nuevas o elegir otra actividad con más contenido.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variante="secundario" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Volver</Button>
          <Button onClick={() => navigate('/tarjetas/nueva')}><Sparkles size={15} /> Crear tarjeta</Button>
        </div>
      </Card>
    )
  }

  if (eligiendo && !tarjetaParam) {
    return (
      <div className="mx-auto max-w-2xl">
        <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-muted hover:text-ink">
          <ArrowLeft size={14} /> Volver
        </button>
        <Card className="p-5">
          <div className="mb-4 flex items-start gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${ficha.tono}`}>
              <ficha.icono size={19} />
            </span>
            <div className="min-w-0">
              <h1 className="text-[19px] font-black leading-tight text-ink">{ficha.titulo}</h1>
              <p className="mt-0.5 text-[12.5px] font-semibold leading-relaxed text-muted">{ficha.descripcion}</p>
            </div>
          </div>
          <SeleccionTemas seleccion={seleccion} onChange={setSeleccion} tarjetas={ctx.tarjetas} />
          <div className="mt-4">
            <BotonIniciar
              cantidad={tarjetasFiltradas.length}
              etiqueta="Empezar"
              onClick={() => {
                sessionRef.current = new SesionEstudio({
                  tipo: tipoValido,
                  materiaId: seleccion.materiaId || undefined,
                  subtemaIds: seleccion.subtemaIds,
                })
                setIniciada(true)
                setEligiendo(false)
              }}
            />
          </div>
          {tarjetasFiltradas.length > 0 && tarjetasFiltradas.length < ficha.minimo && (
            <p className="mt-2 text-center text-[11px] font-bold text-mango">
              Esta actividad necesita al menos {ficha.minimo} tarjetas: sumá otro subtema.
            </p>
          )}
        </Card>
      </div>
    )
  }

  if (!iniciada || !sessionRef.current) {
    return (
      <div className="grid place-items-center py-24">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-grape border-t-transparent" />
          <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-muted">Preparando la actividad</p>
        </div>
      </div>
    )
  }

  const progresos = new Map(ctx.progresos.map((p) => [p.tarjetaId, p]))
  const comun = {
    sesion: sessionRef.current,
    tarjetas: tarjetasFiltradas,
    pool: ctx.tarjetas,
    progresos,
    subtemasNombres,
    onSalir: salir,
    onFinalizar: finalizar,
    onToast: toast,
  }

  return (
    <div>
      {tipoValido !== 'flashcards' && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <button onClick={salir} className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-muted hover:text-ink">
            <ArrowLeft size={14} /> Salir
          </button>
          <div className="flex items-center gap-2 text-[11.5px] font-extrabold uppercase tracking-wide text-muted">
            <span className={`grid h-7 w-7 place-items-center rounded-lg ${ficha.tono}`}><ficha.icono size={14} /></span>
            {ficha.titulo}
            {ficha.cronometro && <Clock size={13} className="ml-1 text-mango" />}
          </div>
        </div>
      )}

      {tipoValido === 'flashcards' && <TarjetasSesion {...comun} />}
      {tipoValido === 'kahoot' && <KahootSesion {...comun} />}
      {tipoValido === 'examen' && <ExamenSesion {...comun} />}
      {!['flashcards', 'kahoot', 'examen'].includes(tipoValido) && (
        <EjerciciosSesion {...comun} tipo={tipoValido} />
      )}
    </div>
  )
}
