import { NextRequest }    from 'next/server'
import { db }             from '@/lib/db'
import { usuarios, zonas }from '@/drizzle/schema'
import { eq, and, ilike } from 'drizzle-orm'
import { generarCodigoAcceso, hashCodigo } from '@/lib/auth'
import { apiOk, apiError, getUser, requireRol, withErrorHandler } from '@/lib/helpers'
import { logAuditoria }   from '@/lib/auditoria'
import { getIp }          from '@/lib/helpers'
import { z }              from 'zod'

const CrearUsuarioSchema = z.object({
  nombre_completo:               z.string().min(3).max(150),
  email:                         z.string().email(),
  rol:                           z.enum(['COORDINADOR', 'TECNICO']),
  especialidad:                  z.enum(['AGRICOLA','AGROPECUARIO','ACTIVIDAD_GENERAL']).optional(),
  id_zona:                       z.number().int().positive().optional(),
  puede_registrar_beneficiarios: z.boolean().default(false),
})

// GET /api/web/usuarios
export const GET = withErrorHandler(async (req: NextRequest) => {
  const perm = requireRol(req, ['SUPER_ADMIN', 'COORDINADOR'])
  if (perm) return perm

  const { searchParams } = req.nextUrl
  const rol    = searchParams.get('rol')
  const id_zona = searchParams.get('id_zona')
  const buscar  = searchParams.get('buscar')

  let query = db
    .select({
      id_usuario:      usuarios.id_usuario,
      nombre_completo: usuarios.nombre_completo,
      email:           usuarios.email,
      codigo_acceso:   usuarios.codigo_acceso,
      rol:             usuarios.rol,
      especialidad:    usuarios.especialidad,
      activo:          usuarios.activo,
      ultimo_acceso:   usuarios.ultimo_acceso,
      zona:            zonas.nombre,
      bloqueado:       usuarios.bloqueado_revision,
    })
    .from(usuarios)
    .leftJoin(zonas, eq(usuarios.id_zona, zonas.id_zona))

  const conditions = []
  if (rol)     conditions.push(eq(usuarios.rol, rol))
  if (id_zona) conditions.push(eq(usuarios.id_zona, parseInt(id_zona)))
  if (buscar)  conditions.push(ilike(usuarios.nombre_completo, `%${buscar}%`))
  if (conditions.length) query = query.where(and(...conditions)) as any

  const lista = await query
  return apiOk(lista)
})

// POST /api/web/usuarios
export const POST = withErrorHandler(async (req: NextRequest) => {
  const perm = requireRol(req, ['SUPER_ADMIN'])
  if (perm) return perm

  const { id: adminId } = getUser(req)
  const body   = await req.json()
  const parsed = CrearUsuarioSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0].message)

  // Verificar email único
  const [existe] = await db
    .select({ id: usuarios.id_usuario })
    .from(usuarios)
    .where(eq(usuarios.email, parsed.data.email.toLowerCase()))
    .limit(1)
  if (existe) return apiError('Ya existe un usuario con ese email', 409)

  // Generar código único
  let codigo = ''
  for (let i = 0; i < 20; i++) {
    const candidato = generarCodigoAcceso()
    const [dup] = await db.select({ id: usuarios.id_usuario })
      .from(usuarios).where(eq(usuarios.codigo_acceso, candidato)).limit(1)
    if (!dup) { codigo = candidato; break }
  }
  if (!codigo) return apiError('Error generando código único. Intenta de nuevo.', 500)

  const codigoHash = await hashCodigo(codigo)

  const [nuevo] = await db.insert(usuarios).values({
    nombre_completo:               parsed.data.nombre_completo.trim(),
    email:                         parsed.data.email.toLowerCase().trim(),
    codigo_acceso:                 codigo,
    codigo_acceso_hash:            codigoHash,
    rol:                           parsed.data.rol,
    especialidad:                  parsed.data.especialidad ?? null,
    id_zona:                       parsed.data.id_zona ?? null,
    puede_registrar_beneficiarios: parsed.data.puede_registrar_beneficiarios,
    activo:                        true,
  }).returning()

  await logAuditoria({
    id_usuario: adminId, tabla: 'usuarios',
    id_registro: nuevo.id_usuario, accion: 'INSERT',
    despues: { nombre: nuevo.nombre_completo, rol: nuevo.rol, email: nuevo.email },
    ip: getIp(req),
  })

  // DEVOLVER EL CÓDIGO EN TEXTO UNA SOLA VEZ para que el admin se lo dé al técnico
  return apiOk({ usuario: nuevo, codigo_generado: codigo }, 201)
})
