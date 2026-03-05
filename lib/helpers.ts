import { NextRequest, NextResponse } from 'next/server'

// ── RESPUESTAS ESTÁNDAR ──────────────────────────────────────────
export function apiOk(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function apiError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status })
}

// ── USUARIO DEL JWT (headers inyectados por middleware) ───────────
export function getUser(req: NextRequest) {
  return {
    id:     parseInt(req.headers.get('x-user-id')    ?? '0'),
    rol:    req.headers.get('x-user-rol')             ?? '',
    email:  req.headers.get('x-user-email')           ?? '',
    nombre: req.headers.get('x-user-nombre')          ?? '',
  }
}

// ── VERIFICACIÓN DE ROL ──────────────────────────────────────────
export function requireRol(req: NextRequest, roles: string[]) {
  const rol = req.headers.get('x-user-rol') ?? ''
  if (!roles.includes(rol)) return apiError('Sin permisos', 403)
  return null
}

// ── WRAPPER DE ERROR ─────────────────────────────────────────────
export function withErrorHandler(
  handler: (req: NextRequest, ctx?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx?: any): Promise<NextResponse> => {
    try {
      return await handler(req, ctx)
    } catch (err: any) {
      console.error('[API Error]', err)
      // Intentar loguear en error_log sin romper la respuesta
      try {
        const { db }        = await import('@/lib/db')
        const { error_log } = await import('@/drizzle/schema')
        await db.insert(error_log).values({
          origen:        'API',
          entorno:       (process.env.NODE_ENV ?? 'production') as any,
          endpoint:      req.nextUrl.pathname,
          metodo_http:   req.method,
          mensaje_error: err.message ?? String(err),
          stack_trace:   err.stack ?? null,
          codigo_http:   500,
          ip_address:    req.headers.get('x-forwarded-for') ?? null,
          user_agent:    req.headers.get('user-agent') ?? null,
        })
      } catch { /* el log nunca rompe la respuesta */ }

      return apiError(
        process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor',
        500
      )
    }
  }
}

// ── IP DEL REQUEST ───────────────────────────────────────────────
export function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}
