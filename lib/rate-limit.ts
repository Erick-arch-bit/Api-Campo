interface Entry { count: number; resetTime: number }
const store = new Map<string, Entry>()

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
  const now = Date.now()
  for (const [k, e] of store) if (now > e.resetTime) store.delete(k)
}, 5 * 60 * 1000)

function rateLimit(key: string, max: number, windowMs: number) {
  const now   = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: max - 1, resetIn: windowMs }
  }
  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now }
  }
  entry.count++
  return { allowed: true, remaining: max - entry.count, resetIn: entry.resetTime - now }
}

export const limits = {
  login:         (ip: string) => rateLimit(`login:${ip}`,   5,  15 * 60 * 1000),
  forgotCode:    (ip: string) => rateLimit(`forgot:${ip}`,  3,  60 * 60 * 1000),
  sync:          (id: number) => rateLimit(`sync:${id}`,    20, 60 * 1000),
  uploadEvidencia:(id: number)=> rateLimit(`upload:${id}`,  30, 60 * 1000),
  api:           (ip: string) => rateLimit(`api:${ip}`,     200,60 * 1000),
}
