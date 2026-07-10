type FetchInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type GlobalWithRateLimit = typeof globalThis & {
  lumbungRateLimits?: Map<string, RateLimitEntry>;
};

const globalWithRateLimit = globalThis as GlobalWithRateLimit;

function limits() {
  if (!globalWithRateLimit.lumbungRateLimits) {
    globalWithRateLimit.lumbungRateLimits = new Map();
  }
  return globalWithRateLimit.lumbungRateLimits;
}

function requestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    {
      error: "RATE_LIMITED",
      message: "Terlalu banyak request. Coba lagi sebentar.",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export function checkRateLimit(
  request: Request,
  bucket: string,
  options: { limit: number; windowMs: number },
) {
  const key = `${bucket}:${requestIp(request)}`;
  const now = Date.now();
  const entry = limits().get(key);

  if (!entry || entry.resetAt <= now) {
    limits().set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (entry.count >= options.limit) {
    return rateLimitResponse(Math.ceil((entry.resetAt - now) / 1000));
  }

  entry.count += 1;
  limits().set(key, entry);
  return null;
}

export async function fetchWithTimeout(
  input: string | URL,
  init: FetchInit = {},
  options: { timeoutMs?: number; label?: string } = {},
) {
  const timeoutMs = options.timeoutMs ?? 6500;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${options.label ?? "External fetch"} timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
