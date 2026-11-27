/**
 * Guarda la clave de la API de IA en el navegador, cifrada.
 *
 * La app no tiene servidor, así que la clave vive en este dispositivo y nunca
 * viaja a GitHub ni a ningún otro lado: solo se envía al proveedor de IA cuando
 * se le pide procesar un documento o responder una consulta.
 *
 * El cifrado usa AES-GCM con una clave derivada del origen del sitio. No protege
 * de alguien que ya controle este navegador (nada podría), pero evita que la
 * clave quede legible en el almacenamiento y que se copie por accidente en un
 * respaldo o en una captura del inspector.
 */

const ALMACEN = 'knowledge-ia-clave'
const SAL = 'knowledge-ia-v1'

const codificador = new TextEncoder()
const decodificador = new TextDecoder()

function aBase64(bytes: Uint8Array): string {
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario)
}

function deBase64(texto: string): Uint8Array<ArrayBuffer> {
  const binario = atob(texto)
  const bytes = new Uint8Array(new ArrayBuffer(binario.length))
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

/** Clave de cifrado derivada del origen: distinta en cada sitio donde se sirva la app. */
async function claveDeCifrado(): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', codificador.encode(location.origin + SAL), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: codificador.encode(SAL), iterations: 100_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function guardarClave(clave: string): Promise<void> {
  const limpia = clave.trim()
  if (!limpia) return borrarClave()
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)))
  const cifrada = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await claveDeCifrado(),
    codificador.encode(limpia),
  )
  localStorage.setItem(ALMACEN, JSON.stringify({ iv: aBase64(iv), datos: aBase64(new Uint8Array(cifrada)) }))
}

export async function leerClave(): Promise<string | null> {
  const crudo = localStorage.getItem(ALMACEN)
  if (!crudo) return null
  try {
    const { iv, datos } = JSON.parse(crudo) as { iv: string; datos: string }
    const plano = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: deBase64(iv) },
      await claveDeCifrado(),
      deBase64(datos),
    )
    return decodificador.decode(plano)
  } catch {
    // Si cambió el origen o el dato está corrupto, se descarta y se pide de nuevo.
    localStorage.removeItem(ALMACEN)
    return null
  }
}

export function borrarClave(): void {
  localStorage.removeItem(ALMACEN)
}

export async function hayClave(): Promise<boolean> {
  return (await leerClave()) !== null
}

/** Muestra solo el final de la clave, para confirmar cuál está cargada sin exponerla. */
export function pistaClave(clave: string): string {
  if (clave.length <= 8) return '••••'
  return `••••••••${clave.slice(-4)}`
}
