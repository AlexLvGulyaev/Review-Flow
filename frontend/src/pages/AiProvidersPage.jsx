import { useCallback, useEffect, useState } from "react";
import { apiFetch, readApiError } from "../lib/api.js";

const emptyEdit = {
  model_name: "",
  is_enabled: false,
  temperature: "",
  max_tokens: "",
};

export default function AiProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [effective, setEffective] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [edit, setEdit] = useState(emptyEdit);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, effRes] = await Promise.all([
        apiFetch("/api/settings/ai-providers"),
        apiFetch("/api/settings/ai-providers/effective"),
      ]);
      if (!listRes.ok) throw new Error(await readApiError(listRes, "Не удалось загрузить providers"));
      if (!effRes.ok) throw new Error(await readApiError(effRes, "Не удалось загрузить effective"));
      const list = await listRes.json();
      setProviders(list);
      setEffective(await effRes.json());
      setSelectedKey((prev) => prev ?? list[0]?.provider_key ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selected = providers.find((p) => p.provider_key === selectedKey);

  useEffect(() => {
    if (selected) {
      setEdit({
        model_name: selected.model_name,
        is_enabled: selected.is_enabled,
        temperature: selected.temperature ?? "",
        max_tokens: selected.max_tokens ?? "",
      });
      setTestResult(null);
    }
  }, [selectedKey, selected]);

  async function handleSave(e) {
    e.preventDefault();
    if (!selectedKey) return;
    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      const body = {
        model_name: edit.model_name,
        is_enabled: edit.is_enabled,
        temperature: edit.temperature === "" ? null : Number(edit.temperature),
        max_tokens: edit.max_tokens === "" ? null : Number(edit.max_tokens),
      };
      const res = await apiFetch(`/api/settings/ai-providers/${selectedKey}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось сохранить"));
      setMessage("Настройки сохранены");
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function runAction(path, okMsg) {
    if (!selectedKey) return;
    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/settings/ai-providers/${selectedKey}${path}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readApiError(res, "Ошибка действия"));
      setMessage(okMsg);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTest() {
    if (!selectedKey) return;
    setActionLoading(true);
    setError(null);
    setTestResult(null);
    try {
      const res = await apiFetch(`/api/settings/ai-providers/${selectedKey}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResult(data);
      if (!data.ok) setError(data.message);
      else setMessage(data.message);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main className="page page-wide">
      <h1>AI Provider Settings</h1>
      <p className="muted">
        Секреты задаются только в <code>.env</code> (имена переменных ниже). UI не хранит ключи.
      </p>

      {error && <p className="error">{error}</p>}
      {message && <p className="success-inline">{message}</p>}

      {effective && (
        <section className="detail-block effective-block">
          <h2>Effective settings</h2>
          <p>
            <strong>Readiness:</strong> {effective.readiness}
            {effective.effective_model && (
              <>
                {" "}
                · <strong>Model:</strong> {effective.effective_model}
              </>
            )}
          </p>
          {effective.active && (
            <p>
              Active: {effective.active.display_name} ({effective.active.provider_key}) —{" "}
              {effective.active.readiness}
            </p>
          )}
          {effective.fallback && (
            <p>
              Fallback: {effective.fallback.display_name} ({effective.fallback.provider_key}) —{" "}
              {effective.fallback.readiness}
            </p>
          )}
          {effective.missing_env_keys?.length > 0 && (
            <p className="error">
              Missing env: {effective.missing_env_keys.join(", ")}
            </p>
          )}
          {effective.warnings?.map((w, i) => (
            <p key={i} className="notice">
              {w}
            </p>
          ))}
        </section>
      )}

      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <div className="operator-layout">
          <aside className="operator-list">
            <h2>Providers</h2>
            <ul>
              {providers.map((p) => (
                <li key={p.provider_key}>
                  <button
                    type="button"
                    className={
                      selectedKey === p.provider_key ? "list-item active" : "list-item"
                    }
                    onClick={() => setSelectedKey(p.provider_key)}
                  >
                    <strong>{p.display_name}</strong>
                    <span>{p.model_name}</span>
                    {p.is_active && <span className="badge">ACTIVE</span>}
                    {p.is_fallback && <span className="badge">FALLBACK</span>}
                    {p.implementation_status === "not_implemented" && (
                      <span className="badge">NOT IMPL</span>
                    )}
                    {!p.is_enabled && <span className="muted">disabled</span>}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="operator-detail">
            <h2>Настройки</h2>
            {!selected && <p>Выберите provider</p>}
            {selected && (
              <>
                {selected.implementation_status === "not_implemented" && (
                  <p className="notice provider-stub-notice">
                    <strong>Not implemented.</strong>{" "}
                    {selected.readiness_reason || "This provider cannot be used yet."}
                  </p>
                )}
                {selected.provider_key === "gigachat" &&
                  selected.implementation_status === "implemented" && (
                    <p className="notice">
                      GigaChat uses OAuth (<code>GIGACHAT_AUTH_KEY</code> or client id/secret).
                      Secrets stay in <code>.env</code> only.
                    </p>
                  )}

                <table className="data-table provider-meta">
                  <tbody>
                    <tr>
                      <td>Implementation</td>
                      <td>
                        {selected.implementation_status === "not_implemented"
                          ? "Stub / not implemented"
                          : selected.implementation_status}
                      </td>
                    </tr>
                    {selected.credentials_check_applicable ? (
                      <>
                        <tr>
                          <td>
                            {selected.provider_key === "gigachat"
                              ? "Auth credential env"
                              : "API key env"}
                          </td>
                          <td>
                            <code>{selected.api_key_env_key || "—"}</code>{" "}
                            {selected.api_key_configured ? "✓" : "✗"}
                          </td>
                        </tr>
                        <tr>
                          <td>Base URL env</td>
                          <td>
                            <code>{selected.base_url_env_key || "—"}</code>{" "}
                            {selected.base_url_configured ? "✓" : "✗"}
                          </td>
                        </tr>
                      </>
                    ) : (
                      <>
                        <tr>
                          <td>Auth env (informational)</td>
                          <td>
                            <code>{selected.api_key_env_key || "—"}</code>
                            {selected.api_key_configured
                              ? " — значение в .env есть, интеграция не реализована"
                              : " — не задано в .env"}
                          </td>
                        </tr>
                        {selected.related_env_keys?.length > 0 && (
                          <tr>
                            <td>Related .env keys</td>
                            <td>
                              {selected.related_env_keys.map((k) => (
                                <code key={k} className="env-key-chip">
                                  {k}
                                </code>
                              ))}
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>

                <form className="review-form" onSubmit={handleSave}>
                  <label>
                    model_name
                    <input
                      value={edit.model_name}
                      onChange={(e) => setEdit({ ...edit, model_name: e.target.value })}
                      required
                      disabled={actionLoading}
                    />
                  </label>
                  <label>
                    enabled{" "}
                    <input
                      type="checkbox"
                      checked={edit.is_enabled}
                      onChange={(e) => setEdit({ ...edit, is_enabled: e.target.checked })}
                      disabled={actionLoading}
                    />
                  </label>
                  <label>
                    temperature
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="2"
                      value={edit.temperature}
                      onChange={(e) => setEdit({ ...edit, temperature: e.target.value })}
                      disabled={actionLoading}
                    />
                  </label>
                  <label>
                    max_tokens
                    <input
                      type="number"
                      min="1"
                      value={edit.max_tokens}
                      onChange={(e) => setEdit({ ...edit, max_tokens: e.target.value })}
                      disabled={actionLoading}
                    />
                  </label>
                  <button type="submit" disabled={actionLoading}>
                    Сохранить
                  </button>
                </form>

                <div className="action-row">
                  <button
                    type="button"
                    className="btn-approve"
                    disabled={
                      actionLoading || selected.implementation_status === "not_implemented"
                    }
                    onClick={() => runAction("/activate", "Provider активирован")}
                  >
                    Activate
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => runAction("/set-fallback", "Fallback обновлён")}
                  >
                    Set fallback
                  </button>
                  <button type="button" disabled={actionLoading} onClick={handleTest}>
                    Test provider
                  </button>
                </div>

                {testResult && (
                  <pre className="metadata-preview">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
