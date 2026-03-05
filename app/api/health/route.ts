import { NextRequest } from 'next/server'
import { db }          from '@/lib/db'
import { zonas }       from '@/drizzle/schema'

export async function GET(_req: NextRequest) {
  try {
    await db.select().from(zonas).limit(1)
    return Response.json({
      success:  true,
      status:   'ok',
      database: 'connected',
      version:  '2.0.0',
      ts:       new Date().toISOString(),
    })
  } catch {
    return Response.json({ success: false, status: 'error', database: 'disconnected' }, { status: 503 })
  }
}
