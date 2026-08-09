import { useCallback, useEffect, useState } from "react";
import { apiFetch, readApiError } from "../lib/api.js";

export default function AdminKbPage({ title, apiBase, fields, createDefaults }) {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [createForm, setCreateForm] = useState(createDefaults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(apiBase);
      if (!res.ok) {
        throw new Error(await readApiError(res, "Не удалось загрузить список"));
      }
      const data = await res.json();
      setItems(data);
      setSelectedId((prev) => prev ?? data[0]?.id ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    const item = items.find((i) => i.id === selectedId);
    if (item) {
      const form = {};
      fields.forEach((f) => {
        form[f.key] = item[f.key] ?? (f.type === "checkbox" ? false : "");
      });
      setEditForm(form);
    }
  }, [selectedId, items, fields]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const body = {};
      fields.forEach((f) => {
        if (f.create) body[f.key] = createForm[f.key];
      });
      const res = await apiFetch(apiBase, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(await readApiError(res, "Не удалось создать запись"));
      }
      const created = await res.json();
      setMessage("Запись создана");
      setCreateForm(createDefaults);
      await loadList();
      setSelectedId(created.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);
    setMessage(null);
    try {
      const body = {};
      fields.forEach((f) => {
        if (f.edit) body[f.key] = editForm[f.key];
      });
      const res = await apiFetch(`${apiBase}/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(await readApiError(res, "Не удалось сохранить"));
      }
      setMessage("Сохранено");
      await loadList();
    } catch (err) {
      setError(err.message);
    }
  }

  function renderField(f, form, setForm) {
    const val = form[f.key];
    if (f.type === "checkbox") {
      return (
        <label key={f.key}>
          {f.label}:{" "}
          <input
            type="checkbox"
            checked={!!val}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
          />
        </label>
      );
    }
    if (f.type === "textarea") {
      return (
        <label key={f.key}>
          {f.label}
          <textarea
            rows={4}
            value={val ?? ""}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
          />
        </label>
      );
    }
    return (
      <label key={f.key}>
        {f.label}
        <input
          type="text"
          value={val ?? ""}
          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
        />
      </label>
    );
  }

  const listLabel = (item) => {
    const primary = fields.find((f) => f.listPrimary);
    if (primary) return String(item[primary.key] ?? item.id);
    return item.title || item.code || item.phrase_text || item.id;
  };

  return (
    <main className="page admin-kb-page">
      <h1>{title}</h1>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <div className="admin-kb-layout">
          <section className="admin-kb-list">
            <h2>Список</h2>
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={item.id === selectedId ? "active" : ""}
                    onClick={() => setSelectedId(item.id)}
                  >
                    {listLabel(item)}
                    {!item.is_active && " (неактивно)"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="admin-kb-edit">
            <h2>Редактирование</h2>
            {selectedId ? (
              <form onSubmit={handleUpdate}>
                {fields.filter((f) => f.edit).map((f) => renderField(f, editForm, setEditForm))}
                <button type="submit">Сохранить</button>
              </form>
            ) : (
              <p>Выберите запись</p>
            )}
          </section>
          <section className="admin-kb-create">
            <h2>Создать</h2>
            <form onSubmit={handleCreate}>
              {fields.filter((f) => f.create).map((f) => renderField(f, createForm, setCreateForm))}
              <button type="submit">Создать</button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
