import { SignJWT, jwtVerify } from 'jose'

// Edge-compatible hashing using Web Crypto API
// PBKDF2 with SHA-256, 100k iterations
const PBKDF2_ITERATIONS = 100000
const SALT_LENGTH = 16
const HASH_LENGTH = 32

// Edge-compatible base64 encode/decode
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return globalThis.btoa(binary)
}

function fromBase64(base64: string): Uint8Array {
  const binary = globalThis.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function hashWithPbkdf2(password: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const saltBuffer = salt.slice().buffer as ArrayBuffer
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_LENGTH * 8
  )
  const hashArray = new Uint8Array(bits)
  // Combine salt + hash for storage
  const result = new Uint8Array(SALT_LENGTH + HASH_LENGTH)
  result.set(salt, 0)
  result.set(hashArray, SALT_LENGTH)
  return toBase64(result)
}

async function verifyWithPbkdf2(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const decoded = fromBase64(storedHash)
  const salt = decoded.slice(0, SALT_LENGTH)
  const expectedHash = decoded.slice(SALT_LENGTH)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const saltBuffer = salt.slice().buffer as ArrayBuffer
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_LENGTH * 8
  )
  const actualHash = new Uint8Array(bits)

  // Constant-time comparison
  if (expectedHash.length !== actualHash.length) return false
  let result = 0
  for (let i = 0; i < expectedHash.length; i++) {
    result |= expectedHash[i] ^ actualHash[i]
  }
  return result === 0
}

const enc = new TextEncoder()

const secrets = {
  web:   enc.encode(process.env.JWT_SECRET!),
  app:   enc.encode(process.env.JWT_SECRET_APP!),
  admin: enc.encode(process.env.JWT_SECRET_ADMIN!),
}

// ── JWT ─────────────────────────────────────────────────────────
export async function generarToken(
  payload: { id: number; email: string; rol: string; nombre: string },
  tipo:    'web' | 'app' | 'admin' = 'web'
) {
  return new SignJWT({ ...payload, tipo })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(tipo === 'app' ? '30d' : '8h')
    .setIssuedAt()
    .sign(secrets[tipo])
}

export async function verificarToken(
  token: string,
  tipo:  'web' | 'app' | 'admin' = 'web'
) {
  try {
    const { payload } = await jwtVerify(token, secrets[tipo])
    return payload as { id: number; email: string; rol: string; nombre: string }
  } catch { return null }
}

// ── CÓDIGO DE ACCESO ─────────────────────────────────────────────
// Genera número de 5 dígitos entre 10000-99999 (siempre 5 dígitos)
export function generarCodigoAcceso(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String((array[0] % 90000) + 10000)
}

export async function hashCodigo(c: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  return hashWithPbkdf2(c, salt)
}

export async function verificarCodigo(c: string, hash: string): Promise<boolean> {
  return verifyWithPbkdf2(c, hash)
}

// ── TOKEN DE RECUPERACIÓN ────────────────────────────────────────
export const generarTokenRecuperacion = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
