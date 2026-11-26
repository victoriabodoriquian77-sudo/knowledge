import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowLeft, BarChart3, Brain, Clock, Coins, Flame, Target, TrendingUp, Zap } from 'lucide-react'
import { db } from '../db/database'
import { Card, Chip, Eyebrow, Empty, Progress } from '../components/ui/Primitives'
import { Button } from '../components/ui/Button'
import { useContexto, useNivel, usePerfil, useResumenDiario } from '../hooks/useDatos'
import { calcularPreparacion, ETIQUETA_NIVEL } from '../lib/preparacion'
import { estaDominada } from '../lib/srs'
import { fmtMs, fmt } from '../lib/format'
import { Lumi } from '../components/mascot/Lumi'
import { DIMENSIONES, ETIQUETA_DIMENSION } from '../lib/srs'
import type { Sesion } from '../types/models'

type Rango = '7d' | '30d' | '90d'

export function Estadisticas() {
  const ctx = useContexto()
  const perfil = usePerfil()
  const nivel = useNivel()
  const diario = useResumenDiario()
  const navigate = useNavigate()
  const [rango, setRango] = useState<Rango>('7d')

  const sesiones = useLiveQuery(() => db.sesiones.orderBy('iniciadaEn').reverse().toArray(), [], []) as Sesion[]

  const dias = rango === '7d' ? 7 : rango === '30d' ? 30 : 90

  const serie = useMemo(() => {
    const mapa = new Map((diario ?? []).map((d) => [d.fecha, d]))
    const out: { fecha: string; etiqueta: string; xp: number; correctas: number; incorrectas: number; minutos: number; tarjetas: number }[] = []
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const reg = mapa.get(iso)
      out.push({
        fecha: iso,
        etiqueta: `${d.getDate()}/${d.getMonth() + 1}`,
        xp: reg?.xp ?? 0,
        correctas: reg?.correctas ?? 0,
        incorrectas: reg?.incorrectas ?? 0,
        minutos: Math.round((reg?.tiempoMs ?? 0) / 60000),
        tarjetas: reg?.tarjetas ?? 0,
      })
    }
    return out
  }, [diario, dias])

  const progresos = ctx?.progresos ?? []
  const tarjetas = ctx?.tarjetas ?? []
  const conHistorial = progresos.filter((p) => p.repeticiones > 0)
  const dominadas = conHistorial.filter(estaDominada).length

  const totalAciertos = conHistorial.reduce((a, p) => a + p.aciertos, 0)
  const totalIntentos = conHistorial.reduce((a, p) => a + p.aciertos + p.fallos, 0)
  const precision = totalIntentos ? Math.round((totalAciertos / totalIntentos) * 100) : 0

  const porMateria = useMemo(() => {
    if (!ctx) return []
    return ctx.materias.map((m) => {
      const ts = tarjetas.filter((t) => t.materiaId === m.id)
      const prog = ts.map((t) => ctx.progresos.find((p) => p.tarjetaId === t.id)).filter(Boolean)
      const dom = prog.filter((p) => estaDominada(p!)).length
      const a = prog.reduce((x, p) => x + (p!.aciertos ?? 0), 0)
      const i = prog.reduce((x, p) => x + (p!.aciertos ?? 0) + (p!.fallos ?? 0), 0)
      return {
        nombre: m.nombre,
        tarjetas: ts.length,
        dominadas: dom,
        precision: i ? Math.round((a / i) * 100) : 0,
        color: m.color,
      }
    })
  }, [ctx, tarjetas])

  const porSubtema = useMemo(() => {
    if (!ctx) return []
    return ctx.subtemas
      .map((s) => {
        const ts = tarjetas.filter((t) => t.subtemaId === s.id)
        const prog = ts.map((t) => ctx.progresos.find((p) => p.tarjetaId === t.id)).filter(Boolean)
        const dom = prog.filter((p) => estaDominada(p!)).length
        const a = prog.reduce((x, p) => x + (p!.aciertos ?? 0), 0)
        const tot = prog.reduce((x, p) => x + (p!.aciertos ?? 0) + (p!.fallos ?? 0), 0)
        return {
          id: s.id,
          nombre: s.nombre,
          tarjetas: ts.length,
          dominadas: dom,
          precision: tot ? Math.round((a / tot) * 100) : 0,
          dominio: prog.length ? Math.round(prog.reduce((x, p) => x + (p!.dominio ?? 0), 0) / prog.length) : 0,
        }
      })
      .filter((s) => s.tarjetas > 0)
      .sort((a, b) => b.dominio - a.dominio)
  }, [ctx, tarjetas])

  const dimensiones = useMemo(() => {
    return DIMENSIONES.map((d) => ({
      dimension: ETIQUETA_DIMENSION[d],
      valor: conHistorial.length
        ? Math.round(conHistorial.reduce((a, p) => a + (p.dimensiones[d] ?? 0), 0) / conHistorial.length)
        : 0,
    }))
  }, [conHistorial])

  const preparacion = useMemo(
    () => (ctx ? calcularPreparacion(ctx.subtemas, tarjetas, new Map(progresos.map((p) => [p.tarjetaId, p])), sesiones) : null),
    [ctx, tarjetas, progresos, sesiones],
  )

  const refuerzo = useMemo(
    () =>
      [...porSubtema]
        .filter((s) => s.dominio > 0 && (s.dominio < 55 || s.precision < 65))
        .sort((a, b) => a.dominio - b.dominio)
        .slice(0, 5),
    [porSubtema],
  )

  const totalMs = (diario ?? []).reduce((a, d) => a + (d.tiempoMs ?? 0), 0)
  const totalSesiones = sesiones.length

  const porTipo = useMemo(() => {
    const mapa = new Map<string, number>()
    sesiones.forEach((s) => mapa.set(s.tipo, (mapa.get(s.tipo) ?? 0) + 1))
    return [...mapa.entries()].map(([name, value]) => ({ name, value }))
  }, [sesiones])

  const colores = ['#7961d8', '#56b8d9', '#23885c', '#f39a48', '#f17d78', '#f6c84a', '#35b779']

  if (!ctx) return null
  const sinDatos = sesiones.length === 0 && tarjetas.length === 0

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Tu progreso</Eyebrow>
          <h1 className="mt-1 text-[24px] font-black leading-tight tracking-tight text-ink sm:text-[28px]">Entendé tu progreso de verdad</h1>
          <p className="mt-1 max-w-xl text-[13px] font-semibold leading-relaxed text-muted">
            Todo lo que ves acá sale de tus sesiones reales. No hay números estimados ni estadísticas inventadas.
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-white p-1 shadow-card">
          {(['7d', '30d', '90d'] as Rango[]).map((r) => (
            <button
              key={r}
              onClick={() => setRango(r)}
              className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide transition ${rango === r ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
            >
              {r === '7d' ? 'Semana' : r === '30d' ? 'Mes' : '90 días'}
            </button>
          ))}
        </div>
      </header>

      {sinDatos ? (
        <Empty
          titulo="Todavía no hay datos"
          detalle="Cuando completes tu primera sesión de estudio vas a ver acá tu evolución, precisión y temas a reforzar."
          icono={<BarChart3 size={22} />}
          accion={<Button onClick={() => navigate('/juegos')}>Empezar a estudiar</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[
              { l: 'XP total', v: fmt(perfil?.xp ?? 0), sub: `Nivel ${nivel?.nivel ?? 1}`, icono: <Zap size={15} />, tono: 'bg-grape-tint text-grape' },
              { l: 'Monedas', v: fmt(perfil?.monedas ?? 0), sub: 'Ganadas estudiando', icono: <Coins size={15} />, tono: 'bg-sun-tint text-sun-deep' },
              { l: 'Racha', v: `${perfil?.rachaActual ?? 0} d`, sub: `Récord ${perfil?.mejorRacha ?? 0} d`, icono: <Flame size={15} />, tono: 'bg-coral-tint text-coral' },
              { l: 'Precisión', v: `${precision}%`, sub: `${fmt(totalIntentos)} respuestas`, icono: <Target size={15} />, tono: 'bg-grass-tint text-grass' },
            ].map((s) => (
              <Card key={s.l} className="p-3.5">
                <span className={`grid h-8 w-8 place-items-center rounded-xl ${s.tono}`}>{s.icono}</span>
                <p className="mt-2 text-[21px] font-black leading-none text-ink">{s.v}</p>
                <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-muted">{s.l}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-stone">{s.sub}</p>
              </Card>
            ))}
          </div>

          {/* Evolución */}
          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Eyebrow color="text-grape">Evolución</Eyebrow>
                <p className="text-[12px] font-semibold text-muted">XP y respuestas por día</p>
              </div>
              <div className="flex items-center gap-3 text-[10.5px] font-bold">
                <span className="flex items-center gap-1 text-grape"><span className="h-2 w-2 rounded-full bg-grape" /> XP</span>
                <span className="flex items-center gap-1 text-grass"><span className="h-2 w-2 rounded-full bg-grass" /> Correctas</span>
                <span className="flex items-center gap-1 text-coral"><span className="h-2 w-2 rounded-full bg-coral" /> Incorrectas</span>
              </div>
            </div>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serie} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gXp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7961d8" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#7961d8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dc" vertical={false} />
                  <XAxis dataKey="etiqueta" tick={{ fontSize: 10, fill: '#aeb7c4' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={14} />
                  <YAxis tick={{ fontSize: 10, fill: '#aeb7c4' }} axisLine={false} tickLine={false} width={38} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e8e5dc', fontSize: 11, fontWeight: 600 }}
                    labelStyle={{ fontSize: 10, color: '#718096', fontWeight: 800, textTransform: 'uppercase' }}
                  />
                  <Area type="monotone" dataKey="xp" name="XP" stroke="#7961d8" strokeWidth={2} fill="url(#gXp)" />
                  <Line type="monotone" dataKey="correctas" name="Correctas" stroke="#23885c" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="incorrectas" name="Incorrectas" stroke="#f17d78" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            {/* Preparación */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <Eyebrow color="text-grass">Preparación para el examen</Eyebrow>
                {preparacion && <Chip tono={ETIQUETA_NIVEL[preparacion.nivel].tono}>{ETIQUETA_NIVEL[preparacion.nivel].texto}</Chip>}
              </div>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-[42px] font-black leading-none tracking-tight text-ink">{preparacion?.puntaje ?? 0}<span className="text-[18px] text-muted">%</span></p>
                <div className="pb-1">
                  <p className="text-[11px] font-extrabold text-ink-soft">
                    {(preparacion?.puntaje ?? 0) >= 80 ? 'Listo para rendir' : (preparacion?.puntaje ?? 0) >= 55 ? 'Vas encaminada' : 'Falta consolidar'}
                  </p>
                  <p className="text-[10.5px] font-semibold text-muted">Basado en tu desempeño real, no en el recorrido</p>
                </div>
              </div>
              <Progress value={preparacion?.puntaje ?? 0} tono={preparacion ? ETIQUETA_NIVEL[preparacion.nivel].barra : 'bg-stone'} alto="h-2.5" className="mt-2.5" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { l: 'Cobertura', v: preparacion?.cobertura ?? 0 },
                  { l: 'Precisión', v: preparacion?.precision ?? 0 },
                  { l: 'Dominio medio', v: preparacion?.dominio ?? 0 },
                  { l: 'Retención', v: preparacion?.retencion ?? 0 },
                ].map((x) => (
                  <div key={x.l} className="rounded-xl bg-cream px-2.5 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted">{x.l}</span>
                      <span className="text-[11px] font-black text-ink">{x.v}%</span>
                    </div>
                    <Progress value={x.v} tono="bg-ink" alto="h-1" className="mt-1" />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[10.5px] font-bold text-muted">
                <span className="rounded-full bg-cream px-2 py-0.5">{preparacion?.escritas ?? 0} respuestas escritas</span>
                <span className="rounded-full bg-cream px-2 py-0.5">{preparacion?.examenes ?? 0} simulacros</span>
                <span className="rounded-full bg-cream px-2 py-0.5">{preparacion?.aplicacion ?? 0}% aplicación</span>
              </div>
            </Card>

            {/* Dimensiones */}
            <Card className="p-4">
              <Eyebrow color="text-sky">Cómo aprendés</Eyebrow>
              <p className="text-[11.5px] font-semibold text-muted">Dominio por tipo de exigencia cognitiva</p>
              <div className="mt-1 h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={dimensiones} outerRadius="72%">
                    <PolarGrid stroke="#e8e5dc" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: '#718096', fontWeight: 700 }} />
                    <Radar dataKey="valor" stroke="#56b8d9" fill="#56b8d9" fillOpacity={0.35} strokeWidth={2} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e8e5dc', fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {/* Por subtema */}
            <Card className="p-4">
              <Eyebrow color="text-grape">Rendimiento por subtema</Eyebrow>
              <div className="mt-2.5 space-y-2.5">
                {porSubtema.length === 0 && <p className="text-[11.5px] font-semibold text-muted">Sin subtemas con tarjetas todavía.</p>}
                {porSubtema.map((s) => (
                  <div key={s.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[11.5px] font-extrabold text-ink">{s.nombre}</p>
                      <span className="shrink-0 text-[10.5px] font-extrabold text-muted">{s.dominadas}/{s.tarjetas}</span>
                    </div>
                    <Progress value={s.dominio} tono={s.dominio >= 80 ? 'bg-grass' : s.dominio >= 50 ? 'bg-sky' : 'bg-mango'} alto="h-1.5" className="mt-1" />
                  </div>
                ))}
              </div>
            </Card>

            {/* Refuerzo */}
            <Card className="p-4">
              <Eyebrow color="text-coral">Temas a reforzar</Eyebrow>
              {refuerzo.length === 0 ? (
                <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-grass-tint px-3 py-2.5">
                  <Lumi animo="orgulloso" tamano={42} />
                  <p className="text-[11.5px] font-semibold text-grass">Ningún tema está flojo según tus datos actuales.</p>
                </div>
              ) : (
                <div className="mt-2.5 space-y-2">
                  {refuerzo.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/actividad/flashcards?subtema=${r.id}`)}
                      className="flex w-full items-center gap-2 rounded-xl border border-line bg-white px-2.5 py-2 text-left transition hover:border-coral/50"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-coral-tint text-coral"><Brain size={13} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-extrabold text-ink">{r.nombre}</p>
                        <p className="text-[10px] font-semibold text-muted">Dominio {r.dominio}% · precisión {r.precision}%</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-extrabold uppercase text-coral">Repasar</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 rounded-xl bg-cream px-2.5 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-muted">Tiempo total</span>
                  <span className="text-[11.5px] font-black text-ink">{fmtMs(totalMs)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-muted">Sesiones</span>
                  <span className="text-[11.5px] font-black text-ink">{totalSesiones}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-muted">Tarjetas dominadas</span>
                  <span className="text-[11.5px] font-black text-ink">{dominadas} / {tarjetas.length}</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
            <Card className="p-4">
              <Eyebrow color="text-mango">Actividad por día</Eyebrow>
              <div className="mt-2 h-[190px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serie.slice(-14)} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e5dc" vertical={false} />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 9.5, fill: '#aeb7c4' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9.5, fill: '#aeb7c4' }} axisLine={false} tickLine={false} width={34} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e8e5dc', fontSize: 11 }} />
                    <Bar dataKey="tarjetas" name="Tarjetas" fill="#f6c84a" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="minutos" name="Minutos" fill="#7961d8" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <Eyebrow color="text-sky">Tipos de práctica</Eyebrow>
              {porTipo.length === 0 ? (
                <p className="mt-2 text-[11.5px] font-semibold text-muted">Sin sesiones registradas.</p>
              ) : (
                <div className="mt-1 h-[190px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={porTipo} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2}>
                        {porTipo.map((_, i) => <Cell key={i} fill={colores[i % colores.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e8e5dc', fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 9.5, fontWeight: 700, textTransform: 'capitalize' }} iconType="circle" iconSize={6} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <Card className="p-4">
            <Eyebrow color="text-ink">Por materia</Eyebrow>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {porMateria.map((m) => (
                <div key={m.nombre} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                    <p className="truncate text-[11.5px] font-extrabold text-ink">{m.nombre}</p>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-muted"><span>Tarjetas</span><span className="text-ink">{m.tarjetas}</span></div>
                    <div className="flex justify-between text-[10px] font-bold text-muted"><span>Dominadas</span><span className="text-ink">{m.dominadas}</span></div>
                    <div className="flex justify-between text-[10px] font-bold text-muted"><span>Precisión</span><span className="text-ink">{m.precision}%</span></div>
                  </div>
                  <Progress value={m.tarjetas ? (m.dominadas / m.tarjetas) * 100 : 0} tono="bg-grape" alto="h-1" className="mt-1.5" />
                </div>
              ))}
            </div>
          </Card>

          <div className="rounded-2xl bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11.5px] font-semibold text-muted">
                <Clock size={12} className="mr-1 inline" />
                Datos calculados sobre {totalSesiones} sesiones y {tarjetas.length} tarjetas.
              </p>
              <Button variante="secundario" tam="sm" onClick={() => navigate('/perfil')}>
                <TrendingUp size={13} /> Exportar mis datos
              </Button>
            </div>
          </div>
        </>
      )}
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-muted hover:text-ink">
        <ArrowLeft size={14} /> Volver
      </button>
      <Line data={[]} dataKey="x" />
    </div>
  )
}
