import { describe, expect, it, vi } from 'vitest';
import { RateLimiter, fetchWithBackoff } from '../src/utils/rateLimiter';

describe('RateLimiter', () => {
  it('enforces spacing between tasks and keeps processing after failures', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const limiter = new RateLimiter(60); // 1 request/sec baseline
    const timestamps: number[] = [];

    const first = limiter.schedule(async () => {
      timestamps.push(Date.now());
      return 'first';
    });

    const second = limiter.schedule(async () => {
      timestamps.push(Date.now());
      throw new Error('boom');
    });

    const third = limiter.schedule(async () => {
      timestamps.push(Date.now());
      return 'third';
    });

    await vi.runAllTimersAsync();
    const results = await Promise.allSettled([first, second, third]);

    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    expect(results[2].status).toBe('fulfilled');
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(1000);
    expect(timestamps[2] - timestamps[1]).toBeGreaterThanOrEqual(2000);

    vi.useRealTimers();
  });
});

describe('fetchWithBackoff', () => {
  it('retries on 429/5xx and eventually returns success', async () => {
    vi.useFakeTimers();

    const factory = vi
      .fn<[], Promise<Response>>()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));

    const promise = fetchWithBackoff(() => factory(), {
      retries: 3,
      baseDelayMs: 200,
      maxDelayMs: 1000,
    });

    await vi.runAllTimersAsync();
    const response = await promise;

    expect(factory).toHaveBeenCalledTimes(3);
    expect(response.status).toBe(200);

    vi.useRealTimers();
  });

  it('respects Retry-After header when provided', async () => {
    vi.useFakeTimers();

    const factory = vi
      .fn<[], Promise<Response>>()
      .mockResolvedValueOnce(
        new Response('', { status: 429, headers: { 'retry-after': '2' } })
      )
      .mockResolvedValueOnce(new Response('', { status: 200 }));

    const promise = fetchWithBackoff(() => factory(), {
      retries: 2,
      baseDelayMs: 100,
      maxDelayMs: 5000,
    });

    await vi.advanceTimersByTimeAsync(1999);
    expect(factory).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    const response = await promise;

    expect(factory).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);

    vi.useRealTimers();
  });
});
