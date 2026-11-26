import { useEffect, useRef } from 'react'
import clsx from 'clsx'

/**
 * Editor de texto enriquecido mínimo y sin dependencias externas:
 * contentEditable + document.execCommand. Guarda HTML simple
 * (strong, em, u, h3, ul, ol, li, p, br, blockquote, img).
 */
export function RichText({
  value,
  onChange,
  placeholder,
  minHeight = 120,
  className,
  compacto = false,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
  compacto?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const ultimoValor = useRef(value)

  useEffect(() => {
    if (ref.current && value !== ultimoValor.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value
      ultimoValor.current = value
    }
  }, [value])

  useEffect(() => {
    if (ref.current && !ref.current.innerHTML && value) {
      ref.current.innerHTML = value
    }
  }, [value])

  const exec = (comando: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(comando, false, arg)
    if (ref.current) {
      ultimoValor.current = ref.current.innerHTML
      onChange(ref.current.innerHTML)
    }
  }

  const insertarImagen = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      if (file.size > 2_500_000) {
        alert('La imagen no puede superar 2,5 MB.')
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        exec('insertImage', String(reader.result))
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const BOTONES = [
    { label: 'B', titulo: 'Negrita', clase: 'font-black', accion: () => exec('bold') },
    { label: 'I', titulo: 'Cursiva', clase: 'italic', accion: () => exec('italic') },
    { label: 'U', titulo: 'Subrayado', clase: 'underline', accion: () => exec('underline') },
    { label: 'H', titulo: 'Subtítulo', clase: 'font-extrabold text-[11px]', accion: () => exec('formatBlock', 'h3') },
    { label: '•', titulo: 'Lista', clase: '', accion: () => exec('insertUnorderedList') },
    { label: '1.', titulo: 'Numeración', clase: 'text-[11px]', accion: () => exec('insertOrderedList') },
  ]

  return (
    <div className={clsx('overflow-hidden rounded-xl border border-line bg-white transition focus-within:border-grape', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-cream/60 px-1.5 py-1">
        {BOTONES.map((b) => (
          <button
            key={b.titulo}
            type="button"
            title={b.titulo}
            onMouseDown={(e) => e.preventDefault()}
            onClick={b.accion}
            className={clsx('grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[12.5px] font-bold text-ink-soft hover:bg-white hover:text-ink', b.clase)}
          >
            {b.label}
          </button>
        ))}
        <span className="mx-0.5 h-4 w-px bg-line" />
        <button type="button" title="Insertar imagen" onMouseDown={(e) => e.preventDefault()} onClick={insertarImagen} className="flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] font-bold text-ink-soft hover:bg-white hover:text-ink">
          Imagen
        </button>
        {!compacto && (
          <>
            <span className="mx-0.5 h-4 w-px bg-line" />
            <button type="button" title="Quitar formato" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('removeFormat')} className="grid h-7 place-items-center rounded-md px-1.5 text-[11px] font-bold text-muted hover:bg-white hover:text-ink">
              Limpiar
            </button>
          </>
        )}
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        data-placeholder={placeholder}
        onInput={() => {
          if (!ref.current) return
          ultimoValor.current = ref.current.innerHTML
          onChange(ref.current.innerHTML)
        }}
        onBlur={() => {
          if (!ref.current) return
          ultimoValor.current = ref.current.innerHTML
          onChange(ref.current.innerHTML)
        }}
        onPaste={(e) => {
          e.preventDefault()
          const texto = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, texto)
        }}
        className="rich-content max-h-[420px] overflow-y-auto px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink outline-none"
        style={{ minHeight }}
        suppressContentEditableWarning
      />
    </div>
  )
}
