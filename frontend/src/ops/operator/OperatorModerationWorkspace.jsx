import { OpButton, OpTextarea } from "../components/OpToolbar.jsx";
import { OpPayloadBlock } from "../observability/OpPayloadBlock.jsx";
import { OperatorLifecycleTimeline } from "./OperatorLifecycleTimeline.jsx";
import { CollapsibleTextPanel } from "./CollapsibleTextPanel.jsx";
import {
  WORKFLOW_COMPLETED_TOOLTIP,
  isControlledHybridDetail,
  isOperatorWorkflowCompleted,
  labelModeration,
  labelPriority,
  labelScenario,
  labelSentiment,
} from "../../lib/displayLabels.js";
import { ResponseCasePanel } from "./ResponseCasePanel.jsx";
import {
  formatAge,
  formatDateTime,
  formatRequestHeader,
  isEditorLocked,
  shortTechnicalId,
  templateDisplayLabel,
} from "./operatorUtils.js";

export function OperatorModerationWorkspace({
  detail,
  selectedId,
  finalResponse,
  onFinalResponseChange,
  editorLocked,
  actionLoading,
  loadingDetail,
  lifecycleTimeline,
  onApprove,
  onRejectClick,
  onConfirmCase,
  onOverrideCase,
  onOpenCandidateModal,
}) {
  if (loadingDetail) {
    return <p className="rf-oc-empty">Загрузка обращения…</p>;
  }
  if (!detail) {
    return <p className="rf-oc-empty">Выберите обращение в очереди слева</p>;
  }

  const cls = detail.classification;
  const locked = editorLocked ?? isEditorLocked(detail);
  const workflowCompleted = isOperatorWorkflowCompleted(detail);
  const actionsDisabled = actionLoading || workflowCompleted;
  const completedTooltip = workflowCompleted ? WORKFLOW_COMPLETED_TOOLTIP : undefined;
  const modUpper = labelModeration(detail.moderation_status).toUpperCase();
  const templateLabel = templateDisplayLabel(detail.template);
  const completedAt =
    detail.moderation_status === "approved" && detail.updated_at
      ? formatDateTime(detail.updated_at)
      : "—";

  const phraseFooter = detail.matched_phrase_text
    ? `Найдена типовая формулировка: «${detail.matched_phrase_text}»`
    : null;
  const templateFooter = templateLabel ? `Шаблон ответа: ${templateLabel}` : null;
  const chMode = isControlledHybridDetail(detail);
  const approvedText = detail.selected_response_case?.approved_response_text;
  const draftText = detail.draft_response;

  return (
    <div className="rf-oc-detail">
      <div className="rf-oc-detail-identity">
        <h2 className="rf-oc-detail-identity__title">{formatRequestHeader(detail)}</h2>
        <span className="rf-oc-detail-identity__status">{modUpper}</span>
      </div>

      <div className="rf-oc-summary-grid">
        <div className="rf-oc-summary-col">
          <h3 className="rf-oc-summary-col__label">Клиент / заказ</h3>
          <dl className="rf-oc-kv-list">
            <dt>Номер заказа</dt>
            <dd>{detail.order_number || detail.service_case_title || "—"}</dd>
            <dt>Тема обращения</dt>
            <dd>{detail.service_case_title || detail.product_area || "—"}</dd>
            <dt>Email</dt>
            <dd>{detail.customer_email || "—"}</dd>
            <dt>Клиент</dt>
            <dd>{detail.customer_name || "—"}</dd>
            <dt>Оценка</dt>
            <dd>{detail.rating ?? "—"}</dd>
          </dl>
        </div>
        <div className="rf-oc-summary-col">
          <h3 className="rf-oc-summary-col__label">Операционные данные</h3>
          <dl className="rf-oc-kv-list">
            <dt>Создано / длительность</dt>
            <dd>
              {formatDateTime(detail.created_at)} · {formatAge(detail.created_at)}
            </dd>
            <dt>LLM модель</dt>
            <dd>{detail.llm_model || cls?.classification_source || "—"}</dd>
            <dt>Сценарий</dt>
            <dd>{labelScenario(cls?.scenario)}</dd>
            <dt>Тональность</dt>
            <dd>{labelSentiment(cls?.sentiment)}</dd>
            <dt>Приоритет</dt>
            <dd>{labelPriority(cls?.priority)}</dd>
            <dt>Завершено</dt>
            <dd>{completedAt}</dd>
          </dl>
        </div>
      </div>

      {chMode ? (
        <ResponseCasePanel
          detail={detail}
          actionLoading={actionLoading}
          workflowCompleted={workflowCompleted}
          onConfirmCase={onConfirmCase}
          onOverrideCase={onOverrideCase}
          onOpenCandidateModal={onOpenCandidateModal}
        />
      ) : null}

      <div className={chMode ? "rf-oc-io-grid rf-oc-io-grid--ch" : "rf-oc-io-grid"}>
        <CollapsibleTextPanel title="Обращение клиента" text={detail.review_text} footer={chMode ? null : phraseFooter} />
        {chMode ? (
          <>
            <CollapsibleTextPanel
              title="Утверждённая основа ответа"
              text={approvedText || "—"}
              footer="Текст и политика типовой ситуации (read-only)"
            />
            <CollapsibleTextPanel
              title="Сгенерированный черновик"
              text={draftText || "Черновик ещё не сформирован — выберите или подтвердите типовую ситуацию."}
              footer={null}
            />
          </>
        ) : (
          <CollapsibleTextPanel title="Ответ AI" text={detail.draft_response} footer={templateFooter} />
        )}
      </div>

      <div className="rf-oc-detail-block rf-oc-detail-block--editor">
        <div className="rf-oc-detail-block__head rf-oc-detail-block__head--actions">
          <h3 className="rf-oc-detail-block__title">Ответ оператора</h3>
          <div className="rf-oc-editor-actions">
            <OpButton
              type="button"
              onClick={onApprove}
              disabled={actionsDisabled}
              title={completedTooltip}
              variant="primary"
            >
              Одобрить и отправить
            </OpButton>
            <OpButton
              type="button"
              onClick={onRejectClick}
              disabled={actionsDisabled}
              title={completedTooltip}
            >
              Отклонить
            </OpButton>
          </div>
        </div>
        <OpTextarea
          className="rf-oc-editor rf-oc-editor--compact"
          rows={5}
          value={finalResponse}
          onChange={(e) => onFinalResponseChange(e.target.value)}
          disabled={actionLoading || locked}
          readOnly={locked}
          placeholder={locked ? "Примите или отклоните черновик AI…" : "Внесите исправления в ответ…"}
        />
      </div>

      <h3 className="rf-oc-timeline-heading">Таймлайн обработки</h3>
      {lifecycleTimeline.length ? (
        <OperatorLifecycleTimeline events={lifecycleTimeline} />
      ) : (
        <p className="muted">Нет событий жизненного цикла</p>
      )}

      <details className="rf-oc-tech">
        <summary>Технические данные</summary>
        <div className="rf-oc-tech-body">
          <p className="muted">
            Внутренний ID: <code title={selectedId}>{shortTechnicalId(detail.review_id)}</code>
          </p>
          {detail.rejection_feedback_history?.length ? (
            <OpPayloadBlock title="История отклонений AI" payload={detail.rejection_feedback_history} />
          ) : null}
          <OpPayloadBlock title="Журнал событий (raw)" payload={detail.operational_logs} />
        </div>
      </details>
    </div>
  );
}
