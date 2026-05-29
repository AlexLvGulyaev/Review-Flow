import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch, readApiError } from "../../lib/api.js";
import { fetchClassificationReference, refOptions } from "../../lib/classificationReference.js";
import { labelActiveFilter, labelEntityActive } from "../../lib/displayLabels.js";
import { OpPage, OpPageHeader } from "../components/OpPage.jsx";
import { OpToolbar, OpButton, OpInput, OpSelect, OpTextarea } from "../components/OpToolbar.jsx";
import { OpSplitView } from "../components/OpSplitView.jsx";
import { OpCardButton } from "../components/OpCard.jsx";
import { OpPill, OpPillRow } from "../components/OpPill.jsx";
import { OpMetadataGrid } from "../components/OpMetadata.jsx";

const API = "/api/admin";

const EMPTY_CASE = {
  case_code: "",
  title: "",
  description: "",
  scenario_id: "",
  sentiment_id: "",
  priority_id: "",
  product_area_id: "",
  topic_id: "",
  response_policy: "",
  approved_response_text: "",
  confidence_threshold: "0.75",
  review_policy: "operator_required",
};

function slugFromTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function casePill(item) {
  const active = item?.is_active !== false;
  return { color: active ? "green" : "gray", label: labelEntityActive(active) };
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU");
  } catch {
    return iso;
  }
}

export default function ResponseCasesAdminWorkspace() {
  const [tab, setTab] = useState("cases");
  const [cases, setCases] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [catalog, setCatalog] = useState({ product_areas: [], review_topics: [] });
  const [classRef, setClassRef] = useState({ scenarios: [], sentiments: [], priorities: [] });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [activeFilter, setActiveFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  const [mode, setMode] = useState("edit");
  const [editModel, setEditModel] = useState({});
  const [createModel, setCreateModel] = useState(EMPTY_CASE);
  const [newExampleText, setNewExampleText] = useState("");

  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [mergeCaseId, setMergeCaseId] = useState("");
  const [rejectComment, setRejectComment] = useState("");

  const loadCases = useCallback(async () => {
    const params = new URLSearchParams();
    if (activeFilter === "active") params.set("is_active", "true");
    else if (activeFilter === "archived") params.set("is_active", "false");
    if (search.trim()) params.set("search", search.trim());
    const res = await apiFetch(`${API}/response-cases?${params}`);
    if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить cases"));
    return res.json();
  }, [activeFilter, search]);

  const loadCandidates = useCallback(async () => {
    const res = await apiFetch(`${API}/response-case-candidates?status=pending_admin`);
    if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить кандидатов"));
    return res.json();
  }, []);

  const loadCatalog = useCallback(async () => {
    const res = await apiFetch(`${API}/ch-catalog`);
    if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить каталог CH"));
    return res.json();
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const [caseList, candList, cat, cref] = await Promise.all([
        loadCases(),
        loadCandidates(),
        loadCatalog(),
        fetchClassificationReference(),
      ]);
      setCases(caseList);
      setCandidates(candList);
      setCatalog(cat);
      setClassRef(cref);
    } catch (e) {
      setError(e.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [loadCases, loadCandidates, loadCatalog]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadCaseDetail = useCallback(async (caseId) => {
    const res = await apiFetch(`${API}/response-cases/${caseId}`);
    if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить case"));
    const data = await res.json();
    setCaseDetail(data);
    setEditModel({
      title: data.title,
      description: data.description ?? "",
      scenario_id: data.scenario?.id ?? "",
      sentiment_id: data.sentiment?.id ?? "",
      priority_id: data.priority?.id ?? "",
      product_area_id: data.product_area?.id ?? "",
      topic_id: data.topic?.id ?? "",
      response_policy: data.response_policy ?? "",
      approved_response_text: data.approved_response_text ?? "",
      confidence_threshold: String(data.confidence_threshold ?? "0.75"),
      review_policy: data.review_policy ?? "operator_required",
    });
  }, []);

  useEffect(() => {
    if (!selectedCaseId || mode === "create") {
      setCaseDetail(null);
      return;
    }
    loadCaseDetail(selectedCaseId).catch((e) => setError(e.message));
  }, [selectedCaseId, mode, loadCaseDetail]);

  const filteredCases = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return cases;
    return cases.filter((c) => {
      const hay = [c.title, c.case_code, c.product_area?.name, c.topic?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [cases, search]);

  const topicsForArea = useCallback(
    (areaId) => {
      if (!areaId) return catalog.review_topics ?? [];
      return (catalog.review_topics ?? []).filter(
        (t) => t.product_area?.id === areaId || t.product_area_id === areaId
      );
    },
    [catalog.review_topics]
  );

  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId]
  );

  async function handleSaveCase() {
    if (!selectedCaseId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body = {
        ...editModel,
        confidence_threshold: editModel.confidence_threshold,
        description: editModel.description || null,
      };
      const res = await apiFetch(`${API}/response-cases/${selectedCaseId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось сохранить"));
      setMessage("Сохранено");
      await loadAll();
      await loadCaseDetail(selectedCaseId);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCase() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const code = createModel.case_code.trim() || slugFromTitle(createModel.title);
      const res = await apiFetch(`${API}/response-cases`, {
        method: "POST",
        body: JSON.stringify({ ...createModel, case_code: code }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось создать"));
      const created = await res.json();
      setMessage("Типовая ситуация создана");
      setMode("edit");
      setSelectedCaseId(created.id);
      await loadAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLifecycle(activate) {
    if (!selectedCaseId) return;
    setSaving(true);
    setError(null);
    try {
      const path = activate ? "activate" : "archive";
      const res = await apiFetch(`${API}/response-cases/${selectedCaseId}/${path}`, { method: "POST" });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось обновить статус"));
      setMessage(activate ? "Активировано" : "В архиве");
      await loadAll();
      await loadCaseDetail(selectedCaseId);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddExample() {
    if (!selectedCaseId || !newExampleText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`${API}/response-cases/${selectedCaseId}/examples`, {
        method: "POST",
        body: JSON.stringify({ example_text: newExampleText.trim() }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось добавить пример"));
      setNewExampleText("");
      await loadCaseDetail(selectedCaseId);
      await loadAll();
      setMessage("Пример добавлен");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExamplePatch(exampleId, patch) {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`${API}/response-case-examples/${exampleId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось обновить пример"));
      await loadCaseDetail(selectedCaseId);
      setMessage("Пример обновлён");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveCandidate(mergeInto) {
    if (!selectedCandidateId) return;
    setSaving(true);
    setError(null);
    try {
      const body = mergeInto ? { merge_into_case_id: mergeInto } : {};
      const res = await apiFetch(`${API}/response-case-candidates/${selectedCandidateId}/approve`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось обработать кандидата"));
      setMessage(mergeInto ? "Объединено с case" : "Создан новый case");
      setSelectedCandidateId(null);
      setMergeCaseId("");
      await loadAll();
      setTab("cases");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRejectCandidate() {
    if (!selectedCandidateId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`${API}/response-case-candidates/${selectedCandidateId}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejection_comment: rejectComment.trim() || null }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось отклонить"));
      setMessage("Кандидат отклонён");
      setSelectedCandidateId(null);
      setRejectComment("");
      await loadAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function renderRefSelect(key, label, model, setModel, refKey) {
    const options = refOptions(classRef, refKey);
    return (
      <label key={key}>
        {label}
        <OpSelect
          value={model[key] ?? ""}
          onChange={(e) => setModel({ ...model, [key]: e.target.value })}
          disabled={saving}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.code})
            </option>
          ))}
        </OpSelect>
      </label>
    );
  }

  function renderCaseForm(model, setModel, { isCreate }) {
    const topics = topicsForArea(model.product_area_id);
    return (
      <div className="op-form-stack">
        {isCreate && (
          <label>
            Код case
            <OpInput
              value={model.case_code}
              onChange={(e) => setModel({ ...model, case_code: e.target.value })}
              placeholder={slugFromTitle(model.title) || "auto из названия"}
              disabled={saving}
            />
          </label>
        )}
        <label>
          Название
          <OpInput
            value={model.title}
            onChange={(e) => setModel({ ...model, title: e.target.value })}
            disabled={saving}
          />
        </label>
        <label>
          Описание
          <OpTextarea
            rows={3}
            value={model.description}
            onChange={(e) => setModel({ ...model, description: e.target.value })}
            disabled={saving}
          />
        </label>
        {renderRefSelect("scenario_id", "Сценарий", model, setModel, "scenarios")}
        {renderRefSelect("sentiment_id", "Тональность", model, setModel, "sentiments")}
        {renderRefSelect("priority_id", "Приоритет", model, setModel, "priorities")}
        <label>
          Продуктовая область
          <OpSelect
            value={model.product_area_id ?? ""}
            onChange={(e) =>
              setModel({ ...model, product_area_id: e.target.value, topic_id: "" })
            }
            disabled={saving}
          >
            <option value="">—</option>
            {(catalog.product_areas ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </OpSelect>
        </label>
        <label>
          Тема
          <OpSelect
            value={model.topic_id ?? ""}
            onChange={(e) => setModel({ ...model, topic_id: e.target.value })}
            disabled={saving}
          >
            <option value="">—</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </OpSelect>
        </label>
        <label>
          Политика ответа
          <OpTextarea
            rows={4}
            value={model.response_policy}
            onChange={(e) => setModel({ ...model, response_policy: e.target.value })}
            disabled={saving}
          />
        </label>
        <label>
          Утверждённый ответ
          <OpTextarea
            rows={5}
            value={model.approved_response_text}
            onChange={(e) => setModel({ ...model, approved_response_text: e.target.value })}
            disabled={saving}
          />
        </label>
        <label>
          Порог уверенности
          <OpInput
            value={model.confidence_threshold}
            onChange={(e) => setModel({ ...model, confidence_threshold: e.target.value })}
            disabled={saving}
          />
        </label>
        <label>
          Политика проверки
          <OpInput
            value={model.review_policy}
            onChange={(e) => setModel({ ...model, review_policy: e.target.value })}
            disabled={saving}
          />
        </label>
      </div>
    );
  }

  const casesListPane = (
    <>
      <OpToolbar>
        <OpInput
          placeholder="Поиск…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={loading}
        />
        <OpSelect
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          disabled={loading}
          aria-label="Фильтр статуса"
        >
          <option value="all">Все</option>
          <option value="active">{labelActiveFilter("active")}</option>
          <option value="archived">{labelActiveFilter("archived")}</option>
        </OpSelect>
        <OpButton type="button" onClick={loadAll} disabled={loading || saving}>
          Обновить
        </OpButton>
        <OpButton
          type="button"
          onClick={() => {
            setTab("cases");
            setMode("create");
            setSelectedCaseId(null);
            setCreateModel(EMPTY_CASE);
          }}
          disabled={loading || saving}
        >
          Создать case
        </OpButton>
      </OpToolbar>
      {filteredCases.map((item) => (
        <OpCardButton
          key={item.id}
          active={item.id === selectedCaseId && mode !== "create"}
          onClick={() => {
            setMode("edit");
            setSelectedCaseId(item.id);
          }}
        >
          <div className="op-card-title">{item.title}</div>
          <OpPillRow>
            <OpPill {...casePill(item)} />
            <OpPill color="blue" label={`${item.examples_count ?? 0} прим.`} />
          </OpPillRow>
          <div className="op-card-meta">
            {item.product_area?.name} · {item.topic?.name}
          </div>
        </OpCardButton>
      ))}
      {!loading && filteredCases.length === 0 && (
        <p className="op-muted">Нет типовых ситуаций по выбранному фильтру.</p>
      )}
    </>
  );

  const casesDetailPane =
    mode === "create" ? (
      <>
        <h3 className="op-panel-title">Новая типовая ситуация</h3>
        {renderCaseForm(createModel, setCreateModel, { isCreate: true })}
        <OpButton type="button" onClick={handleCreateCase} disabled={saving} variant="primary">
          Создать
        </OpButton>
      </>
    ) : caseDetail ? (
      <>
        <OpPillRow>
          <OpPill {...casePill(caseDetail)} />
          <OpPill color="gray" label={caseDetail.case_code} />
        </OpPillRow>
        <OpMetadataGrid
          items={[
            { label: "Область", value: caseDetail.product_area?.name },
            { label: "Тема", value: caseDetail.topic?.name },
            { label: "Обновлено", value: formatDate(caseDetail.updated_at) },
          ]}
        />
        {renderCaseForm(editModel, setEditModel, { isCreate: false })}
        <OpToolbar>
          <OpButton type="button" onClick={handleSaveCase} disabled={saving} variant="primary">
            Сохранить
          </OpButton>
          {caseDetail.is_active ? (
            <OpButton type="button" onClick={() => handleLifecycle(false)} disabled={saving}>
              В архив
            </OpButton>
          ) : (
            <OpButton type="button" onClick={() => handleLifecycle(true)} disabled={saving}>
              Активировать
            </OpButton>
          )}
        </OpToolbar>
        <section className="op-section">
          <h4>Примеры для retrieval</h4>
          {(caseDetail.examples ?? []).map((ex) => (
            <div key={ex.id} className="op-example-row">
              <OpTextarea
                rows={2}
                value={ex.example_text}
                disabled={!ex.is_active || saving}
                onChange={(e) => {
                  const next = caseDetail.examples.map((x) =>
                    x.id === ex.id ? { ...x, example_text: e.target.value } : x
                  );
                  setCaseDetail({ ...caseDetail, examples: next });
                }}
                onBlur={(e) => {
                  const nextText = e.target.value;
                  if (nextText !== ex.example_text) {
                    handleExamplePatch(ex.id, { example_text: nextText });
                  }
                }}
              />
              <OpButton
                type="button"
                disabled={saving || !ex.is_active}
                onClick={() => handleExamplePatch(ex.id, { is_active: false })}
              >
                Деактивировать
              </OpButton>
              {!ex.is_active && <OpPill color="gray" label="Неактивен" />}
            </div>
          ))}
          <label>
            Новый пример
            <OpTextarea
              rows={2}
              value={newExampleText}
              onChange={(e) => setNewExampleText(e.target.value)}
              disabled={saving}
            />
          </label>
          <OpButton type="button" onClick={handleAddExample} disabled={saving || !newExampleText.trim()}>
            Добавить пример
          </OpButton>
        </section>
      </>
    ) : (
      <p className="op-muted">Выберите типовую ситуацию из списка.</p>
    );

  const candidatesListPane = (
    <>
      <OpToolbar>
        <OpButton type="button" onClick={loadAll} disabled={loading || saving}>
          Обновить очередь
        </OpButton>
        <span className="op-muted">{candidates.length} в ожидании</span>
      </OpToolbar>
      {candidates.map((c) => (
        <OpCardButton
          key={c.id}
          active={c.id === selectedCandidateId}
          onClick={() => setSelectedCandidateId(c.id)}
        >
          <div className="op-card-title">{c.proposed_title || "Без названия"}</div>
          <div className="op-card-meta">{formatDate(c.created_at)}</div>
        </OpCardButton>
      ))}
      {!loading && candidates.length === 0 && (
        <p className="op-muted">Очередь кандидатов пуста.</p>
      )}
    </>
  );

  const candidatesDetailPane = selectedCandidate ? (
    <>
      <h3 className="op-panel-title">{selectedCandidate.proposed_title}</h3>
      <OpMetadataGrid
        items={[
          { label: "Описание", value: selectedCandidate.proposed_description || "—" },
          { label: "Создан", value: formatDate(selectedCandidate.created_at) },
          { label: "Оператор", value: selectedCandidate.proposed_by_operator_id || "—" },
          { label: "Review ID", value: selectedCandidate.review_id },
        ]}
      />
      {selectedCandidate.proposed_approved_response_text && (
        <label>
          Предложенный ответ
          <OpTextarea rows={4} value={selectedCandidate.proposed_approved_response_text} readOnly />
        </label>
      )}
      <OpToolbar>
        <OpButton
          type="button"
          variant="primary"
          disabled={saving}
          onClick={() => handleApproveCandidate(null)}
        >
          Создать новый case
        </OpButton>
      </OpToolbar>
      <div className="op-form-stack">
        <label>
          Объединить с существующим case
          <OpSelect value={mergeCaseId} onChange={(e) => setMergeCaseId(e.target.value)} disabled={saving}>
            <option value="">— выберите case —</option>
            {cases
              .filter((c) => c.is_active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </OpSelect>
        </label>
        <OpButton
          type="button"
          disabled={saving || !mergeCaseId}
          onClick={() => handleApproveCandidate(mergeCaseId)}
        >
          Объединить
        </OpButton>
        <label>
          Комментарий при отклонении
          <OpTextarea rows={2} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} />
        </label>
        <OpButton type="button" disabled={saving} onClick={handleRejectCandidate}>
          Отклонить кандидата
        </OpButton>
      </div>
    </>
  ) : (
    <p className="op-muted">Выберите кандидата из очереди.</p>
  );

  return (
    <OpPage wide>
      <OpPageHeader
        title="Типовые ситуации (Controlled Hybrid)"
        subtitle="Управление базой знаний: cases, примеры, политики ответов и очередь кандидатов."
        actions={
          <OpButton type="button" onClick={loadAll} disabled={loading || saving} variant="primary">
            Обновить всё
          </OpButton>
        }
      />

      <div className="op-seg" aria-label="CH admin section">
        <button
          type="button"
          className={tab === "cases" ? "op-seg-btn active" : "op-seg-btn"}
          onClick={() => setTab("cases")}
        >
          Типовые ситуации
        </button>
        <button
          type="button"
          className={tab === "candidates" ? "op-seg-btn active" : "op-seg-btn"}
          onClick={() => setTab("candidates")}
        >
          Кандидаты ({candidates.length})
        </button>
      </div>

      {error && <p className="op-error">{error}</p>}
      {message && <p className="op-success">{message}</p>}
      {loading && <p className="op-muted">Загрузка…</p>}

      {tab === "cases" ? (
        <OpSplitView list={casesListPane} detail={casesDetailPane} />
      ) : (
        <OpSplitView list={candidatesListPane} detail={candidatesDetailPane} />
      )}
    </OpPage>
  );
}
