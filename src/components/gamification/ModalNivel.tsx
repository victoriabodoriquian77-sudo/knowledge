import { Modal } from '../ui/Modal'
import { Lumi } from '../mascot/Lumi'
import { Button } from '../ui/Button'
import { Progress } from '../ui/Primitives'

export function ModalNivel({
  abierto,
  nivel,
  onCerrar,
}: {
  abierto: boolean
  nivel: { nivel: number; xpNivel: number; xpSiguiente: number; progreso: number }
  onCerrar: () => void
}) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`¡Llegaste al nivel ${nivel.nivel}!`} ancho="max-w-md">
      <div className="flex flex-col items-center pb-1 text-center">
        <Lumi animo="celebrando" tamano={168} />
        <p className="mt-1 text-[14px] font-bold leading-relaxed text-ink-soft">
          Cada repaso que hacés construye memoria de verdad. Lumi está orgullosa de tu constancia.
        </p>
        <div className="mt-4 w-full">
          <div className="mb-1.5 flex justify-between text-[11.5px] font-extrabold text-muted">
            <span>Nivel {nivel.nivel}</span>
            <span>{nivel.xpNivel} / {nivel.xpSiguiente} XP</span>
          </div>
          <Progress value={nivel.progreso * 100} tono="bg-grape" />
        </div>
        <Button className="mt-5" variante="primario" bloque onClick={onCerrar}>
          Seguir aprendiendo
        </Button>
      </div>
    </Modal>
  )
}
