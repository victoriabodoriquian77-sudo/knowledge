import { motion } from 'framer-motion'
import clsx from 'clsx'

export type AnimoLumi =
  | 'feliz'
  | 'celebrando'
  | 'animando'
  | 'pensativo'
  | 'orgulloso'
  | 'dormido'
  | 'sorprendido'

const PALETA = {
  cuerpo: '#6a51c4',
  cuerpoOscuro: '#5b45b5',
  panza: '#fff3cc',
  mejilla: '#b83e37',
  pico: '#9a570f',
  ojo: '#24334a',
  brillo: '#ffffff',
}

/**
 * Lumi: mascota original de KNOWLEDGE.
 * Un pequeño guardián del conocimiento con forma de búho-libro, redondo,
 * orejas de hoja y panza de papel. Se dibuja en SVG (nítido en cualquier
 * pantalla) y cambia de expresión según el momento del recorrido.
 */
export function Lumi({
  animo = 'feliz',
  tamano = 120,
  className,
  flotando = false,
}: {
  animo?: AnimoLumi
  tamano?: number
  className?: string
  flotando?: boolean
}) {
  const festeja = animo === 'celebrando' || animo === 'orgulloso'

  return (
    <motion.svg
      viewBox="0 0 200 200"
      width={tamano}
      height={tamano}
      className={clsx(className)}
      role="img"
      aria-label={`Lumi, la mascota de Knowledge, ${animo}`}
      animate={
        flotando
          ? { y: [0, -7, 0] }
          : festeja
            ? { y: [0, -12, 0], rotate: [0, -3, 3, 0] }
            : animo === 'dormido'
              ? { y: [0, 2, 0] }
              : { y: 0 }
      }
      transition={
        festeja
          ? { duration: 1.1, repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut' }
          : flotando
            ? { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 3 }
      }
    >
      <defs>
        <radialGradient id="lumi-brillo" cx="35%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#9d8ae8" />
          <stop offset="100%" stopColor={PALETA.cuerpo} />
        </radialGradient>
        <linearGradient id="lumi-panza" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="100%" stopColor={PALETA.panza} />
        </linearGradient>
      </defs>

      {/* sombra */}
      <ellipse cx="100" cy="178" rx="44" ry="7" fill="#24334a" opacity="0.10" />

      {/* alitas traseras */}
      <motion.path
        d="M52 108 C30 106 22 126 30 142 C38 154 52 150 58 138"
        fill={PALETA.cuerpoOscuro}
        animate={festeja ? { rotate: [-4, -18, -4] } : {}}
        transition={{ duration: 0.8, repeat: festeja ? Infinity : 0, ease: 'easeInOut' }}
        style={{ transformOrigin: '56px 120px' }}
      />
      <motion.path
        d="M148 108 C170 106 178 126 170 142 C162 154 148 150 142 138"
        fill={PALETA.cuerpoOscuro}
        animate={festeja ? { rotate: [4, 18, 4] } : {}}
        transition={{ duration: 0.8, repeat: festeja ? Infinity : 0, ease: 'easeInOut' }}
        style={{ transformOrigin: '144px 120px' }}
      />

      {/* cuerpo */}
      <path
        d="M100 26 C146 26 172 58 172 102 C172 148 142 172 100 172 C58 172 28 148 28 102 C28 58 54 26 100 26 Z"
        fill="url(#lumi-brillo)"
      />

      {/* orejas de hoja */}
      <motion.path
        d="M74 34 C66 18 70 8 80 6 C86 16 86 26 84 36 Z"
        fill={PALETA.cuerpoOscuro}
        animate={animo === 'sorprendido' ? { rotate: -8, y: -3 } : { rotate: 0 }}
        style={{ transformOrigin: '78px 30px' }}
      />
      <motion.path
        d="M126 34 C134 18 130 8 120 6 C114 16 114 26 116 36 Z"
        fill={PALETA.cuerpoOscuro}
        animate={animo === 'sorprendido' ? { rotate: 8, y: -3 } : { rotate: 0 }}
        style={{ transformOrigin: '122px 30px' }}
      />

      {/* panza de papel */}
      <path
        d="M100 74 C126 74 142 92 142 114 C142 142 124 158 100 158 C76 158 58 142 58 114 C58 92 74 74 100 74 Z"
        fill="url(#lumi-panza)"
      />
      <g stroke="#e8d9a8" strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
        <line x1="78" y1="104" x2="122" y2="104" />
        <line x1="78" y1="116" x2="122" y2="116" />
        <line x1="78" y1="128" x2="108" y2="128" />
      </g>

      {/* ojos */}
      <Ojos animo={animo} />

      {/* mejillas */}
      <ellipse cx="63" cy="108" rx="9" ry="6" fill={PALETA.mejilla} opacity={animo === 'dormido' ? 0.35 : 0.55} />
      <ellipse cx="137" cy="108" rx="9" ry="6" fill={PALETA.mejilla} opacity={animo === 'dormido' ? 0.35 : 0.55} />

      {/* pico / boca */}
      <Boca animo={animo} />

      {/* patitas */}
      <ellipse cx="82" cy="170" rx="12" ry="6" fill={PALETA.pico} />
      <ellipse cx="118" cy="170" rx="12" ry="6" fill={PALETA.pico} />

      {/* elementos de estado */}
      {animo === 'celebrando' && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.circle
              key={i}
              cx={36 + i * 32}
              cy={54}
              r={4 + (i % 2) * 2}
              fill={['#f6c84a', '#b83e37', '#1a7291', '#35b779', '#9a570f'][i]}
              animate={{ y: [-6, -26, -6], opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.16 }}
            />
          ))}
        </g>
      )}
      {animo === 'dormido' && (
        <g fill={PALETA.cuerpoOscuro} fontWeight="800" fontFamily="Nunito, sans-serif">
          <motion.text x="150" y="62" fontSize="20" animate={{ y: [62, 44], opacity: [0, 1, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
            z
          </motion.text>
          <motion.text x="166" y="50" fontSize="14" animate={{ y: [50, 32], opacity: [0, 1, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: 0.5 }}>
            z
          </motion.text>
        </g>
      )}
      {animo === 'pensativo' && (
        <motion.circle
          cx="158"
          cy="56"
          r="5"
          fill="#fff"
          stroke={PALETA.cuerpoOscuro}
          strokeWidth="2"
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.svg>
  )
}

function Ojos({ animo }: { animo: AnimoLumi }) {
  if (animo === 'dormido') {
    return (
      <g stroke={PALETA.ojo} strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M66 92 Q82 102 98 92" />
        <path d="M102 92 Q118 102 134 92" />
      </g>
    )
  }
  if (animo === 'celebrando' || animo === 'orgulloso') {
    return (
      <g stroke={PALETA.ojo} strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M64 96 Q80 82 96 96" />
        <path d="M104 96 Q120 82 136 96" />
      </g>
    )
  }
  const grande = animo === 'sorprendido'
  const r = grande ? 12 : 10.5
  return (
    <g>
      <circle cx="81" cy="94" r={r} fill={PALETA.brillo} />
      <circle cx="119" cy="94" r={r} fill={PALETA.brillo} />
      <motion.g
        animate={{ scaleY: [1, 1, 0.12, 1] }}
        transition={{ duration: 5.5, repeat: Infinity, times: [0, 0.9, 0.94, 1] }}
        style={{ transformOrigin: '100px 94px' }}
      >
        <circle cx={animo === 'pensativo' ? 84 : 81} cy="94" r={grande ? 6.5 : 5.4} fill={PALETA.ojo} />
        <circle cx={animo === 'pensativo' ? 122 : 119} cy="94" r={grande ? 6.5 : 5.4} fill={PALETA.ojo} />
        <circle cx={animo === 'pensativo' ? 86 : 83} cy="91.5" r="1.9" fill="#fff" />
        <circle cx={animo === 'pensativo' ? 124 : 121} cy="91.5" r="1.9" fill="#fff" />
      </motion.g>
    </g>
  )
}

function Boca({ animo }: { animo: AnimoLumi }) {
  if (animo === 'celebrando' || animo === 'orgulloso' || animo === 'feliz') {
    return (
      <path
        d="M92 112 Q100 120 108 112 Q104 124 100 124 Q96 124 92 112 Z"
        fill={PALETA.pico}
        stroke={PALETA.pico}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    )
  }
  if (animo === 'sorprendido') {
    return <ellipse cx="100" cy="117" rx="7" ry="9" fill={PALETA.pico} />
  }
  if (animo === 'dormido') {
    return <path d="M95 116 Q100 121 105 116" stroke={PALETA.pico} strokeWidth="3" fill="none" strokeLinecap="round" />
  }
  return <path d="M92 116 Q100 113 108 116" stroke={PALETA.pico} strokeWidth="3.4" fill="none" strokeLinecap="round" />
}

/** Burbuja de diálogo de Lumi. */
export function LumiBocadillo({
  texto,
  animo = 'feliz',
  tamano = 96,
  className,
}: {
  texto: string
  animo?: AnimoLumi
  tamano?: number
  className?: string
}) {
  return (
    <div className={clsx('flex items-end gap-3', className)}>
      <Lumi animo={animo} tamano={tamano} className="shrink-0" />
      <div className="relative mb-2 max-w-[320px] rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-2.5 shadow-card">
        <p className="text-[13px] font-semibold leading-snug text-ink-soft">{texto}</p>
      </div>
    </div>
  )
}
