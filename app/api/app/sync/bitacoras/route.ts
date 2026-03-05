import { NextRequest }      from 'next/server'
import { db }               from '@/lib/db'
import { bitacoras, sync_log, periodos_cierre, beneficiarios, asignaciones } from '@/drizzle/schema'
import { eq, and, sql }     from 'drizzle-orm'
import { apiOk, apiError, getUser, withErrorHandler } from '@/lib/helpers'
import { limits }           from '@/lib/rate-limit'
import { createHmac }       from 'crypto'
import { z }                from 'zod'

const BitacoraSchema = z.object({
  uuid_movil:        z.string().uuid(),
  id_asignacion:     z.number().int().positive().optional().nullable(),
  fecha_hora_inicio: z.string().datetime(),
  fecha_hora_fin:    z.string().datetime().optional().nullable(),
  latitud:           z.number().min(-90).max(90),
  longitud:          z.number().min(-180).max(180),
  precision_gps:     z.number().optional().nullable(),
  latitud_fin:       z.number().optional().nullable(),
  longitud_fin:      z.number().optional().nullable(),
  tipo_bitacora:     z.enum(['BENEFICIARIO', 'ACTIVIDAD_GENERAL']).default('BENEFICIARIO'),
  calificacion:      z.number().int().min(1).max(5).optional().nullable(),
  reporte:           z.string().max(5000).optional().nullable(),
  firma_url:         z.string().url().optional().nullable(),
  foto_confirmacion_url: z.string().url().optional().nullable(),
  datos_extendidos:  z.record(z.unknown()).optional(),
  dispositivo_info:  z.record(z.unknown()).optional(),
})

const BodySchema = z.object({
  bitacoras: z.array(BitacoraSchema).min(1).max(100),
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { id: tecnicoId } = getUser(req)

  // Rate limiting
  const rl = limits.sync(tecnicoId)
  if (!rl.allowed) return apiError('Demasiadas sincronizaciones. Espera un minuto.', 429)

  // Verificar firma HMAC si viene del cliente
  const firma     = req.headers.get('x-signature')
  const bodyText  = await req.text()
  
  if (firma) {
    const hmacSecret = process.env.APP_HMAC_SECRET
    if (!hmacSecret) {
      console.error('[CONFIG] APP_HMAC_SECRET no está definido')
      return apiError('Error de configuración del servidor', 500)
    }
    const expected = 'sha256=' + createHmac('sha256', hmacSecret)
      .update(bodyText).digest('hex')
    if (firma !== expected) return apiError('Firma inválida', 401)
  }

  const body   = JSON.parse(bodyText)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0].message)

  // Buscar período activo
  const hoy = new Date()
  const [periodo] = await db
    .select({ id_periodo: periodos_cierre.id_periodo })
    .from(periodos_cierre)
    .where(and(
      eq(periodos_cierre.anio,    hoy.getFullYear()),
      eq(periodos_cierre.mes,     hoy.getMonth() + 1),
      eq(periodos_cierre.cerrado, false)
    ))
    .limit(1)

  if (!periodo) return apiError('No hay período activo este mes. Contacta a tu coordinador.', 409)

  const resultados = []

  for (const reg of parsed.data.bitacoras) {
    // Detectar duplicado por uuid_movil
    const [existe] = await db
      .select({ id_bitacora: bitacoras.id_bitacora })
      .from(bitacoras)
      .where(eq(bitacoras.uuid_movil, reg.uuid_movil))
      .limit(1)

    if (existe) {
      await db.insert(sync_log).values({
        uuid_movil:    reg.uuid_movil as any,
        tipo_registro: 'BITACORA',
        id_usuario:    tecnicoId,
        resultado:     'DUPLICADO',
        detalle:       'uuid_movil ya existe',
      })
      resultados.push({ uuid_movil: reg.uuid_movil, resultado: 'DUPLICADO', id: existe.id_bitacora })
      continue
    }

    // Insertar bitácora
    const [nueva] = await db.insert(bitacoras).values({
      uuid_movil:             reg.uuid_movil as any,
      id_usuario:             tecnicoId,
      id_asignacion:          reg.id_asignacion ?? null,
      id_periodo:             periodo.id_periodo,
      fecha_hora_inicio:      new Date(reg.fecha_hora_inicio),
      fecha_hora_fin:         reg.fecha_hora_fin ? new Date(reg.fecha_hora_fin) : null,
      latitud:                String(reg.latitud),
      longitud:               String(reg.longitud),
      precision_gps:          reg.precision_gps ? String(reg.precision_gps) : null,
      latitud_fin:            reg.latitud_fin   ? String(reg.latitud_fin)   : null,
      longitud_fin:           reg.longitud_fin  ? String(reg.longitud_fin)  : null,
      tipo_bitacora:          reg.tipo_bitacora,
      calificacion:           reg.calificacion ?? null,
      reporte:                reg.reporte ?? null,
      firma_url:              reg.firma_url ?? null,
      foto_confirmacion_url:  reg.foto_confirmacion_url ?? null,
      datos_extendidos:       reg.datos_extendidos ?? {},
      dispositivo_info:       reg.dispositivo_info ?? {},
      estatus_sincronizacion: 'RECIBIDO',
    }).returning({ id_bitacora: bitacoras.id_bitacora })

    // Incrementar total_visitas en el beneficiario si aplica
    if (reg.id_asignacion) {
      const asig = await db.query.asignaciones.findFirst({
        where: (a, { eq }) => eq(a.id_asignacion, reg.id_asignacion!),
        columns: { id_beneficiario: true },
      })
      if (asig?.id_beneficiario) {
        await db.update(beneficiarios)
          .set({ total_visitas: sql`${beneficiarios.total_visitas} + 1` })
          .where(eq(beneficiarios.id_beneficiario, asig.id_beneficiario))
      }
    }

    await db.insert(sync_log).values({
      uuid_movil:    reg.uuid_movil as any,
      tipo_registro: 'BITACORA',
      id_usuario:    tecnicoId,
      resultado:     'OK',
    })

    resultados.push({ uuid_movil: reg.uuid_movil, resultado: 'OK', id: nueva.id_bitacora })
  }

  const ok   = resultados.filter(r => r.resultado === 'OK').length
  const dup  = resultados.filter(r => r.resultado === 'DUPLICADO').length

  return apiOk({ sincronizadas: ok, duplicadas: dup, resultados })
})
