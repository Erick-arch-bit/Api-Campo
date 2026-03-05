import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'

// Rutas que NO requieren token
const PUBLICAS = [
  '/api/auth/login',
  '/api/auth/forgot-code',
  '/api/health',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204 })
  }

  // Solo aplica a rutas /api/*
  if (!pathname.startsWith('/api/')) return NextResponse.next()

  // Rutas públicas — pasar directo
  if (PUBLICAS.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Detectar tipo de token
  const authHeader  = req.headers.get('Authorization')
  const cookieToken = req.cookies.get('token')?.value
  let usuario = null

  if (authHeader?.startsWith('Bearer ')) {
    // App móvil → JWT_SECRET_APP (30 días)
    usuario = await verificarToken(authHeader.slice(7), 'app')
  } else if (cookieToken) {
    // Dashboard web → JWT_SECRET (8 horas)
    usuario = await verificarToken(cookieToken, 'web')
  }

  if (!usuario) {
    return NextResponse.json(
      { success: false, error: 'No autenticado' },
      { status: 401 }
    )
  }

  // Inyectar datos del usuario en headers (para todos los handlers)
  const headers = new Headers(req.headers)
  headers.set('x-user-id',     String(usuario.id))
  headers.set('x-user-rol',    usuario.rol)
  headers.set('x-user-email',  usuario.email)
  headers.set('x-user-nombre', usuario.nombre)

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/api/:path*'],
}
