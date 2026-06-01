import { CollapsibleTextPanel } from "../operator/CollapsibleTextPanel.jsx";
import {
  labelConfidenceBand,
  labelDecisionSource,
  labelPriority,
  labelScenario,
  labelSentiment,
} from "../../lib/displayLabels.js";

const CANDIDATE_TYPE_LABELS = {
  new_response_case: "Новая типовая ситуация",
  response_case_example: "Пример для существующей ТС",
};

const ESCALATION_LABELS = {
  no_case_fits: "Ни одна типовая ситуация не подошла",
  case_correction_needed: "Требуется корректировка ТС",
  bad_llm_draft: "Некачественный черновик LLM",
};

function candidateTypeLabel(type) {
  return CANDIDATE_TYPE_LABELS[type] || type || "—";
}

function escalationLabel(code) {
  if (!code) return "—";
  return ESCALATION_LABELS[code] || code;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatScore(score) {
  if (score == null || Number.isNaN(Number(score))) return "—";
  return Number(score).toFixed(2);
}

function CandidateQueueItem({ item, active, onSelect }) {
  return (
    <button
      type="button"
      className={active ? "rf-oc-item rf-oc-item--selected" : "rf-oc-item"}
      onClick={onSelect}
    >
      <div className="rf-oc-item__row rf-oc-item__row--head">
        <span className="rf-oc-item__ts">{formatDateTime(item.created_at)}</span>
        <span className="rf-oc-item__status">{candidateTypeLabel(item.candidate_type)}</span>
      </div>
      <div className="rf-oc-item__preview">{item.proposed_title || "Без названия"}</div>
      <div className="rf-oc-item__telemetry muted">
        {item.review_id ? `Обращение ${String(item.review_id).slice(0, 8)}` : "—"}
      </div>
    </button>
  );
}

function KvRow({ label, value }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value ?? "—"}</dd>
    </>
  );
}

function CandidateReviewSummary({ review }) {
  if (!review) return null;
  const cls = review.classification;
  return (
    <div className="rf-oc-summary-col">
      <h3 className="rf-oc-summary-col__label">Обращение / кандидат</h3>
      <dl className="rf-oc-kv-list">
        <KvRow label="Номер обращения" value={review.request_number} />
        <KvRow label="Заказ" value={review.order_number} />
        <KvRow label="Клиент" value={review.customer_name} />
        <KvRow label="Email" value={review.customer_email} />
        <KvRow label="Тема" value={review.service_case_title || review.product_area} />
        <KvRow label="Оценка" value={review.rating != null ? String(review.rating) : null} />
        <KvRow label="Дата создания кандидата" value={formatDateTime(review.candidate_created_at)} />
        <KvRow label="Оператор" value={review.operator_id} />
        {cls ? (
          <KvRow
            label="Классификация"
            value={`${labelScenario(cls.scenario)} · ${labelSentiment(cls.sentiment)} · ${labelPriority(cls.priority)}`}
          />
        ) : null}
      </dl>
    </div>
  );
}

function CandidateAnalysisSummary({ detail }) {
  const analysis = detail?.analysis;
  const isExample = detail?.candidate_type === "response_case_example";
  if (!analysis) return null;

  if (isExample) {
    return (
      <div className="rf-oc-summary-col">
        <h3 className="rf-oc-summary-col__label">Параметры анализа</h3>
        <dl className="rf-oc-kv-list">
          <KvRow label="Целевая ТС" value={analysis.target_case_title || analysis.target_case_code} />
          <KvRow
            label="Score / порог / gap"
            value={`${formatScore(analysis.match_score)} / ${formatScore(analysis.retrieval_threshold)} / ${formatScore(analysis.gap)}`}
          />
          <KvRow label="Confidence band" value={labelConfidenceBand(analysis.confidence_band)} />
          <KvRow label="Источник выбора" value={labelDecisionSource(analysis.decision_source)} />
          <KvRow label="Retrieval summary" value={analysis.retrieval_summary} />
        </dl>
      </div>
    );
  }

  return (
    <div className="rf-oc-summary-col">
      <h3 className="rf-oc-summary-col__label">Параметры анализа</h3>
      <dl className="rf-oc-kv-list">
        {analysis.no_case_fits ? (
          <>
            <KvRow label="Причина эскалации" value={escalationLabel(analysis.escalation_reason)} />
            <KvRow label="Подходящая ТС" value="Не найдена" />
          </>
        ) : (
          <KvRow label="Причина эскалации" value={escalationLabel(analysis.escalation_reason)} />
        )}
        <KvRow label="Retrieval summary" value={analysis.retrieval_summary} />
        <KvRow label="Confidence band" value={labelConfidenceBand(analysis.confidence_band)} />
        <KvRow label="Источник выбора" value={labelDecisionSource(analysis.decision_source)} />
        {analysis.system_selected_case_title ? (
          <KvRow label="Системное предложение" value={analysis.system_selected_case_title} />
        ) : null}
      </dl>
    </div>
  );
}

function CandidateRetrievalAlternatives({ lines }) {
  if (!lines?.length) {
    return (
      <section className="rf-rc-candidate-alternatives" aria-label="Альтернативные типовые ситуации">
        <h3 className="rf-oc-detail-block__title">Альтернативные типовые ситуации</h3>
        <p className="muted">Нет данных retrieval для этого обращения</p>
      </section>
    );
  }

  return (
    <section className="rf-rc-candidate-alternatives" aria-label="Альтернативные типовые ситуации">
      <h3 className="rf-oc-detail-block__title">Альтернативные типовые ситуации</h3>
      <ul className="rf-oc-ch-alt-rows">
        {lines.map((alt) => (
          <li key={`${alt.response_case_id}-${alt.rank}`} className="rf-oc-ch-alt-row">
            <span className="rf-oc-ch-alt-row__score">{formatScore(alt.match_score)}</span>
            <span className="rf-oc-ch-alt-row__sep" aria-hidden="true">
              |
            </span>
            <strong className="rf-oc-ch-alt-row__title">{alt.title}</strong>
            <span className="rf-oc-ch-alt-row__sep" aria-hidden="true">
              |
            </span>
            <span className="rf-oc-ch-alt-row__desc muted">{alt.description || "—"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CandidateDetailCard({ detail }) {
  const review = detail.review;
  const operatorComment =
    detail.candidate_type === "response_case_example" ? null : detail.operator_comment;

  return (
    <div className="rf-rc-candidate-detail">
      <div className="rf-oc-detail">
        <div className="rf-oc-detail-identity">
          <h2 className="rf-oc-detail-identity__title">{detail.proposed_title || "Кандидат"}</h2>
          <span className="rf-oc-detail-identity__status">
            {candidateTypeLabel(detail.candidate_type).toUpperCase()}
          </span>
        </div>

        <div className="rf-oc-summary-grid rf-rc-candidate-summary">
          <CandidateReviewSummary review={review} />
          <CandidateAnalysisSummary detail={detail} />
        </div>

        <div className="rf-oc-io-grid">
          <CollapsibleTextPanel title="Обращение клиента" text={review?.review_text} previewLines={5} />
          <CollapsibleTextPanel
            title="Комментарий оператора"
            text={operatorComment || "—"}
            previewLines={5}
          />
        </div>

        <CandidateRetrievalAlternatives lines={detail.retrieval_alternatives} />

        <details className="rf-oc-tech rf-rc-candidate-collapsible">
          <summary>Таймлайн жизненного цикла кандидата</summary>
          <div className="rf-oc-tech-body">
            {detail.timeline?.length ? (
              <ul className="rf-rc-candidate-timeline">
                {detail.timeline.map((ev, idx) => (
                  <li key={`${ev.event_type}-${ev.created_at}-${idx}`}>
                    <strong>{ev.event_type}</strong>
                    <span className="muted">
                      {" "}
                      · {formatDateTime(ev.created_at)}
                      {ev.status ? ` · ${ev.status}` : ""}
                    </span>
                    {ev.error_message ? <div className="muted">{ev.error_message}</div> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Нет событий</p>
            )}
          </div>
        </details>

        <details className="rf-oc-tech rf-rc-candidate-collapsible">
          <summary>Технические данные</summary>
          <div className="rf-oc-tech-body">
            <pre className="rf-oc-details__json">{JSON.stringify(detail.technical_payload, null, 2)}</pre>
          </div>
        </details>
      </div>
    </div>
  );
}

export function ResponseCaseCandidatesPanel({
  candidates,
  loading,
  detailLoading,
  candidateDetail,
  selectedCandidateId,
  onSelectCandidate,
}) {
  return (
    <div className="rf-oc-console rf-rc-candidate-console">
      <section className="rf-oc-left card" aria-label="Очередь кандидатов">
        <div className="rf-oc-filters">
          <div className="rf-oc-filter-meta muted">
            <span>В очереди: {candidates.length}</span>
          </div>
        </div>
        <div className="rf-oc-list">
          {loading && candidates.length === 0 ? <p className="rf-oc-empty">Загрузка…</p> : null}
          {!loading && candidates.length === 0 ? <p className="rf-oc-empty">Очередь пуста</p> : null}
          {candidates.map((c) => (
            <CandidateQueueItem
              key={c.id}
              item={c}
              active={c.id === selectedCandidateId}
              onSelect={() => onSelectCandidate(c.id)}
            />
          ))}
        </div>
      </section>

      <section className="rf-oc-right card rf-rc-candidate-right" aria-label="Карточка кандидата">
        <div className="rf-rc-detail-scroll">
          {!selectedCandidateId ? (
            <p className="rf-oc-empty">Выберите кандидата из очереди слева</p>
          ) : detailLoading && !candidateDetail ? (
            <p className="rf-oc-empty">Загрузка карточки…</p>
          ) : candidateDetail ? (
            <CandidateDetailCard detail={candidateDetail} />
          ) : (
            <p className="rf-oc-empty">Не удалось загрузить карточку</p>
          )}
        </div>
      </section>
    </div>
  );
}
