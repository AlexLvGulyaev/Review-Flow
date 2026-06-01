import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiFetch, readApiError } from "../lib/api.js";
import { fetchClassificationReference } from "../lib/classificationReference.js";
import { OpPage } from "../ops/components/OpPage.jsx";
import { OperatorConsoleHeader, OperatorWorkspaceHeader } from "../ops/operator/OperatorConsoleHeader.jsx";
import { OperatorLeftPanel } from "../ops/operator/OperatorLeftPanel.jsx";
import { OperatorModerationWorkspace } from "../ops/operator/OperatorModerationWorkspace.jsx";
import { CaseCandidateModal } from "../ops/operator/CaseCandidateModal.jsx";
import { EscalationModal } from "../ops/operator/EscalationModal.jsx";
import { RejectionFeedbackModal } from "../ops/operator/RejectionFeedbackModal.jsx";
import { buildLifecycleTimeline } from "../ops/operator/operatorTimeline.js";
import { isControlledHybridDetail, isOperatorWorkflowCompleted } from "../lib/displayLabels.js";
import { formatDateTime, getOperationalIdentity, isEditorLocked, queueCounters, resolveOperatorFinalResponse } from "../ops/operator/operatorUtils.js";

const PAGE_SIZE = 10;

function safeLower(s) {
  return String(s || "").toLowerCase();
}

export default function OperatorReviewsPage() {
  const listRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [finalResponse, setFinalResponse] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [escalationModalOpen, setEscalationModalOpen] = useState(false);
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [moderationFilter, setModerationFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [scenarioFilter, setScenarioFilter] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [classificationRef, setClassificationRef] = useState({
    scenarios: [],
    sentiments: [],
    priorities: [],
  });

  const editorLocked = detail ? isEditorLocked(detail) : true;

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
      if (moderationFilter) params.set("moderation_status", moderationFilter);
      const qs = params.toString();
      const path = `/api/operator/reviews${qs ? `?${qs}` : ""}`;
      const res = await apiFetch(path);
      if (!res.ok) throw new Error(await readApiError(res, "Ошибка загрузки списка"));
      setReviews(await res.json());
    } catch (err) {
      console.error("[operator] failed to load list", err);
      setReviews([]);
      setListError(err.message || "Ошибка загрузки");
    } finally {
      setLoadingList(false);
    }
  }, [moderationFilter]);

  const loadDetail = useCallback(async (reviewId) => {
    if (!reviewId) return;
    setLoadingDetail(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/operator/reviews/${reviewId}`);
      if (!res.ok) throw new Error(await readApiError(res, "Ошибка загрузки карточки"));
      const data = await res.json();
      setDetail(data);
      setFinalResponse(resolveOperatorFinalResponse(data));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    fetchClassificationReference()
      .then(setClassificationRef)
      .catch((err) => console.error("[operator] classification reference", err));
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search, priorityFilter, scenarioFilter, sentimentFilter, moderationFilter]);

  const scenarios = useMemo(() => {
    const fromRef = classificationRef.scenarios.map((s) => s.code);
    const fromQueue = reviews.map((r) => r.scenario).filter(Boolean);
    return Array.from(new Set([...fromRef, ...fromQueue])).sort();
  }, [classificationRef.scenarios, reviews]);

  const sentiments = useMemo(() => {
    const fromRef = classificationRef.sentiments.map((s) => s.code);
    const fromQueue = reviews.map((r) => r.sentiment).filter(Boolean);
    return Array.from(new Set([...fromRef, ...fromQueue])).sort();
  }, [classificationRef.sentiments, reviews]);

  const priorities = useMemo(() => {
    const fromRef = classificationRef.priorities.map((p) => p.code);
    const fromQueue = reviews.map((r) => r.priority).filter(Boolean);
    return Array.from(new Set([...fromRef, ...fromQueue])).sort();
  }, [classificationRef.priorities, reviews]);

  const filteredReviews = useMemo(() => {
    const needle = safeLower(search).trim();
    return reviews.filter((r) => {
      if (priorityFilter && r.priority !== priorityFilter) return false;
      if (scenarioFilter && r.scenario !== scenarioFilter) return false;
      if (sentimentFilter && r.sentiment !== sentimentFilter) return false;
      if (!needle) return true;
      const identity = getOperationalIdentity(r);
      const hay = [
        identity.primary,
        identity.secondary,
        r.request_number,
        r.review_id,
        r.customer_name,
        r.service_case_title,
        r.product_area,
        r.review_text_preview,
        r.scenario,
        r.sentiment,
      ]
        .map(safeLower)
        .join(" ");
      return hay.includes(needle);
    });
  }, [reviews, search, priorityFilter, scenarioFilter, sentimentFilter]);

  const totalPagesRaw = Math.ceil(filteredReviews.length / PAGE_SIZE);
  const totalPages = Math.max(1, totalPagesRaw || 1);
  const pageIndex = Math.min(page, Math.max(0, totalPagesRaw - 1));
  const pageItems = useMemo(
    () => filteredReviews.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE),
    [filteredReviews, pageIndex]
  );

  useEffect(() => {
    if (page !== pageIndex) setPage(pageIndex);
  }, [page, pageIndex]);

  useEffect(() => {
    if (!pageItems.length) {
      if (!filteredReviews.length) setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredReviews.some((r) => r.review_id === selectedId)) {
      setSelectedId(pageItems[0].review_id);
      return;
    }
    if (!pageItems.some((r) => r.review_id === selectedId)) {
      const idx = filteredReviews.findIndex((r) => r.review_id === selectedId);
      if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE));
      else setSelectedId(pageItems[0].review_id);
    }
  }, [filteredReviews, pageItems, selectedId]);

  useEffect(() => {
    if (selectedId) {
      setActionError(null);
      loadDetail(selectedId);
    }
  }, [selectedId, loadDetail]);

  const lastPageIndex = Math.max(0, totalPagesRaw - 1);

  function goPrevPage() {
    const np = Math.max(0, pageIndex - 1);
    setPage(np);
    const slice = filteredReviews.slice(np * PAGE_SIZE, (np + 1) * PAGE_SIZE);
    const pick = slice[slice.length - 1] ?? slice[0];
    if (pick) setSelectedId(pick.review_id);
  }

  function goNextPage() {
    const np = Math.min(lastPageIndex, pageIndex + 1);
    setPage(np);
    const slice = filteredReviews.slice(np * PAGE_SIZE, (np + 1) * PAGE_SIZE);
    if (slice[0]) setSelectedId(slice[0].review_id);
  }

  function resetPagination() {
    setPage(0);
    const first = filteredReviews[0];
    if (first) setSelectedId(first.review_id);
  }

  async function runApprove() {
    if (!selectedId || !detail) return;
    const text = (editorLocked ? detail.draft_response : finalResponse) || "";
    if (!String(text).trim()) {
      setActionError("Нет текста ответа для отправки");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/operator/reviews/${selectedId}/approve`, {
        method: "POST",
        body: JSON.stringify({ final_response: String(text).trim() }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Ошибка одобрения"));
      const data = await res.json();
      setDetail(data);
      setFinalResponse(resolveOperatorFinalResponse(data));
      await loadList();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function refreshDetail(reviewId) {
    const res = await apiFetch(`/api/operator/reviews/${reviewId}`);
    if (!res.ok) throw new Error(await readApiError(res, "Ошибка загрузки карточки"));
    const data = await res.json();
    setDetail(data);
    setFinalResponse(resolveOperatorFinalResponse(data));
    return data;
  }

  async function runConfirmCase() {
    if (!selectedId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/operator/reviews/${selectedId}/confirm-case`, { method: "POST" });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось подтвердить ситуацию"));
      await refreshDetail(selectedId);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function runOverrideCase(responseCaseId, comment) {
    if (!selectedId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/operator/reviews/${selectedId}/override-case`, {
        method: "POST",
        body: JSON.stringify({ response_case_id: responseCaseId, comment }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось сменить типовую ситуацию"));
      const data = await refreshDetail(selectedId);
      setFinalResponse(resolveOperatorFinalResponse(data));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function runCreateCandidate(payload) {
    if (!selectedId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/operator/reviews/${selectedId}/case-candidates`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось создать кандидата"));
      await refreshDetail(selectedId);
      setCandidateModalOpen(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function runEscalate(payload) {
    if (!selectedId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/operator/reviews/${selectedId}/escalate`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Ошибка эскалации"));
      const data = await res.json();
      setDetail(data);
      setFinalResponse(resolveOperatorFinalResponse(data));
      setEscalationModalOpen(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function runRejectFeedback(payload) {
    if (!selectedId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/operator/reviews/${selectedId}/reject-feedback`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Ошибка сохранения отклонения"));
      const data = await res.json();
      setDetail(data);
      setFinalResponse(resolveOperatorFinalResponse(data));
      setRejectModalOpen(false);
      await loadList();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  const counters = useMemo(() => queueCounters(reviews), [reviews]);
  const chMode = detail ? isControlledHybridDetail(detail) : false;
  const lifecycleTimeline = detail ? buildLifecycleTimeline(detail, formatDateTime) : [];

  return (
    <OpPage wide className="op-page--operator-full">
      <OperatorConsoleHeader />
      <OperatorWorkspaceHeader />

      <div className="rf-oc-console">
        <OperatorLeftPanel
          listRef={listRef}
          search={search}
          onSearchChange={setSearch}
          moderationFilter={moderationFilter}
          onModerationFilterChange={setModerationFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          scenarioFilter={scenarioFilter}
          onScenarioFilterChange={setScenarioFilter}
          sentimentFilter={sentimentFilter}
          onSentimentFilterChange={setSentimentFilter}
          scenarios={scenarios}
          sentiments={sentiments}
          counters={counters}
          filteredCount={filteredReviews.length}
          pageIndex={pageIndex}
          totalPages={totalPagesRaw || 1}
          pageItems={pageItems}
          loading={loadingList}
          onRefresh={loadList}
          onPrevPage={goPrevPage}
          onNextPage={goNextPage}
          onResetPage={resetPagination}
          selectedId={selectedId}
          onSelect={setSelectedId}
          listError={listError}
        />

        <section className="rf-oc-right card" aria-label="Рабочая область проверки AI">
          <OperatorModerationWorkspace
            detail={detail}
            selectedId={selectedId}
            finalResponse={finalResponse}
            onFinalResponseChange={setFinalResponse}
            editorLocked={editorLocked}
            actionLoading={actionLoading}
            loadingDetail={loadingDetail}
            lifecycleTimeline={lifecycleTimeline}
            actionError={actionError}
            onApprove={runApprove}
            onRejectClick={() => {
              if (detail && isOperatorWorkflowCompleted(detail)) return;
              setRejectModalOpen(true);
            }}
            onEscalateClick={() => {
              if (
                detail &&
                (isOperatorWorkflowCompleted(detail) || detail.case_resolved || detail.case_escalated)
              ) {
                return;
              }
              setEscalationModalOpen(true);
            }}
            onConfirmCase={runConfirmCase}
            onOverrideCase={runOverrideCase}
          />
        </section>
      </div>

      {!chMode ? (
        <RejectionFeedbackModal
          open={rejectModalOpen}
          detail={detail}
          scenarioOptions={classificationRef.scenarios}
          sentimentOptions={classificationRef.sentiments}
          priorityOptions={classificationRef.priorities}
          saving={actionLoading}
          onClose={() => setRejectModalOpen(false)}
          onSave={runRejectFeedback}
        />
      ) : null}

      {chMode ? (
        <EscalationModal
          open={escalationModalOpen}
          saving={actionLoading}
          scenarioOptions={classificationRef.scenarios}
          sentimentOptions={classificationRef.sentiments}
          priorityOptions={classificationRef.priorities}
          onClose={() => setEscalationModalOpen(false)}
          onSave={runEscalate}
        />
      ) : null}

      {!chMode ? (
        <CaseCandidateModal
          open={candidateModalOpen}
          saving={actionLoading}
          onClose={() => setCandidateModalOpen(false)}
          onSave={runCreateCandidate}
        />
      ) : null}
    </OpPage>
  );
}
