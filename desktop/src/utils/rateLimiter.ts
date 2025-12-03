type RateLimiterTask<T> = () => Promise<T>;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class RateLimiter {
  private queue: Promise<unknown> = Promise.resolve();
  private lastExecuted = 0;
  private readonly minInterval: number;

  constructor(requestsPerMinute: number) {
    const safeRpm = Math.max(1, requestsPerMinute);
    this.minInterval = Math.floor(60000 / safeRpm);
  }

  schedule<T>(task: RateLimiterTask<T>): Promise<T> {
    const runTask = async () => {
      const now = Date.now();
      const waitTime = Math.max(0, this.lastExecuted + this.minInterval - now);
      if (waitTime > 0) {
        await sleep(waitTime);
      }

      this.lastExecuted = Date.now();
      return task();
    };

    this.queue = this.queue
      .catch(() => undefined) // keep the chain alive even if a previous task failed
      .then(runTask);

    return this.queue as Promise<T>;
  }
}

interface BackoffOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function fetchWithBackoff(
  factory: () => Promise<Response>,
  options: BackoffOptions = {}
): Promise<Response> {
  const retries = options.retries ?? 3;
  const baseDelay = options.baseDelayMs ?? 500;
  const maxDelay = options.maxDelayMs ?? 4000;
  const parseRetryAfter = (value: string | null): number | null => {
    if (!value) return null;

    const seconds = Number.parseInt(value, 10);
    if (Number.isFinite(seconds)) {
      return seconds * 1000;
    }

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }

    return null;
  };

  let attempt = 0;
  let delay = baseDelay;

  while (true) {
    let retryAfterMs: number | null = null;

    try {
      const response = await factory();

      if (response.status !== 429 && response.status < 500) {
        return response;
      }

      retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
      if (attempt >= retries) {
        return response;
      }
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
    }

    const waitTime = retryAfterMs !== null ? retryAfterMs : delay;

    await sleep(Math.min(waitTime, maxDelay));
    attempt += 1;
    delay = Math.min(delay * 2, maxDelay);
  }
}
