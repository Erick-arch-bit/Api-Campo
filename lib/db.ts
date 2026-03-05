import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/drizzle/schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:              { rejectUnauthorized: false },
  max:              20,
  min:              2,
  idleTimeoutMillis:     60_000,
  connectionTimeoutMillis: 10_000, // Aumentado para dar tiempo a conectar
  allowExitOnIdle:  false,
})

pool.on('error', (err) => console.error('[DB Pool Error]', err.message))

export const db = drizzle(pool, { schema })
