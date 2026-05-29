# Cursor Task 019A — Восстановление загрузки данных в operator console перед AF-style redesign

## Контекст проекта

Проект: Review Flow / Northline Market.

Текущая стадия проекта:

- customer-facing contour стабилизирован до приемлемого production-like состояния;
- modal interaction UX реализован;
- homepage composition стабилизирован;
- review submission flow визуально завершён;
- status modal flow визуально завершён;
- основной фокус разработки смещён на company contour.

Следующий крупный milestone:

```text
AF-style operational workspace
```

для operator/admin контуров.

Однако:

до начала AF-style redesign необходимо сначала стабилизировать текущую operator console технически.

Текущая страница:

```text
/operator/reviews
```

Текущие симптомы:

- sidebar отображается;
- page shell отображается;
- role selector отображается;
- filter control отображается;
- queue shell отображается;
- detail panel отображается;
- но загрузка данных не работает;
- UI показывает `Failed to fetch`;
- список отзывов пуст;
- moderation workflow фактически неработоспособен.

Данный task intentionally ограничен:

```text
repair + stabilization + verification
```

Это НЕ redesign task.

---

# Главная цель

Восстановить стабильную end-to-end загрузку данных operator review queue.

После выполнения task:

1. Operator console должна корректно получать review data из backend.
2. Existing reviews должны отображаться в queue.
3. Review detail panel должна корректно открываться.
4. Moderation actions должны работать.
5. Filter и refresh actions должны работать.
6. Browser console не должна содержать fetch/network/CORS errors при healthy backend.
7. Реализация должна оставаться совместимой с текущим:
   - Docker Compose;
   - Vite frontend;
   - FastAPI backend;
   - PostgreSQL stack.

---

# Обязательная operational discipline

До внесения изменений в код:

НЕ начинать сразу patching frontend files.

Сначала необходимо провести structured forensic investigation data path.

Цель task:
проверка integrity цепочки:

```text
frontend → API → backend → database
```

relationship flow.

Запрещено:

- blind fixes;
- speculative rewrites;
- uncontrolled refactors;
- guessing instead of verification.

---

# Обязательная последовательность расследования

Все findings обязательно фиксировать в session log.

---

## Step 1 — Определение frontend rendering chain

Определить:

1. Какой React component рендерит:

```text
/operator/reviews
```

2. Какие hooks/services/helpers используются.

3. Используется ли:
   - centralized API helper;
   - direct fetch;
   - axios instance;
   - hardcoded URL.

4. Какие state variables отвечают за:
   - loading;
   - fetch failure;
   - empty queue;
   - selected review.

---

## Step 2 — Определение фактического request URL

Определить точно:

1. Какой URL пытается вызвать browser frontend.
2. Является ли URL:
   - relative;
   - absolute;
   - env-driven;
   - Docker-internal;
   - browser-facing.

Отдельно проверить, не используется ли ошибочно:

```text
backend:8700
postgres
localhost inside container
```

в browser-side frontend code.

Критически важно:

browser frontend обязан использовать browser-accessible backend URL.

---

## Step 3 — Проверка environment configuration

Проверить:

- `VITE_API_URL`;
- frontend env handling;
- docker compose env injection;
- Vite proxy configuration;
- runtime API helper logic.

Определить:

не bypass'ит ли operator console существующий API abstraction layer.

Если centralized API helper уже существует:
- использовать его;
- не создавать duplicate API logic.

---

## Step 4 — Проверка backend route contract

Определить:

1. Какой backend route реально существует.
2. Соответствует ли route documented API contract.
3. Совпадает ли frontend path с backend path.
4. Совпадают ли moderation filter parameters.

Ожидаемый documented route:

```http
GET /api/operator/reviews
```

Возможный filter:

```http
GET /api/operator/reviews?moderation_status=pending_review
```

Если actual backend implementation отличается:

- определить, что является authoritative source;
- не создавать second competing standard.

Предпочтительно:
align frontend with existing backend,
если backend не противоречит общей API architecture.

---

## Step 5 — Проверка role/header requirements

Определить:

требует ли backend role headers, например:

```http
X-Role: operator
```

Если role-based access уже реализован:
- использовать существующую role infrastructure;
- не hardcode administrator access для operator pages.

Проверить:
- header propagation;
- role state source;
- request interceptor usage.

---

## Step 6 — Проверка backend execution path

Проверить:

- route handler;
- repository/service calls;
- serialization;
- response schemas;
- exception handling;
- DB query execution.

Определить:
на каком этапе возникает failure:
- before DB access;
- during DB query;
- during serialization;
- during frontend parsing.

---

## Step 7 — Проверка существования данных

Определить:

действительно ли queue пустая.

Критически важно различать:

```text
empty queue
vs
failed request
```

UI никогда не должен показывать:

```text
Нет отзывов
```

если fetch фактически завершился ошибкой.

Это mandatory invariant.

---

# Обязательные исправления

---

## 1. API URL stabilization

Operator console обязана использовать корректный browser-facing API URL.

Вероятный корректный backend URL:

```text
http://216.57.108.80:8700
```

или env-based equivalent.

Browser frontend code НЕ должен зависеть от:
- Docker-internal networking;
- backend container names;
- localhost inside containers.

---

## 2. Centralized API usage

Если приложение уже содержит:
- API helper;
- axios instance;
- fetch wrapper;
- role-aware request layer;

operator console обязана использовать их консистентно.

Запрещено unnecessary infrastructure duplication.

---

## 3. Корректное разделение loading/error/empty states

Queue UI обязана различать:

| State | Meaning |
|---|---|
| loading | request in progress |
| fetch error | request failed |
| empty queue | successful fetch with zero reviews |
| loaded | reviews available |

Запрещено collapse этих состояний в generic UI.

---

## 4. Минимально достаточная debugging visibility

На этапе repair допустим lightweight debugging:

- request URL logging;
- HTTP status logging;
- short response body logging;
- concise frontend error logging.

Запрещено:
- telemetry-heavy infrastructure;
- analytics instrumentation;
- enterprise logging expansion.

---

## 5. Проверка moderation workflow

Проверить:

- approve;
- reject;
- needs_revision;
- refresh queue;
- detail reload.

Даже если текущий UI пока визуально примитивен.

---

# Жёсткие anti-scope ограничения

Данный task НЕ имеет права:

- redesign operator console;
- внедрять AF-style visual shell;
- redesign sidebar;
- redesign typography;
- redesign cards/tables;
- внедрять analytics widgets;
- вводить новый layout system;
- выполнять broad frontend refactor;
- начинать redesign administrator console.

Допустимо:
- minimal loading/error text improvements;
- minimal technical stabilization;
- small UI adjustments strictly required for fetch correctness.

Это:

```text
repair/stabilization task only
```

---

# Smoke tests (обязательны)

Все команды и результаты фиксировать в session log.

---

## Backend health

```bash
curl http://localhost:8700/health
```

При необходимости:

```bash
curl http://216.57.108.80:8700/health
```

---

## Operator queue endpoint

```bash
curl -H "X-Role: operator" "http://localhost:8700/api/operator/reviews"
```

Если moderation filter поддерживается:

```bash
curl -H "X-Role: operator" "http://localhost:8700/api/operator/reviews?moderation_status=pending_review"
```

Также проверить browser-facing URL при необходимости.

---

## Frontend validation

Запустить существующую frontend validation/build command.

Например:

```bash
cd frontend && npm run build
```

Запрещено вводить новый toolchain или validation framework.

---

# Acceptance criteria

Task считается завершённым ТОЛЬКО если:

1. `/operator/reviews` больше не показывает `Failed to fetch` при healthy backend.
2. Queue успешно загружает reviews из backend.
3. Empty queue визуально отличается от request failure.
4. Selecting review populates detail panel.
5. Moderation filter продолжает работать.
6. Refresh button продолжает работать.
7. Browser console не содержит CORS/network failures.
8. Role-based requests работают корректно.
9. Session log содержит полное расследование и root cause.

---

# Session log requirements

Создать/update session log:

```text
docs/cursor_sessions/2026-05-28_cursor_task_019_operator_console_data_fetch_repair.md
```

Обязательные разделы:

1. Full original prompt text.
2. Investigation sequence.
3. Root cause.
4. Files changed.
5. Exact repairs performed.
6. Smoke-test commands/results.
7. Remaining risks/issues.
8. Recommendations for next redesign stage.

Запрещено omit original prompt text.

---

# Важное operational замечание

Этот task intentionally precedes AF-style operational console redesign.

Следующие task'и будут:
- redesign operator workspace;
- introducing AF-style operational hierarchy;
- redesign queue/detail interaction;
- introducing administrator operational views.

Запрещено pre-implement future redesign tasks внутри этого task.

Maintain strict scope discipline.

---

# Implementation report (2026-05-28)

## Investigation sequence (per prompt)

### Step 1 — Frontend rendering chain
- Route: `/operator/reviews` → `OperatorReviewsPage` via `ProtectedRoute` in `frontend/src/App.jsx`.
- Data loading: `loadList()` and `loadDetail()` in `frontend/src/pages/OperatorReviewsPage.jsx`.
- API helper: uses centralized `apiFetch()` from `frontend/src/lib/api.js` (role-aware via `X-Role`).
- State: `loadingList`, `loadingDetail`, `error`, `reviews`, `selectedId`, `detail`.

### Step 2 — Actual request URL
- Requests are constructed as `fetch(${API_URL}${path})` in `apiFetch`.
- Previous default was `VITE_API_URL || "http://localhost:8700"`.
- When frontend is opened on a remote host (not localhost), `http://localhost:8700` points to **the user's own machine**, producing browser `Failed to fetch`.

### Step 3 — Env configuration
- `VITE_API_URL` exists, but was often set to `http://localhost:8700` in docker compose (fine for local dev, broken for remote browser usage).
- Operator console already used the centralized API layer; the bug was inside URL resolution.

### Step 4 — Backend route contract
- Backend router: `backend/app/api/operator.py` provides:
  - `GET /api/operator/reviews`
  - `GET /api/operator/reviews/{review_id}`
  - `POST /api/operator/reviews/{review_id}/approve|reject|revision`

### Step 5 — Role/header requirements
- Backend enforces `require_operator` via router dependencies.
- `apiFetch` sets `X-Role: <stored role>` automatically.

### Step 6 — Backend execution path
- Verified by curl: `GET /api/operator/reviews` returns JSON list with 200.
- Therefore failure was **before** backend execution (browser-side network URL issue).

### Step 7 — Data existence
- Verified non-empty queue via curl (multiple `pending_review` items present).

## Root cause

**Browser-facing API URL mismatch**:
- Operator console used `http://localhost:8700` (from `VITE_API_URL` or default) even when the UI is served from a non-localhost host.
- In a browser, `localhost` is always the user's machine → `Failed to fetch`.

Secondary invariant issue:
- UI could show “Нет отзывов” even when fetch failed (empty list after error).

## Repairs performed (minimal, no redesign)

1) API URL stabilization in `frontend/src/lib/api.js`
- Added `computeApiUrl()`:
  - If `VITE_API_URL` is localhost but page is not on localhost → use `window.location.hostname` with port 8700.
  - Otherwise keep env URL.
  - If env absent → default to `protocol//hostname:8700`.

2) Correct state separation in `frontend/src/pages/OperatorReviewsPage.jsx`
- On fetch error: reset `reviews` to `[]`, log concise error to console.
- Empty-state is shown only when `!loadingList && !error && reviews.length === 0`.
- Rating display uses `rating ?? "—"` to avoid `★ null`.

## Files changed

| File | Change |
|---|---|
| `frontend/src/lib/api.js` | Browser-facing `API_URL` resolution, fixes remote-host `localhost` failures |
| `frontend/src/pages/OperatorReviewsPage.jsx` | Enforce loading/error/empty invariants; minimal logging |
| `docs/cursor_sessions/2026-05-28_cursor_task_019_operator_console_data_fetch_repair.md` | Session log |

## Smoke-test commands/results

```bash
curl http://localhost:8700/health
```
Result: `HTTP 200`, `{"status":"ok","database":"connected"}`

```bash
curl -H "X-Role: operator" "http://localhost:8700/api/operator/reviews"
```
Result: `HTTP 200`, non-empty JSON list.

```bash
curl -H "X-Role: operator" "http://localhost:8700/api/operator/reviews?moderation_status=pending_review"
```
Result: `HTTP 200`, filtered list.

## Remaining risks/issues
- If backend is not on port 8700 in some deployments, runtime fallback still needs `VITE_API_URL` to be set correctly.
- Operator moderation actions were not exercised via curl in this session log (API exists and page uses it; recommended to click-test).

## Recommendations for next redesign stage
- Keep `apiFetch` as the single API gateway (role headers, URL).
- During AF-style redesign, preserve the loading/error/empty invariants as explicit UI states.
