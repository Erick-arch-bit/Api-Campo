import { NextRequest }        from 'next/server'
import { db }                 from '@/lib/db'
import { usuarios, sesiones_app } from '@/drizzle/schema'
import { eq }                 from 'drizzle-orm'
import { verificarCodigo, generarToken } from '@/lib/auth'
import { apiOk, apiError, withErrorHandler, getIp } from '@/lib/helpers'
import { limits }             from '@/lib/rate-limit'
import { z }                  from 'zod'
import { createHash }         from 'crypto'

const Schema = z.object({
  codigo_acceso: z.string().length(5).regex(/^\d{5}$/,
    'El código debe ser exactamente 5 dígitos numéricos'),
  source:        z.enum(['web', 'app']).default('app'),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Rate limiting: 5 intentos / 15 min por IP
  const ip = getIp(req)
  const rl  = limits.login(ip)
  if (!rl.allowed) {
    return apiError('Demasiados intentos. Espera 15 minutos.', 429)
  }

  const body   = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message)
  }

  const { codigo_acceso, source } = parsed.data

  // Buscar usuario por código
  const [user] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.codigo_acceso, codigo_acceso))
    .limit(1)

  // Mensaje genérico — no revelar si el código existe
  if (!user || !user.activo) return apiError('Código incorrecto', 401)
  if (user.bloqueado_revision) {
    return apiError('Cuenta bloqueada. Contacta a tu coordinador.', 403)
  }

  // Separación de plataformas
  if (source === 'web' && user.rol === 'TECNICO') {
    return apiError('Los técnicos acceden desde la app móvil', 403)
  }
  if (source === 'app' && user.rol !== 'TECNICO') {
    return apiError('Coordinadores y admins acceden desde el panel web', 403)
  }

  // Verificar hash del código
  const ok = await verificarCodigo(codigo_acceso, user.codigo_acceso_hash)
  if (!ok) return apiError('Código incorrecto', 401)

  // Actualizar último acceso
  await db.update(usuarios)
    .set({ ultimo_acceso: new Date() })
    .where(eq(usuarios.id_usuario, user.id_usuario))

  const userData = {
    id_usuario:                    user.id_usuario,
    nombre_completo:               user.nombre_completo,
    email:                         user.email,
    rol:                           user.rol,
    especialidad:                  user.especialidad,
    id_zona:                       user.id_zona,
    puede_registrar_beneficiarios: user.puede_registrar_beneficiarios,
    foto_perfil_url:               user.foto_perfil_url,
  }

  const tipo  = source === 'app' ? 'app' : 'web'
  const token = await generarToken(
    { id: user.id_usuario, email: user.email, rol: user.rol, nombre: user.nombre_completo },
    tipo
  )

  if (source === 'app') {
    // Registrar sesión para revocación remota
    const tokenHash = createHash('sha256').update(token).digest('hex')
    await db.insert(sesiones_app).values({
      id_usuario:  user.id_usuario,
      token_hash:  tokenHash,
      dispositivo: req.headers.get('x-device-info') ?? null,
      activa:      true,
    })
    return apiOk({ token, user: userData })
  }

  // Web → cookie httpOnly
  const res = apiOk({ user: userData })
  res.cookies.set('token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 8,
    path:     '/',
  })
  return res
})
