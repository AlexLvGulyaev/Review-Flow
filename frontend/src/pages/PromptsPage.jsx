import { useCallback, useEffect, useState } from "react";

import { apiFetch, readApiError } from "../lib/api.js";
import { OpPage, OpPageHeader } from "../ops/components/OpPage.jsx";
import { OpToolbar, OpButton, OpInput, OpTextarea } from "../ops/components/OpToolbar.jsx";
import { OpSplitView } from "../ops/components/OpSplitView.jsx";
import { OpCardButton } from "../ops/components/OpCard.jsx";
import { OpPill, OpPillRow } from "../ops/components/OpPill.jsx";
import { OpEditorSection } from "../ops/kb/components/OpEditorSection.jsx";
import { OpPayloadBlock } from "../ops/observability/OpPayloadBlock.jsx";

export default function PromptsPage() {
  const [prompts, setPrompts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
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

  const items = prompts
    .filter((p) => (activeOnly ? p.is_active : true))
    .filter((p) => {
      const needle = String(search || "").toLowerCase().trim();
      if (!needle) return true;
      const hay = `${p.prompt_key} ${p.title} v${p.version}`.toLowerCase();
      return hay.includes(needle);
    })
    .map((p) => {
      const createdAt = p.created_at ? new Date(p.created_at).toLocaleDateString() : "";
      return {
        key: p.id,
        active: selectedId === p.id,
        primaryLeft: `${p.prompt_key}`,
        primaryRight: createdAt,
        secondary: `v${p.version} — ${p.title}`,
        preview: "",
        pills: [
          {
            key: "state",
            color: p.is_active ? "green" : "gray",
            label: p.is_active ? "active" : "inactive",
            title: "activation state",
          },
        ],
        raw: p,
      };
    });

  return (
    <OpPage wide>
      <OpPageHeader
        title="AI Governance — Prompts"
        subtitle="Versioned AI configuration. Active prompt state and safe activation semantics."
        actions={
          <OpButton type="button" onClick={loadList} disabled={loading} variant="primary">
            Refresh
          </OpButton>
        }
      />

      <OpToolbar>
        <label style={{ flex: 1, minWidth: 240 }}>
          search
          <OpInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="prompt_key / title…" />
        </label>
        <label>
          active only
          <select className="op-select" value={activeOnly ? "1" : "0"} onChange={(e) => setActiveOnly(e.target.value === "1")}>
            <option value="0">all</option>
            <option value="1">active</option>
          </select>
        </label>
        <OpButton type="button" onClick={loadList} disabled={loading} variant="primary">
          {loading ? "Loading…" : "Refresh"}
        </OpButton>
        {error ? <span className="error">{error}</span> : null}
        {message ? <span className="success-inline">{message}</span> : null}
      </OpToolbar>

      <OpSplitView
        left={
          <>
            <h2 className="op-panel-title">Prompt versions</h2>
            {loading ? <p>Загрузка…</p> : null}
            {!loading && items.length === 0 ? <p>Нет промптов</p> : null}
            <ul className="op-list">
              {items.map((it) => (
                <li key={it.key} style={{ marginBottom: 10 }}>
                  <OpCardButton
                    active={it.active}
                    onClick={() => setSelectedId(it.key)}
                    primaryLeft={it.primaryLeft}
                    primaryRight={it.primaryRight}
                    secondary={it.secondary}
                    preview={it.preview}
                    pills={it.pills}
                  />
                </li>
              ))}
            </ul>
          </>
        }
        right={
          <>
            <h2 className="op-panel-title">Workspace</h2>
            {loadingDetail ? <p>Загрузка…</p> : null}
            {!detail ? <p>Выберите prompt</p> : null}
            {detail ? (
              <>
                <OpPillRow>
                  <OpPill color={detail.is_active ? "green" : "gray"}>{detail.is_active ? "active" : "inactive"}</OpPill>
                  <OpPill color="gray">
                    {detail.prompt_key} v{detail.version}
                  </OpPill>
                </OpPillRow>

                <div style={{ marginTop: 12 }}>
                  <OpEditorSection
                    title="Prompt header"
                    right={
                      !detail.is_active ? (
                        <OpButton type="button" onClick={handleActivate} variant="primary">
                          Activate
                        </OpButton>
                      ) : null
                    }
                  >
                    <div className="muted">Title: <strong>{detail.title}</strong></div>
                    <div className="muted">
                      Created: {detail.created_at ? new Date(detail.created_at).toLocaleString() : "—"} · Updated:{" "}
                      {detail.updated_at ? new Date(detail.updated_at).toLocaleString() : "—"}
                    </div>
                  </OpEditorSection>
                </div>

                <OpEditorSection title="System prompt (read-only)">
                  <OpTextarea rows={10} value={detail.system_prompt || ""} readOnly />
                </OpEditorSection>

                <OpEditorSection title="User template (read-only)">
                  <OpTextarea rows={8} value={detail.user_prompt_template || ""} readOnly />
                </OpEditorSection>

                <OpPayloadBlock title="Prompt metadata (compact)" payload={{ prompt_key: detail.prompt_key, version: detail.version, is_active: detail.is_active }} />

                <OpEditorSection title="Create new version">
                  <form onSubmit={handleCreate}>
                    <label>
                      prompt_key
                      <OpInput value={form.prompt_key} onChange={(e) => setForm({ ...form, prompt_key: e.target.value })} />
                    </label>
                    <label>
                      title
                      <OpInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    </label>
                    <label>
                      system_prompt
                      <OpTextarea
                        rows={8}
                        value={form.system_prompt}
                        onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                        required
                      />
                    </label>
                    <label>
                      user_prompt_template
                      <OpTextarea
                        rows={6}
                        value={form.user_prompt_template}
                        onChange={(e) => setForm({ ...form, user_prompt_template: e.target.value })}
                        required
                      />
                    </label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <OpButton type="submit" variant="primary">
                        Create version
                      </OpButton>
                    </div>
                  </form>
                </OpEditorSection>
              </>
            ) : null}
          </>
        }
      />
    </OpPage>
  );
}
