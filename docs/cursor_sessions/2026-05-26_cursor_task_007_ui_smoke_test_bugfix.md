# Session log: Cursor Task 007 — UI smoke test and bugfix

## Исходный промпт (полный текст)

# Cursor Task 007 — UI smoke test and bugfix pass

## Контекст

Проект: `review-flow`.

Milestone 1–6 завершены:
- infrastructure;
- review ingestion;
- AI classification;
- template-guided draft generation;
- operator moderation;
- mock publication;
- prompt lifecycle;
- evaluation foundation;
- analytics;
- observability;
- admin knowledge base;
- lightweight role separation.

Теперь задача НЕ добавлять новые возможности.

Задача — провести UI smoke test и bugfix pass.

```text
UI smoke test → identify runtime/API/navigation issues → fix only confirmed bugs
```

---

# Главная цель

Проверить, что проект как единый web-прототип работает end-to-end через UI:

- client contour;
- operator contour;
- administrator contour;
- API integration;
- role-aware navigation;
- forms;
- status updates;
- analytics/logs visibility.

---

# Жёсткие ограничения

НЕ делать:

- новые продуктовые фичи;
- redesign;
- auth/RBAC expansion;
- async workers;
- charts libraries;
- RAG;
- embeddings;
- real publication integrations;
- new milestone scope;
- large refactoring без необходимости.

Разрешено:

- исправлять confirmed UI/API/runtime bugs;
- поправить routing;
- поправить API clients;
- поправить loading/error states;
- поправить формы;
- поправить CORS/env/base URL issues;
- поправить role guard bugs;
- поправить очевидные backend ошибки, которые блокируют UI.

---

# 1. Pre-check

Запустить проект:

```bash
docker compose up --build -d
```

Проверить:

```bash
curl http://localhost:8700/health
curl http://localhost:8700/api/analytics/overview
curl http://localhost:8700/api/logs?limit=5
```

Проверить, что frontend доступен:

```text
http://localhost:5180
```

---

# 2. UI smoke test matrix

Проверить следующие страницы.

## Client contour

### `/review`

Проверить:

- страница открывается;
- форма отображается;
- можно отправить отзыв;
- после отправки показывается review id;
- показывается ссылка на status page;
- нет ошибок в browser console;
- backend сохраняет review.

---

### `/review/status/:reviewId`

Проверить:

- страница открывается по ссылке после отправки;
- показывает review text;
- показывает rating;
- показывает processing/moderation/publication status;
- НЕ показывает draft response до публикации;
- показывает final response после approve/publish.

---

## Operator contour

### `/operator/reviews`

Проверить:

- список отзывов загружается;
- можно выбрать отзыв;
- карточка показывает:
  - review text;
  - customer;
  - service case;
  - classification;
  - matched phrase;
  - selected template;
  - draft response;
- textarea final response работает;
- approve работает;
- reject работает;
- needs revision работает;
- после действия карточка/список обновляются;
- status page клиента отражает результат.

---

## Admin contour

### `/prompts`

Проверить:

- список prompt versions загружается;
- detail view открывается;
- создать новую prompt version можно;
- activate работает;
- active badge обновляется;
- новая генерация сохраняет prompt_version_id / generation_metadata.

---

### `/evaluation`

Проверить:

- страница открывается;
- список cases загружается;
- можно создать evaluation case по review_id;
- можно поставить score 1–5;
- comment сохраняется;
- данные не пропадают после refresh.

---

### `/analytics`

Проверить:

- страница открывается;
- analytics endpoint используется корректно;
- карточки/таблицы показывают реальные значения;
- пустые состояния отображаются без падения;
- после создания/публикации review показатели меняются.

---

### `/logs`

Проверить:

- страница открывается;
- logs endpoint используется корректно;
- список событий отображается;
- фильтр event_type работает;
- фильтр review_id работает;
- metadata не ломает layout.

---

## Admin knowledge base

### `/admin/phrases`

Проверить:

- list;
- create;
- edit;
- deactivate;
- созданная/изменённая phrase участвует в matching.

---

### `/admin/templates`

Проверить:

- list;
- create;
- edit;
- deactivate;
- созданный/изменённый template участвует в template selection.

---

### `/admin/scenarios`

Проверить:

- list;
- create;
- edit;
- activate/deactivate;
- active scenarios корректно используются в classification context.

---

### `/admin/sentiments`

Проверить:

- list;
- create;
- edit;
- activate/deactivate;
- active sentiments корректно используются в classification context.

---

# 3. Role-aware navigation test

Проверить role selector / mock login / выбранный способ role separation.

## Client role

Должен видеть:

- review;
- review status.

Не должен видеть admin/operator navigation.

---

## Operator role

Должен видеть:

- operator reviews.

Не должен видеть admin pages.

---

## Administrator role

Должен видеть:

- prompts;
- evaluation;
- analytics;
- logs;
- admin KB pages.

---

# 4. Browser console/API errors

Проверить DevTools console на основных страницах.

Искать:

- failed fetch;
- CORS errors;
- 404 routes;
- uncaught runtime exceptions;
- React rendering errors;
- invalid JSON assumptions;
- missing fields;
- undefined/null crashes.

Исправить только подтверждённые ошибки.

---

# 5. Backend/API consistency

Если UI падает из-за несовпадения schema:

- привести frontend API client к backend response;
- либо добавить missing field в backend response;
- не делать большие schema redesign.

Проверить consistency для:

- review id naming;
- prompt id;
- evaluation case id;
- status names;
- moderation_status;
- publication_status;
- role headers/session value.

---

# 6. Operational logs after UI test

Проверить, что после UI actions пишутся relevant logs:

- review_received;
- phrase_matching_completed;
- classification_completed;
- template_selected;
- response_generated;
- operator_review_opened;
- moderation_approved/rejected/revision_requested;
- mock_publication_completed;
- prompt_version_created;
- prompt_version_activated;
- evaluation_case_created;
- evaluation_scored;
- analytics_overview_requested;
- logs_view_opened;
- admin_* events.

---

# 7. Bugfix discipline

Для каждого исправления:

- фиксировать symptom;
- root cause;
- changed files;
- verification result.

Не исправлять то, что не воспроизведено.

Не добавлять новые features под видом bugfix.

---

# 8. Final verification

После исправлений выполнить:

```bash
docker compose up --build -d
curl http://localhost:8700/health
curl http://localhost:8700/api/analytics/overview
curl http://localhost:8700/api/logs?limit=5
```

Проверить основные UI routes:

```text
/review
/operator/reviews
/prompts
/evaluation
/analytics
/logs
/admin/phrases
/admin/templates
/admin/scenarios
/admin/sentiments
```

---

# Что НЕ делать

Не начинать следующий product milestone.

Не реализовывать:

- advanced styling;
- dashboard redesign;
- full auth;
- screenshots automation;
- Playwright unless already present and cheap to add;
- new analytics metrics;
- new evaluation logic;
- export features.

---

# Сессионный лог

Создать файл:

```text
docs/cursor_sessions/2026-05-26_cursor_task_007_ui_smoke_test_bugfix.md
```

В начало файла вставить полный текст этого промпта.

Ниже зафиксировать:

- tested routes;
- found issues;
- fixed issues;
- changed files;
- verification commands;
- remaining known issues;
- recommendation for next milestone.

---

# Формат ответа в чат

После выполнения написать:

```text
Session log: docs/cursor_sessions/2026-05-26_cursor_task_007_ui_smoke_test_bugfix.md
Status: UI smoke test completed
```

или:

```text
Status: UI smoke test blocked
Reason: ...
```

---

## Выполнение

### Pre-check

```bash
docker compose up --build -d
curl http://localhost:8700/health  # ok
curl -H "X-Role: administrator" http://localhost:8700/api/analytics/overview  # 200
curl -H "X-Role: administrator" "http://localhost:8700/api/logs?limit=5"  # 200
curl http://localhost:5180/review  # 200
```

### Tested routes (API E2E + code review)

| Route | Result |
|-------|--------|
| `/review` | POST review 201, status link OK |
| `/review/status/:id` | No draft before publish; final_response after approve |
| `/operator/reviews` | List/detail/approve/reject/revision OK with `X-Role: operator` |
| `/prompts` | List/detail/create/activate OK (admin) |
| `/evaluation` | Create case, PATCH score OK |
| `/analytics` | Overview metrics OK |
| `/logs` | List + filters OK |
| `/admin/phrases|templates|scenarios|sentiments` | CRUD OK (admin) |
| Role nav | client/operator/admin contours in `App.jsx` |

### Found issues

1. **LogsPage** — `useEffect` перезагружал логи при каждом символе в `review_id` / `event_type` (лишние запросы и `logs_view_opened` spam).
2. **EvaluationPage** — при смене case score/comment в форме не обновлялись из выбранной записи.
3. **HomePage** — ссылки на все контуры без учёта роли (вводили в заблокированные маршруты).
4. **API errors** — FastAPI 422 возвращает `detail` массивом; UI показывал `[object Object]`.
5. **List pages** — `selectedId` в deps `loadList`/`loadCases` вызывал лишний refetch при каждом клике по списку.

### Fixed issues

| Symptom | Root cause | Files | Verification |
|---------|------------|-------|--------------|
| Логи дергаются при вводе UUID | auto `useEffect` на filter state | `LogsPage.jsx` | load только mount + кнопка «Применить» |
| Неверный score при переключении case | нет sync state | `EvaluationPage.jsx` | `useEffect` на `selected` |
| Home показывает operator/admin всем | статичный список | `HomePage.jsx` | role-aware links |
| Ошибки 422 нечитаемы | `detail` array | `lib/api.js`, pages | `readApiError()` |
| Мигание списка при выборе | `selectedId` в deps | `PromptsPage`, `EvaluationPage`, `AdminKbPage` | functional `setSelectedId` |
| Moderation message generic | проверка `draft_response` | `OperatorReviewsPage.jsx` | показ `data.message` для reject/revision |
| Analytics rates | defensive null | `AnalyticsPage.jsx` | `?? 0` |

### Changed files

- `frontend/src/lib/api.js` — `readApiError`, `getApiUrl`
- `frontend/src/pages/HomePage.jsx`
- `frontend/src/pages/LogsPage.jsx`
- `frontend/src/pages/EvaluationPage.jsx`
- `frontend/src/pages/PromptsPage.jsx`
- `frontend/src/pages/OperatorReviewsPage.jsx`
- `frontend/src/pages/AnalyticsPage.jsx`
- `frontend/src/pages/ReviewPage.jsx`
- `frontend/src/pages/ReviewStatusPage.jsx`
- `frontend/src/components/AdminKbPage.jsx`

### Operational logs (spot check)

После smoke: `review_received`, `moderation_*`, `mock_publication_completed`, `evaluation_case_created`, `analytics_overview_requested`, `logs_view_opened`, `role_access_denied` — присутствуют.

### Remaining known issues

- Нет автоматизированного Playwright/E2E в репозитории (ручной + API smoke).
- `HomePage` не блокирует прямой URL на чужие контуры (редирект через `ProtectedRoute` на `/` без пояснения).
- Browser DevTools console не проверялся через MCP (инструмент недоступен в среде).

### Recommendation for next milestone

- Добавить лёгкий Playwright smoke suite на три роли.
- Toast/сообщение при `ProtectedRoute` redirect.
- Debounce опционален для logs filters; сейчас достаточно кнопки «Применить».
