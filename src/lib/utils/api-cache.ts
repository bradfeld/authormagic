// Enhanced in-memory cache with TTL support and disk persistence for API responses
// Optimized for production with cache analytics and pre-warming

import { promises as fs } from 'fs';
import { join } from 'path';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits?: number;
  lastAccess?: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  keys: string[];
  persistedAt?: number;
  restoredAt?: number;
}

interface CacheConfig {
  cleanupIntervalMs?: number;
  persistToFile?: boolean;
  cacheFilePath?: string;
  preWarmOnStart?: boolean;
  enableAnalytics?: boolean;
}

class ApiCache {
  private cache: Map<string, CacheItem<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats: CacheStats = {
    size: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
    keys: [],
  };

  private config: Required<CacheConfig> = {
    cleanupIntervalMs: 60000, // 1 minute
    persistToFile: true,
    cacheFilePath: join(process.cwd(), '.cache', 'api-cache.json'),
    preWarmOnStart: true,
    enableAnalytics: true,
  };

  constructor(config: CacheConfig = {}) {
    this.config = { ...this.config, ...config };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);

    // Initialize cache with persistence and pre-warming
    if (typeof window === 'undefined') {
      // Server-side only
      this.initializeCache();
    }
  }

  private async initializeCache(): Promise<void> {
    try {
      // Restore cache from disk
      if (this.config.persistToFile) {
        await this.restoreFromDisk();
      }

      // Pre-warm with common searches
      if (this.config.preWarmOnStart) {
        await this.preWarmCache();
      }
    } catch {
      // Cache initialization failed - continue without cache persistence
    }
  }

  set<T>(key: string, data: T, ttlSeconds: number = 3600): void {
    const now = Date.now();
    const optimizedKey = this.optimizeKey(key);

    this.cache.set(optimizedKey, {
      data,
      timestamp: now,
      ttl: ttlSeconds * 1000,
      hits: 0,
      lastAccess: now,
    });

    this.updateStats();

    // Persist to disk periodically (every 10 cache sets)
    if (this.config.persistToFile && this.cache.size % 10 === 0) {
      this.persistToDisk().catch(() => {
        // Silent fail - disk persistence is not critical
      });
    }
  }

  get<T>(key: string): T | null {
    const optimizedKey = this.optimizeKey(key);
    const item = this.cache.get(optimizedKey);

    if (this.config.enableAnalytics) {
      this.stats.totalRequests++;
    }

    if (!item) {
      if (this.config.enableAnalytics) {
        this.stats.misses++;
        this.updateHitRate();
      }
      return null;
    }

    const now = Date.now();
    const isExpired = now - item.timestamp > item.ttl;

    if (isExpired) {
      this.cache.delete(optimizedKey);
      if (this.config.enableAnalytics) {
        this.stats.misses++;
        this.updateHitRate();
      }
      return null;
    }

    // Update access statistics
    if (this.config.enableAnalytics) {
      item.hits = (item.hits || 0) + 1;
      item.lastAccess = now;
      this.stats.hits++;
      this.updateHitRate();
    }

    return item.data as T;
  }

  has(key: string): boolean {
    const optimizedKey = this.optimizeKey(key);
    const item = this.cache.get(optimizedKey);

    if (!item) {
      return false;
    }

    const now = Date.now();
    const isExpired = now - item.timestamp > item.ttl;

    if (isExpired) {
      this.cache.delete(optimizedKey);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const optimizedKey = this.optimizeKey(key);
    const deleted = this.cache.delete(optimizedKey);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.keys = [];
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Enhanced cache key optimization for better hit rates
  private optimizeKey(key: string): string {
    // Normalize title+author searches for better cache hits
    if (key.includes('title') && key.includes('author')) {
      return key
        .toLowerCase()
        .replace(/[^a-z0-9:|\-]/g, '') // Remove special chars except separators
        .replace(/\s+/g, '') // Remove spaces
        .replace(/the|a|an/g, ''); // Remove articles
    }

    return key.toLowerCase().replace(/\s+/g, '');
  }

  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.stats.keys = Array.from(this.cache.keys());
  }

  private updateHitRate(): void {
    this.stats.hitRate =
      this.stats.totalRequests > 0
        ? (this.stats.hits / this.stats.totalRequests) * 100
        : 0;
  }

  // Disk persistence for server restarts
  private async persistToDisk(): Promise<void> {
    if (!this.config.persistToFile || typeof window !== 'undefined') {
      return;
    }

    try {
      // Ensure cache directory exists
      const cacheDir = join(process.cwd(), '.cache');
      await fs.mkdir(cacheDir, { recursive: true });

      // Convert cache to serializable format
      const cacheData = {
        cache: Array.from(this.cache.entries()),
        stats: { ...this.stats, persistedAt: Date.now() },
        timestamp: Date.now(),
      };

      await fs.writeFile(
        this.config.cacheFilePath,
        JSON.stringify(cacheData),
        'utf-8',
      );
    } catch {
      // Silent fail - disk persistence is not critical
    }
  }

  private async restoreFromDisk(): Promise<void> {
    if (!this.config.persistToFile || typeof window !== 'undefined') {
      return;
    }

    try {
      const cacheData = await fs.readFile(this.config.cacheFilePath, 'utf-8');
      const parsed = JSON.parse(cacheData);

      // Restore cache entries, filtering out expired ones
      const now = Date.now();

      for (const [key, item] of parsed.cache) {
        const isExpired = now - item.timestamp > item.ttl;
        if (!isExpired) {
          this.cache.set(key, item);
        }
      }

      // Restore stats
      this.stats = {
        ...parsed.stats,
        restoredAt: now,
        size: this.cache.size,
        keys: Array.from(this.cache.keys()),
      };

      // Silent fail - disk persistence is not critical
    } catch {
      // Silent fail - disk persistence is not critical
    }
  }

  // Pre-warm cache with common searches to improve first-time performance
  private async preWarmCache(): Promise<void> {
    const commonSearches = [
      { title: 'Startup Life', author: 'Brad Feld' },
      { title: 'Startup Opportunities', author: 'Brad Feld' },
      { title: 'Venture Deals', author: 'Brad Feld' },
      { title: 'Startup Communities', author: 'Brad Feld' },
      { title: 'Do More Faster', author: 'Brad Feld' },
    ];

    // Silent fail - pre-warming is not critical
    for (const search of commonSearches) {
      // Only pre-warm if not already cached
      const cacheKey = this.buildTitleAuthorKey(search.title, search.author);
      if (!this.has(cacheKey)) {
        // Pre-warm by making actual API calls in background
        // This will be done by the services that use this cache
        // Silent fail - pre-warming is not critical
      }
    }
  }

  private buildTitleAuthorKey(title: string, author: string): string {
    return `title-author:${title.toLowerCase()}:${author.toLowerCase()}`;
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      const isExpired = now - item.timestamp > item.ttl;
      if (isExpired) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      this.updateStats();
      // Silent fail - cache cleanup is not critical
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Persist final state before shutdown
    if (this.config.persistToFile) {
      this.persistToDisk().catch(() => {
        // Silent fail - disk persistence is not critical
      });
    }

    this.clear();
  }

  // Enhanced analytics
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Get detailed analytics for monitoring
  getDetailedAnalytics() {
    const hotKeys = Array.from(this.cache.entries())
      .map(([key, item]) => ({
        key,
        hits: item.hits || 0,
        lastAccess: item.lastAccess,
      }))
      .sort((a, b) => (b.hits || 0) - (a.hits || 0))
      .slice(0, 10);

    return {
      ...this.getStats(),
      hotKeys,
      averageHitsPerKey:
        this.cache.size > 0
          ? Array.from(this.cache.values()).reduce(
              (sum, item) => sum + (item.hits || 0),
              0,
            ) / this.cache.size
          : 0,
    };
  }
}

// Global cache instance with enhanced configuration
const globalCache = new ApiCache({
  cleanupIntervalMs: 60000, // 1 minute cleanup
  persistToFile:
    process.env.NODE_ENV === 'production' ||
    process.env.NODE_ENV === 'development',
  preWarmOnStart: true,
  enableAnalytics: true,
});

// Enhanced cache utilities
export function getCachedData<T>(key: string): T | null {
  return globalCache.get<T>(key);
}

export function setCachedData<T>(
  key: string,
  data: T,
  ttlSeconds?: number,
): void {
  globalCache.set(key, data, ttlSeconds);
}

export function hasCachedData(key: string): boolean {
  return globalCache.has(key);
}

export function deleteCachedData(key: string): boolean {
  return globalCache.delete(key);
}

export function clearCache(): void {
  globalCache.clear();
}

export function getCacheSize(): number {
  return globalCache.size();
}

export function getCacheKeys(): string[] {
  return globalCache.keys();
}

// Enhanced cache key builders with normalization
export function buildCacheKey(
  prefix: string,
  params: Record<string, unknown>,
): string {
  const paramString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      // Normalize title and author for better cache hits
      if (key === 'title' || key === 'author') {
        return `${key}:${String(value).toLowerCase().trim()}`;
      }
      return `${key}:${value}`;
    })
    .join('|');

  return `${prefix}${paramString}`;
}

// Cache with async function wrapper
export async function cacheWrapper<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 3600,
): Promise<T> {
  // Check cache first
  const cached = getCachedData<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute function and cache result
  const result = await fn();
  setCachedData(key, result, ttlSeconds);

  return result;
}

// Cache with fallback
export async function cacheWithFallback<T>(
  key: string,
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  ttlSeconds: number = 3600,
): Promise<T> {
  // Check cache first
  const cached = getCachedData<T>(key);
  if (cached !== null) {
    return cached;
  }

  try {
    const result = await primary();
    setCachedData(key, result, ttlSeconds);
    return result;
  } catch {
    // Try fallback
    const fallbackResult = await fallback();
    setCachedData(key, fallbackResult, ttlSeconds);
    return fallbackResult;
  }
}

// Enhanced cache statistics
export function getCacheStats(): CacheStats {
  return globalCache.getStats();
}

export function getCacheAnalytics() {
  return globalCache.getDetailedAnalytics();
}

// Pre-warming helper for services
export async function preWarmCommonSearches(
  searchFn: (title: string, author: string) => Promise<unknown>,
) {
  const commonSearches = [
    { title: 'Startup Life', author: 'Brad Feld' },
    { title: 'Startup Opportunities', author: 'Brad Feld' },
    { title: 'Venture Deals', author: 'Brad Feld' },
  ];

  const promises = commonSearches.map(async ({ title, author }) => {
    try {
      // Silent fail - pre-warming is not critical
      await searchFn(title, author);
    } catch {
      // Silent fail - pre-warming is not critical
    }
  });

  await Promise.allSettled(promises);
  // Silent fail - pre-warming is not critical
}

export { ApiCache };
