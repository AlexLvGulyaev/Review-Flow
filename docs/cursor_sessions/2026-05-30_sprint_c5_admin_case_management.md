# Sprint C5 — Admin Case Management (Controlled Hybrid)

## FULL PROMPT

# Sprint C5 — Admin Case Management (Controlled Hybrid)

## Тип задачи

Implementation Sprint.

Цель:

реализовать административный контур управления базой знаний Controlled Hybrid.

Важно:

- C1, C2, C6 и C4 уже реализованы.
- Не изменять CH pipeline.
- Не изменять retrieval.
- Не изменять confidence engine.
- Не изменять operator UI.
- Использовать существующую модель данных C2.

---

## Перед началом обязательно изучить

1. docs/architecture/controlled_hybrid_operational_model.md
2. Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md (§3A)
3. IMPLEMENTATION_PLAN.md
4. Sprint C6 session log
5. Sprint C4 session log

---

## Главная цель

Сейчас оператор может работать с Response Case.

Администратор пока не может полноценно управлять новой базой знаний Controlled Hybrid.

После C5 администратор должен иметь полноценный интерфейс управления:

- response_cases;
- response_case_examples;
- approved responses;
- response policies;
- response_case_candidates.

---

## Требование 1. Response Cases Console

Создать административную страницу управления типовыми ситуациями.

Поддержать:

- список cases;
- просмотр case;
- создание case;
- редактирование case;
- архивирование case;
- активацию case.

Отображать:

- title;
- product area;
- topic;
- status;
- examples count.

---

## Требование 2. Response Case Details

Реализовать карточку типовой ситуации.

Отображать:

- описание;
- product area;
- topic;
- response policy;
- approved response;
- confidence threshold;
- lifecycle status.

---

## Требование 3. Examples Management

Реализовать управление:

response_case_examples

Поддержать:

- просмотр примеров;
- добавление примеров;
- редактирование примеров;
- деактивацию примеров.

---

## Требование 4. Approved Response Management

Администратор должен иметь возможность:

- просматривать approved response;
- редактировать approved response;
- сохранять изменения.

Не изменять runtime pipeline.

---

## Требование 5. Response Policy Management

Реализовать редактирование:

response_policy

Поддержать:

- просмотр;
- изменение;
- сохранение.

---

## Требование 6. Candidate Queue

Реализовать очередь:

response_case_candidates

Показывать:

- название;
- описание;
- комментарий оператора;
- дату создания.

---

## Требование 7. Candidate Decisions

Поддержать решения:

1. Create New Case
2. Merge With Existing Case
3. Reject Candidate

После решения обновлять состояние candidate.

---

## Требование 8. Lifecycle Management

Отображать жизненный цикл типовой ситуации.

Поддержать:

- Active
- Archived

Не вводить новые состояния без необходимости.

---

## Требование 9. Knowledge Base UX

Использовать существующий стиль Admin UI.

Не создавать отдельное приложение.

Встраивать функциональность в текущий административный контур.

---

## Требование 10. Navigation

Добавить навигацию к новому разделу базы знаний CH.

Не ломать существующие административные разделы.

---

## Acceptance Criteria

Администратор может:

1. Создавать Response Case.
2. Редактировать Response Case.
3. Архивировать и активировать Response Case.
4. Управлять Examples.
5. Управлять Approved Responses.
6. Управлять Response Policies.
7. Просматривать Candidate Queue.
8. Создавать новый Case из Candidate.
9. Объединять Candidate с существующим Case.
10. Отклонять Candidate.

---

## Документация

Обновить:

- SOT;
- IMPLEMENTATION_PLAN;
- README.

Только в части статуса реализации.

Создать session log:

docs/cursor_sessions/2026-05-30_sprint_c5_admin_case_management.md

В начало включить FULL PROMPT.

---

## Ожидаемый результат

Административный контур Controlled Hybrid становится полноценным инструментом управления базой знаний типовых ситуаций.

---

## Результат

Реализован административный контур CH без изменений pipeline / retrieval / confidence / operator UI.

### Backend

- `backend/app/schemas/response_case_admin.py` — DTO для create/update, examples, candidates, catalog.
- `backend/app/services/response_cases.py` — admin list с `examples_count`, CRUD case, examples, catalog, lifecycle.
- `backend/app/api/response_cases_admin.py` — REST:
  - `GET/POST /api/admin/response-cases`, `GET/PATCH`, `POST …/archive|activate`
  - `POST …/examples`, `PATCH /response-case-examples/{id}`
  - `GET /api/admin/ch-catalog`
  - `GET /response-case-candidates`, `POST …/approve`, `POST …/reject`
- `backend/app/services/controlled_hybrid/candidates.py` — `reject_candidate()`.

### Frontend

- `frontend/src/ops/ch/ResponseCasesAdminWorkspace.jsx` — вкладки «Типовые ситуации» и «Кандидаты».
- `frontend/src/pages/admin/AdminResponseCasesPage.jsx`
- Маршрут `/admin/response-cases`, навигация «Типовые ситуации (CH)» в `companyNavModel.js`.

### Документация

- SOT §3A (статусы C5, таблицы CH).
- `IMPLEMENTATION_PLAN.md`, `README.md`.

### Проверка

- `npm run build` — OK
- `python3 -m compileall app` — OK

### Acceptance criteria

| # | Критерий | Статус |
|---|----------|--------|
| 1 | Создавать Response Case | ✓ |
| 2 | Редактировать Response Case | ✓ |
| 3 | Архивировать / активировать | ✓ |
| 4 | Управлять Examples | ✓ |
| 5 | Approved Responses | ✓ (в форме case) |
| 6 | Response Policies | ✓ (в форме case) |
| 7 | Candidate Queue | ✓ |
| 8 | Create case из candidate | ✓ approve без merge |
| 9 | Merge candidate | ✓ approve + merge_into_case_id |
| 10 | Reject candidate | ✓ |
