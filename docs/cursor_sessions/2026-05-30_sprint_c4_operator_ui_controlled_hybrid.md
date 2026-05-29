# Sprint C4 — Operator UI Controlled Hybrid

**Date:** 2026-05-30  
**Status:** Completed  
**Task source:** `cursor_tasks_local/2026-05-30_sprint_c4_operator_ui_controlled_hybrid.md`

---

## Summary

Реализован операторский UI для Controlled Hybrid поверх C6 API: блок выбранной типовой ситуации, визуализация уверенности (HIGH/MEDIUM/LOW), альтернативы, подтверждение, override, создание candidate. Разделены «Утверждённая основа» и «Сгенерированный черновик». Layout консоли сохранён.

---

## UI components

| File | Purpose |
|------|---------|
| `ResponseCasePanel.jsx` | Selected case, confidence badge, lifecycle chips, alternatives, actions |
| `CaseCandidateModal.jsx` | Форма candidate (title, description, comment) |
| `OperatorModerationWorkspace.jsx` | CH integration, split response blocks |
| `OperatorReviewsPage.jsx` | API: confirm-case, override-case, case-candidates |
| `displayLabels.js` | CONFIDENCE_BAND, DECISION_SOURCE, CH event labels |
| `operator-console.css` | CH panel styles |

---

## API used (C6)

| Action | Endpoint |
|--------|----------|
| Confirm | `POST /api/operator/reviews/{id}/confirm-case` |
| Override | `POST /api/operator/reviews/{id}/override-case` |
| Candidate | `POST /api/operator/reviews/{id}/case-candidates` |
| Detail | `GET /api/operator/reviews/{id}` — `selected_response_case`, `case_alternatives`, `pipeline_mode` |

---

## Read-model enrichment (presentation only)

Расширены поля `SelectedResponseCaseOut` / `ResponseCaseAlternativeOut` (description, product_area, topic) в `presenter.py` — без миграций БД.

---

## Branches

| Band | UI |
|------|-----|
| HIGH | Badge «Высокая», case shown, draft + approved |
| MEDIUM | Badge «Средняя», кнопка «Подтвердить типовую ситуацию» |
| LOW | Badge «Низкая», нет selected case, alternatives + candidate |

---

## Not changed

- Retrieval / confidence engine / pipeline
- Queue layout, filters, approve/reject flow
- Customer UI

---

## Verification

```bash
cd frontend && npm run build
```

Manual: operator `/operator/reviews` on CH review → see case panel, confirm (medium), override, candidate modal.

---

## FULL PROMPT
# Sprint C4 — Operator UI for Controlled Hybrid

## Тип задачи
Implementation Sprint.

Цель:
реализовать операторский интерфейс для уже работающего Controlled Hybrid backend.

Важно:
- C6 уже реализован.
- Не изменять retrieval.
- Не изменять decision engine.
- Не изменять data model.
- Не изменять confidence logic.
- Использовать существующий CH runtime как источник данных.

## Перед началом обязательно изучить

1. docs/architecture/controlled_hybrid_operational_model.md
2. Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md
3. IMPLEMENTATION_PLAN.md
4. Sprint C6 session log

## Главная цель

После C4 оператор должен видеть:
- выбранную типовую ситуацию;
- confidence;
- альтернативные типовые ситуации;
- возможность подтвердить case;
- возможность заменить case;
- возможность создать candidate.

Backend уже подготовлен.
Нужно реализовать пользовательский интерфейс.

## Требование 1. Selected Response Case

Добавить блок:
Selected Response Case

Отображать:
- название case;
- описание case;
- product area;
- topic;
- confidence;
- источник решения.

## Требование 2. Confidence Visualization

Показывать:
- HIGH
- MEDIUM
- LOW

Не отображать внутренние технические значения.

## Требование 3. Alternative Cases

Отображать альтернативные cases:
- название;
- confidence;
- краткое описание.

## Требование 4. Confirm Case Workflow

Для MEDIUM confidence реализовать подтверждение case.

Использовать endpoint:
confirm-case

## Требование 5. Override Workflow

Реализовать override через endpoint:
override-case

После override обновлять карточку обращения.

## Требование 6. Candidate Workflow

Добавить действие:
«Создать новую типовую ситуацию»

Использовать endpoint:
case-candidates

Поля:
- название;
- описание;
- комментарий оператора.

## Требование 7. Response Block

Явно разделить:
- Approved Response
- Generated Draft

## Требование 8. Queue Compatibility

Не ломать:
- очередь;
- фильтры;
- навигацию;
- approve/reject workflow.

## Требование 9. Lifecycle Indicators

Отображать:
- case selected;
- case confirmed;
- case overridden;
- candidate created.

## Требование 10. UX

Не менять общий layout консоли.
Встраивать CH в существующий интерфейс.

## Acceptance Criteria

Оператор может:
1. Видеть выбранный response case.
2. Видеть confidence.
3. Видеть альтернативные cases.
4. Подтверждать case.
5. Делать override.
6. Создавать candidate.
7. Работать со всеми ветками HIGH/MEDIUM/LOW.

## Документация

Обновить:
- SOT;
- IMPLEMENTATION_PLAN;
- README.

Создать session log:
docs/cursor_sessions/2026-05-30_sprint_c4_operator_ui_controlled_hybrid.md

В начало включить FULL PROMPT.
