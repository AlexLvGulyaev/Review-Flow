import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch, readApiError } from "../../lib/api.js";
import { OpPage, OpPageHeader } from "../components/OpPage.jsx";
import { OpToolbar, OpButton, OpInput, OpSelect, OpTextarea } from "../components/OpToolbar.jsx";
import { OpSplitView } from "../components/OpSplitView.jsx";
import { OpCardButton } from "../components/OpCard.jsx";
import { OpPill, OpPillRow } from "../components/OpPill.jsx";
import { OpMetadataGrid, OpMetadataList } from "../components/OpMetadata.jsx";
import { OpEditorSection } from "./components/OpEditorSection.jsx";
import { OpRelationshipBlock } from "./components/OpRelationshipBlock.jsx";
import { labelActiveFilter, labelEntityActive, formatKbRoutingLabel } from "../../lib/displayLabels.js";
import { KB_ENTITIES } from "./kbModel.js";

function entityPill(item) {
  const active = item?.is_active !== false;
  return { color: active ? "green" : "gray", label: labelEntityActive(active) };
}

function safeLower(s) {
  return String(s || "").toLowerCase();
}

function pickPatchBody(model, fields) {
  const body = {};
  fields.forEach((f) => {
    body[f.key] = model[f.key];
  });
  return body;
}

export default function KnowledgeBaseWorkspace({ initialEntityKey = "phrases" }) {
  const [entityKey, setEntityKey] = useState(initialEntityKey);
  const entity = KB_ENTITIES[entityKey] || KB_ENTITIES.phrases;

  const [lists, setLists] = useState({
    phrases: [],
    templates: [],
    scenarios: [],
    sentiments: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [activeFilter, setActiveFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("edit"); // edit | create

  const [editModel, setEditModel] = useState({});
  const [createModel, setCreateModel] = useState(entity.defaults);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const [phrasesRes, templatesRes, scenariosRes, sentimentsRes] = await Promise.all([
        apiFetch(KB_ENTITIES.phrases.apiBase),
        apiFetch(KB_ENTITIES.templates.apiBase),
        apiFetch(KB_ENTITIES.scenarios.apiBase),
        apiFetch(KB_ENTITIES.sentiments.apiBase),
      ]);

      const all = [phrasesRes, templatesRes, scenariosRes, sentimentsRes];
      for (const res of all) {
        if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить KB"));
      }

      const [phrases, templates, scenarios, sentiments] = await Promise.all(all.map((r) => r.json()));
      setLists({ phrases, templates, scenarios, sentiments });
    } catch (e) {
      setError(e.message || "Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    // when switching entity, reset mode/selection and defaults
    const nextEntity = KB_ENTITIES[entityKey] || KB_ENTITIES.phrases;
    setMode("edit");
    setSearch("");
    setActiveFilter("active");
    setSelectedId(null);
    setEditModel({});
    setCreateModel(nextEntity.defaults);
  }, [entityKey]);

  const currentList = lists[entityKey] || [];

  const filteredList = useMemo(() => {
    const needle = safeLower(search).trim();
    return currentList
      .filter((it) => {
        if (activeFilter === "active" && it.is_active === false) return false;
        if (activeFilter === "inactive" && it.is_active !== false) return false;
        return true;
      })
      .filter((it) => {
        if (!needle) return true;
        const hay = [
          entity.listPrimary(it),
          entity.listSemantic(it),
          entity.listPreview(it),
          it.id,
          it.code,
          it.scenario,
          it.sentiment,
          it.priority,
        ]
          .map(safeLower)
          .join(" ");
        return hay.includes(needle);
      });
  }, [activeFilter, currentList, entity, search]);

  useEffect(() => {
    if (!selectedId && filteredList.length) setSelectedId(filteredList[0][entity.idKey]);
  }, [filteredList, selectedId, entity]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return currentList.find((i) => i[entity.idKey] === selectedId) || null;
  }, [currentList, selectedId, entity]);

  useEffect(() => {
    if (!selected || mode !== "edit") return;
    // build edit model with entity fields
    const m = {};
    entity.fields.forEach((f) => {
      m[f.key] = selected[f.key] ?? (f.type === "checkbox" ? false : "");
    });
    setEditModel(m);
  }, [selected, entity, mode]);

  const relationships = useMemo(() => {
    if (!selected) return { summary: [], blocks: [] };
    const blocks = [];
    const summary = [];

    if (entityKey === "scenarios") {
      const code = selected.code;
      const phrasesLinked = lists.phrases.filter((p) => p.scenario === code);
      const templatesLinked = lists.templates.filter((t) => t.scenario === code);
      summary.push({ key: "phrases", color: "gray", label: `phrases: ${phrasesLinked.length}` });
      summary.push({ key: "templates", color: "gray", label: `templates: ${templatesLinked.length}` });
      blocks.push({
        title: "Linked phrases (by scenario code)",
        items: phrasesLinked.slice(0, 8).map((p) => ({ key: p.id, label: (p.phrase_text || "").slice(0, 32) })),
      });
      blocks.push({
        title: "Linked templates (by scenario code)",
        items: templatesLinked.slice(0, 8).map((t) => ({ key: t.id, label: t.title || "template" })),
      });
    }

    if (entityKey === "sentiments") {
      const code = selected.code;
      const phrasesLinked = lists.phrases.filter((p) => p.sentiment === code);
      const templatesLinked = lists.templates.filter((t) => t.sentiment === code);
      summary.push({ key: "phrases", color: "gray", label: `phrases: ${phrasesLinked.length}` });
      summary.push({ key: "templates", color: "gray", label: `templates: ${templatesLinked.length}` });
      blocks.push({
        title: "Linked phrases (by sentiment code)",
        items: phrasesLinked.slice(0, 8).map((p) => ({ key: p.id, label: (p.phrase_text || "").slice(0, 32) })),
      });
      blocks.push({
        title: "Linked templates (by sentiment code)",
        items: templatesLinked.slice(0, 8).map((t) => ({ key: t.id, label: t.title || "template" })),
      });
    }

    if (entityKey === "templates") {
      summary.push({ key: "scenario", color: "gray", label: formatKbRoutingLabel("scenario", selected.scenario) });
      summary.push({ key: "sentiment", color: "gray", label: formatKbRoutingLabel("sentiment", selected.sentiment) });
      summary.push({ key: "priority", color: "gray", label: formatKbRoutingLabel("priority", selected.priority) });
      blocks.push({
        title: "Template targeting",
        items: [
          { key: "scenario", label: formatKbRoutingLabel("scenario", selected.scenario) },
          { key: "sentiment", label: formatKbRoutingLabel("sentiment", selected.sentiment) },
          { key: "priority", label: formatKbRoutingLabel("priority", selected.priority) },
        ],
      });
    }

    if (entityKey === "phrases") {
      summary.push({ key: "scenario", color: "gray", label: formatKbRoutingLabel("scenario", selected.scenario) });
      summary.push({ key: "sentiment", color: "gray", label: formatKbRoutingLabel("sentiment", selected.sentiment) });
      summary.push({ key: "priority", color: "gray", label: formatKbRoutingLabel("priority", selected.priority) });
      blocks.push({
        title: "Phrase routing hints",
        items: [
          { key: "scenario", label: formatKbRoutingLabel("scenario", selected.scenario) },
          { key: "sentiment", label: formatKbRoutingLabel("sentiment", selected.sentiment) },
          { key: "priority", label: formatKbRoutingLabel("priority", selected.priority) },
        ],
      });
    }

    return { summary, blocks };
  }, [entityKey, lists, selected]);

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body = pickPatchBody(editModel, entity.fields.filter((f) => !f.readonlyOnEdit));
      const res = await apiFetch(`${entity.apiBase}/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось сохранить"));
      setMessage("Сохранено");
      await loadAll();
    } catch (e) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      // for create, include all fields that exist in defaults (server will validate)
      const res = await apiFetch(entity.apiBase, {
        method: "POST",
        body: JSON.stringify(createModel),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось создать"));
      const created = await res.json();
      setMessage("Создано");
      await loadAll();
      setEntityKey(entityKey);
      setMode("edit");
      setSelectedId(created.id);
    } catch (e) {
      setError(e.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  function renderField(f, model, setModel, { isEdit }) {
    const val = model[f.key];
    const disabled = saving || (isEdit && f.readonlyOnEdit);
    if (f.type === "checkbox") {
      return (
        <label key={f.key}>
          {f.label}
          <input
            type="checkbox"
            checked={!!val}
            onChange={(e) => setModel({ ...model, [f.key]: e.target.checked })}
            disabled={disabled}
          />
        </label>
      );
    }
    if (f.type === "textarea") {
      return (
        <label key={f.key}>
          {f.label}
          <OpTextarea
            rows={5}
            value={val ?? ""}
            onChange={(e) => setModel({ ...model, [f.key]: e.target.value })}
            disabled={disabled}
          />
        </label>
      );
    }
    return (
      <label key={f.key}>
        {f.label}
        <OpInput
          value={val ?? ""}
          onChange={(e) => setModel({ ...model, [f.key]: e.target.value })}
          disabled={disabled}
        />
      </label>
    );
  }

  return (
    <OpPage wide>
      <OpPageHeader
        title="Knowledge Base Workspace"
        subtitle="Unified list/detail/editor with relationship visibility. NL-style operational configuration surface."
        actions={
          <>
            <OpButton type="button" onClick={loadAll} disabled={loading || saving} variant="primary">
              Refresh
            </OpButton>
            <OpButton
              type="button"
              onClick={() => {
                setMode("create");
                setCreateModel(entity.defaults);
              }}
              disabled={loading || saving}
            >
              Create
            </OpButton>
          </>
        }
      />

      <div className="op-seg" aria-label="KB entity type">
        {Object.values(KB_ENTITIES).map((e) => (
          <button
            key={e.key}
            type="button"
            className={e.key === entityKey ? "op-seg-btn active" : "op-seg-btn"}
            onClick={() => setEntityKey(e.key)}
          >
            {e.title}
          </button>
        ))}
      </div>

      <OpToolbar>
        <label style={{ flex: 1, minWidth: 240 }}>
          search
          <OpInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="name / code / content…" />
        </label>
        <label>
          active
          <OpSelect value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
            <option value="active">{labelActiveFilter("active")}</option>
            <option value="inactive">{labelActiveFilter("inactive")}</option>
            <option value="all">{labelActiveFilter("all")}</option>
          </OpSelect>
        </label>
        <OpButton type="button" onClick={loadAll} disabled={loading || saving} variant="primary">
          {loading ? "Loading…" : "Refresh"}
        </OpButton>
        {error ? <span className="error">{error}</span> : null}
        {message ? <span className="success-inline">{message}</span> : null}
        {!loading && !error ? (
          <span className="muted">
            shown: <strong>{filteredList.length}</strong> / {currentList.length}
          </span>
        ) : null}
      </OpToolbar>

      <OpSplitView
        left={
          <>
            <h2 className="op-panel-title">{entity.title}</h2>
            {loading ? <p>Загрузка…</p> : null}
            {!loading && !error && filteredList.length === 0 ? <p>Нет записей</p> : null}
            <ul className="op-list">
              {filteredList.map((it) => {
                const id = it[entity.idKey];
                const status = entityPill(it);
                return (
                  <li key={id} style={{ marginBottom: 10 }}>
                    <OpCardButton
                      active={selectedId === id}
                      onClick={() => {
                        setSelectedId(id);
                        setMode("edit");
                      }}
                      primaryLeft={entity.listPrimary(it) || id}
                      primaryRight={it.updated_at ? new Date(it.updated_at).toLocaleDateString() : ""}
                      secondary={entity.listSemantic(it)}
                      preview={entity.listPreview(it)}
                      pills={[
                        { key: "active", color: status.color, label: status.label, title: "activation status" },
                      ]}
                    />
                  </li>
                );
              })}
            </ul>
          </>
        }
        right={
          <>
            <h2 className="op-panel-title">Workspace</h2>
            {mode === "create" ? (
              <>
                <OpEditorSection title={`Create: ${entity.title}`} right={<OpPill color="blue">create</OpPill>}>
                  {entity.fields.map((f) => renderField(f, createModel, setCreateModel, { isEdit: false }))}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <OpButton type="button" variant="primary" onClick={handleCreate} disabled={saving}>
                      Create
                    </OpButton>
                    <OpButton type="button" onClick={() => setMode("edit")} disabled={saving}>
                      Cancel
                    </OpButton>
                  </div>
                </OpEditorSection>
              </>
            ) : (
              <>
                {!selected ? <p>Выберите элемент слева</p> : null}
                {selected ? (
                  <>
                    <OpPillRow>
                      <OpPill color={selected.is_active ? "green" : "gray"}>
                        {labelEntityActive(selected.is_active !== false)}
                      </OpPill>
                      {relationships.summary.map((s) => (
                        <OpPill key={s.key} color={s.color || "gray"}>
                          {s.label}
                        </OpPill>
                      ))}
                    </OpPillRow>

                    <div style={{ marginTop: 12 }}>
                      <OpMetadataGrid>
                        <OpMetadataList
                          items={[
                            { key: "id", label: "ID", value: selected.id },
                            { key: "type", label: "Type", value: entity.title },
                          ]}
                        />
                        <OpMetadataList
                          items={[
                            { key: "created", label: "Created", value: selected.created_at ? new Date(selected.created_at).toLocaleString() : "—" },
                            { key: "updated", label: "Updated", value: selected.updated_at ? new Date(selected.updated_at).toLocaleString() : "—" },
                          ]}
                        />
                      </OpMetadataGrid>
                    </div>

                    <OpEditorSection
                      title="Editor"
                      right={
                        <OpButton type="button" variant="primary" onClick={handleSave} disabled={saving}>
                          Save
                        </OpButton>
                      }
                    >
                      {entity.fields.map((f) => renderField(f, editModel, setEditModel, { isEdit: true }))}
                    </OpEditorSection>

                    {relationships.blocks.map((b) => (
                      <OpRelationshipBlock key={b.title} title={b.title} items={b.items} />
                    ))}
                  </>
                ) : null}
              </>
            )}
          </>
        }
      />
    </OpPage>
  );
}

