import { createClient, RedisClientType } from 'redis'

let redisClient: RedisClientType | null = null

// ── CONEXIÓN ─────────────────────────────────────────────────────────
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient
  }

  const url = process.env.REDIS_URL
  if (!url) {
    throw new Error('REDIS_URL no configurada')
  }

  redisClient = createClient({ url })
  
  redisClient.on('error', (err) => {
    console.error('Redis error:', err)
  })

  await redisClient.connect()
  return redisClient
}

// ── CACHE BÁSICO ─────────────────────────────────────────────────────
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient()
    const data = await client.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Redis cacheGet error:', error)
    return null
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 300 // 5 minutos por defecto
): Promise<boolean> {
  try {
    const client = await getRedisClient()
    await client.setEx(key, ttlSeconds, JSON.stringify(value))
    return true
  } catch (error) {
    console.error('Redis cacheSet error:', error)
    return false
  }
}

export async function cacheDelete(key: string): Promise<boolean> {
  try {
    const client = await getRedisClient()
    await client.del(key)
    return true
  } catch (error) {
    console.error('Redis cacheDelete error:', error)
    return false
  }
}

// ── HELPERS CON PATRONES COMUNES ─────────────────────────────────────
export async function cacheOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Intentar obtener del cache
  const cached = await cacheGet<T>(key)
  if (cached !== null) {
    return cached
  }

  // Si no está en cache, obtener de la fuente
  const data = await fetcher()
  
  // Guardar en cache
  await cacheSet(key, data, ttlSeconds)
  
  return data
}

export async function invalidateCache(pattern: string): Promise<number> {
  try {
    const client = await getRedisClient()
    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await client.del(keys)
    }
    return keys.length
  } catch (error) {
    console.error('Redis invalidateCache error:', error)
    return 0
  }
}
