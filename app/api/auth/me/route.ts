import { NextRequest }   from 'next/server'
import { db }            from '@/lib/db'
import { usuarios }      from '@/drizzle/schema'
import { eq }            from 'drizzle-orm'
import { apiOk, apiError, getUser, withErrorHandler } from '@/lib/helpers'

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { id } = getUser(req)
  const [user] = await db
    .select({
      id_usuario:                    usuarios.id_usuario,
      nombre_completo:               usuarios.nombre_completo,
      email:                         usuarios.email,
      rol:                           usuarios.rol,
      especialidad:                  usuarios.especialidad,
      id_zona:                       usuarios.id_zona,
      activo:                        usuarios.activo,
      puede_registrar_beneficiarios: usuarios.puede_registrar_beneficiarios,
      foto_perfil_url:               usuarios.foto_perfil_url,
      ultimo_acceso:                 usuarios.ultimo_acceso,
    })
    .from(usuarios)
    .where(eq(usuarios.id_usuario, id))
    .limit(1)

  if (!user) return apiError('Usuario no encontrado', 404)
  return apiOk(user)
})
