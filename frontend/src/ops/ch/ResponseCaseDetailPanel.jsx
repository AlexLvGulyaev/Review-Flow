import { CollapsibleTextPanel } from "../operator/CollapsibleTextPanel.jsx";
import { OpInput, OpSelect, OpTextarea } from "../components/OpToolbar.jsx";
import {
  labelEntityActive,
  labelPriority,
  labelScenario,
  labelSentiment,
} from "../../lib/displayLabels.js";
import { refOptions } from "../../lib/classificationReference.js";
import { ResponseCaseExampleChunk } from "./ResponseCaseExampleChunk.jsx";

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU");
  } catch {
    return iso;
  }
}

function KvRow({ label, value }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value ?? "—"}</dd>
    </>
  );
}

export function ResponseCaseEditFields({ model, setModel, catalog, classRef, topicsForArea, isCreate, saving }) {
  const scenarios = refOptions(classRef, "scenarios");
  const sentiments = refOptions(classRef, "sentiments");
  const priorities = refOptions(classRef, "priorities");
  const topics = topicsForArea(model.product_area_id);

  return (
    <div className="rf-rc-edit-fields rf-rc-edit-fields--inline">
      {isCreate ? (
        <label className="rf-rc-field">
          <span>Код</span>
          <OpInput
            value={model.case_code}
            onChange={(e) => setModel({ ...model, case_code: e.target.value })}
            disabled={saving}
          />
        </label>
      ) : null}
      <label className="rf-rc-field">
        <span>Название</span>
        <OpInput value={model.title} onChange={(e) => setModel({ ...model, title: e.target.value })} disabled={saving} />
      </label>
      <label className="rf-rc-field">
        <span>Продукт</span>
        <OpSelect
          value={model.product_area_id}
          onChange={(e) => setModel({ ...model, product_area_id: e.target.value, topic_id: "" })}
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
      <label className="rf-rc-field">
        <span>Тема</span>
        <OpSelect
          value={model.topic_id}
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
      <label className="rf-rc-field">
        <span>Сценарий</span>
        <OpSelect
          value={model.scenario_id}
          onChange={(e) => setModel({ ...model, scenario_id: e.target.value })}
          disabled={saving}
        >
          <option value="">—</option>
          {scenarios.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </OpSelect>
      </label>
      <label className="rf-rc-field">
        <span>Тональность</span>
        <OpSelect
          value={model.sentiment_id}
          onChange={(e) => setModel({ ...model, sentiment_id: e.target.value })}
          disabled={saving}
        >
          <option value="">—</option>
          {sentiments.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </OpSelect>
      </label>
      <label className="rf-rc-field">
        <span>Приоритет</span>
        <OpSelect
          value={model.priority_id}
          onChange={(e) => setModel({ ...model, priority_id: e.target.value })}
          disabled={saving}
        >
          <option value="">—</option>
          {priorities.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </OpSelect>
      </label>
      <label className="rf-rc-field rf-rc-field--textarea">
        <span>Политика ответа</span>
        <OpTextarea
          rows={3}
          value={model.response_policy}
          onChange={(e) => setModel({ ...model, response_policy: e.target.value })}
          disabled={saving}
        />
      </label>
      <label className="rf-rc-field rf-rc-field--textarea">
        <span>Утверждённый ответ</span>
        <OpTextarea
          rows={3}
          value={model.approved_response_text}
          onChange={(e) => setModel({ ...model, approved_response_text: e.target.value })}
          disabled={saving}
        />
      </label>
      <label className="rf-rc-field rf-rc-field--textarea">
        <span>Описание</span>
        <OpTextarea
          rows={3}
          value={model.description}
          onChange={(e) => setModel({ ...model, description: e.target.value })}
          disabled={saving}
        />
      </label>
      <label className="rf-rc-field">
        <span>Порог уверенности</span>
        <OpInput
          value={model.confidence_threshold}
          onChange={(e) => setModel({ ...model, confidence_threshold: e.target.value })}
          disabled={saving}
        />
      </label>
      <label className="rf-rc-field">
        <span>Политика обработки</span>
        <OpSelect
          value={model.processing_policy_id}
          onChange={(e) => setModel({ ...model, processing_policy_id: e.target.value })}
          disabled={saving}
        >
          <option value="">—</option>
          {(catalog.processing_policies ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name_ru}
            </option>
          ))}
        </OpSelect>
      </label>
    </div>
  );
}

export function ResponseCaseDetailPanel({
  caseDetail,
  listItem,
  quality,
  saving,
  onEditExample,
  onDeactivateExample,
  relatedCandidates,
}) {
  if (!caseDetail) {
    return <p className="rf-oc-empty">Выберите типовую ситуацию в списке слева</p>;
  }

  const d = caseDetail;
  const q = quality || {};
  const statusLabel = labelEntityActive(d.is_active !== false).toUpperCase();

  return (
    <div className="rf-oc-detail rf-rc-detail-scroll">
      <div className="rf-oc-detail-identity">
        <h2 className="rf-oc-detail-identity__title">{d.title}</h2>
        <span className="rf-oc-detail-identity__status">{statusLabel}</span>
      </div>

      <div className="rf-oc-summary-grid rf-rc-summary-top">
          <div className="rf-rc-summary-stack">
            <div className="rf-oc-summary-col">
              <h3 className="rf-oc-summary-col__label">Паспорт</h3>
              <dl className="rf-oc-kv-list">
                <KvRow label="Код" value={d.case_code} />
                <KvRow label="Продукт" value={d.product_area?.name} />
                <KvRow label="Тема" value={d.topic?.name} />
                <KvRow label="Сценарий" value={labelScenario(d.scenario)} />
                <KvRow label="Тональность" value={labelSentiment(d.sentiment)} />
                <KvRow label="Приоритет" value={labelPriority(d.priority)} />
                <KvRow label="Статус" value={labelEntityActive(d.is_active)} />
              </dl>
            </div>
            <div className="rf-oc-summary-col">
              <h3 className="rf-oc-summary-col__label">Обработка</h3>
              <dl className="rf-oc-kv-list">
                <KvRow
                  label="Политика обработки"
                  value={d.processing_policy?.name_ru ?? d.review_policy ?? "—"}
                />
                <KvRow label="Порог уверенности" value={String(d.confidence_threshold ?? "—")} />
              </dl>
            </div>
          </div>
          <div className="rf-oc-summary-col rf-rc-exploitation">
            <h3 className="rf-oc-summary-col__label">Эксплуатация</h3>
            <dl className="rf-oc-kv-list">
              <KvRow label="Срабатывания" value={q.hit_count != null ? String(q.hit_count) : "—"} />
              <KvRow label="Переопределения" value={q.override_count != null ? String(q.override_count) : "—"} />
              <KvRow label="Обратная связь" value={q.feedback_count != null ? String(q.feedback_count) : "—"} />
              <KvRow
                label="Кандидаты"
                value={
                  q.candidate_count != null
                    ? String(q.candidate_count)
                    : relatedCandidates?.length
                      ? String(relatedCandidates.length)
                      : "—"
                }
              />
              <KvRow label="Качество" value={q.problem_score != null ? String(q.problem_score) : "—"} />
              <KvRow label="Примеров" value={listItem?.examples_count ?? d.examples?.length ?? "—"} />
              <KvRow label="Создано" value={formatDateTime(d.created_at)} />
              <KvRow label="Изменено" value={formatDateTime(d.updated_at)} />
            </dl>
          </div>
        </div>

      <div className="rf-oc-io-grid">
            <CollapsibleTextPanel title="Описание" text={d.description} previewLines={5} />
            <CollapsibleTextPanel title="Политика ответа" text={d.response_policy} previewLines={5} />
          </div>

          <div className="rf-rc-approved-block">
            <CollapsibleTextPanel title="УТВЕРЖДЁННЫЙ ОТВЕТ" text={d.approved_response_text} previewLines={5} />
          </div>

          <section className="rf-rc-chunks-section" aria-label="Примеры retrieval">
            <h3 className="rf-oc-detail-block__title">Примеры retrieval</h3>
            <div className="rf-rc-chunks">
              {(d.examples ?? []).map((ex) => (
                <ResponseCaseExampleChunk
                  key={ex.id}
                  example={ex}
                  saving={saving}
                  onEdit={onEditExample}
                  onDeactivate={onDeactivateExample}
                />
              ))}
            </div>
          </section>

          <details className="rf-oc-tech">
            <summary>Кандидаты</summary>
            <div className="rf-oc-tech-body">
              {relatedCandidates?.length ? (
                <ul className="rf-rc-candidate-mini">
                  {relatedCandidates.map((c) => (
                    <li key={c.id}>
                      <strong>{c.proposed_title || "—"}</strong> · {c.status} · {formatDateTime(c.created_at)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Нет связанных кандидатов в очереди</p>
              )}
            </div>
          </details>

          <details className="rf-oc-tech">
            <summary>История</summary>
            <div className="rf-oc-tech-body">
              <dl className="rf-oc-kv-list">
                <KvRow label="Создано" value={formatDateTime(d.created_at)} />
                <KvRow label="Автор" value={d.created_by} />
                <KvRow label="Обновлено" value={formatDateTime(d.updated_at)} />
              </dl>
            </div>
          </details>

          <details className="rf-oc-tech">
            <summary>Pipeline</summary>
            <div className="rf-oc-tech-body">
              <p className="rf-oc-pipeline__flow">
                Review → retrieval (examples) → confidence band → response_case_decision → policy draft →
                operator confirm / override → publication
              </p>
            </div>
          </details>

          <details className="rf-oc-tech">
            <summary>Technical View</summary>
            <pre className="rf-oc-details__json">{JSON.stringify(d, null, 2)}</pre>
          </details>
    </div>
  );
}
