// Rate Limiter for API requests
// Simple in-memory rate limiter with sliding window approach

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
  burstLimit: number;
}

interface RateLimitState {
  requests: number[];
  dailyRequests: number;
  dailyResetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitState> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const state = this.getOrCreateState(identifier);

    // Clean up old requests (older than 1 minute)
    const oneMinuteAgo = now - 60 * 1000;
    state.requests = state.requests.filter(
      timestamp => timestamp > oneMinuteAgo,
    );

    // Check daily limit reset
    if (now > state.dailyResetTime) {
      state.dailyRequests = 0;
      state.dailyResetTime = this.getTomorrowMidnight();
    }

    // Check limits
    const canMakeRequest =
      state.requests.length < this.config.requestsPerMinute &&
      state.dailyRequests < this.config.requestsPerDay &&
      state.requests.length < this.config.burstLimit;

    if (canMakeRequest) {
      state.requests.push(now);
      state.dailyRequests++;
      return true;
    }

    return false;
  }

  async waitForSlot(identifier: string): Promise<void> {
    const state = this.getOrCreateState(identifier);
    const now = Date.now();

    if (state.requests.length >= this.config.burstLimit) {
      // Wait for the oldest request to expire
      const oldestRequest = Math.min(...state.requests);
      const waitTime = oldestRequest + 60 * 1000 - now;

      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }
  }

  getRemainingRequests(identifier: string): {
    perMinute: number;
    perDay: number;
    resetTime: number;
  } {
    const state = this.getOrCreateState(identifier);
    const now = Date.now();

    // Clean up old requests
    const oneMinuteAgo = now - 60 * 1000;
    state.requests = state.requests.filter(
      timestamp => timestamp > oneMinuteAgo,
    );

    return {
      perMinute: Math.max(
        0,
        this.config.requestsPerMinute - state.requests.length,
      ),
      perDay: Math.max(0, this.config.requestsPerDay - state.dailyRequests),
      resetTime: state.dailyResetTime,
    };
  }

  private getOrCreateState(identifier: string): RateLimitState {
    if (!this.limits.has(identifier)) {
      this.limits.set(identifier, {
        requests: [],
        dailyRequests: 0,
        dailyResetTime: this.getTomorrowMidnight(),
      });
    }
    return this.limits.get(identifier)!;
  }

  private getTomorrowMidnight(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global rate limiter instances
const rateLimiters = new Map<string, RateLimiter>();

export function createRateLimiter(
  key: string,
  config: RateLimitConfig,
): RateLimiter {
  if (!rateLimiters.has(key)) {
    rateLimiters.set(key, new RateLimiter(config));
  }
  return rateLimiters.get(key)!;
}

export function getRateLimiter(key: string): RateLimiter | undefined {
  return rateLimiters.get(key);
}

// Exponential backoff utility
export class ExponentialBackoff {
  private attempts: number;
  private delay: number;
  private maxDelay: number;
  private jitter: boolean;

  constructor(
    attempts: number = 3,
    initialDelay: number = 1000,
    maxDelay: number = 10000,
    jitter: boolean = true,
  ) {
    this.attempts = attempts;
    this.delay = initialDelay;
    this.maxDelay = maxDelay;
    this.jitter = jitter;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 1; attempt <= this.attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === this.attempts) {
          throw error;
        }

        const backoffDelay = Math.min(
          this.delay * Math.pow(2, attempt - 1),
          this.maxDelay,
        );

        const actualDelay = this.jitter
          ? backoffDelay + Math.random() * 1000
          : backoffDelay;

        await this.sleep(actualDelay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Performance-optimized backoff for time-sensitive operations
export class FastBackoff {
  private attempts: number;
  private delay: number;
  private maxDelay: number;

  constructor(
    attempts: number = 2,
    initialDelay: number = 200,
    maxDelay: number = 1000,
  ) {
    this.attempts = attempts;
    this.delay = initialDelay;
    this.maxDelay = maxDelay;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 1; attempt <= this.attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === this.attempts) {
          throw error;
        }

        const backoffDelay = Math.min(this.delay * attempt, this.maxDelay);
        await this.sleep(backoffDelay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { RateLimiter, type RateLimitConfig, type RateLimitState };
