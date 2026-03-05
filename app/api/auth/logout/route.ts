import { NextRequest }                    from 'next/server'
import { createHash }                  from 'crypto'
import { db }                         from '@/lib/db'
import { sesiones_app }                from '@/drizzle/schema'
import { eq }                         from 'drizzle-orm'
import { apiOk, withErrorHandler, getUser } from '@/lib/helpers'

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { id: userId } = getUser(req)
  
  // Invalidar sesión de app si existe
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const tokenHash = createHash('sha256')
        .update(authHeader.slice(7))
        .digest('hex')
      await db.update(sesiones_app)
        .set({ activa: false })
        .where(eq(sesiones_app.token_hash, tokenHash))
    } catch (err) {
      console.error('[Logout] Error invalidando sesión:', err)
    }
  }
  
  const res = apiOk({ mensaje: 'Sesión cerrada' })
  res.cookies.delete('token')
  return res
})
