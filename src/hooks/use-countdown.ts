import { useCallback, useEffect, useState } from 'react';

/**
 * Ticking countdown for resend-cooldown buttons. Always seed it from a
 * SERVER-provided duration (`resendCooldownSec` on success, the 429's
 * `retryAfterSec`) — never compute durations from client-side clocks, the
 * server's OTP row is the only authoritative timer.
 */
export function useCountdown(): {
  secondsLeft: number;
  start: (seconds: number) => void;
} {
  const [target, setTarget] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const running = target != null && target > nowMs;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback((seconds: number) => {
    const startedAt = Date.now();
    setNowMs(startedAt);
    setTarget(startedAt + seconds * 1000);
  }, []);

  const secondsLeft =
    target == null ? 0 : Math.max(0, Math.ceil((target - nowMs) / 1000));

  return { secondsLeft, start };
}
