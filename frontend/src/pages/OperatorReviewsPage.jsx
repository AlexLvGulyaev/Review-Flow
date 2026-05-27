import { useCallback, useEffect, useState } from "react";

import { apiFetch, readApiError } from "../lib/api.js";

export default function OperatorReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [finalResponse, setFinalResponse] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [moderationFilter, setModerationFilter] = useState("");

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (moderationFilter) params.set("moderation_status", moderationFilter);
      const qs = params.toString();
      const res = await apiFetch(`/api/operator/reviews${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error(await readApiError(res, "Ошибка загрузки списка"));
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingList(false);
    }
  }, [moderationFilter]);

  const loadDetail = useCallback(async (reviewId) => {
    if (!reviewId) return;
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/operator/reviews/${reviewId}`);
      if (!res.ok) throw new Error(await readApiError(res, "Ошибка загрузки карточки"));
      const data = await res.json();
      setDetail(data);
      setFinalResponse(data.final_response || data.draft_response || "");
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
    if (reviews.length && !selectedId) {
      setSelectedId(reviews[0].review_id);
    }
  }, [reviews, selectedId]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function runAction(url, body) {
    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Ошибка действия модерации"));
      }
      const data = await res.json();
      if (data.draft_response !== undefined) {
        setDetail(data);
        setFinalResponse(data.final_response || data.draft_response || "");
      }
      setMessage(data.message || "Действие выполнено");
      await loadList();
      if (selectedId) await loadDetail(selectedId);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function handleApprove() {
    if (!selectedId || !finalResponse.trim()) {
      setError("Укажите финальный ответ");
      return;
    }
    runAction(`/api/operator/reviews/${selectedId}/approve`, {
      final_response: finalResponse.trim(),
    });
  }

  function handleReject() {
    if (!selectedId || !rejectReason.trim()) {
      setError("Укажите причину отклонения");
      return;
    }
    runAction(`/api/operator/reviews/${selectedId}/reject`, {
      reason: rejectReason.trim(),
    });
  }

  function handleRevision() {
    if (!selectedId || !revisionReason.trim()) {
      setError("Укажите причину доработки");
      return;
    }
    runAction(`/api/operator/reviews/${selectedId}/revision`, {
      reason: revisionReason.trim(),
    });
  }

  return (
    <main className="page page-wide">
      <h1>Оператор — очередь отзывов</h1>

      <div className="operator-toolbar">
        <label>
          Фильтр moderation_status
          <select
            value={moderationFilter}
            onChange={(e) => setModerationFilter(e.target.value)}
          >
            <option value="">Все</option>
            <option value="pending_review">pending_review</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="needs_revision">needs_revision</option>
          </select>
        </label>
        <button type="button" onClick={loadList} disabled={loadingList}>
          Обновить
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="success-inline">{message}</p>}

      <div className="operator-layout">
        <aside className="operator-list">
          <h2>Список</h2>
          {loadingList && <p>Загрузка…</p>}
          {!loadingList && reviews.length === 0 && <p>Нет отзывов</p>}
          <ul>
            {reviews.map((item) => (
              <li key={item.review_id}>
                <button
                  type="button"
                  className={
                    selectedId === item.review_id ? "list-item active" : "list-item"
                  }
                  onClick={() => setSelectedId(item.review_id)}
                >
                  <strong>{item.customer_name || "Клиент"}</strong>
                  <span>★ {item.rating}</span>
                  <span>
                    {item.scenario} / {item.sentiment} / {item.priority}
                  </span>
                  <span className="badge">{item.moderation_status}</span>
                  <span className="preview">{item.review_text_preview}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="operator-detail">
          <h2>Карточка отзыва</h2>
          {loadingDetail && <p>Загрузка карточки…</p>}
          {!loadingDetail && !detail && <p>Выберите отзыв</p>}
          {detail && (
            <>
              <div className="detail-grid">
                <div>
                  <h3>Клиент</h3>
                  <p>{detail.customer_name}</p>
                  <p>{detail.customer_email}</p>
                </div>
                <div>
                  <h3>Обращение</h3>
                  <p>{detail.service_case_title}</p>
                  <p>{detail.product_area}</p>
                  <p>Оценка: {detail.rating}</p>
                </div>
              </div>

              <div className="detail-block">
                <h3>Отзыв</h3>
                <p>{detail.review_text}</p>
              </div>

              {detail.classification && (
                <div className="detail-block">
                  <h3>Классификация</h3>
                  <ul>
                    <li>scenario: {detail.classification.scenario}</li>
                    <li>sentiment: {detail.classification.sentiment}</li>
                    <li>priority: {detail.classification.priority}</li>
                    <li>topic: {detail.classification.topic}</li>
                    <li>source: {detail.classification.classification_source}</li>
                  </ul>
                </div>
              )}

              {detail.matched_phrase_text && (
                <div className="detail-block">
                  <h3>Типовая формулировка</h3>
                  <p>{detail.matched_phrase_text}</p>
                </div>
              )}

              {detail.template?.template_text && (
                <div className="detail-block">
                  <h3>Шаблон</h3>
                  <p className="mono">{detail.template.template_text}</p>
                </div>
              )}

              {detail.draft_response && (
                <div className="detail-block">
                  <h3>Draft (AI)</h3>
                  <p>{detail.draft_response}</p>
                </div>
              )}

              <div className="detail-block">
                <h3>Финальный ответ</h3>
                <p>
                  moderation: <strong>{detail.moderation_status}</strong> · publication:{" "}
                  <strong>{detail.publication_status}</strong>
                </p>
                <textarea
                  rows={6}
                  value={finalResponse}
                  onChange={(e) => setFinalResponse(e.target.value)}
                  disabled={actionLoading}
                />
              </div>

              <div className="action-row">
                <button
                  type="button"
                  className="btn-approve"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  Approve / Mock publish
                </button>
              </div>

              <div className="action-row secondary">
                <input
                  placeholder="Причина отклонения"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  disabled={actionLoading}
                />
                <button type="button" onClick={handleReject} disabled={actionLoading}>
                  Reject
                </button>
              </div>

              <div className="action-row secondary">
                <input
                  placeholder="Причина доработки"
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  disabled={actionLoading}
                />
                <button type="button" onClick={handleRevision} disabled={actionLoading}>
                  Needs revision
                </button>
              </div>

              {detail.operational_logs?.length > 0 && (
                <div className="detail-block">
                  <h3>Operational logs</h3>
                  <ul className="log-list">
                    {detail.operational_logs.map((log, idx) => (
                      <li key={idx}>
                        {log.created_at} — {log.event_type} ({log.status})
                        {log.error_message ? `: ${log.error_message}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
