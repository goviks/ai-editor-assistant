export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
}

const WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_LIMIT = Number.parseInt(process.env.CHECK_RATE_LIMIT ?? "20", 10);

const buckets = new Map<string, number[]>();

function prune(timestamps: number[], now: number): number[] {
  return timestamps.filter((time) => now - time < WINDOW_MS);
}

export function consumeCheck(key: string): RateLimitResult {
  const now = Date.now();
  const limit = Number.isFinite(DEFAULT_LIMIT) && DEFAULT_LIMIT > 0 ? DEFAULT_LIMIT : 20;

  const history = prune(buckets.get(key) ?? [], now);

  if (history.length >= limit) {
    const oldest = history[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));
    buckets.set(key, history);
    return { allowed: false, remaining: 0, retryAfterSeconds, limit };
  }

  history.push(now);
  buckets.set(key, history);

  if (buckets.size > 5000) {
    for (const [bucketKey, timestamps] of buckets) {
      if (prune(timestamps, now).length === 0) buckets.delete(bucketKey);
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - history.length),
    retryAfterSeconds: 0,
    limit,
  };
}
