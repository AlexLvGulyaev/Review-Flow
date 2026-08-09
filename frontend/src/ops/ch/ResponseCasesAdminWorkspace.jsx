import { useCallback, useEffect, useMemo, useState } from "react";

import { adminApiFetch, readApiError } from "../../lib/api.js";
import { fetchClassificationReference } from "../../lib/classificationReference.js";
import { OpPage } from "../components/OpPage.jsx";
import { AdminConsoleHeader, ResponseCaseWorkspaceHeader } from "./AdminConsoleHeader.jsx";
import { ResponseCaseLeftPanel } from "./ResponseCaseLeftPanel.jsx";
import { ResponseCaseDetailPanel } from "./ResponseCaseDetailPanel.jsx";
import { ResponseCaseCandidatesPanel } from "./ResponseCaseCandidatesPanel.jsx";
import { ResponseCaseCandidateMergeModal } from "./ResponseCaseCandidateMergeModal.jsx";
import { ResponseCaseCandidateRejectModal } from "./ResponseCaseCandidateRejectModal.jsx";
import { ResponseCaseAddExampleModal } from "./ResponseCaseAddExampleModal.jsx";
import { ResponseCaseFormModal } from "./ResponseCaseFormModal.jsx";
import { ResponseCaseEditExampleModal } from "./ResponseCaseEditExampleModal.jsx";
import { ResponseCaseUnifiedToolbar } from "./ResponseCaseUnifiedToolbar.jsx";

import "../operator/operator-console.css";
import "./response-case-workspace.css";

const API = "/api/admin";
const PAGE_SIZE = 10;

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
  processing_policy_id: "",
};

function slugFromTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function caseApiPayload(model) {
  const body = { ...model };
  if (!body.processing_policy_id) delete body.processing_policy_id;
  return body;
}

function prefillFromCandidateDetail(detail, catalog) {
  const p = detail?.prefill ?? {};
  const defaultPolicy =
    catalog.processing_policies?.find((pol) => pol.code === "operator_review_with_llm_draft") ??
    catalog.processing_policies?.[0];
  let title = p.title || detail?.proposed_title || "";
  title = title.replace(/^Эскалация:\s*/i, "").trim();
  return {
    ...EMPTY_CASE,
    title,
    description: p.description || "",
    scenario_id: p.scenario_id || "",
    sentiment_id: p.sentiment_id || "",
    priority_id: p.priority_id || "",
    product_area_id: p.product_area_id || "",
    topic_id: p.topic_id || "",
    response_policy: p.response_policy || "",
    approved_response_text: p.approved_response_text || "",
    confidence_threshold: "0.75",
    processing_policy_id: defaultPolicy?.id ?? "",
  };
}

function caseToFormModel(data) {
  return {
    case_code: data.case_code ?? "",
    title: data.title ?? "",
    description: data.description ?? "",
    scenario_id: data.scenario?.id ?? "",
    sentiment_id: data.sentiment?.id ?? "",
    priority_id: data.priority?.id ?? "",
    product_area_id: data.product_area?.id ?? "",
    topic_id: data.topic?.id ?? "",
    response_policy: data.response_policy ?? "",
    approved_response_text: data.approved_response_text ?? "",
    confidence_threshold: String(data.confidence_threshold ?? "0.75"),
    processing_policy_id: data.processing_policy?.id ?? data.processing_policy_id ?? "",
  };
}

export default function ResponseCasesAdminWorkspace() {
  const [tab, setTab] = useState("cases");
  const [cases, setCases] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [catalog, setCatalog] = useState({
    product_areas: [],
    review_topics: [],
    processing_policies: [],
  });
  const [classRef, setClassRef] = useState({ scenarios: [], sentiments: [], priorities: [] });
  const [qualityByCaseId, setQualityByCaseId] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [statusFilter, setStatusFilter] = useState("active");
  const [productAreaFilter, setProductAreaFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [scenarioFilter, setScenarioFilter] = useState("");
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModel, setCreateModel] = useState(EMPTY_CASE);
  const [editModel, setEditModel] = useState(EMPTY_CASE);

  const [exampleModalOpen, setExampleModalOpen] = useState(false);
  const [exampleEdit, setExampleEdit] = useState(null);

  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [candidateDetail, setCandidateDetail] = useState(null);
  const [candidateDetailLoading, setCandidateDetailLoading] = useState(false);
  const [createFromCandidateId, setCreateFromCandidateId] = useState(null);
  const [candidateRejectModalOpen, setCandidateRejectModalOpen] = useState(false);
  const [candidateMergeModalOpen, setCandidateMergeModalOpen] = useState(false);

  const loadCases = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter === "active") params.set("is_active", "true");
    else if (statusFilter === "archived") params.set("is_active", "false");
    const res = await adminApiFetch(`${API}/response-cases?${params}`);
    if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить cases"));
    return res.json();
  }, [statusFilter]);

  const loadCandidates = useCallback(async () => {
    const res = await adminApiFetch(`${API}/response-case-candidates?status=pending_admin`);
    if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить кандидатов"));
    return res.json();
  }, []);

  const loadCatalog = useCallback(async () => {
    const res = await adminApiFetch(`${API}/ch-catalog`);
    if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить каталог CH"));
    return res.json();
  }, []);

  const loadQualityMap = useCallback(async () => {
    try {
      const res = await adminApiFetch(`${API}/ch-analytics/dashboard?days=30&case_quality_limit=200`);
      if (!res.ok) return {};
      const data = await res.json();
      const map = {};
      for (const row of data.case_quality ?? []) {
        map[row.case_id] = row;
      }
      return map;
    } catch {
      return {};
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const [caseList, candList, cat, cref, quality] = await Promise.all([
        loadCases(),
        loadCandidates(),
        loadCatalog(),
        fetchClassificationReference(),
        loadQualityMap(),
      ]);
      setCases(caseList);
      setCandidates(candList);
      setCatalog(cat);
      setClassRef(cref);
      setQualityByCaseId(quality);
    } catch (e) {
      setError(e.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [loadCases, loadCandidates, loadCatalog, loadQualityMap]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadCaseDetail = useCallback(async (caseId) => {
    const res = await adminApiFetch(`${API}/response-cases/${caseId}`);
    if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить case"));
    const data = await res.json();
    setCaseDetail(data);
    return data;
  }, []);

  useEffect(() => {
    if (!selectedCaseId) {
      setCaseDetail(null);
      return;
    }
    loadCaseDetail(selectedCaseId).catch((e) => setError(e.message));
  }, [selectedCaseId, loadCaseDetail]);

  const loadCandidateDetail = useCallback(async (candidateId) => {
    if (!candidateId) {
      setCandidateDetail(null);
      return null;
    }
    setCandidateDetailLoading(true);
    try {
      const res = await adminApiFetch(`${API}/response-case-candidates/${candidateId}`);
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить кандидата"));
      const data = await res.json();
      setCandidateDetail(data);
      return data;
    } finally {
      setCandidateDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "candidates" || !selectedCandidateId) {
      setCandidateDetail(null);
      return;
    }
    loadCandidateDetail(selectedCandidateId).catch((e) => setError(e.message));
  }, [tab, selectedCandidateId, loadCandidateDetail]);

  useEffect(() => {
    if (tab !== "candidates" || loading || candidates.length === 0) return;
    const stillVisible = selectedCandidateId && candidates.some((c) => c.id === selectedCandidateId);
    if (!stillVisible) {
      setSelectedCandidateId(candidates[0].id);
    }
  }, [tab, loading, candidates, selectedCandidateId]);

  const topicsForArea = useCallback(
    (areaId) => {
      if (!areaId) return catalog.review_topics ?? [];
      return (catalog.review_topics ?? []).filter(
        (t) => t.product_area?.id === areaId || t.product_area_id === areaId
      );
    },
    [catalog.review_topics]
  );

  const topicsForFilter = useMemo(() => {
    if (!productAreaFilter) return catalog.review_topics ?? [];
    return topicsForArea(productAreaFilter);
  }, [catalog.review_topics, productAreaFilter, topicsForArea]);

  const filteredCases = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (productAreaFilter && c.product_area?.id !== productAreaFilter) return false;
      if (topicFilter && c.topic?.id !== topicFilter) return false;
      if (scenarioFilter && c.scenario?.id !== scenarioFilter) return false;
      if (!needle) return true;
      const hay = [c.title, c.case_code, c.product_area?.name, c.topic?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [cases, search, productAreaFilter, topicFilter, scenarioFilter]);

  const totalPages = Math.ceil(filteredCases.length / PAGE_SIZE) || 1;
  const pageItems = useMemo(
    () => filteredCases.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE),
    [filteredCases, pageIndex]
  );

  useEffect(() => {
    setPageIndex(0);
  }, [statusFilter, productAreaFilter, topicFilter, scenarioFilter, search]);

  useEffect(() => {
    if (pageIndex > totalPages - 1) setPageIndex(Math.max(0, totalPages - 1));
  }, [pageIndex, totalPages]);

  useEffect(() => {
    if (tab !== "cases" || loading || createModalOpen || editModalOpen) return;
    if (pageItems.length === 0) {
      if (selectedCaseId) setSelectedCaseId(null);
      return;
    }
    const visible = pageItems.some((c) => c.id === selectedCaseId);
    if (!selectedCaseId || !visible) {
      setSelectedCaseId(pageItems[0].id);
    }
  }, [tab, loading, pageItems, selectedCaseId, createModalOpen, editModalOpen]);

  const selectedListItem = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) ?? null,
    [cases, selectedCaseId]
  );

  const qualityForSelected = selectedCaseId ? qualityByCaseId[selectedCaseId] : null;

  async function handleSaveCase() {
    if (!selectedCaseId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body = {
        ...caseApiPayload(editModel),
        confidence_threshold: editModel.confidence_threshold,
        description: editModel.description || null,
      };
      const res = await adminApiFetch(`${API}/response-cases/${selectedCaseId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось сохранить"));
      setMessage("Сохранено");
      setEditModalOpen(false);
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
    const linkedCandidateId = createFromCandidateId;
    try {
      const code = createModel.case_code.trim() || slugFromTitle(createModel.title);
      const res = await adminApiFetch(`${API}/response-cases`, {
        method: "POST",
        body: JSON.stringify({ ...caseApiPayload(createModel), case_code: code }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось создать"));
      const created = await res.json();

      if (linkedCandidateId) {
        const completeRes = await adminApiFetch(
          `${API}/response-case-candidates/${linkedCandidateId}/complete`,
          {
            method: "POST",
            body: JSON.stringify({ response_case_id: created.id }),
          }
        );
        if (!completeRes.ok) {
          throw new Error(await readApiError(completeRes, "ТС создана, но не удалось закрыть кандидата"));
        }
        setCreateFromCandidateId(null);
        setSelectedCandidateId(null);
        setCandidateDetail(null);
        setTab("cases");
        setSelectedCaseId(created.id);
        setMessage("Типовая ситуация создана, retrieval-пример добавлен");
        setCreateModalOpen(false);
        await loadAll();
        await loadCaseDetail(created.id);
        return;
      }

      setMessage("Типовая ситуация создана");
      setCreateModalOpen(false);
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
      const res = await adminApiFetch(`${API}/response-cases/${selectedCaseId}/${path}`, { method: "POST" });
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

  async function handleAddExample(text) {
    const exampleText = String(text || "").trim();
    if (!selectedCaseId || !exampleText) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminApiFetch(`${API}/response-cases/${selectedCaseId}/examples`, {
        method: "POST",
        body: JSON.stringify({ example_text: exampleText }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось добавить пример"));
      setExampleModalOpen(false);
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
      const res = await adminApiFetch(`${API}/response-case-examples/${exampleId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось обновить пример"));
      setExampleEdit(null);
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
      const res = await adminApiFetch(`${API}/response-case-candidates/${selectedCandidateId}/approve`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось обработать кандидата"));
      const result = await res.json();
      setMessage(mergeInto ? "Объединено с типовой ситуацией" : "Кандидат обработан");
      setSelectedCandidateId(null);
      setCandidateDetail(null);
      setCandidateMergeModalOpen(false);
      await loadAll();
      if (mergeInto || result?.id) {
        setTab("cases");
        setSelectedCaseId(result.id);
        await loadCaseDetail(result.id);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRejectCandidate(rejectionComment) {
    if (!selectedCandidateId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminApiFetch(`${API}/response-case-candidates/${selectedCandidateId}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejection_comment: rejectionComment }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось отклонить"));
      setMessage("Кандидат отклонён");
      setCandidateRejectModalOpen(false);
      setSelectedCandidateId(null);
      setCandidateDetail(null);
      await loadAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCandidateMergeClick() {
    if (!selectedCandidateId || !candidateDetail) return;
    if (candidateDetail.candidate_type === "response_case_example") {
      handleApproveCandidate();
      return;
    }
    setCandidateMergeModalOpen(true);
  }

  function handleCandidateMergeConfirm(mergeIntoCaseId) {
    setCandidateMergeModalOpen(false);
    handleApproveCandidate(mergeIntoCaseId);
  }

  function selectCase(id) {
    setSelectedCaseId(id);
  }

  function openCreateFromCandidate() {
    if (!candidateDetail) return;
    setCreateFromCandidateId(selectedCandidateId);
    setCreateModel(prefillFromCandidateDetail(candidateDetail, catalog));
    setCreateModalOpen(true);
  }

  function openCreateModal() {
    setCreateFromCandidateId(null);
    setTab("cases");
    const defaultPolicy =
      catalog.processing_policies?.find((p) => p.code === "operator_review_with_llm_draft") ??
      catalog.processing_policies?.[0];
    setCreateModel({
      ...EMPTY_CASE,
      processing_policy_id: defaultPolicy?.id ?? "",
    });
    setCreateModalOpen(true);
  }

  function openEditModal() {
    if (!caseDetail) return;
    setEditModel(caseToFormModel(caseDetail));
    setEditModalOpen(true);
  }

  return (
    <OpPage wide className="op-page--operator-full op-page--response-cases-full">
      <AdminConsoleHeader />
      <ResponseCaseWorkspaceHeader />

      <ResponseCaseFormModal
        open={createModalOpen}
        title="Новая типовая ситуация"
        submitLabel="Создать"
        model={createModel}
        setModel={setCreateModel}
        catalog={catalog}
        classRef={classRef}
        topicsForArea={topicsForArea}
        isCreate
        saving={saving}
        onClose={() => {
          setCreateModalOpen(false);
          setCreateFromCandidateId(null);
        }}
        onSubmit={handleCreateCase}
      />

      <ResponseCaseFormModal
        open={editModalOpen}
        title="Изменение типовой ситуации"
        submitLabel="Сохранить"
        model={editModel}
        setModel={setEditModel}
        catalog={catalog}
        classRef={classRef}
        topicsForArea={topicsForArea}
        isCreate={false}
        saving={saving}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleSaveCase}
      />

      <ResponseCaseAddExampleModal
        open={exampleModalOpen}
        saving={saving}
        onClose={() => setExampleModalOpen(false)}
        onSave={handleAddExample}
      />

      <ResponseCaseEditExampleModal
        open={Boolean(exampleEdit)}
        initialText={exampleEdit?.example_text}
        saving={saving}
        onClose={() => setExampleEdit(null)}
        onSave={(text) => {
          if (!exampleEdit) return;
          handleExamplePatch(exampleEdit.id, { example_text: text });
        }}
      />

      <ResponseCaseCandidateRejectModal
        open={candidateRejectModalOpen}
        saving={saving}
        onClose={() => setCandidateRejectModalOpen(false)}
        onConfirm={(comment) => handleRejectCandidate(comment)}
      />

      <ResponseCaseCandidateMergeModal
        open={candidateMergeModalOpen}
        saving={saving}
        cases={cases}
        onClose={() => setCandidateMergeModalOpen(false)}
        onConfirm={handleCandidateMergeConfirm}
      />

      {tab === "cases" ? (
        <div className="rf-rc-workspace-main">
          <ResponseCaseUnifiedToolbar
            tab={tab}
            candidatesCount={candidates.length}
            onTabChange={setTab}
            showCaseActions
            saving={saving}
            loading={loading}
            hasCase={Boolean(caseDetail)}
            isActive={caseDetail?.is_active !== false}
            onAdd={openCreateModal}
            onEdit={openEditModal}
            onRefresh={loadAll}
            onAddExample={() => setExampleModalOpen(true)}
            onArchive={() => handleLifecycle(false)}
            onActivate={() => handleLifecycle(true)}
          />
          <div className="rf-oc-console rf-rc-console">
            <ResponseCaseLeftPanel
            productAreaFilter={productAreaFilter}
            onProductAreaFilterChange={(v) => {
              setProductAreaFilter(v);
              setTopicFilter("");
            }}
            topicFilter={topicFilter}
            onTopicFilterChange={setTopicFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            scenarioFilter={scenarioFilter}
            onScenarioFilterChange={setScenarioFilter}
            productAreas={catalog.product_areas ?? []}
            topicsForFilter={topicsForFilter}
            scenarios={classRef.scenarios ?? []}
            search={search}
            onSearchChange={setSearch}
            filteredCount={filteredCases.length}
            pageIndex={pageIndex}
            totalPages={totalPages}
            pageItems={pageItems}
            loading={loading}
            onRefresh={loadAll}
            onPrevPage={() => setPageIndex((p) => Math.max(0, p - 1))}
            onNextPage={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
            onResetPage={() => setPageIndex(0)}
            selectedCaseId={selectedCaseId}
            onSelectCase={selectCase}
            error={error}
            message={message}
          />

          <section className="rf-oc-right card" aria-label="Карточка типовой ситуации">
            <ResponseCaseDetailPanel
              caseDetail={caseDetail}
              listItem={selectedListItem}
              quality={qualityForSelected}
              saving={saving}
              onEditExample={(ex) => setExampleEdit(ex)}
              onDeactivateExample={(id) => handleExamplePatch(id, { is_active: false })}
              relatedCandidates={[]}
            />
          </section>
          </div>
        </div>
      ) : (
        <div className="rf-rc-workspace-main">
          <ResponseCaseUnifiedToolbar
            tab={tab}
            candidatesCount={candidates.length}
            onTabChange={setTab}
            showCaseActions={false}
            showCandidateActions
            candidateIsExample={candidateDetail?.candidate_type === "response_case_example"}
            hasSelectedCandidate={Boolean(selectedCandidateId)}
            onCandidateCreate={openCreateFromCandidate}
            onCandidateMerge={handleCandidateMergeClick}
            onCandidateReject={() => setCandidateRejectModalOpen(true)}
            saving={saving}
            loading={loading}
            hasCase={false}
            isActive
            onAdd={openCreateModal}
            onEdit={openEditModal}
            onRefresh={loadAll}
            onAddExample={() => {}}
            onArchive={() => {}}
            onActivate={() => {}}
          />
          <ResponseCaseCandidatesPanel
            candidates={candidates}
            loading={loading}
            detailLoading={candidateDetailLoading}
            candidateDetail={candidateDetail}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={setSelectedCandidateId}
          />
        </div>
      )}
    </OpPage>
  );
}
