export const nf = new Intl.NumberFormat('es-AR')
export const fmt = (n: number) => nf.format(Math.round(n))

export const fmtMs = (ms: number): string => {
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export const fmtMsCorto = (ms: number): string => {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export const fmtFecha = (ts: number): string =>
  new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })

export const fmtFechaCorta = (iso: string): string => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
export const diaCorto = (date: Date) => DIAS[date.getDay()]

export const saludo = (): string => {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export const plural = (n: number, singular: string, plural_: string): string =>
  `${nf.format(n)} ${n === 1 ? singular : plural_}`

export const recortar = (s: string, max = 90): string =>
  s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…'

export const minutos = (ms: number) => Math.max(1, Math.round(ms / 60000))

/** Fecha corta a partir de un timestamp. */
export const fmtFechaTs = (ms: number): string => {
  const d = new Date(ms)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`
}
