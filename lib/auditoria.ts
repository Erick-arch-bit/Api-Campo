import { db } from './db'
import { auditoria } from '@/drizzle/schema'

export async function logAuditoria(params: {
  id_usuario:  number | null
  tabla:       string
  id_registro: number
  accion:      'INSERT' | 'UPDATE' | 'DELETE'
  antes?:      Record<string, unknown> | null
  despues?:    Record<string, unknown> | null
  ip?:         string
}) {
  try {
    await db.insert(auditoria).values({
      id_usuario:  params.id_usuario,
      tabla:       params.tabla,
      id_registro: params.id_registro,
      accion:      params.accion,
      antes:       params.antes  ?? null,
      despues:     params.despues ?? null,
      ip_address:  params.ip ?? null,
    })
  } catch (err) {
    // Auditoría nunca interrumpe el flujo principal
    console.error('[Auditoría]', err)
  }
}
