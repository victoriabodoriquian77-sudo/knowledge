import clsx from 'clsx'
import type { ReactNode } from 'react'

export function Card({ children, className, as: As = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  return <As className={clsx('card', className)}>{children}</As>
}

export function SectionTitle({ children, accion, className }: { children: ReactNode; accion?: ReactNode; className?: string }) {
  return (
    <div className={clsx('mb-3 flex items-end justify-between gap-3', className)}>
      <h2 className="text-[15px] font-extrabold tracking-tight text-ink">{children}</h2>
      {accion}
    </div>
  )
}

export function Eyebrow({ children, color = 'text-grape' }: { children: ReactNode; color?: string }) {
  return <p className={clsx('text-[10.5px] font-extrabold uppercase tracking-[0.14em]', color)}>{children}</p>
}

export function Progress({ value, className, tono = 'bg-grass-bright', alto = 'h-2' }: { value: number; className?: string; tono?: string; alto?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={clsx('w-full overflow-hidden rounded-full bg-line/80', alto, className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={clsx('h-full rounded-full transition-[width] duration-500', tono)} style={{ width: `${v}%` }} />
    </div>
  )
}

export function Chip({ children, tono = 'bg-grape-tint text-grape', className }: { children: ReactNode; tono?: string; className?: string }) {
  return <span className={clsx('chip', tono, className)}>{children}</span>
}

export function Empty({ titulo, detalle, accion, icono }: { titulo: string; detalle?: string; accion?: ReactNode; icono?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border-2 border-dashed border-line bg-white/60 px-6 py-12 text-center">
      {icono && <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-cream text-stone">{icono}</div>}
      <p className="text-[15px] font-extrabold text-ink">{titulo}</p>
      {detalle && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{detalle}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  )
}

export function Stat({ valor, etiqueta, tono, icono }: { valor: ReactNode; etiqueta: string; tono?: string; icono?: ReactNode }) {
  return (
    <div className="rounded-xl2 bg-white px-4 py-3">
      <div className={clsx('flex items-center gap-1.5', tono)}>
        {icono}
        <p className="text-[22px] font-extrabold leading-none tracking-tight text-ink">{valor}</p>
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-muted">{etiqueta}</p>
    </div>
  )
}
