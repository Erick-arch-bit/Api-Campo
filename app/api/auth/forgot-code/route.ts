import { NextRequest }  from 'next/server'
import { db }           from '@/lib/db'
import { usuarios, password_reset_tokens } from '@/drizzle/schema'
import { eq }           from 'drizzle-orm'
import { apiOk, withErrorHandler, getIp } from '@/lib/helpers'
import { enviarCodigoPorEmail } from '@/lib/email'
import { generarTokenRecuperacion } from '@/lib/auth'
import { limits }       from '@/lib/rate-limit'
import { z }            from 'zod'

const Schema = z.object({ email: z.string().email() })
// Siempre responder igual — no revelar si el email existe
const RESPUESTA = { mensaje: 'Si el correo está registrado, recibirás tu código.' }

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getIp(req)
  const rl  = limits.forgotCode(ip)
  if (!rl.allowed) return apiOk(RESPUESTA)  // 200 igualmente

  const { email } = Schema.parse(await req.json())

  const [user] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, email.toLowerCase().trim()))
    .limit(1)

  if (user?.activo) {
    // Enviar el código EXISTENTE por correo (no creamos uno nuevo)
    let emailEnviado = false
    try {
      await enviarCodigoPorEmail(email, user.nombre_completo, user.codigo_acceso)
      emailEnviado = true
    } catch (emailErr) {
      console.error('[Email Error]', emailErr)
      // No revelamos el error al usuario, pero registramos en logs
    }

    // Registrar en auditoría (tracking)
    await db.insert(password_reset_tokens).values({
      id_usuario:     user.id_usuario,
      token:          generarTokenRecuperacion(),
      tipo:           'EMAIL',
      usado:          emailEnviado, // marcar como no usado si el email falló
      fecha_expira:   new Date(Date.now() + 3_600_000),
      fecha_uso:      emailEnviado ? new Date() : null,
      ip_solicitante: ip,
    })
  }

  return apiOk(RESPUESTA)
})
