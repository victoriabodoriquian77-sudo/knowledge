# KNOWLEDGE

Plataforma de estudio activo en español: recorrido tipo Duolingo + juegos tipo Kahoot, con repaso espaciado real y estadísticas que salen únicamente de tus sesiones.

**La biblioteca arranca vacía.** No hay materias, unidades ni subtemas de fábrica: los creás vos con los nombres que quieras. La app trae el recorrido, los juegos y el motor de repaso, no el contenido.

## Qué hace

- **Recorrido secuencial**: Materia → Unidad → Subtema → Actividades → Evaluación. El subtema siguiente se abre al completar el anterior; los anteriores se pueden repetir siempre.
- **13 modos de estudio**: flashcards clásicas, opción múltiple, verdadero o falso, completar espacios, respuesta escrita, examen, desafío tipo Kahoot, relacionar conceptos, ordenar información, detectar errores, casos prácticos, explicárselo a alguien y repaso espaciado.
- **Selección de temas antes de empezar**: por materia, unidad, subtema, dificultad, estado, favoritas y pendientes. Muestra cuántas tarjetas entran antes de arrancar y nunca mezcla materias sin pedirlo.
- **Sistema adaptativo**: cada respuesta actualiza el progreso de esa tarjeta (SM-2 con correcciones propias). Distingue reconocimiento, recuperación activa, comprensión y aplicación. Una tarjeta **nunca** se domina con un solo acierto: exige repeticiones espaciadas y evidencia en más de una dimensión.
- **Evaluación de respuestas escritas sin castigar la redacción**: compara conceptos por raíz de palabra (“vínculo”, “vinculación”, “vinculante” cuentan como la misma idea), acepta sinónimos y muestra qué conceptos faltaron para autoevaluarse.
- **Gamificación con esfuerzo real**: XP, monedas persistentes, niveles con barra, 14 logros y 5 misiones diarias. Las recompensas se acreditan por sesión, con idempotencia: recargar la página no duplica nada.
- **Estadísticas sin inventos**: XP, monedas, racha actual y récord, tiempo estudiado, sesiones, tarjetas estudiadas y dominadas, precisión, evolución diaria, desempeño por materia/unidad/subtema, temas a reforzar y próximos repasos.
- **Preparación para el examen**: mide tarjetas dominadas, precisión, respuestas escritas, simulacros y retención, con diagnóstico por subtema (dominado / buen nivel / necesita refuerzo / pendiente). Completar el recorrido no equivale a estar preparado.
- **Tus datos, tuyos**: todo en IndexedDB. Exportar backup JSON completo, importar respaldo, exportar tarjetas a CSV y a PDF imprimible.
- **Funciona sin conexión** después de la primera carga, y se instala como app en iPhone y escritorio.

## Cómo correrlo

```bash
npm install
npm run dev
```

Para compilar y previsualizar la versión de producción:

```bash
npm run build
npm run preview
```

## Verificación

```bash
npx tsc --noEmit     # tipos
npm test             # 29 pruebas del motor
npm run build        # build de producción + service worker
```

Las pruebas cubren el motor de repaso espaciado, el desbloqueo secuencial, la evaluación de respuestas abiertas y el indicador de preparación.

Verificado además de punta a punta en navegador real: las 13 modalidades se completan sin errores de consola, el récord de Kahoot persiste, recargar no duplica XP ni monedas, el respaldo JSON se restaura y la app funciona sin conexión en todas las rutas (iPhone 14, iPhone SE, iPad y escritorio, sin desborde horizontal).

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · Dexie (IndexedDB) · Recharts · Framer Motion · Lucide · vite-plugin-pwa.

Sin backend, sin login, sin sonido. Todo el feedback es visual. La mascota es **Lumi**, original.
