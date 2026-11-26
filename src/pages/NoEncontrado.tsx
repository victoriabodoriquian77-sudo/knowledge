import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Lumi } from '../components/mascot/Lumi'

export function NoEncontrado() {
  const navigate = useNavigate()
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md text-center">
        <Lumi animo="sorprendido" tamano={148} className="mx-auto" />
        <p className="mt-3 text-[11px] font-extrabold uppercase tracking-[0.15em] text-grape">Error 404</p>
        <h1 className="mt-1 text-[26px] font-black leading-tight tracking-tight text-ink">Esta página no existe</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] font-semibold leading-relaxed text-muted">
          Lumi buscó por todos lados y no la encontró. Puede que el enlace esté mal escrito o que el contenido se haya movido.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variante="secundario" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Volver</Button>
          <Button onClick={() => navigate('/')}><Home size={15} /> Ir al inicio</Button>
        </div>
      </div>
    </div>
  )
}
