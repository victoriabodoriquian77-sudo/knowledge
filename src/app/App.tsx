import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { ToastProvider } from '../hooks/useToast'
import { asegurarBase } from '../db/seed'
import { db } from '../db/database'
import { Onboarding } from '../pages/Onboarding'
import { Inicio } from '../pages/Inicio'
import { Aprender } from '../pages/Aprender'
import { UnidadDetalle } from '../pages/UnidadDetalle'
import { SubtemaDetalle } from '../pages/SubtemaDetalle'
import { Juegos } from '../pages/Juegos'
import { Actividad } from '../pages/Actividad'
import { Flashcards } from '../pages/Flashcards'
import { EditorTarjeta } from '../pages/EditorTarjeta'
import { Estadisticas } from '../pages/Estadisticas'
import { Perfil } from '../pages/Perfil'
import { Logros } from '../pages/Logros'
import { Repaso } from '../pages/Repaso'
import { ExamenConfig } from '../pages/ExamenConfig'
import { ResultadoSesion } from '../pages/ResultadoSesion'
import { NoEncontrado } from '../pages/NoEncontrado'
import { Lumi } from '../components/mascot/Lumi'

export function App() {
  const [listo, setListo] = useState(false)
  const [onboarding, setOnboarding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    ;(async () => {
      try {
        await asegurarBase()
        const perfil = await db.perfil.get('perfil')
        if (!activo) return
        setOnboarding(!perfil?.onboardingCompletado)
        setListo(true)
      } catch (e) {
        if (!activo) return
        console.error(e)
        setError(e instanceof Error ? e.message : 'Error desconocido')
        setListo(true)
      }
    })()
    return () => {
      activo = false
    }
  }, [])

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center bg-cream p-6">
        <div className="max-w-md text-center">
          <Lumi animo="sorprendido" tamano={128} className="mx-auto" />
          <h1 className="mt-3 text-[20px] font-black text-ink">No pudimos abrir tus datos</h1>
          <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-muted">
            El almacenamiento local del navegador no está disponible. Suele pasar en ventanas privadas o si bloqueaste los datos del sitio.
          </p>
          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-left text-[11px] font-mono text-coral">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-3d mt-4 h-11 rounded-xl2 bg-grape px-5 text-[13px] font-extrabold text-white">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!listo) {
    return (
      <div className="grid min-h-dvh place-items-center bg-cream">
        <div className="flex flex-col items-center gap-3">
          <Lumi animo="dormido" tamano={120} flotando />
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-muted">Cargando tus datos</p>
        </div>
      </div>
    )
  }

  if (onboarding) return <Onboarding onCompletado={() => setOnboarding(false)} />

  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Inicio />} />
            <Route path="/aprender" element={<Aprender />} />
            <Route path="/aprender/unidad/:unidadId" element={<UnidadDetalle />} />
            <Route path="/aprender/subtema/:subtemaId" element={<SubtemaDetalle />} />
            <Route path="/juegos" element={<Juegos />} />
            <Route path="/juegos/examen" element={<ExamenConfig />} />
            <Route path="/actividad/:tipo" element={<Actividad />} />
            <Route path="/resultado" element={<ResultadoSesion />} />
            <Route path="/tarjetas" element={<Flashcards />} />
            <Route path="/tarjetas/nueva" element={<EditorTarjeta />} />
            <Route path="/tarjetas/:tarjetaId" element={<EditorTarjeta />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/logros" element={<Logros />} />
            <Route path="/repaso" element={<Repaso />} />
            <Route path="*" element={<NoEncontrado />} />
          </Route>
          <Route path="/bienvenida" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
