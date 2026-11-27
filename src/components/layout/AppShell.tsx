import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { Flame, Coins, Zap, Settings2 } from 'lucide-react'
import { Logo } from './Logo'
import { NAV, NAV_MOVIL } from './NavItems'
import { useNivel, usePerfil } from '../../hooks/useDatos'
import { fmt } from '../../lib/format'
import { Lumi } from '../mascot/Lumi'
import { RecompensaHost } from '../gamification/RecompensaHost'

export function AppShell() {
  const perfil = usePerfil()
  const nivel = useNivel()
  const location = useLocation()

  return (
    <div className="min-h-dvh bg-cream">
      <RecompensaHost />

      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[230px] flex-col border-r border-line bg-white/70 px-4 py-5 lg:flex xl:w-[248px]">
        <div className="px-1">
          <Logo />
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Navegación principal">
          {NAV.map(({ ruta, etiqueta, icono: Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              end={ruta === '/'}
              className={({ isActive }) =>
                clsx(
                  'group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[14px] font-extrabold transition',
                  isActive ? 'bg-grape-tint text-grape' : 'text-muted hover:bg-cream hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icono size={19} strokeWidth={isActive ? 2.6 : 2.2} />
                  <span>{etiqueta}</span>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pip"
                      className="absolute right-2.5 h-1.5 w-1.5 rounded-full bg-grape"
                      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="rounded-2xl bg-cream p-3">
          <div className="flex items-center gap-2.5">
            <Lumi animo={nivel && nivel.progreso > 0.7 ? 'animando' : 'feliz'} tamano={46} />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-extrabold text-ink">{perfil?.nombre || 'Estudiante'}</p>
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted">Nivel {nivel?.nivel ?? 1}</p>
            </div>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-grape transition-all duration-500" style={{ width: `${Math.round((nivel?.progreso ?? 0) * 100)}%` }} />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-muted">
            <span className="inline-flex items-center gap-1">
              <Zap size={12} className="text-grape" /> {fmt(perfil?.xp ?? 0)} XP
            </span>
            <NavLink
              to="/perfil"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white hover:text-ink"
              aria-label="Configuración"
            >
              <Settings2 size={13} />
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Barra superior */}
      <header className="sticky top-0 z-20 border-b border-line bg-cream/85 backdrop-blur-md lg:pl-[230px] xl:pl-[248px]">
        <div className="mx-auto flex h-[58px] max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="lg:hidden">
            <Logo compacto />
          </div>
          <p className="hidden text-[12.5px] font-bold text-muted lg:block">
            {NAV.find((n) => (n.ruta === '/' ? location.pathname === '/' : location.pathname.startsWith(n.ruta)))?.etiqueta ?? 'Knowledge'}
          </p>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 shadow-card">
              <Flame size={15} className="text-mango" />
              <span className="text-[12.5px] font-extrabold text-ink">{perfil?.rachaActual ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 shadow-card">
              <Coins size={15} className="text-sun-deep" />
              <span className="text-[12.5px] font-extrabold text-ink">{fmt(perfil?.monedas ?? 0)}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 shadow-card">
              <Zap size={15} className="text-grape" />
              <span className="text-[12.5px] font-extrabold text-ink">{fmt(perfil?.xp ?? 0)}</span>
            </div>
            <NavLink to="/perfil" className="ml-0.5 grid h-10 w-10 place-items-center rounded-full bg-ink text-[12px] font-black text-sun lg:hidden" aria-label="Perfil">
              {(perfil?.nombre || 'E').slice(0, 1).toUpperCase()}
            </NavLink>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 pb-[86px] lg:pb-10 lg:pl-[230px] xl:pl-[248px]">
        <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </div>
      </main>

      {/* Nav inferior móvil */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Navegación principal"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-between px-1.5">
          {NAV_MOVIL.map(({ ruta, corta, icono: Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              end={ruta === '/'}
              className={({ isActive }) =>
                clsx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-extrabold transition', isActive ? 'text-grape' : 'text-stone')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={clsx('grid h-8 w-11 place-items-center rounded-xl transition', isActive && 'bg-grape-tint')}>
                    <Icono size={19} strokeWidth={isActive ? 2.6 : 2.1} />
                  </span>
                  {corta}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
