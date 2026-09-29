type Window = { startedAt: number; count: number }

// In serverless deployments this in-memory window is scoped to one function instance; it is not shared across instances.
const windows = new Map<string, Window>()

export function checkRateLimit(key: string, limit = 20, windowMs = 60_000): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const current = windows.get(key)
  if (!current || now - current.startedAt >= windowMs) {
    windows.set(key, { startedAt: now, count: 1 })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000)),
    }
  }

  current.count += 1
  if (windows.size > 10_000) {
    for (const [entryKey, value] of windows) {
      if (now - value.startedAt >= windowMs) windows.delete(entryKey)
    }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}
