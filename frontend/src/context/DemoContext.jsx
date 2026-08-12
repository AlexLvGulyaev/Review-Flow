import { createContext, useCallback, useEffect, useState } from "react";

import { getApiUrl } from "../lib/api.js";

const DemoContext = createContext(null);

const TOKEN_KEY = "review-flow-demo-token";
const SESSION_KEY = "review-flow-demo-session-id";

function generateSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readBody(res) {
  return res.text().then((text) => {
    try {
      return JSON.parse(text);
    } catch {
      return { detail: text };
    }
  });
}

/**
 * Provides a tokenized demo session for the public client contour.
 *
 * On mount it tries to start a session via POST /api/demo/start. If the
 * backend returns 403 the demo limiter is disabled on this instance and the
 * context hides all demo UI (no badge, no gating) — POST /api/reviews then
 * works without a token as before.
 */
export function DemoProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [sessionId, setSessionId] = useState(
    () => localStorage.getItem(SESSION_KEY) || generateSessionId(),
  );
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [demoDisabled, setDemoDisabled] = useState(false);

  const clearDemo = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setSessionId(generateSessionId());
    setStatus(null);
    setError(null);
  }, []);

  const startDemo = useCallback(
    async (existingSessionId = null) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${getApiUrl()}/api/demo/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: existingSessionId || sessionId }),
        });
        const data = await readBody(res);
        if (res.status === 403) {
          // Demo limiter is not enabled on this instance — hide all demo UI.
          setDemoDisabled(true);
          clearDemo();
          return null;
        }
        if (!res.ok) {
          throw new Error(data.detail || `Ошибка ${res.status}`);
        }
        const newSessionId = data.session_id || existingSessionId || sessionId || generateSessionId();
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(SESSION_KEY, newSessionId);
        setToken(data.token);
        setSessionId(newSessionId);
        setStatus(data);
        setDemoDisabled(false);
        return { ...data, session_id: newSessionId };
      } catch (err) {
        setError(err.message || "Не удалось начать демо-сессию.");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, clearDemo],
  );

  const refreshStatus = useCallback(async () => {
    if (!token) return null;
    try {
      const res = await fetch(`${getApiUrl()}/api/demo/status`, {
        headers: { "X-Demo-Token": token },
      });
      const data = await readBody(res);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          clearDemo();
        }
        throw new Error(data.detail || `Ошибка ${res.status}`);
      }
      setStatus(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [token, clearDemo]);

  // Auto-start a demo session on mount when one is not active and the limiter
  // has not been reported disabled.
  useEffect(() => {
    if (!token && !demoDisabled) {
      startDemo().catch(() => {
        /* error already captured in state */
      });
    }
  }, [token, demoDisabled, startDemo]);

  // Mirror the backend quota every 5s while a session is active.
  useEffect(() => {
    if (!token) return undefined;
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [token, refreshStatus]);

  const value = {
    token,
    sessionId,
    status,
    error,
    isLoading,
    demoDisabled,
    isDemoActive: !!token && !demoDisabled,
    startDemo,
    refreshStatus,
    clearDemo,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export default DemoContext;