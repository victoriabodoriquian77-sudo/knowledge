import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Clock, Coins, RotateCcw, Sparkles, Target, TrendingUp, Trophy, XCircle, Zap } from 'lucide-react'
import { Card, Chip, Eyebrow, Progress } from '../components/ui/Primitives'
import { Button } from '../components/ui/Button'
import { Lumi } from '../components/mascot/Lumi'
import { FICHA } from '../features/actividades/catalogo'
import { usePerfil } from '../hooks/useDatos'
import { nivelDesdeXp } from '../lib/constants'
import { fmt } from '../lib/format'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { fmtMs } from '../lib/format'
import type { ResultadoFinal } from './Actividad'
import type { TipoActividad } from '../types/models'

interface Estado extends ResultadoFinal {
  tipo: TipoActividad
  subtemasNombres: Record<string, string>
}

export function ResultadoSesion() {
  const location = useLocation()
  const navigate = useNavigate()
  const perfil = usePerfil()
  const estado = location.state as Estado | null
  const [mostrado, setMostrado] = useState(0)
  const record = useLiveQuery(async () => (estado?.tipo === 'kahoot' ? db.juegos.get('kahoot') : undefined), [estado?.tipo])

  useEffect(() => {
    if (!estado) return
    const t = setTimeout(() => setMostrado(1), 400)
    return () => clearTimeout(t)
  }, [estado])

  const refuerzo = useMemo(() => {
    if (!estado) return []
    return Object.entries(estado.porSubtema)
      .map(([id, v]) => ({ id, nombre: estado.subtemasNombres[id] ?? 'Subtema', ...v, pct: Math.round((v.aciertos / Math.max(1, v.total)) * 100) }))
      .filter((x) => x.pct < 70)
      .sort((a, b) => a.pct - b.pct)
  }, [estado])

  if (!estado) {
    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <p className="text-[14px] font-extrabold text-ink">No hay resultados para mostrar</p>
        <Button className="mt-4" onClick={() => navigate('/')}>Ir al inicio</Button>
      </Card>
    )
  }

  const ficha = FICHA(estado.tipo)
  const nota = estado.nota ?? estado.precision
  const aprobado = nota >= 60
  const animo = nota >= 85 ? 'celebrando' : nota >= 60 ? 'orgulloso' : 'animando'

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden p-6 text-center">
          <div className="flex justify-center">
            <Lumi animo={animo} tamano={150} />
          </div>
          <Eyebrow color={aprobado ? 'text-grass' : 'text-mango'}>{ficha.titulo}</Eyebrow>
          <h1 className="mt-1.5 text-[26px] font-black leading-tight tracking-tight text-ink sm:text-[31px]">
            {nota >= 85 ? '¡Excelente trabajo!' : nota >= 60 ? '¡Buen resultado!' : 'Todavía se puede mejorar'}
          </h1>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] font-semibold leading-relaxed text-muted">
            {nota >= 85
              ? 'Se nota el repaso. Lumi está dando vueltas de la emoción.'
              : nota >= 60
                ? 'Vas por buen camino. Las tarjetas falladas vuelven antes en el repaso.'
                : 'Equivocarse es parte del método: lo que fallaste hoy es lo que más vas a recordar después.'}
          </p>

          <div className="mx-auto mt-5 grid max-w-lg grid-cols-3 gap-2">
            <div className="rounded-2xl bg-cream px-3 py-3">
              <p className="text-[24px] font-black leading-none text-ink">{nota}%</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-muted">{estado.tipo === 'examen' || estado.tipo === 'kahoot' ? 'Nota' : 'Precisión'}</p>
            </div>
            <div className="rounded-2xl bg-grape-tint px-3 py-3">
              <p className="text-[24px] font-black leading-none text-grape">{estado.xp}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-grape/70">XP ganada</p>
            </div>
            <div className="rounded-2xl bg-sun-tint px-3 py-3">
              <p className="text-[24px] font-black leading-none text-sun-deep">{estado.monedas}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-sun-deep/70">Monedas</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <Eyebrow color="text-grass">Detalle</Eyebrow>
          <div className="mt-2.5 space-y-2">
            <Fila icono={<CheckCircle2 size={14} className="text-grass" />} etiqueta="Correctas" valor={estado.aciertos} />
            <Fila icono={<XCircle size={14} className="text-coral" />} etiqueta="Incorrectas" valor={estado.fallos} />
            <Fila icono={<Target size={14} className="text-sun-deep" />} etiqueta="Omitidas" valor={estado.omitidas} />
            <Fila icono={<Clock size={14} className="text-sky" />} etiqueta="Tiempo" valor={fmtMs(estado.duracionMs)} />
            <Fila icono={<TrendingUp size={14} className="text-grape" />} etiqueta="Mejor racha" valor={`${estado.rachaMaxima} seguidas`} />
          </div>
        </Card>

        <Card className="p-4">
          <Eyebrow color="text-coral">Necesitan refuerzo</Eyebrow>
          {refuerzo.length === 0 ? (
            <p className="mt-2.5 rounded-xl bg-grass-tint px-3 py-2.5 text-[12px] font-semibold text-grass">
              Ningún tema quedó flojo en esta sesión. Buen momento para subir la dificultad.
            </p>
          ) : (
            <div className="mt-2.5 space-y-2">
              {refuerzo.slice(0, 4).map((r) => (
                <div key={r.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11.5px] font-extrabold text-ink">{r.nombre}</p>
                    <span className="shrink-0 text-[10.5px] font-extrabold text-coral">{r.pct}%</span>
                  </div>
                  <Progress value={r.pct} tono="bg-coral" alto="h-1.5" className="mt-1" />
                </div>
              ))}
              <p className="pt-1 text-[10.5px] font-semibold text-muted">
                Estas tarjetas se reprogramaron para aparecer antes en el próximo repaso.
              </p>
            </div>
          )}
        </Card>
      </div>

      {estado.tipo === 'kahoot' && record && (
        <Card className="flex items-center gap-3 bg-sun-tint/70 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-sun-deep"><Trophy size={17} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-extrabold text-ink">Récord personal: {record.mejorPuntaje} puntos</p>
            <p className="text-[11px] font-semibold text-muted">
              {record.partidas} {record.partidas === 1 ? 'partida jugada' : 'partidas jugadas'} · mejor racha {record.mejorRacha}
            </p>
          </div>
        </Card>
      )}

      {perfil && (
        <Card className="flex items-center gap-3 bg-grape-tint/50 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-grape"><Sparkles size={17} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-extrabold text-ink">Nivel {nivelDesdeXp(perfil.xp).nivel} · {fmt(perfil.xp)} XP totales</p>
            <p className="text-[11px] font-semibold text-muted">Tu progreso se guardó en este dispositivo.</p>
          </div>
          <div className="hidden items-center gap-1 text-[11px] font-extrabold text-sun-deep sm:flex">
            <Coins size={13} /> {perfil.monedas}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
        <Button variante="secundario" onClick={() => navigate(-1)}>
          <RotateCcw size={15} /> Repetir
        </Button>
        <Button variante="secundario" onClick={() => navigate('/repaso')}>
          <Zap size={15} /> Repasar pendientes
        </Button>
        <Button onClick={() => navigate('/juegos')}>
          Otro juego <ArrowRight size={15} />
        </Button>
      </div>
      <p className="pb-4 text-center text-[10.5px] font-semibold text-stone">
        <Link to="/estadisticas" className="underline hover:text-ink">Ver estadísticas completas</Link>
      </p>
      <Chip className="hidden">{mostrado}</Chip>
    </div>
  )
}

function Fila({ icono, etiqueta, valor }: { icono: React.ReactNode; etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-1.5 last:border-0 last:pb-0">
      <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-muted">{icono} {etiqueta}</span>
      <span className="text-[12px] font-extrabold text-ink">{valor}</span>
    </div>
  )
}
