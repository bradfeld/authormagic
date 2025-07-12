// Simple in-memory cache with TTL support for API responses
// In production, this should be replaced with Redis or similar

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class ApiCache {
  private cache: Map<string, CacheItem<unknown>> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(cleanupIntervalMs: number = 60000) {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, cleanupIntervalMs)
  }

  set<T>(key: string, data: T, ttlSeconds: number = 3600): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: ttlSeconds * 1000
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }
    
    const now = Date.now()
    const isExpired = (now - item.timestamp) > item.ttl
    
    if (isExpired) {
      this.cache.delete(key)
      return null
    }
    
    return item.data as T
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    
    if (!item) {
      return false
    }
    
    const now = Date.now()
    const isExpired = (now - item.timestamp) > item.ttl
    
    if (isExpired) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    for (const [key, item] of this.cache.entries()) {
      const isExpired = (now - item.timestamp) > item.ttl
      if (isExpired) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

// Global cache instance
const globalCache = new ApiCache()

// Cache utilities
export function getCachedData<T>(key: string): T | null {
  return globalCache.get<T>(key)
}

export function setCachedData<T>(key: string, data: T, ttlSeconds?: number): void {
  globalCache.set(key, data, ttlSeconds)
}

export function hasCachedData(key: string): boolean {
  return globalCache.has(key)
}

export function deleteCachedData(key: string): boolean {
  return globalCache.delete(key)
}

export function clearCache(): void {
  globalCache.clear()
}

export function getCacheSize(): number {
  return globalCache.size()
}

export function getCacheKeys(): string[] {
  return globalCache.keys()
}

// Cache key builders
export function buildCacheKey(prefix: string, params: Record<string, unknown>): string {
  const paramString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|')
  
  return `${prefix}${paramString}`
}

// Cache with async function wrapper
export async function cacheWrapper<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  // Check cache first
  const cached = getCachedData<T>(key)
  if (cached !== null) {
    return cached
  }
  
  // Execute function and cache result
  const result = await fn()
  setCachedData(key, result, ttlSeconds)
  
  return result
}

// Cache with fallback
export async function cacheWithFallback<T>(
  key: string,
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  // Check cache first
  const cached = getCachedData<T>(key)
  if (cached !== null) {
    return cached
  }
  
  try {
    const result = await primary()
    setCachedData(key, result, ttlSeconds)
    return result
  } catch {
    // Try fallback
    const fallbackResult = await fallback()
    setCachedData(key, fallbackResult, ttlSeconds)
    return fallbackResult
  }
}

// Cache statistics
export function getCacheStats(): {
  size: number
  keys: string[]
  hitRate?: number
} {
  return {
    size: globalCache.size(),
    keys: globalCache.keys()
  }
}

export { ApiCache } 