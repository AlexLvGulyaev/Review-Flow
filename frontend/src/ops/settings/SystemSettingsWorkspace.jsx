import { useCallback, useEffect, useMemo, useState } from "react";

import {
  mergeEditsWithRollback,
  parseProviderPatchErrors,
  validateProviderEdit,
} from "../../lib/aiProviderValidation.js";
import { adminApiFetch, apiFetch, readApiError } from "../../lib/api.js";
import { fetchClassificationReference } from "../../lib/classificationReference.js";
import { OpPage, OpPageHeader } from "../components/OpPage.jsx";
import { OpButton, OpInput, OpSelect, OpTextarea } from "../components/OpToolbar.jsx";

import "./system-settings.css";

const CH_ADAPTATION_PROMPT_KEY = "review_response_generation";
const PRODUCTION_PROVIDER_KEYS = ["openai", "gigachat", "proxyapi"];

const RETRIEVAL_ALGORITHM = "rapidfuzz.token_set_ratio";

const SEARCH_LABELS = {
  topK: "Top-K кандидатов",
  minimumScore: "Minimum Score",
  mediumDelta: "Medium Delta",
  defaultConfidenceThreshold: "Default Confidence Threshold",
  draftOnMedium: "Draft On Medium",
  autoDecisionOnHigh: "Auto Decision On High",
};

function providerEditFromRow(p) {
  return {
    model_name: p.model_name ?? "",
    is_enabled: Boolean(p.is_enabled),
    temperature: p.temperature ?? "",
  };
}

function nsiLabel(row, nameKey = "name") {
  return row[nameKey] ?? row.title ?? "—";
}

function NsiCard({ title, items, nameKey = "name", scrollable = false }) {
  return (
    <article className="rf-sys-card" aria-label={title}>
      <div className="rf-sys-card__head">
        <h3 className="rf-sys-card__title">{title}</h3>
        <span className="rf-sys-card__meta">{items.length}</span>
      </div>
      <ul className={`rf-sys-card__list${scrollable ? " rf-sys-card__list--scroll" : ""}`}>
        {items.length === 0 ? (
          <li className="muted">Нет записей</li>
        ) : (
          items.map((row) => (
            <li key={row.id ?? nsiLabel(row, nameKey)} title={nsiLabel(row, nameKey)}>
              {nsiLabel(row, nameKey)}
            </li>
          ))
        )}
      </ul>
    </article>
  );
}

function SearchRow({ label, children }) {
  return (
    <div className="rf-sys-search-row">
      <span>{label}</span>
      {children}
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <span className="rf-sys-field-error" role="alert">
      {message}
    </span>
  );
}

function ProviderCard({
  provider,
  edit,
  fieldErrors,
  saveFlash,
  onEditChange,
  onFieldBlur,
  onSave,
  saving,
}) {
  const p = provider;
  if (!p) return null;
  const disabled = saving || p.implementation_status === "not_implemented";
  const endpoint = p.effective_base_url || "—";

  return (
    <article className="rf-sys-provider-card">
      <h4 className="rf-sys-provider-card__title">{p.display_name}</h4>
      <div className="rf-sys-provider-card__body">
        <label>
          Base URL / Endpoint
          <OpInput value={endpoint} readOnly disabled title={endpoint} />
        </label>
        <label>
          Model
          <OpInput
            value={edit.model_name}
            onChange={(e) => onEditChange({ ...edit, model_name: e.target.value })}
            onBlur={() => onFieldBlur("model_name")}
            onKeyDown={(e) => {
              if (e.key === "Escape") onFieldBlur("model_name", true);
            }}
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors.model_name)}
          />
          <FieldError message={fieldErrors.model_name} />
        </label>
        <label>
          Temperature
          <OpInput
            type="number"
            step="0.05"
            min="0"
            max="2"
            value={edit.temperature}
            onChange={(e) => onEditChange({ ...edit, temperature: e.target.value })}
            onBlur={() => onFieldBlur("temperature")}
            onKeyDown={(e) => {
              if (e.key === "Escape") onFieldBlur("temperature", true);
            }}
            disabled={disabled}
            aria-invalid={Boolean(fieldErrors.temperature)}
          />
          <FieldError message={fieldErrors.temperature} />
        </label>
        <label className="rf-sys-enabled-row">
          <span className="rf-sys-enabled-label">{edit.is_enabled ? "Включён" : "Отключён"}</span>
          <input
            type="checkbox"
            checked={edit.is_enabled}
            onChange={(e) => onEditChange({ ...edit, is_enabled: e.target.checked })}
            disabled={disabled}
            aria-label={edit.is_enabled ? "Включён" : "Отключён"}
          />
        </label>
      </div>
      <div className="rf-sys-provider-card__foot">
        <OpButton
          type="button"
          variant="primary"
          className="rf-sys-provider-card__save"
          disabled={disabled}
          onClick={onSave}
        >
          Сохранить
        </OpButton>
        {saveFlash ? <span className="rf-sys-save-flash">Сохранено</span> : null}
      </div>
    </article>
  );
}

export default function SystemSettingsWorkspace() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [scenarios, setScenarios] = useState([]);
  const [sentiments, setSentiments] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [productAreas, setProductAreas] = useState([]);
  const [reviewTopics, setReviewTopics] = useState([]);
  const [processingPolicies, setProcessingPolicies] = useState([]);

  const [searchSettings, setSearchSettings] = useState({
    topK: 5,
    minimumScore: 0,
    mediumDelta: 0.1,
    defaultConfidenceThreshold: 0.75,
    draftOnMedium: true,
    autoDecisionOnHigh: true,
  });
  const [searchSaved, setSearchSaved] = useState(null);
  const [searchFlash, setSearchFlash] = useState(false);

  const [providers, setProviders] = useState([]);
  const [activeKey, setActiveKey] = useState("");
  const [fallbackKey, setFallbackKey] = useState("");
  const [mockActiveInDb, setMockActiveInDb] = useState(false);
  const [providerEdits, setProviderEdits] = useState({});
  const [providerSaved, setProviderSaved] = useState({});
  const [providerFieldErrors, setProviderFieldErrors] = useState({});
  const [providerSaveFlash, setProviderSaveFlash] = useState({});
  const [routingError, setRoutingError] = useState(null);
  const [routingFlash, setRoutingFlash] = useState(false);

  const [promptDetail, setPromptDetail] = useState(null);
  const [promptSystemText, setPromptSystemText] = useState("");
  const [promptSavedText, setPromptSavedText] = useState("");
  const [promptFlash, setPromptFlash] = useState(false);

  const productionProviders = useMemo(
    () => providers.filter((p) => PRODUCTION_PROVIDER_KEYS.includes(p.provider_key)),
    [providers]
  );

  const flash = useCallback((setter, ms = 1800) => {
    setter(true);
    const t = setTimeout(() => setter(false), ms);
    return () => clearTimeout(t);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [classRes, catalogRes, provRes, promptsRes, searchRes] = await Promise.all([
        fetchClassificationReference(),
        adminApiFetch("/api/admin/ch-catalog"),
        apiFetch("/api/settings/ai-providers"),
        apiFetch("/api/prompts"),
        apiFetch("/api/settings/ch-runtime"),
      ]);

      setScenarios(classRes.scenarios);
      setSentiments(classRes.sentiments);
      setPriorities(classRes.priorities);

      if (!catalogRes.ok) throw new Error(await readApiError(catalogRes, "Не удалось загрузить каталог CH"));
      const catalog = await catalogRes.json();
      setProductAreas(catalog.product_areas ?? []);
      setReviewTopics(catalog.review_topics ?? []);
      setProcessingPolicies(
        (catalog.processing_policies ?? []).filter((p) => p.is_active !== false)
      );

      if (!searchRes.ok) throw new Error(await readApiError(searchRes, "Не удалось загрузить настройки поиска"));
      const search = await searchRes.json();
      const searchState = {
        topK: search.retrieval_top_n,
        minimumScore: search.minimum_match_score,
        mediumDelta: search.confidence_medium_delta,
        defaultConfidenceThreshold: search.default_confidence_threshold,
        draftOnMedium: search.draft_on_medium,
        autoDecisionOnHigh: search.auto_decision_on_high,
      };
      setSearchSettings(searchState);
      setSearchSaved(searchState);

      if (!provRes.ok) throw new Error(await readApiError(provRes, "Не удалось загрузить провайдеры"));
      const provList = await provRes.json();
      setProviders(provList);

      const prod = provList.filter((p) => PRODUCTION_PROVIDER_KEYS.includes(p.provider_key));
      const edits = {};
      const saved = {};
      for (const p of prod) {
        const snap = providerEditFromRow(p);
        edits[p.provider_key] = snap;
        saved[p.provider_key] = snap;
      }
      setProviderEdits(edits);
      setProviderSaved(saved);
      setProviderFieldErrors({});

      const activeRow = provList.find((p) => p.is_active);
      if (activeRow?.provider_key === "mock") {
        setMockActiveInDb(true);
        setActiveKey("");
      } else if (activeRow && PRODUCTION_PROVIDER_KEYS.includes(activeRow.provider_key)) {
        setMockActiveInDb(false);
        setActiveKey(activeRow.provider_key);
      } else {
        setMockActiveInDb(false);
        setActiveKey("");
      }

      const fallbackRow = provList.find((p) => p.is_fallback);
      const fallback =
        fallbackRow && PRODUCTION_PROVIDER_KEYS.includes(fallbackRow.provider_key)
          ? fallbackRow.provider_key
          : "";
      setFallbackKey(fallback);

      if (!promptsRes.ok) throw new Error(await readApiError(promptsRes, "Не удалось загрузить промпты"));
      const prompts = await promptsRes.json();
      const activePrompt = prompts.find(
        (p) => p.prompt_key === CH_ADAPTATION_PROMPT_KEY && p.is_active
      );
      if (activePrompt) {
        const detailRes = await apiFetch(`/api/prompts/${activePrompt.id}`);
        if (!detailRes.ok) throw new Error(await readApiError(detailRes, "Не удалось загрузить промпт"));
        const detail = await detailRes.json();
        setPromptDetail(detail);
        setPromptSystemText(detail.system_prompt ?? "");
        setPromptSavedText(detail.system_prompt ?? "");
      } else {
        setPromptDetail(null);
        setPromptSystemText("");
        setPromptSavedText("");
      }
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function applyProviderFieldErrors(key, errors, rollbackFromSaved = true) {
    setProviderFieldErrors((prev) => ({ ...prev, [key]: errors }));
    if (rollbackFromSaved && Object.keys(errors).length > 0) {
      const saved = providerSaved[key];
      setProviderEdits((prev) => ({
        ...prev,
        [key]: mergeEditsWithRollback(prev[key], saved, errors),
      }));
    }
  }

  function handleProviderFieldBlur(key, field, forceRollback = false) {
    const edit = providerEdits[key];
    const saved = providerSaved[key];
    if (!edit) return;
    const allErrors = validateProviderEdit(key, edit);
    const fieldError = allErrors[field];
    if (fieldError || forceRollback) {
      const errors = fieldError ? { [field]: fieldError } : {};
      if (fieldError || forceRollback) {
        setProviderFieldErrors((prev) => {
          const next = { ...(prev[key] || {}) };
          if (fieldError) next[field] = fieldError;
          else delete next[field];
          return { ...prev, [key]: next };
        });
      }
      if ((fieldError || forceRollback) && saved) {
        setProviderEdits((prev) => ({
          ...prev,
          [key]: { ...edit, [field]: saved[field] },
        }));
      }
    } else {
      setProviderFieldErrors((prev) => {
        const next = { ...(prev[key] || {}) };
        delete next[field];
        return { ...prev, [key]: next };
      });
    }
  }

  async function saveSearchSettings() {
    setActionLoading(true);
    try {
      const res = await apiFetch("/api/settings/ch-runtime", {
        method: "PATCH",
        body: JSON.stringify({
          retrieval_top_n: searchSettings.topK,
          minimum_match_score: searchSettings.minimumScore,
          confidence_medium_delta: searchSettings.mediumDelta,
          default_confidence_threshold: searchSettings.defaultConfidenceThreshold,
          draft_on_medium: searchSettings.draftOnMedium,
          auto_decision_on_high: searchSettings.autoDecisionOnHigh,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось сохранить настройки поиска"));
      setSearchSaved({ ...searchSettings });
      flash(setSearchFlash);
    } catch {
      if (searchSaved) setSearchSettings(searchSaved);
    } finally {
      setActionLoading(false);
    }
  }

  async function saveRouting() {
    if (!activeKey) return;
    setActionLoading(true);
    setRoutingError(null);
    try {
      const actRes = await apiFetch(`/api/settings/ai-providers/${activeKey}/activate`, { method: "POST" });
      if (!actRes.ok) throw new Error(await readApiError(actRes, "Не удалось активировать провайдер"));
      if (fallbackKey) {
        const fbRes = await apiFetch(`/api/settings/ai-providers/${fallbackKey}/set-fallback`, {
          method: "POST",
        });
        if (!fbRes.ok) throw new Error(await readApiError(fbRes, "Не удалось задать fallback"));
      }
      setMockActiveInDb(false);
      flash(setRoutingFlash);
      await loadAll();
    } catch (err) {
      setRoutingError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function saveProvider(key) {
    const edit = providerEdits[key];
    if (!edit) return;

    const localErrors = validateProviderEdit(key, edit);
    if (Object.keys(localErrors).length > 0) {
      applyProviderFieldErrors(key, localErrors);
      return;
    }

    setActionLoading(true);
    setProviderFieldErrors((prev) => ({ ...prev, [key]: {} }));
    try {
      const res = await apiFetch(`/api/settings/ai-providers/${key}`, {
        method: "PATCH",
        body: JSON.stringify({
          model_name: String(edit.model_name).trim(),
          is_enabled: edit.is_enabled,
          temperature: edit.temperature === "" ? null : Number(edit.temperature),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const apiErrors = parseProviderPatchErrors(body.detail);
        if (Object.keys(apiErrors).length > 0) {
          applyProviderFieldErrors(key, apiErrors);
          return;
        }
        throw new Error(await readApiError(res, "Не удалось сохранить провайдер"));
      }
      const updated = await res.json();
      const snap = providerEditFromRow(updated);
      setProviderSaved((prev) => ({ ...prev, [key]: snap }));
      setProviderEdits((prev) => ({ ...prev, [key]: snap }));
      setProviders((prev) =>
        prev.map((p) => (p.provider_key === key ? { ...p, ...updated } : p))
      );
      setProviderSaveFlash((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setProviderSaveFlash((prev) => ({ ...prev, [key]: false }));
      }, 1800);
    } catch (err) {
      applyProviderFieldErrors(key, { model_name: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function saveAdaptationPrompt() {
    if (!promptDetail || !promptSystemText.trim()) return;
    setActionLoading(true);
    try {
      const title = `CH adaptation v${(promptDetail.version ?? 0) + 1}`;
      const createRes = await apiFetch("/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          prompt_key: CH_ADAPTATION_PROMPT_KEY,
          title,
          system_prompt: promptSystemText.trim(),
          user_prompt_template: promptDetail.user_prompt_template,
        }),
      });
      if (!createRes.ok) throw new Error(await readApiError(createRes, "Не удалось создать версию промпта"));
      const created = await createRes.json();
      const actRes = await apiFetch(`/api/prompts/${created.id}/activate`, { method: "POST" });
      if (!actRes.ok) throw new Error(await readApiError(actRes, "Не удалось активировать промпт"));
      setPromptSavedText(promptSystemText.trim());
      flash(setPromptFlash);
      await loadAll();
    } catch {
      setPromptSystemText(promptSavedText);
    } finally {
      setActionLoading(false);
    }
  }

  function patchSearch(field, value) {
    setSearchSettings((prev) => ({ ...prev, [field]: value }));
  }

  function patchProviderEdit(key, next) {
    setProviderEdits((prev) => ({ ...prev, [key]: next }));
    setProviderFieldErrors((prev) => {
      const errs = { ...(prev[key] || {}) };
      delete errs.model_name;
      delete errs.temperature;
      return { ...prev, [key]: errs };
    });
  }

  return (
    <OpPage wide className="op-page--system-settings">
      <OpPageHeader
        title="Системные настройки"
        subtitle="НСИ, параметры поиска типовых ситуаций и настройки LLM."
        actions={
          <OpButton type="button" variant="primary" onClick={loadAll} disabled={loading || actionLoading}>
            Обновить
          </OpButton>
        }
      />

      {loadError ? <p className="rf-sys-load-error">{loadError}</p> : null}
      {loading ? <p className="muted">Загрузка…</p> : null}

      {!loading ? (
        <>
          <div className="rf-sys-layout">
            <section
              className="rf-sys-macro rf-sys-layout__nsi"
              aria-labelledby="rf-sys-nsi-title"
            >
              <h2 id="rf-sys-nsi-title" className="rf-sys-macro__title">
                Нормативно-справочная информация
              </h2>
              <div className="rf-sys-nsi-grid">
                <NsiCard title="Сценарии" items={scenarios} />
                <NsiCard title="Тональности" items={sentiments} />
                <NsiCard title="Приоритеты" items={priorities} />
                <NsiCard title="Направления" items={productAreas} />
                <NsiCard title="Темы" items={reviewTopics} scrollable />
                <NsiCard title="Политики обработки" items={processingPolicies} nameKey="name_ru" />
              </div>
            </section>

            <section
              className="rf-sys-macro rf-sys-layout__search"
              aria-labelledby="rf-sys-search-title"
            >
              <h2 id="rf-sys-search-title" className="rf-sys-macro__title">
                Настройки поиска
              </h2>
              <div className="rf-sys-search-body">
                <div className="rf-sys-search-rows">
                  <div className="rf-sys-search-row rf-sys-search-row--algorithm">
                    <span>Алгоритм</span>
                    <div className="rf-sys-search-row__value" title={RETRIEVAL_ALGORITHM}>
                      {RETRIEVAL_ALGORITHM}
                    </div>
                  </div>
                  <SearchRow label={SEARCH_LABELS.topK}>
                    <OpInput
                      type="number"
                      min="1"
                      max="20"
                      value={searchSettings.topK}
                      onChange={(e) => patchSearch("topK", Number(e.target.value))}
                    />
                  </SearchRow>
                  <SearchRow label={SEARCH_LABELS.minimumScore}>
                    <OpInput
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={searchSettings.minimumScore}
                      onChange={(e) => patchSearch("minimumScore", Number(e.target.value))}
                    />
                  </SearchRow>
                  <SearchRow label={SEARCH_LABELS.mediumDelta}>
                    <OpInput
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={searchSettings.mediumDelta}
                      onChange={(e) => patchSearch("mediumDelta", Number(e.target.value))}
                    />
                  </SearchRow>
                  <SearchRow label={SEARCH_LABELS.defaultConfidenceThreshold}>
                    <OpInput
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={searchSettings.defaultConfidenceThreshold}
                      onChange={(e) =>
                        patchSearch("defaultConfidenceThreshold", Number(e.target.value))
                      }
                    />
                  </SearchRow>
                  <SearchRow label={SEARCH_LABELS.draftOnMedium}>
                    <OpSelect
                      value={searchSettings.draftOnMedium ? "1" : "0"}
                      onChange={(e) => patchSearch("draftOnMedium", e.target.value === "1")}
                    >
                      <option value="1">Да</option>
                      <option value="0">Нет</option>
                    </OpSelect>
                  </SearchRow>
                  <SearchRow label={SEARCH_LABELS.autoDecisionOnHigh}>
                    <OpSelect
                      value={searchSettings.autoDecisionOnHigh ? "1" : "0"}
                      onChange={(e) => patchSearch("autoDecisionOnHigh", e.target.value === "1")}
                    >
                      <option value="1">Да</option>
                      <option value="0">Нет</option>
                    </OpSelect>
                  </SearchRow>
                </div>
                <div className="rf-sys-search-actions">
                  <OpButton
                    type="button"
                    variant="primary"
                    disabled={actionLoading}
                    onClick={saveSearchSettings}
                  >
                    Сохранить
                  </OpButton>
                  {searchFlash ? <span className="rf-sys-save-flash">Сохранено</span> : null}
                </div>
              </div>
            </section>

            <h2 id="rf-sys-llm-title" className="rf-sys-layout__llm-title">
              Настройки LLM
            </h2>

            <div className="rf-sys-layout__llm-left">
              <div className="rf-sys-routing">
                <h3 className="rf-sys-routing__title">Активный провайдер / fallback</h3>
                {mockActiveInDb ? (
                  <p className="rf-sys-routing-warn" role="status">
                    В базе активен mock-провайдер (только для разработки). Выберите production-провайдер
                    и нажмите «Сохранить».
                  </p>
                ) : null}
                <div className="rf-sys-routing__form">
                  <label>
                    Активный провайдер
                    <OpSelect value={activeKey} onChange={(e) => setActiveKey(e.target.value)}>
                      {mockActiveInDb && !activeKey ? (
                        <option value="">— выберите провайдер —</option>
                      ) : null}
                      {productionProviders.map((p) => (
                        <option key={p.provider_key} value={p.provider_key}>
                          {p.display_name}
                        </option>
                      ))}
                    </OpSelect>
                  </label>
                  <label>
                    Fallback провайдер
                    <OpSelect value={fallbackKey} onChange={(e) => setFallbackKey(e.target.value)}>
                      <option value="">—</option>
                      {productionProviders.map((p) => (
                        <option key={p.provider_key} value={p.provider_key}>
                          {p.display_name}
                        </option>
                      ))}
                    </OpSelect>
                  </label>
                  <div className="rf-sys-routing__actions">
                    <OpButton
                      type="button"
                      variant="primary"
                      disabled={actionLoading || !activeKey}
                      onClick={saveRouting}
                    >
                      Сохранить
                    </OpButton>
                    {routingFlash ? <span className="rf-sys-save-flash">Сохранено</span> : null}
                  </div>
                  <FieldError message={routingError} />
                </div>
              </div>

              <div className="rf-sys-providers-row">
                {PRODUCTION_PROVIDER_KEYS.map((key) => {
                  const p = providers.find((x) => x.provider_key === key);
                  const edit = providerEdits[key] ?? {
                    model_name: "",
                    is_enabled: false,
                    temperature: "",
                  };
                  return (
                    <ProviderCard
                      key={key}
                      provider={p}
                      edit={edit}
                      fieldErrors={providerFieldErrors[key] ?? {}}
                      saveFlash={Boolean(providerSaveFlash[key])}
                      onEditChange={(next) => patchProviderEdit(key, next)}
                      onFieldBlur={(field, force) => handleProviderFieldBlur(key, field, force)}
                      onSave={() => saveProvider(key)}
                      saving={actionLoading}
                    />
                  );
                })}
              </div>
            </div>

            <div className="rf-sys-prompt-panel rf-sys-layout__prompt">
              <h3 className="rf-sys-prompt-panel__title">Промпт адаптации ответа</h3>
              <OpTextarea
                value={promptSystemText}
                onChange={(e) => setPromptSystemText(e.target.value)}
                disabled={actionLoading || !promptDetail}
                spellCheck={false}
              />
              <div className="rf-sys-prompt-panel__foot">
                <OpButton
                  type="button"
                  variant="primary"
                  disabled={actionLoading || !promptDetail || !promptSystemText.trim()}
                  onClick={saveAdaptationPrompt}
                >
                  Сохранить
                </OpButton>
                {promptFlash ? <span className="rf-sys-save-flash">Сохранено</span> : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </OpPage>
  );
}
