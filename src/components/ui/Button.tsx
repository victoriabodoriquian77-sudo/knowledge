import { forwardRef, type ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'exito' | 'peligro' | 'sol'
type Tam = 'sm' | 'md' | 'lg'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-grape text-white hover:bg-grape-deep',
  secundario: 'bg-white text-ink border-2 border-line hover:border-stone hover:bg-cream/70',
  fantasma: 'bg-transparent text-ink hover:bg-black/5 shadow-none',
  exito: 'bg-grass-bright text-white hover:brightness-95',
  peligro: 'bg-coral text-white hover:brightness-95',
  sol: 'bg-sun text-ink hover:brightness-95',
}

const TAM: Record<Tam, string> = {
  sm: 'h-9 px-3.5 text-[12px]',
  md: 'h-11 px-5 text-[13px]',
  lg: 'h-[54px] px-7 text-[15px]',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tam?: Tam
  bloque?: boolean
  cargando?: boolean
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variante = 'primario', tam = 'md', bloque, cargando, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || cargando}
      className={clsx('btn-3d', VARIANTES[variante], TAM[tam], bloque && 'w-full', className)}
      {...rest}
    >
      {cargando && (
        <span className="mr-1 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
})
