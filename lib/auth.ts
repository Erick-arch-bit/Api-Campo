import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { randomInt, randomBytes } from 'crypto'

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
  return String(randomInt(10000, 100000))
}

export const hashCodigo      = (c: string) => bcrypt.hash(c, 12)
export const verificarCodigo = (c: string, hash: string) => bcrypt.compare(c, hash)

// ── TOKEN DE RECUPERACIÓN ────────────────────────────────────────
export const generarTokenRecuperacion = () => randomBytes(32).toString('hex')
