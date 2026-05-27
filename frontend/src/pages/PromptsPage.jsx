import { useCallback, useEffect, useState } from "react";

import { apiFetch, readApiError } from "../lib/api.js";

export default function PromptsPage() {
  const [prompts, setPrompts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    prompt_key: "review_response_generation",
    title: "",
    system_prompt: "",
    user_prompt_template: "",
  });

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/prompts");
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить prompts"));
      const data = await res.json();
      setPrompts(data);
      setSelectedId((prev) => prev ?? data[0]?.id ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setLoadingDetail(true);
    try {
      const res = await apiFetch(`/api/prompts/${id}`);
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить prompt"));
      setDetail(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch("/api/prompts", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Не удалось создать prompt"));
      }
      const created = await res.json();
      setMessage(`Создана версия v${created.version}`);
      setForm((f) => ({ ...f, title: "", system_prompt: "", user_prompt_template: "" }));
      await loadList();
      setSelectedId(created.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleActivate() {
    if (!selectedId) return;
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/prompts/${selectedId}/activate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось активировать prompt"));
      setMessage("Prompt активирован");
      await loadList();
      await loadDetail(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page page-wide">
      <h1>Prompt Management</h1>
      {error && <p className="error">{error}</p>}
      {message && <p className="success-inline">{message}</p>}

      <div className="operator-layout">
        <aside className="operator-list">
          <h2>Версии</h2>
          {loading && <p>Загрузка…</p>}
          <ul>
            {prompts.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={selectedId === p.id ? "list-item active" : "list-item"}
                  onClick={() => setSelectedId(p.id)}
                >
                  <strong>{p.prompt_key}</strong>
                  <span>v{p.version} — {p.title}</span>
                  {p.is_active && <span className="badge">ACTIVE</span>}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="operator-detail">
          <h2>Детали prompt</h2>
          {loadingDetail && <p>Загрузка…</p>}
          {detail && (
            <>
              <p>
                <strong>{detail.prompt_key}</strong> v{detail.version}{" "}
                {detail.is_active && <span className="badge">ACTIVE</span>}
              </p>
              <div className="detail-block">
                <h3>System prompt</h3>
                <pre className="prompt-box">{detail.system_prompt}</pre>
              </div>
              <div className="detail-block">
                <h3>User template</h3>
                <pre className="prompt-box">{detail.user_prompt_template}</pre>
              </div>
              {!detail.is_active && (
                <button type="button" className="btn-approve" onClick={handleActivate}>
                  Activate
                </button>
              )}
            </>
          )}

          <form className="review-form" onSubmit={handleCreate} style={{ marginTop: "2rem" }}>
            <h3>Новая версия</h3>
            <label>
              prompt_key
              <input
                value={form.prompt_key}
                onChange={(e) => setForm({ ...form, prompt_key: e.target.value })}
              />
            </label>
            <label>
              title
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>
            <label>
              system_prompt
              <textarea
                rows={8}
                value={form.system_prompt}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                required
              />
            </label>
            <label>
              user_prompt_template
              <textarea
                rows={6}
                value={form.user_prompt_template}
                onChange={(e) =>
                  setForm({ ...form, user_prompt_template: e.target.value })
                }
                required
              />
            </label>
            <button type="submit">Создать версию</button>
          </form>
        </section>
      </div>
    </main>
  );
}
