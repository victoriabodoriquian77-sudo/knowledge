import clsx from 'clsx'

/**
 * Renderiza el HTML enriquecido guardado por el editor.
 * Se sanea dejando solo etiquetas de formato seguras, para evitar
 * inyecciones desde contenido importado.
 */
const PERMITIDAS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'H3', 'P', 'BR', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'IMG', 'SPAN', 'DIV', 'A', 'CODE', 'PRE'])

function sanear(html: string): string {
  if (typeof window === 'undefined') return html
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const raiz = doc.body.firstElementChild
  if (!raiz) return ''
  const recorrer = (nodo: Node) => {
    const hijos = Array.from(nodo.childNodes)
    for (const hijo of hijos) {
      if (hijo.nodeType === Node.ELEMENT_NODE) {
        const el = hijo as HTMLElement
        if (!PERMITIDAS.has(el.tagName)) {
          const texto = doc.createTextNode(el.textContent ?? '')
          el.replaceWith(texto)
          continue
        }
        for (const attr of Array.from(el.attributes)) {
          const nombre = attr.name.toLowerCase()
          const ok = (el.tagName === 'IMG' && (nombre === 'src' || nombre === 'alt' || nombre === 'title')) || (el.tagName === 'A' && nombre === 'href') || nombre === 'class'
          if (!ok) el.removeAttribute(attr.name)
          if ((nombre === 'src' || nombre === 'href') && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name)
        }
        recorrer(el)
      } else if (hijo.nodeType !== Node.TEXT_NODE) {
        hijo.remove()
      }
    }
  }
  recorrer(raiz)
  return raiz.innerHTML
}

export function RichTextRenderer({ html, className }: { html: string; className?: string }) {
  if (!html) return null
  return <div className={clsx('rich-content', className)} dangerouslySetInnerHTML={{ __html: sanear(html) }} />
}
