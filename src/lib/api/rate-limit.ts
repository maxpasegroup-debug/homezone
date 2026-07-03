type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

export type RateLimitAdapter = {
  check: (options: RateLimitOptions) => RateLimitResult;
  name: string;
};

const buckets = new Map<string, RateLimitBucket>();

function now() {
  return Date.now();
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

const memoryRateLimitAdapter: RateLimitAdapter = {
  check({ key, limit, windowMs }) {
  const currentTime = now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= currentTime) {
    const resetAt = currentTime + windowMs;
    buckets.set(key, {
      count: 1,
      resetAt
    });

    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(resetAt)
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(existing.resetAt)
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: new Date(existing.resetAt)
  };
  },
  name: "memory"
};

let activeAdapter: RateLimitAdapter = memoryRateLimitAdapter;

export function setRateLimitAdapter(adapter: RateLimitAdapter) {
  activeAdapter = adapter;
}

export function getRateLimitAdapterName() {
  return activeAdapter.name;
}

export function checkRateLimit(options: RateLimitOptions) {
  return activeAdapter.check(options);
}

export function rateLimitKey(request: Request, scope: string, actorId?: string | null) {
  return `${scope}:${actorId ?? getClientIp(request)}`;
}

export function clearRateLimitBucketsForTests() {
  buckets.clear();
}
