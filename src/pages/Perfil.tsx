import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  Coins,
  Database,
  Download,
  FileDown,
  FileUp,
  Flame,
  LogOut,
  Pencil,
  Settings2,
  Shield,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Zap,
} from 'lucide-react'
import { Card, Chip, Eyebrow, Progress } from '../components/ui/Primitives'
import { Button } from '../components/ui/Button'
import { Modal, Confirm } from '../components/ui/Modal'
import { Lumi } from '../components/mascot/Lumi'
import { useConfig, usePerfil, useContexto } from '../hooks/useDatos'
import { useToast } from '../hooks/useToast'
import { db } from '../db/database'
import { CONFIG_DEFAULT, nivelDesdeXp, LOGROS, xpParaNivel } from '../lib/constants'
import { exportarBackup, exportarCSV, exportarPDF, importarBackup } from '../lib/export'
import { fmtFechaTs } from '../lib/format'

export function Perfil() {
  const perfil = usePerfil()
  const config = useConfig()
  const ctx = useContexto()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState(perfil?.nombre ?? '')
  const [objetivo, setObjetivo] = useState(perfil?.objetivoDiarioTarjetas ?? 15)
  const [ajustes, setAjustes] = useState(false)
  const [confirmarReset, setConfirmarReset] = useState(false)
  const [importando, setImportando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const archivoRef = useRef<HTMLInputElement>(null)
  const [menuExport, setMenuExport] = useState(false)

  const nivel = perfil ? nivelDesdeXp(perfil.xp) : undefined
  const logrosHechos = (perfil?.logrosReclamados ?? []).length
  const tarjetas = ctx?.tarjetas.length ?? 0
  const dominadas = useMemo(
    () => (ctx?.progresos ?? []).filter((p) => p.dominio >= 80 && p.repeticiones >= 3 && p.dimensiones.recuperacion > 0).length,
    [ctx],
  )

  const guardarPerfil = async () => {
    if (!perfil) return
    if (nombre.trim().length < 2) {
      toast('El nombre necesita al menos 2 caracteres.', 'error')
      return
    }
    await db.perfil.update('perfil', {
      nombre: nombre.trim(),
      objetivoDiarioTarjetas: objetivo,
      objetivoDiarioXp: objetivo * 4,
    })
    setEditando(false)
    toast('Perfil actualizado.')
  }

  const guardarAjustes = async (parcial: Partial<typeof CONFIG_DEFAULT>) => {
    await db.config.update('config', parcial)
  }

  const hacerBackup = async () => {
    setExportando(true)
    try {
      const total = await exportarBackup()
      toast(`Backup creado con ${total} registros.`)
    } catch {
      toast('No pudimos crear el backup.', 'error')
    } finally {
      setExportando(false)
    }
  }

  if (!perfil || !config) return null

  return (
    <div className="space-y-4">
      <header>
        <Eyebrow>Tu cuenta local</Eyebrow>
        <h1 className="mt-1 text-[24px] font-black leading-tight tracking-tight text-ink sm:text-[28px]">Perfil y ajustes</h1>
        <p className="mt-1 text-[13px] font-semibold text-muted">Todo vive en este dispositivo: sin cuentas, sin servidores, sin contraseñas.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {/* Identidad */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-grape to-grape-deep p-5 text-white">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                  <Lumi animo="feliz" tamano={62} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[20px] font-black leading-tight">{perfil.nombre}</p>
                  <p className="text-[11.5px] font-bold text-white/70">
                    Nivel {nivel?.nivel ?? 1} · {perfil.xp} XP · {perfil.monedas} monedas
                  </p>
                  <div className="mt-2 max-w-[240px]">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(nivel?.progreso ?? 0) * 100}%` }} className="h-full rounded-full bg-sun" />
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-white/60">{nivel?.restante ?? 0} XP para el nivel {(nivel?.nivel ?? 1) + 1}</p>
                  </div>
                </div>
                <button onClick={() => { setNombre(perfil.nombre); setObjetivo(perfil.objetivoDiarioTarjetas); setEditando(true) }} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 text-white hover:bg-white/25" aria-label="Editar perfil">
                  <Pencil size={15} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-line">
              {[
                { l: 'Racha actual', v: `${perfil.rachaActual} d`, icono: <Flame size={13} /> },
                { l: 'Mejor racha', v: `${perfil.mejorRacha} d`, icono: <Trophy size={13} /> },
                { l: 'Logros', v: `${logrosHechos}/${LOGROS.length}`, icono: <Sparkles size={13} /> },
              ].map((s) => (
                <div key={s.l} className="px-3 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted">{s.icono} {s.l}</span>
                  <p className="mt-0.5 text-[15px] font-black text-ink">{s.v}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Objetivo */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <Eyebrow color="text-grass">Objetivo diario</Eyebrow>
              <Chip tono="bg-grass-tint text-grass">{perfil.objetivoDiarioTarjetas} tarjetas</Chip>
            </div>
            <p className="mt-1.5 text-[11.5px] font-semibold text-muted">
              Meta de {perfil.objetivoDiarioXp} XP por día. Un objetivo realista se sostiene mejor que uno ambicioso.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[10, 15, 25, 40].map((n) => (
                <button
                  key={n}
                  onClick={async () => { await db.perfil.update('perfil', { objetivoDiarioTarjetas: n, objetivoDiarioXp: n * 4 }); toast(`Objetivo: ${n} tarjetas por día.`, 'info') }}
                  className={`rounded-full border px-3 py-1 text-[11.5px] font-extrabold transition ${perfil.objetivoDiarioTarjetas === n ? 'border-grass bg-grass text-white' : 'border-line bg-white text-muted hover:border-stone'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Card>

          {/* Ajustes de estudio */}
          <Card className="p-4">
            <button onClick={() => setAjustes((v) => !v)} className="flex w-full items-center justify-between">
              <div className="text-left">
                <Eyebrow color="text-grape">Ajustes de estudio</Eyebrow>
                <p className="text-[11.5px] font-semibold text-muted">Tamaño de sesión, tiempos y preguntas de examen.</p>
              </div>
              <ChevronRight size={16} className={`text-stone transition ${ajustes ? 'rotate-90' : ''}`} />
            </button>

            {ajustes && (
              <div className="mt-3 space-y-3 border-t border-line pt-3">
                <Numero label="Tarjetas por sesión" valor={config.tamanioSesion} min={5} max={50} paso={5} onChange={(v) => guardarAjustes({ tamanioSesion: v })} />
                <Numero label="Repasos máximos por sesión" valor={config.repasosMaximosPorSesion} min={10} max={60} paso={5} onChange={(v) => guardarAjustes({ repasosMaximosPorSesion: v })} />
                <Numero label="Segundos por pregunta (desafío)" valor={config.segundosPorPregunta} min={5} max={60} paso={5} onChange={(v) => guardarAjustes({ segundosPorPregunta: v })} />
                <Numero label="Preguntas de examen" valor={config.preguntasExamen} min={5} max={60} paso={5} onChange={(v) => guardarAjustes({ preguntasExamen: v })} />
                <Numero label="Minutos de examen" valor={config.minutosExamen} min={5} max={90} paso={5} onChange={(v) => guardarAjustes({ minutosExamen: v })} />
                <Numero label="Puntos por acierto (desafío)" valor={config.puntosPorAciertoKahoot} min={50} max={200} paso={10} onChange={(v) => guardarAjustes({ puntosPorAciertoKahoot: v })} />
                <button
                  onClick={() => guardarAjustes(CONFIG_DEFAULT).then(() => toast('Ajustes restaurados.', 'info'))}
                  className="text-[11px] font-extrabold uppercase tracking-wide text-muted hover:text-ink"
                >
                  Restaurar valores por defecto
                </button>
              </div>
            )}
          </Card>

          {/* Datos */}
          <Card className="p-4">
            <Eyebrow color="text-sky">Tus datos</Eyebrow>
            <p className="mt-1 text-[11.5px] font-semibold leading-relaxed text-muted">
              Exportá un respaldo completo, llevá tus tarjetas a Excel o imprimí un PDF para estudiar en papel.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button onClick={hacerBackup} disabled={exportando} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-left transition hover:border-grape/50">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-grape-tint text-grape"><Database size={14} /></span>
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-extrabold text-ink">Backup completo</span>
                  <span className="block text-[10px] font-semibold text-muted">JSON con todo tu progreso</span>
                </span>
              </button>
              <button onClick={() => setMenuExport(true)} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-left transition hover:border-grape/50">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-tint text-sky"><Download size={14} /></span>
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-extrabold text-ink">Exportar tarjetas</span>
                  <span className="block text-[10px] font-semibold text-muted">CSV o PDF imprimible</span>
                </span>
              </button>
              <button onClick={() => archivoRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-left transition hover:border-grass/50">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-grass-tint text-grass"><FileUp size={14} /></span>
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-extrabold text-ink">Importar backup</span>
                  <span className="block text-[10px] font-semibold text-muted">Restaurá desde un archivo</span>
                </span>
              </button>
              <button onClick={() => navigate('/tarjetas')} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-left transition hover:border-mango/50">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mango-tint text-mango"><BookOpen size={14} /></span>
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-extrabold text-ink">Biblioteca</span>
                  <span className="block text-[10px] font-semibold text-muted">{tarjetas} tarjetas guardadas</span>
                </span>
              </button>
            </div>
            <input
              ref={archivoRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setImportando(true)
                try {
                  const { importadas } = await importarBackup(file, 'reemplazar')
                  toast(`Importados ${importadas} registros. Recargando…`)
                  setTimeout(() => window.location.reload(), 900)
                } catch (err) {
                  toast(err instanceof Error ? err.message : 'No pudimos importar el archivo.', 'error')
                } finally {
                  setImportando(false)
                  e.target.value = ''
                }
              }}
            />
            {importando && <p className="mt-2 text-[11px] font-bold text-grape">Importando datos…</p>}
            <p className="mt-2 flex items-start gap-1.5 text-[10px] font-semibold leading-relaxed text-stone">
              <Shield size={11} className="mt-0.5 shrink-0" />
              Ningún dato sale de este dispositivo. Si borrás los datos del navegador, se pierde el progreso: descargá un backup de vez en cuando.
            </p>
          </Card>

          <Card className="p-4">
            <Eyebrow color="text-coral">Zona sensible</Eyebrow>
            <div className="mt-2 space-y-2">
              <button onClick={() => setConfirmarReset(true)} className="flex w-full items-center gap-2 rounded-xl border border-coral/30 bg-coral-tint/40 px-3 py-2.5 text-left">
                <Trash2 size={14} className="shrink-0 text-coral" />
                <span>
                  <span className="block text-[11.5px] font-extrabold text-coral">Borrar todo y empezar de cero</span>
                  <span className="block text-[10px] font-semibold text-coral/70">Elimina materias, tarjetas, progreso y estadísticas.</span>
                </span>
              </button>
              <button onClick={() => navigate('/')} className="flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-left">
                <LogOut size={14} className="shrink-0 text-muted" />
                <span className="text-[11.5px] font-extrabold text-ink-soft">Volver al inicio</span>
              </button>
            </div>
          </Card>
        </div>

        <aside className="space-y-3 self-start">
          <Card className="p-4">
            <Eyebrow>Resumen</Eyebrow>
            <div className="mt-2.5 space-y-2">
              {[
                { l: 'Tarjetas creadas', v: tarjetas, icono: <BookOpen size={13} />, tono: 'text-grape' },
                { l: 'Tarjetas dominadas', v: dominadas, icono: <Target size={13} />, tono: 'text-grass' },
                { l: 'XP acumulada', v: perfil.xp, icono: <Zap size={13} />, tono: 'text-sun-deep' },
                { l: 'Monedas', v: perfil.monedas, icono: <Coins size={13} />, tono: 'text-mango' },
              ].map((x) => (
                <div key={x.l} className="flex items-center justify-between border-b border-line/60 pb-1.5 last:border-0 last:pb-0">
                  <span className={`flex items-center gap-1.5 text-[11px] font-bold text-muted`}>{x.icono} {x.l}</span>
                  <span className="text-[12px] font-black text-ink">{x.v}</span>
                </div>
              ))}
            </div>
            <Progress value={tarjetas ? (dominadas / tarjetas) * 100 : 0} tono="bg-grass" alto="h-1.5" className="mt-2.5" />
            <p className="mt-1 text-[10px] font-semibold text-stone">{tarjetas ? Math.round((dominadas / tarjetas) * 100) : 0}% del material dominado</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <Eyebrow>Logros</Eyebrow>
              <button onClick={() => navigate('/logros')} className="text-[10px] font-extrabold uppercase text-grape hover:underline">Ver todos</button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {LOGROS.slice(0, 8).map((l) => {
                const hecho = (perfil.logrosReclamados ?? []).includes(l.id)
                return (
                  <div key={l.id} className={`grid aspect-square place-items-center rounded-xl ${hecho ? 'bg-sun-tint text-sun-deep' : 'bg-cream text-stone'}`} title={l.titulo}>
                    <Trophy size={15} className={hecho ? '' : 'opacity-40'} />
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-[10px] font-semibold text-stone">{logrosHechos} desbloqueados de {LOGROS.length}</p>
          </Card>

          <Card className="p-4">
            <Eyebrow color="text-sky">Instalar la app</Eyebrow>
            <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-muted">
              En iPhone: compartir → “Agregar a inicio”. En computadora: ícono de instalar en la barra del navegador. Después funciona sin internet.
            </p>
            <p className="mt-2 rounded-lg bg-sky-tint/60 px-2.5 py-1.5 text-[10px] font-bold text-sky">PWA instalable · offline</p>
          </Card>

          <p className="px-1 text-center text-[10px] font-semibold text-stone">
            KNOWLEDGE · v1.0 · datos locales<br />
            Último respaldo: {perfil ? 'desde Ajustes' : '—'}
          </p>
        </aside>
      </div>

      {/* Modal editar perfil */}
      <Modal abierto={editando} titulo="Editar perfil" onCerrar={() => setEditando(false)}>
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="nombre-perfil">Nombre</label>
            <input id="nombre-perfil" className="field" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={24} />
          </div>
          <div>
            <p className="label">Objetivo diario</p>
            <div className="flex gap-1.5">
              {[10, 15, 25, 40].map((n) => (
                <button key={n} onClick={() => setObjetivo(n)} className={`flex-1 rounded-xl border-2 py-2 text-[12px] font-extrabold ${objetivo === n ? 'border-grape bg-grape text-white' : 'border-line text-muted'}`}>
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10.5px] font-semibold text-stone">{objetivo * 4} XP diarios · {objetivo} tarjetas</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variante="secundario" onClick={() => setEditando(false)}>Cancelar</Button>
            <Button onClick={guardarPerfil}><Check size={15} /> Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal exportar tarjetas */}
      <Modal abierto={menuExport} titulo="Exportar tarjetas" onCerrar={() => setMenuExport(false)}>
        <div className="space-y-2">
          <button
            onClick={() => { const tarjetas = ctx?.tarjetas ?? []; exportarCSV(tarjetas, ctx ?? undefined); setMenuExport(false); toast('CSV descargado.') }}
            className="flex w-full items-center gap-2.5 rounded-xl border border-line p-3 text-left hover:border-grape/50"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-grass-tint text-grass"><FileDown size={15} /></span>
            <span>
              <span className="block text-[12px] font-extrabold text-ink">CSV para Excel / Sheets</span>
              <span className="block text-[10.5px] font-semibold text-muted">Pregunta, respuesta, explicación y fuente</span>
            </span>
          </button>
          <button
            onClick={async () => {
              try {
                await exportarPDF(ctx?.tarjetas ?? [], ctx ?? undefined, { conRespuesta: true, titulo: 'Tarjetas de estudio' })
                setMenuExport(false)
                toast('Se abrió la vista de impresión.', 'info')
              } catch (e) {
                toast(e instanceof Error ? e.message : 'No se pudo abrir la impresión.', 'error')
              }
            }}
            className="flex w-full items-center gap-2.5 rounded-xl border border-line p-3 text-left hover:border-grape/50"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-grape-tint text-grape"><FileDown size={15} /></span>
            <span>
              <span className="block text-[12px] font-extrabold text-ink">PDF con respuestas</span>
              <span className="block text-[10.5px] font-semibold text-muted">Para leer y repasar en papel</span>
            </span>
          </button>
          <button
            onClick={async () => {
              try {
                await exportarPDF(ctx?.tarjetas ?? [], ctx ?? undefined, { conRespuesta: false, titulo: 'Tarjetas para completar' })
                setMenuExport(false)
                toast('Se abrió la vista de impresión.', 'info')
              } catch (e) {
                toast(e instanceof Error ? e.message : 'No se pudo abrir la impresión.', 'error')
              }
            }}
            className="flex w-full items-center gap-2.5 rounded-xl border border-line p-3 text-left hover:border-grape/50"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-sun-tint text-sun-deep"><FileDown size={15} /></span>
            <span>
              <span className="block text-[12px] font-extrabold text-ink">PDF para autoevaluarte</span>
              <span className="block text-[10.5px] font-semibold text-muted">Solo preguntas, con espacio para escribir</span>
            </span>
          </button>
          <p className="pt-1 text-[10px] font-semibold leading-relaxed text-stone">
            El PDF se genera desde el diálogo de impresión del navegador: elegí “Guardar como PDF” como destino.
          </p>
        </div>
      </Modal>

      <Confirm
        abierto={confirmarReset}
        titulo="¿Borrar absolutamente todo?"
        detalle="Se eliminan materias, unidades, subtemas, tarjetas, progreso, sesiones y logros. No se puede deshacer."
        textoConfirmar="Borrar todo"
        onCancelar={() => setConfirmarReset(false)}
        onConfirmar={async () => {
          await db.delete()
          window.location.reload()
        }}
      />
    </div>
  )
}

function Numero({ label, valor, min, max, paso, onChange }: { label: string; valor: number; min: number; max: number; paso: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-[11.5px] font-bold text-ink-soft">{label}</label>
        <span className="text-[11.5px] font-black text-grape">{valor}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-grape"
      />
    </div>
  )
}
