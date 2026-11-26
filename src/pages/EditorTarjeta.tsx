import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, ImagePlus, Save, Sparkles, Trash2, X } from 'lucide-react'
import { db, uid } from '../db/database'
import { Button } from '../components/ui/Button'
import { Card, Chip, Eyebrow } from '../components/ui/Primitives'
import { RichText } from '../components/editor/RichText'
import { useContexto } from '../hooks/useDatos'
import { useToast } from '../hooks/useToast'
import { Lumi } from '../components/mascot/Lumi'
import type { Dificultad, Tarjeta } from '../types/models'
import { evaluarLogros } from '../lib/gamification'
import { Confirm } from '../components/ui/Modal'

const DIFICULTADES: { v: Dificultad; t: string; tono: string }[] = [
  { v: 'facil', t: 'Fácil', tono: 'bg-grass-tint text-grass' },
  { v: 'media', t: 'Media', tono: 'bg-sun-tint text-sun-deep' },
  { v: 'dificil', t: 'Difícil', tono: 'bg-coral-tint text-coral' },
]

export function EditorTarjeta() {
  const { tarjetaId } = useParams<{ tarjetaId: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const ctx = useContexto()

  const [cargando, setCargando] = useState(!!tarjetaId)
  const [guardando, setGuardando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    materiaId: params.get('materia') ?? '',
    unidadId: params.get('unidad') ?? '',
    subtemaId: params.get('subtema') ?? '',
    pregunta: '',
    respuesta: '',
    explicacion: '',
    ejemplo: '',
    claves: '',
    capitulo: '',
    pagina: '',
    dificultad: 'media' as Dificultad,
    imagen: '',
    favorita: false,
  })

  useEffect(() => {
    if (!tarjetaId) return
    let activo = true
    ;(async () => {
      const t = await db.tarjetas.get(tarjetaId)
      if (!activo) return
      if (t) {
        setForm({
          materiaId: t.materiaId,
          unidadId: t.unidadId,
          subtemaId: t.subtemaId,
          pregunta: t.pregunta,
          respuesta: t.respuesta,
          explicacion: t.explicacion,
          ejemplo: t.ejemplo,
          claves: t.palabrasClave.join(', '),
          capitulo: t.capitulo,
          pagina: t.pagina,
          dificultad: t.dificultad,
          imagen: t.imagen ?? '',
          favorita: t.favorita,
        })
      }
      setCargando(false)
    })()
    return () => {
      activo = false
    }
  }, [tarjetaId])

  useEffect(() => {
    if (tarjetaId) return
    if (!form.materiaId && ctx?.materias.length) {
      const primera = ctx.materias[0]
      const unidad = ctx.unidades.find((u) => u.materiaId === primera.id)
      const subtema = unidad ? ctx.subtemas.find((s) => s.unidadId === unidad.id) : undefined
      setForm((f) => ({ ...f, materiaId: primera.id, unidadId: unidad?.id ?? '', subtemaId: subtema?.id ?? '' }))
    }
  }, [ctx, form.materiaId, tarjetaId])

  const unidades = useMemo(
    () => (ctx?.unidades ?? []).filter((u) => u.materiaId === form.materiaId).sort((a, b) => a.orden - b.orden),
    [ctx, form.materiaId],
  )
  const subtemas = useMemo(
    () => (ctx?.subtemas ?? []).filter((s) => s.unidadId === form.unidadId).sort((a, b) => a.orden - b.orden),
    [ctx, form.unidadId],
  )

  const validar = () => {
    const e: Record<string, string> = {}
    if (!form.materiaId) e.materiaId = 'Elegí una materia'
    if (!form.unidadId) e.unidadId = 'Elegí una unidad'
    if (!form.subtemaId) e.subtemaId = 'Elegí un subtema'
    const pregunta = form.pregunta.replace(/<[^>]+>/g, '').trim()
    const respuesta = form.respuesta.replace(/<[^>]+>/g, '').trim()
    if (pregunta.length < 5) e.pregunta = 'La pregunta necesita al menos 5 caracteres'
    if (respuesta.length < 3) e.respuesta = 'La respuesta no puede estar vacía'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const guardar = async (seguirCargando = false) => {
    if (!validar()) {
      toast('Revisá los campos marcados.', 'error')
      return
    }
    setGuardando(true)
    try {
      const datos: Omit<Tarjeta, 'id' | 'creadaEn' | 'actualizadaEn'> = {
        materiaId: form.materiaId,
        unidadId: form.unidadId,
        subtemaId: form.subtemaId,
        pregunta: form.pregunta.trim(),
        respuesta: form.respuesta.trim(),
        explicacion: form.explicacion.trim(),
        ejemplo: form.ejemplo.trim(),
        palabrasClave: form.claves
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        capitulo: form.capitulo.trim(),
        pagina: form.pagina.trim(),
        dificultad: form.dificultad,
        imagen: form.imagen || undefined,
        favorita: form.favorita,
      }
      if (tarjetaId) {
        await db.tarjetas.update(tarjetaId, { ...datos, actualizadaEn: Date.now() })
        toast('Tarjeta actualizada.')
        navigate(-1)
      } else {
        const nueva: Tarjeta = { ...datos, id: uid('tar_'), creadaEn: Date.now(), actualizadaEn: Date.now() }
        await db.tarjetas.add(nueva)
        await evaluarLogros()
        toast('Tarjeta creada.')
        if (seguirCargando) {
          setForm((f) => ({ ...f, pregunta: '', respuesta: '', explicacion: '', ejemplo: '', claves: '', capitulo: '', pagina: '', imagen: '' }))
          setErrores({})
          document.getElementById('pregunta-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
          navigate(`/aprender/subtema/${form.subtemaId}`)
        }
      }
    } catch {
      toast('No pudimos guardar la tarjeta.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Lumi animo="dormido" tamano={80} flotando />
      </div>
    )
  }

  if (!ctx) return null

  if (!ctx.materias.length) {
    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <Lumi animo="pensativo" tamano={92} className="mx-auto" />
        <p className="mt-2 text-[15px] font-extrabold text-ink">Primero creá una materia</p>
        <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-muted">
          Las tarjetas necesitan vivir dentro de una materia, una unidad y un subtema.
        </p>
        <Button className="mt-4" onClick={() => navigate('/aprender')}>Ir a Aprender</Button>
      </Card>
    )
  }

  const sinEstructura = !unidades.length || !subtemas.length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-muted hover:text-ink">
          <ArrowLeft size={14} /> Volver
        </button>
        <div className="flex items-center gap-2">
          {tarjetaId && (
            <>
              <Button variante="secundario" tam="sm" onClick={async () => {
                if (!tarjetaId) return
                const original = await db.tarjetas.get(tarjetaId)
                if (!original) return
                await db.tarjetas.add({ ...original, id: uid('tar_'), pregunta: `${original.pregunta} (copia)`, creadaEn: Date.now(), actualizadaEn: Date.now() })
                toast('Tarjeta duplicada.')
              }}>
                <Copy size={14} /> Duplicar
              </Button>
              <Button variante="peligro" tam="sm" onClick={() => setConfirmar(true)}><Trash2 size={14} /></Button>
            </>
          )}
          <Button onClick={() => guardar(false)} cargando={guardando}>
            <Save size={15} /> {tarjetaId ? 'Guardar cambios' : 'Guardar tarjeta'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Editor principal */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <Eyebrow>Contenido de la tarjeta</Eyebrow>
              <Chip tono="bg-grass-tint text-grass"><Check size={11} /> Guardado local</Chip>
            </div>

            <div id="pregunta-anchor">
              <label className="label" htmlFor="pregunta">Pregunta</label>
              <RichText
                value={form.pregunta}
                onChange={(v) => { setForm((f) => ({ ...f, pregunta: v })); setErrores((e) => ({ ...e, pregunta: '' })) }}
                placeholder="¿Qué querés recordar? Escribí la pregunta como te la harías en el examen…"
                minHeight={92}
              />
              {errores.pregunta && <p className="mt-1 text-[11px] font-bold text-coral">{errores.pregunta}</p>}
              <p className="mt-1 text-right text-[10.5px] font-semibold text-stone">{form.pregunta.replace(/<[^>]+>/g, '').length} caracteres</p>
            </div>

            <div className="mt-3">
              <label className="label" htmlFor="respuesta">Respuesta</label>
              <RichText
                value={form.respuesta}
                onChange={(v) => { setForm((f) => ({ ...f, respuesta: v })); setErrores((e) => ({ ...e, respuesta: '' })) }}
                placeholder="Desarrollá la respuesta con el nivel de detalle que necesites: definiciones, fundamentos y relaciones entre conceptos…"
                minHeight={150}
              />
              {errores.respuesta && <p className="mt-1 text-[11px] font-bold text-coral">{errores.respuesta}</p>}
              <p className="mt-1 text-right text-[10.5px] font-semibold text-stone">{form.respuesta.replace(/<[^>]+>/g, '').length} caracteres</p>
            </div>

            <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-cream px-3 py-2 text-[11px] font-semibold leading-snug text-muted">
              <Sparkles size={13} className="mt-0.5 shrink-0 text-grape" />
              Formato enriquecido: negrita, cursiva, subtítulos, listas, numeración e imágenes. El contenido no se recorta ni se modifica automáticamente.
            </p>
          </Card>

          <Card className="p-4 sm:p-5">
            <Eyebrow color="text-grass">Completá el contexto</Eyebrow>
            <p className="mb-3 mt-0.5 text-[11.5px] font-semibold text-muted">Opcional, pero mejora muchísimo el repaso y los juegos.</p>

            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="explicacion">Explicación ampliada</label>
                <RichText value={form.explicacion} onChange={(v) => setForm((f) => ({ ...f, explicacion: v }))} placeholder="Por qué es así, cómo se relaciona con otros conceptos, qué suele confundirse…" minHeight={90} compacto />
              </div>
              <div>
                <label className="label" htmlFor="ejemplo">Ejemplo práctico</label>
                <RichText value={form.ejemplo} onChange={(v) => setForm((f) => ({ ...f, ejemplo: v }))} placeholder="Una situación concreta donde se aplique el concepto" minHeight={76} compacto />
              </div>
              <div>
                <label className="label" htmlFor="claves">Palabras clave</label>
                <input
                  id="claves"
                  className="field"
                  value={form.claves}
                  onChange={(e) => setForm((f) => ({ ...f, claves: e.target.value }))}
                  placeholder="Separadas por coma: relación de consumo, proveedor, vulnerabilidad"
                />
                <p className="mt-1 text-[10.5px] font-semibold text-stone">
                  Se usan para evaluar respuestas escritas, completar espacios y explicar con tus palabras.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="capitulo">Capítulo del libro</label>
                  <input id="capitulo" className="field" value={form.capitulo} onChange={(e) => setForm((f) => ({ ...f, capitulo: e.target.value }))} placeholder="Ej.: Cap. 3" />
                </div>
                <div>
                  <label className="label" htmlFor="pagina">Página de referencia</label>
                  <input id="pagina" className="field" value={form.pagina} onChange={(e) => setForm((f) => ({ ...f, pagina: e.target.value }))} placeholder="Ej.: 47-52" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Panel de contexto */}
        <div className="space-y-4">
          <Card className="p-4">
            <Eyebrow>Organización</Eyebrow>
            <div className="mt-2.5 space-y-2.5">
              <div>
                <label className="label" htmlFor="materia">Materia</label>
                <select
                  id="materia"
                  className="field"
                  value={form.materiaId}
                  onChange={(e) => {
                    const materiaId = e.target.value
                    const u = ctx.unidades.find((x) => x.materiaId === materiaId)
                    const s = u ? ctx.subtemas.find((x) => x.unidadId === u.id) : undefined
                    setForm((f) => ({ ...f, materiaId, unidadId: u?.id ?? '', subtemaId: s?.id ?? '' }))
                  }}
                >
                  {ctx.materias.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
                {errores.materiaId && <p className="mt-1 text-[11px] font-bold text-coral">{errores.materiaId}</p>}
              </div>
              <div>
                <label className="label" htmlFor="unidad">Unidad</label>
                <select
                  id="unidad"
                  className="field"
                  value={form.unidadId}
                  onChange={(e) => {
                    const unidadId = e.target.value
                    const s = ctx.subtemas.find((x) => x.unidadId === unidadId)
                    setForm((f) => ({ ...f, unidadId, subtemaId: s?.id ?? '' }))
                  }}
                >
                  <option value="">Elegir unidad</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
                {errores.unidadId && <p className="mt-1 text-[11px] font-bold text-coral">{errores.unidadId}</p>}
              </div>
              <div>
                <label className="label" htmlFor="subtema">Subtema</label>
                <select id="subtema" className="field" value={form.subtemaId} onChange={(e) => setForm((f) => ({ ...f, subtemaId: e.target.value }))}>
                  <option value="">Elegir subtema</option>
                  {subtemas.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                {errores.subtemaId && <p className="mt-1 text-[11px] font-bold text-coral">{errores.subtemaId}</p>}
              </div>
              {sinEstructura && (
                <p className="rounded-lg bg-sun-tint px-2.5 py-2 text-[11px] font-semibold leading-snug text-ink-soft">
                  Falta estructura: creá al menos una unidad y un subtema en esta materia.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <Eyebrow color="text-mango">Dificultad y estado</Eyebrow>
            <div className="mt-2.5 flex gap-1.5">
              {DIFICULTADES.map((d) => (
                <button
                  key={d.v}
                  onClick={() => setForm((f) => ({ ...f, dificultad: d.v }))}
                  className={`flex-1 rounded-xl border-2 px-2 py-2 text-[11.5px] font-extrabold transition ${form.dificultad === d.v ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:border-stone'}`}
                >
                  {d.t}
                </button>
              ))}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl bg-cream px-3 py-2">
              <input type="checkbox" checked={form.favorita} onChange={(e) => setForm((f) => ({ ...f, favorita: e.target.checked }))} className="h-4 w-4 accent-sun-deep" />
              <span className="text-[11.5px] font-extrabold text-ink-soft">Marcar como favorita</span>
            </label>

            <div className="mt-3">
              <p className="label">Imagen adjunta</p>
              {form.imagen ? (
                <div className="relative overflow-hidden rounded-xl border border-line">
                  <img src={form.imagen} alt="Imagen de la tarjeta" className="max-h-40 w-full object-contain" />
                  <button onClick={() => setForm((f) => ({ ...f, imagen: '' }))} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/70 text-white" aria-label="Quitar imagen">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line px-3 py-4 text-center transition hover:border-grape/50">
                  <ImagePlus size={18} className="text-stone" />
                  <span className="text-[11px] font-bold text-muted">Subir imagen (máx. 2,5 MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 2_500_000) {
                        toast('La imagen supera 2,5 MB.', 'error')
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = () => setForm((f) => ({ ...f, imagen: String(reader.result) }))
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
              )}
            </div>
          </Card>

          {!tarjetaId && (
            <Button variante="secundario" bloque onClick={() => guardar(true)} cargando={guardando}>
              <Save size={15} /> Guardar y crear otra
            </Button>
          )}
        </div>
      </div>

      <Confirm
        abierto={confirmar}
        titulo="¿Eliminar esta tarjeta?"
        detalle="Se borra también su historial de repaso. Esta acción no se puede deshacer."
        onCancelar={() => setConfirmar(false)}
        onConfirmar={async () => {
          if (!tarjetaId) return
          await db.tarjetas.delete(tarjetaId)
          await db.progreso.delete(tarjetaId)
          setConfirmar(false)
          toast('Tarjeta eliminada.')
          navigate(-1)
        }}
      />
    </div>
  )
}
