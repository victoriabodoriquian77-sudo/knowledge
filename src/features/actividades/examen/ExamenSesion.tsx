import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock, Send, ShieldAlert } from 'lucide-react'
import type { SesionEstudio } from '../../../lib/sesion'
import type { ProgresoTarjeta, Tarjeta, TipoActividad } from '../../../types/models'
import type { ResultadoFinal } from '../../../pages/Actividad'
import { generarEjercicios } from '../motor'
import { EjercicioHost, type ResultadoEjercicio } from '../EjercicioHost'
import { Card, Progress } from '../../../components/ui/Primitives'
import { Button } from '../../../components/ui/Button'
import { useConfig } from '../../../hooks/useDatos'
import { fmtMsCorto } from '../../../lib/format'
import { DIMENSION_POR_TIPO } from '../../../lib/quiz'

/**
 * Modo examen: preguntas mixtas, tiempo configurable, sin corrección
 * inmediata. Al finalizar calcula nota, precisión y temas a reforzar.
 */
export function ExamenSesion({
  sesion,
  tarjetas,
  pool,
  progresos,
  onFinalizar,
  onSalir,
}: {
  sesion: SesionEstudio
  tarjetas: Tarjeta[]
  pool: Tarjeta[]
  progresos: Map<string, ProgresoTarjeta>
  onFinalizar: (r: ResultadoFinal) => void
  onSalir: () => void
  onToast: (m: string, t?: 'ok' | 'error' | 'info') => void
}) {
  const config = useConfig()
  const minutos = config?.minutosExamen ?? 25
  const cantidad = config?.preguntasExamen ?? 20

  const [indice, setIndice] = useState(0)
  const [restante, setRestante] = useState(minutos * 60)
  const [finalizando, setFinalizando] = useState(false)
  const [porSubtema, setPorSubtema] = useState<Record<string, { aciertos: number; total: number }>>({})
  const inicio = useRef(Date.now())
  const [entregado, setEntregado] = useState(false)

  const { ejercicios } = useMemo(
    () =>
      generarEjercicios({
        tipo: 'examen',
        tarjetas,
        pool,
        progresos,
        cantidad: Math.min(cantidad, tarjetas.length),
        mezclarTipos: true,
        tiposExamen: ['multiple', 'verdadero-falso', 'completar', 'escrita', 'caso-practico'] as TipoActividad[],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tarjetas.length, cantidad],
  )

  useEffect(() => {
    if (entregado) return
    if (restante <= 0) {
      void terminar(true)
      return
    }
    const t = setTimeout(() => setRestante((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restante, entregado])

  const terminar = async (porTiempo = false) => {
    if (finalizando || entregado) return
    setEntregado(true)
    setFinalizando(true)
    const intentosPrevios = sesion.intentosActuales
    const validosPrevios = intentosPrevios.filter((i) => i.tarjetaId)
    const precisionPrevia = validosPrevios.length
      ? Math.round((validosPrevios.filter((i) => i.correcto).length / validosPrevios.length) * 100)
      : 0
    // La nota se guarda con la sesión: es lo que habilita el logro de examen aprobado.
    await sesion.finalizar({ nota: precisionPrevia })
    const intentos = sesion.intentosActuales
    const validos = intentos.filter((i) => i.tarjetaId)
    const aciertos = validos.filter((i) => i.correcto).length
    const precision = validos.length ? Math.round((aciertos / validos.length) * 100) : 0
    onFinalizar({
      total: ejercicios.length,
      aciertos,
      fallos: validos.length - aciertos,
      omitidas: ejercicios.length - intentos.length,
      precision,
      xp: sesion.xpAcumulada,
      monedas: sesion.monedasAcumuladas,
      duracionMs: Date.now() - inicio.current,
      porSubtema,
      rachaMaxima: sesion.rachaMaximaSesion,
      nota: precision,
    })
    if (porTiempo) void 0
    setFinalizando(false)
  }

  const responder = async (r: ResultadoEjercicio) => {
    const ejercicio = ejercicios[indice]
    if (!('tarjeta' in ejercicio)) return
    const t = ejercicio.tarjeta
    await sesion.responder({
      tarjeta: t,
      correcto: r.correcto,
      puntaje: r.puntaje,
      dimension: DIMENSION_POR_TIPO[ejercicio.tipo as TipoActividad] ?? 'comprension',
      ms: 0,
      conceptosPresentes: r.conceptosPresentes,
      conceptosFaltantes: r.conceptosFaltantes,
    })
    setPorSubtema((prev) => {
      const reg = prev[t.subtemaId] ?? { aciertos: 0, total: 0 }
      return { ...prev, [t.subtemaId]: { aciertos: reg.aciertos + (r.correcto ? 1 : 0), total: reg.total + 1 } }
    })
  }

  if (!ejercicios.length) {
    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <p className="text-[14px] font-extrabold text-ink">No hay suficientes tarjetas para el examen</p>
        <Button className="mt-4" onClick={onSalir}>Volver</Button>
      </Card>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-grape-tint text-grape"><ShieldAlert size={15} /></span>
          <div>
            <p className="text-[12px] font-extrabold text-ink">Simulacro de examen</p>
            <p className="text-[10.5px] font-semibold text-muted">Las respuestas se corrigen al final</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-black tabular-nums ${restante < 120 ? 'bg-coral-tint text-coral' : 'bg-white text-ink shadow-card'}`}>
          <Clock size={12} /> {fmtMsCorto(restante * 1000)}
        </span>
      </div>

      <Progress value={((indice) / ejercicios.length) * 100} tono="bg-grape" alto="h-1.5" className="mb-4" />

      <EjercicioHost
        ejercicio={ejercicios[indice]}
        indice={indice}
        total={ejercicios.length}
        onResponder={responder}
        onSiguiente={() => {
          if (indice + 1 >= ejercicios.length) void terminar()
          else setIndice((i) => i + 1)
        }}
        diferirCorreccion
      />

      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-3">
        <p className="text-[11px] font-semibold text-muted">Respondidas {sesion.cantidad} de {ejercicios.length}</p>
        <Button variante="secundario" tam="sm" onClick={() => void terminar()} cargando={finalizando}>
          <Send size={13} /> Entregar examen
        </Button>
      </div>
    </div>
  )
}
