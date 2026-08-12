import { useEffect, useState } from "react";

import useDemo from "../../hooks/useDemo.js";

function formatRemaining(seconds) {
  if (seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Quota / TTL badge for the public demo session.
 *
 * Rendered only when a demo session is active (the limiter is enabled on the
 * instance). When the quota is exhausted or the session has expired it turns
 * red and prompts the user to start a new session.
 */
export default function DemoBadge() {
  const { status, error, isDemoActive, startDemo } = useDemo();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isDemoActive) return null;

  if (!status) {
    return <span className="client-demo-badge neutral">Демо-режим</span>;
  }

  const remaining = status.requests_remaining ?? 0;
  const expiresAt = status.expires_at ? new Date(status.expires_at).getTime() : null;
  const secondsLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0;
  const isExpired = secondsLeft === 0;
  const isExhausted = remaining === 0;

  let state = "ok";
  if (isExpired || isExhausted || error) state = "error";
  else if (remaining <= 5) state = "warn";

  return (
    <span className={`client-demo-badge ${state}`}>
      {state === "error" ? (
        <>
          🔒 Демо: сессия исчерпана{" "}
          <button
            type="button"
            className="client-demo-badge-action"
            onClick={() => startDemo()}
          >
            новая сессия
          </button>
        </>
      ) : (
        <>🔒 Демо · осталось {remaining} · {formatRemaining(secondsLeft)}</>
      )}
      {error && state !== "error" ? ` · ${error}` : null}
    </span>
  );
}