import { OpButton, OpTextarea } from "../components/OpToolbar.jsx";
import { OpPayloadBlock } from "../observability/OpPayloadBlock.jsx";
import { OperatorLifecycleTimeline } from "./OperatorLifecycleTimeline.jsx";
import { CollapsibleTextPanel } from "./CollapsibleTextPanel.jsx";
import {
  OPERATOR_WORKFLOW_SENT_LABEL,
  WORKFLOW_COMPLETED_TOOLTIP,
  isControlledHybridDetail,
  isOperatorWorkflowCompleted,
  labelModeration,
  labelPriority,
  labelScenario,
  labelSentiment,
} from "../../lib/displayLabels.js";
import { SelectedResponseCaseSummary, ResponseCaseAlternatives } from "./ResponseCasePanel.jsx";
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
  onEscalateClick,
  onConfirmCase,
  onOverrideCase,
  actionError,
}) {
  if (loadingDetail) {
    return <p className="rf-oc-empty">Загрузка обращения…</p>;
  }
  if (!detail) {
    return <p className="rf-oc-empty">Выберите обращение в очереди слева</p>;
  }

  const cls = detail.classification;
  const workflowCompleted = isOperatorWorkflowCompleted(detail);
  const locked = workflowCompleted || (editorLocked ?? isEditorLocked(detail));
  const actionsDisabled = actionLoading || workflowCompleted;
  const showActions = !workflowCompleted;
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
  const selected = detail.selected_response_case;
  const approvedText = selected?.approved_response_text;
  const draftText = detail.draft_response;
  const llmModel = detail.llm_model || cls?.classification_source || "—";
  const needsConfirm =
    !detail.case_confirmation_not_required &&
    selected?.requires_operator_confirmation &&
    !selected?.operator_confirmed;
  const escalationDisabled = actionsDisabled || detail.case_resolved || detail.case_escalated;
  const escalationTitle = detail.case_resolved
    ? "Типовая ситуация уже выбрана оператором — эскалация недоступна"
    : detail.case_escalated
      ? "Эскалация уже зафиксирована для этого обращения"
      : completedTooltip;

  if (chMode) {
    return (
      <div className="rf-oc-detail rf-oc-detail--ch">
        <div className="rf-oc-detail-identity">
          <h2 className="rf-oc-detail-identity__title">{formatRequestHeader(detail)}</h2>
          <span className="rf-oc-detail-identity__status">{modUpper}</span>
        </div>

        <div className="rf-oc-ch-top-grid">
          <div className="rf-oc-ch-top-col rf-oc-ch-top-col--request">
            <h3 className="rf-oc-summary-col__label">Обращение</h3>
            <dl className="rf-oc-kv-list rf-oc-ch-kv rf-oc-ch-kv--compact">
              <dt>Создано / длительность</dt>
              <dd>
                {formatDateTime(detail.created_at)} · {formatAge(detail.created_at)}
              </dd>
              <dt>Заказ</dt>
              <dd>{detail.order_number || detail.service_case_title || "—"}</dd>
              <dt>Тема</dt>
              <dd>{detail.service_case_title || detail.product_area || "—"}</dd>
              <dt>Email</dt>
              <dd>{detail.customer_email || "—"}</dd>
              <dt>Клиент</dt>
              <dd>{detail.customer_name || "—"}</dd>
              <dt>Оценка</dt>
              <dd>{detail.rating ?? "—"}</dd>
              <dt>Завершено</dt>
              <dd>{completedAt}</dd>
            </dl>
          </div>
          <SelectedResponseCaseSummary selected={selected} detail={detail} />
        </div>

        <div className="rf-oc-ch-trio-grid">
          <CollapsibleTextPanel title="Обращение клиента" text={detail.review_text} previewLines={5} />
          <CollapsibleTextPanel
            className="rf-oc-text-panel--approved-basis"
            title="Утверждённая основа ответа"
            text={approvedText || "—"}
            previewLines={5}
          />
          <CollapsibleTextPanel
            title={`Ответ LLM · ${llmModel}`}
            text={draftText || "Черновик ещё не сформирован — выберите или подтвердите типовую ситуацию."}
            previewLines={5}
          />
        </div>

        {workflowCompleted ? (
          <p className="rf-oc-workflow-sent-banner" role="status">
            {OPERATOR_WORKFLOW_SENT_LABEL}
          </p>
        ) : null}

        <div className="rf-oc-detail-block rf-oc-detail-block--editor rf-oc-detail-block--ch-editor">
          <div className="rf-oc-detail-block__head rf-oc-detail-block__head--actions">
            <h3 className="rf-oc-detail-block__title">Ответ оператора</h3>
            {showActions ? (
              <div className="rf-oc-editor-actions rf-oc-editor-actions--ch">
                {needsConfirm ? (
                  <OpButton type="button" variant="primary" disabled={actionsDisabled} onClick={onConfirmCase}>
                    Подтвердить типовую ситуацию
                  </OpButton>
                ) : null}
                <OpButton
                  type="button"
                  onClick={onApprove}
                  disabled={actionsDisabled}
                  variant={needsConfirm ? undefined : "primary"}
                >
                  Одобрить и отправить
                </OpButton>
                <OpButton
                  type="button"
                  onClick={onEscalateClick}
                  disabled={escalationDisabled}
                  title={escalationTitle}
                >
                  Эскалация ТС
                </OpButton>
              </div>
            ) : null}
          </div>
          {actionError ? <div className="rf-oc-action-feedback rf-oc-action-feedback--error">{actionError}</div> : null}
          <OpTextarea
            className="rf-oc-editor rf-oc-editor--compact"
            rows={5}
            value={finalResponse}
            onChange={(e) => onFinalResponseChange(e.target.value)}
            disabled={actionLoading || locked}
            readOnly={locked}
            placeholder={
              workflowCompleted
                ? "Ответ отправлен клиенту"
                : locked
                  ? "Подтвердите типовую ситуацию или выполните эскалацию, чтобы редактировать ответ…"
                  : "Внесите исправления в ответ…"
            }
          />
        </div>

        {!workflowCompleted ? (
          <ResponseCaseAlternatives
            detail={detail}
            actionLoading={actionLoading}
            workflowCompleted={workflowCompleted}
            onOverrideCase={onOverrideCase}
          />
        ) : null}

        <details className="rf-oc-tech">
          <summary>Таймлайн обработки</summary>
          <div className="rf-oc-tech-body">
            {lifecycleTimeline.length ? (
              <OperatorLifecycleTimeline events={lifecycleTimeline} />
            ) : (
              <p className="muted">Нет событий жизненного цикла</p>
            )}
          </div>
        </details>

        <details className="rf-oc-tech">
          <summary>Технические данные</summary>
          <div className="rf-oc-tech-body">
            <p className="muted">
              Внутренний ID: <code title={selectedId}>{shortTechnicalId(detail.review_id)}</code>
            </p>
            {detail.retrieval_suggestion ? (
              <div className="rf-oc-tech-block">
                <h4 className="rf-oc-tech-block__title">Retrieval и решение оператора</h4>
                <dl className="rf-oc-kv-list rf-oc-ch-kv rf-oc-ch-kv--compact">
                  <dt>Retrieval предложил</dt>
                  <dd>
                    {detail.retrieval_suggestion.title || "—"}
                    {detail.retrieval_suggestion.match_score != null
                      ? ` · score=${Number(detail.retrieval_suggestion.match_score).toFixed(2)}`
                      : ""}
                  </dd>
                  {detail.retrieval_suggestion.operator_rejected ? (
                    <>
                      <dt>Оператор отклонил</dt>
                      <dd>Ни одна типовая ситуация не подходит</dd>
                    </>
                  ) : null}
                </dl>
              </div>
            ) : null}
            {detail.rejection_feedback_history?.length ? (
              <OpPayloadBlock title="История отклонений AI" payload={detail.rejection_feedback_history} />
            ) : null}
            <OpPayloadBlock title="Журнал событий (raw)" payload={detail.operational_logs} />
          </div>
        </details>
      </div>
    );
  }

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

      <div className="rf-oc-io-grid">
        <CollapsibleTextPanel title="Обращение клиента" text={detail.review_text} footer={phraseFooter} />
        <CollapsibleTextPanel title="Ответ AI" text={detail.draft_response} footer={templateFooter} />
      </div>

      <div className="rf-oc-detail-block rf-oc-detail-block--editor">
        {workflowCompleted ? (
          <p className="rf-oc-workflow-sent-banner" role="status">
            {OPERATOR_WORKFLOW_SENT_LABEL}
          </p>
        ) : null}
        <div className="rf-oc-detail-block__head rf-oc-detail-block__head--actions">
          <h3 className="rf-oc-detail-block__title">Ответ оператора</h3>
          {showActions ? (
            <div className="rf-oc-editor-actions">
              <OpButton type="button" onClick={onApprove} disabled={actionsDisabled} variant="primary">
                Одобрить и отправить
              </OpButton>
              <OpButton type="button" onClick={onRejectClick} disabled={actionsDisabled}>
                Отклонить
              </OpButton>
            </div>
          ) : null}
        </div>
        {actionError ? <div className="rf-oc-action-feedback rf-oc-action-feedback--error">{actionError}</div> : null}
        <OpTextarea
          className="rf-oc-editor rf-oc-editor--compact"
          rows={5}
          value={finalResponse}
          onChange={(e) => onFinalResponseChange(e.target.value)}
          disabled={actionLoading || locked}
          readOnly={locked}
          placeholder={
            workflowCompleted ? "Ответ отправлен клиенту" : locked ? "Примите или отклоните черновик AI…" : "Внесите исправления в ответ…"
          }
        />
      </div>

      <details className="rf-oc-tech">
        <summary>Таймлайн обработки</summary>
        <div className="rf-oc-tech-body">
          {lifecycleTimeline.length ? (
            <OperatorLifecycleTimeline events={lifecycleTimeline} />
          ) : (
            <p className="muted">Нет событий жизненного цикла</p>
          )}
        </div>
      </details>

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
