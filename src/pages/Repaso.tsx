import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CalendarClock, Flame, Layers, Play, RefreshCw, Sparkles, TrendingUp } from 'lucide-react'
import { Card, Chip, Eyebrow, Progress } from '../components/ui/Primitives'
import { Button } from '../components/ui/Button'
import { Lumi } from '../components/mascot/Lumi'
import { useContexto } from '../hooks/useDatos'
import { pendienteHoy, estimarRepaso, estaDominada, ETIQUETA_ESTADO_TARJETA } from '../lib/srs'
import { fmtFechaTs } from '../lib/format'
import { FICHA } from '../features/actividades/catalogo'

export function Repaso() {
  const ctx = useContexto()
  const navigate = useNavigate()
  const [verTodas, setVerTodas] = useState(false)

  const progresos = useMemo(() => new Map((ctx?.progresos ?? []).map((p) => [p.tarjetaId, p])), [ctx])
  const tarjetas = ctx?.tarjetas ?? []

  const pendientes = useMemo(
    () => tarjetas.filter((t) => pendienteHoy(progresos.get(t.id))).sort((a, b) => {
      const pa = progresos.get(a.id)
      const pb = progresos.get(b.id)
      const da = pa?.proximoRepaso ?? 0
      const db = pb?.proximoRepaso ?? 0
      if (da !== db) return da - db
      return (pa?.dominio ?? 0) - (pb?.dominio ?? 0)
    }),
    [tarjetas, progresos],
  )

  const dificiles = useMemo(() => tarjetas.filter((t) => progresos.get(t.id)?.dificil), [tarjetas, progresos])
  const dominadas = useMemo(() => tarjetas.filter((t) => estaDominada(progresos.get(t.id))).length, [tarjetas, progresos])

  const proximos7 = useMemo(() => {
    const hoy = Date.now()
    const dias: { fecha: number; cantidad: number }[] = []
    for (let i = 0; i < 7; i++) {
      const desde = hoy + i * 86_400_000
      const hasta = desde + 86_400_000
      const cantidad = tarjetas.filter((t) => {
        const p = progresos.get(t.id)
        return p && p.proximoRepaso >= desde && p.proximoRepaso < hasta
      }).length
      dias.push({ fecha: desde, cantidad })
    }
    return dias
  }, [tarjetas, progresos])

  const lista = verTodas ? [...pendientes, ...dificiles.filter((t) => !pendientes.includes(t))] : pendientes
  const maxDia = Math.max(1, ...proximos7.map((d) => d.cantidad))

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-muted hover:text-ink">
        <ArrowLeft size={14} /> Volver
      </button>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Repaso inteligente</Eyebrow>
          <h1 className="mt-1 text-[24px] font-black leading-tight tracking-tight text-ink sm:text-[28px]">Volvé en el momento justo</h1>
          <p className="mt-1 max-w-xl text-[13px] font-semibold leading-relaxed text-muted">
            El sistema programa cada tarjeta según cuánto te costó. Lo difícil aparece antes; lo que ya dominás, más espaciado.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variante="secundario" onClick={() => setVerTodas((v) => !v)}>
            <RefreshCw size={14} /> {verTodas ? 'Solo pendientes' : 'Incluir difíciles'}
          </Button>
          <Button disabled={tarjetas.length === 0} onClick={() => navigate(`/actividad/repaso?n=${Date.now()}`)}>
            <Play size={15} /> Repasar {pendientes.length}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { l: 'Pendientes hoy', v: pendientes.length, icono: <CalendarClock size={15} />, tono: 'bg-mango-tint text-mango' },
          { l: 'Para reforzar', v: dificiles.length, icono: <Flame size={15} />, tono: 'bg-coral-tint text-coral' },
          { l: 'Dominadas', v: dominadas, icono: <TrendingUp size={15} />, tono: 'bg-grass-tint text-grass' },
          { l: 'Total tarjetas', v: tarjetas.length, icono: <Layers size={15} />, tono: 'bg-grape-tint text-grape' },
        ].map((s) => (
          <Card key={s.l} className="p-3.5">
            <span className={`grid h-8 w-8 place-items-center rounded-xl ${s.tono}`}>{s.icono}</span>
            <p className="mt-2 text-[21px] font-black leading-none text-ink">{s.v}</p>
            <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-muted">{s.l}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {tarjetas.length === 0 ? (
            <Card className="p-6 text-center">
              <Lumi animo="pensativo" tamano={104} className="mx-auto" />
              <p className="mt-2 text-[15px] font-extrabold text-ink">Sin tarjetas todavía</p>
              <p className="mt-1 text-[12.5px] font-semibold text-muted">El repaso necesita material: creá tus primeras tarjetas.</p>
              <Button className="mt-4" onClick={() => navigate('/tarjetas/nueva')}>Crear tarjeta</Button>
            </Card>
          ) : lista.length === 0 ? (
            <Card className="p-6 text-center">
              <Lumi animo="orgulloso" tamano={112} className="mx-auto" />
              <p className="mt-2 text-[15px] font-extrabold text-ink">Estás al día</p>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] font-semibold leading-relaxed text-muted">
                No hay tarjetas vencidas. Podés adelantar repaso con una sesión libre o practicar con juegos.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variante="secundario" onClick={() => setVerTodas(true)}>Ver difíciles</Button>
                <Button onClick={() => navigate('/juegos')}>Ir a juegos</Button>
              </div>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted">
                  {verTodas ? 'Pendientes y difíciles' : 'Programadas para hoy'} · {lista.length}
                </p>
                <Chip tono="bg-grape-tint text-grape">{FICHA('repaso').titulo}</Chip>
              </div>
              <div className="space-y-2">
                {lista.slice(0, 24).map((t, i) => {
                  const p = progresos.get(t.id)
                  const estado = ETIQUETA_ESTADO_TARJETA(p)
                  return (
                    <motion.button
                      key={t.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.25) }}
                      onClick={() => navigate(`/actividad/flashcards?tarjeta=${t.id}`)}
                      className="flex w-full items-start gap-3 rounded-xl2 border border-line bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-card"
                    >
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cream text-[11px] font-black text-muted">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[12.5px] font-extrabold leading-snug text-ink">
                          {t.pregunta.replace(/<[^>]+>/g, '')}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Chip tono={estado.tono}>{estado.texto}</Chip>
                          <span className="text-[10px] font-bold text-stone">{p ? estimarRepaso(p) : 'Sin estudiar'}</span>
                          {p?.ultimoRepaso ? <span className="text-[10px] font-semibold text-stone">· visto {fmtFechaTs(p.ultimoRepaso)}</span> : null}
                        </div>
                      </div>
                      <Play size={14} className="mt-1 shrink-0 text-stone" />
                    </motion.button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <aside className="space-y-3 self-start lg:sticky lg:top-[74px]">
          <Card className="p-4">
            <Eyebrow color="text-sky">Próximos 7 días</Eyebrow>
            <div className="mt-3 flex items-end gap-1.5">
              {proximos7.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-20 w-full items-end">
                    <div
                      className={`w-full rounded-t-md ${i === 0 ? 'bg-grape' : 'bg-grape/30'}`}
                      style={{ height: `${Math.max(6, (d.cantidad / maxDia) * 100)}%` }}
                      title={`${d.cantidad} tarjetas`}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-stone">{['Hoy', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'][new Date(d.fecha).getDay() === new Date().getDay() && i === 0 ? 0 : new Date(d.fecha).getDay()]}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10.5px] font-semibold leading-relaxed text-muted">
              Las barras muestran cuántas tarjetas vencen cada día, según tu historial real.
            </p>
          </Card>

          <Card className="p-4">
            <Eyebrow color="text-grass">Cómo funciona</Eyebrow>
            <ul className="mt-2 space-y-1.5 text-[11.5px] font-semibold leading-relaxed text-muted">
              <li className="flex gap-1.5"><Sparkles size={12} className="mt-0.5 shrink-0 text-grass" /> Si fallás, vuelve en minutos.</li>
              <li className="flex gap-1.5"><Sparkles size={12} className="mt-0.5 shrink-0 text-grass" /> Si acertás seguido, el intervalo se alarga.</li>
              <li className="flex gap-1.5"><Sparkles size={12} className="mt-0.5 shrink-0 text-grass" /> Una sola respuesta correcta no alcanza para considerarla dominada.</li>
            </ul>
          </Card>

          <Card className="p-4">
            <Eyebrow color="text-coral">Progreso de dominio</Eyebrow>
            <Progress value={tarjetas.length ? (dominadas / tarjetas.length) * 100 : 0} tono="bg-grass" alto="h-2" className="mt-2.5" />
            <p className="mt-1.5 text-[11px] font-semibold text-muted">
              {dominadas} de {tarjetas.length} tarjetas dominadas ({tarjetas.length ? Math.round((dominadas / tarjetas.length) * 100) : 0}%).
            </p>
          </Card>
        </aside>
      </div>
    </div>
  )
}
