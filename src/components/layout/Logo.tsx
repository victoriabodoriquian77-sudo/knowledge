import { Sparkles } from 'lucide-react'

export function Logo({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-sun shadow-card">
        <Sparkles size={19} strokeWidth={2.6} />
      </div>
      {!compacto && (
        <div className="leading-none">
          <p className="text-[15px] font-black tracking-[0.02em] text-ink">KNOWLEDGE</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Aprender se siente bien</p>
        </div>
      )}
    </div>
  )
}
