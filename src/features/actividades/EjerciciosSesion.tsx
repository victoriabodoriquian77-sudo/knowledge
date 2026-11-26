import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EjercicioHost, type ResultadoEjercicio } from './EjercicioHost'
import { generarEjercicios } from './motor'
import { DIMENSION_POR_TIPO } from '../../lib/quiz'
import type { SesionEstudio } from '../../lib/sesion'
import type { ProgresoTarjeta, Tarjeta, TipoActividad } from '../../types/models'
import type { ResultadoFinal } from '../../pages/Actividad'
import { Card } from '../../components/ui/Primitives'
import { Button } from '../../components/ui/Button'
import { Lumi } from '../../components/mascot/Lumi'

const CANTIDAD_POR_TIPO: Record<string, number> = {
  multiple: 10,
  'verdadero-falso': 10,
  completar: 10,
  escrita: 8,
  relacionar: 8,
  ordenar: 8,
  'detectar-error': 8,
  'caso-practico': 8,
  explicar: 6,
  repaso: 20,
}

export function EjerciciosSesion({
  sesion,
  tarjetas,
  pool,
  progresos,
  tipo,
  subtemasNombres,
  onFinalizar,
  onSalir,
  onToast,
}: {
  sesion: SesionEstudio
  tarjetas: Tarjeta[]
  pool: Tarjeta[]
  progresos: Map<string, ProgresoTarjeta>
  tipo: TipoActividad
  subtemasNombres: Record<string, string>
  onFinalizar: (r: ResultadoFinal) => void
  onSalir: () => void
  onToast: (m: string, t?: 'ok' | 'error' | 'info') => void
}) {
  const [indice, setIndice] = useState(0)
  const [finalizando, setFinalizando] = useState(false)
  const [racha, setRacha] = useState(0)
  const navigate = useNavigate()

  /** Salir a mitad guarda lo respondido: el progreso ya ganado no se pierde. */
  const salir = async () => {
    if (sesion.cantidad > 0 && !sesion.finalizada) {
      try {
        await sesion.finalizar()
      } catch {
        /* seguimos saliendo igual */
      }
    }
    onSalir()
  }

  const { ejercicios } = useMemo(
    () =>
      generarEjercicios({
        tipo,
        tarjetas,
        pool,
        progresos,
        cantidad: CANTIDAD_POR_TIPO[tipo] ?? Math.min(15, tarjetas.length),
        modoRepaso: tipo === 'repaso',
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tipo],
  )

  const porSubtema = useRef<Record<string, { aciertos: number; total: number }>>({})
  const inicio = useRef(Date.now())

  useEffect(() => {
    if (!ejercicios.length) {
      onToast('No se pudieron generar preguntas con estas tarjetas.', 'error')
    }
  }, [ejercicios.length, onToast])

  if (!ejercicios.length) {
    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <Lumi animo="pensativo" tamano={100} className="mx-auto" />
        <p className="mt-2 text-[14px] font-extrabold text-ink">No se pudieron generar preguntas</p>
        <p className="mt-1 text-[12.5px] font-semibold text-muted">
          Esta dinámica necesita tarjetas con más contenido (respuesta y conceptos clave).
        </p>
        <Button className="mt-4" onClick={salir}>Volver</Button>
      </Card>
    )
  }

  const finalizar = async () => {
    if (finalizando) return
    setFinalizando(true)
    const resultado = await sesion.finalizar()
    const intentos = sesion.intentosActuales
    const validos = intentos.filter((i) => i.tarjetaId)
    const aciertos = validos.filter((i) => i.correcto).length
    onFinalizar({
      total: intentos.length,
      aciertos,
      fallos: validos.length - aciertos,
      omitidas: intentos.length - validos.length,
      precision: validos.length ? Math.round((aciertos / validos.length) * 100) : 0,
      xp: sesion.xpAcumulada,
      monedas: sesion.monedasAcumuladas,
      duracionMs: Date.now() - inicio.current,
      porSubtema: porSubtema.current,
      rachaMaxima: sesion.rachaMaximaSesion,
      nota: Math.round((aciertos / Math.max(1, validos.length)) * 100),
    })
    void resultado
    setFinalizando(false)
  }

  const responder = async (r: ResultadoEjercicio) => {
    const ejercicio = ejercicios[indice]
    const t = 'tarjeta' in ejercicio ? ejercicio.tarjeta : null
    if (!t) return
    await sesion.responder({
      tarjeta: t,
      correcto: r.correcto,
      puntaje: r.puntaje,
      dimension: DIMENSION_POR_TIPO[tipo],
      ms: 0,
      conceptosPresentes: r.conceptosPresentes,
      conceptosFaltantes: r.conceptosFaltantes,
    })
    setRacha(sesion.racha)
    const reg = (porSubtema.current[t.subtemaId] ??= { aciertos: 0, total: 0 })
    reg.total++
    if (r.correcto) reg.aciertos++
  }

  return (
    <EjercicioHost
      ejercicio={ejercicios[indice]}
      indice={indice}
      total={ejercicios.length}
      onResponder={responder}
      onSiguiente={() => {
        if (indice + 1 >= ejercicios.length) {
          void finalizar()
        } else {
          setIndice((i) => i + 1)
        }
      }}
      racha={racha}
    />
  )
}
