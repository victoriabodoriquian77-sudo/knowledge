/**
 * Modelos de Gemini que usa la app, en orden de preferencia.
 *
 * El primero es el más rápido y el que mejor responde hoy: `flash-lite` procesa
 * un PDF de apuntes en pocos segundos. Los siguientes son respaldo: si el
 * primero está saturado o el nombre deja de existir (Google los renombra
 * seguido), se prueba el próximo en vez de mostrarle un error al usuario.
 */
export const MODELOS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-flash-latest'] as const

/** Nombre del modelo preferido, para mostrar en Ajustes. */
export const MODELO = MODELOS[0]

/** Errores en los que tiene sentido probar otro modelo. */
export function convieneReintentar(status: number): boolean {
  // 404 = el modelo ya no existe; 503 = saturación; 429 se maneja aparte.
  return status === 404 || status === 503 || status === 500
}
