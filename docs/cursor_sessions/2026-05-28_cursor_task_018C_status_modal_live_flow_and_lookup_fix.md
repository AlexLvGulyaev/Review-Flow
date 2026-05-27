# Cursor Task 018C — Живой modal-flow проверки статуса и исправление lookup

## Контекст

Текущая реализация режима «Проверить статус» архитектурно некорректна.

Сейчас наблюдаются проблемы:

- в правой части диалога проверки статуса висит статичная декоративная картинка;
- после ввода номера обращения и email приложение уходит на полноэкранную страницу статуса;
- modal-flow проверки статуса разрывается;
- для существующего обращения появляется ошибка `Failed to fetch`;
- экран результата статуса не соответствует согласованному customer-facing UX.

Цель 018C — привести проверку статуса к единому modal-flow:

```text
Пользователь нажимает «Проверить статус»
→ открывается centered widescreen modal
→ вводит номер обращения и email
→ результат отображается внутри той же модалки
→ fullscreen page НЕ открывается автоматически
```

---

# Входные reference / текущие ошибки

Использовать текущие screenshots, переданные оператором:

- текущая ошибка status dialog;
- текущая ошибка fullscreen status page;
- visual reference для status dialog.

Если соответствующие файлы уже размещены в проекте, использовать их как визуальные ориентиры.

Основной visual reference:

```text
frontend/public/assets/ui_reference_client_status_dialog_widescreen_v1.png
```

---

# Главная задача

Выполнить три связанные работы:

1. Исправить status lookup, чтобы существующие обращения корректно находились по номеру формата `NL-XXXXXXXX-NNN`.
2. Перестроить status dialog как полноценный live modal workflow.
3. Убрать автоматический переход на fullscreen status page после submit.

---

# 1. Status dialog должен оставаться модальным workflow

## Текущее неправильное поведение

Сейчас:

```text
пользователь вводит номер/email
→ приложение переходит на fullscreen status page
```

Это запрещено.

## Правильное поведение

Должно быть:

```text
пользователь вводит номер/email
→ modal остаётся открытым
→ справа/внутри той же modal появляется результат
```

То есть:

- no route navigation after submit;
- no fullscreen transition;
- homepage remains dimmed behind modal;
- user remains in the same dialog context.

---

# 2. Структура modal

Диалог должен быть centered widescreen modal, похожий на reference.

## Левая часть

Левая часть всегда содержит input form:

- заголовок: `Проверить статус обращения`;
- пояснение;
- поле `Номер обращения *`;
- поле `Email *`;
- основная зелёная кнопка `Проверить статус`;
- privacy/security note.

Пример placeholder:

```text
NL-00500001-001
```

Не использовать:

```text
45821_0001
#NL-00250001_0001
RF-2026-...
```

---

## Правая часть

Правая часть должна быть динамической.

### Idle state — до поиска

До поиска правая часть показывает:

- спокойный визуальный блок;
- preview timeline;
- stages pipeline;
- customer-care illustration.

Это декоративный/объясняющий state.

---

### Success state — обращение найдено

После успешного поиска правая часть должна заменить idle state на live status panel.

Показать внутри той же модалки:

- номер обращения;
- текущий статус;
- этап pipeline;
- timeline/stages;
- тема обращения;
- текст обращения;
- оценка, если есть;
- даты/время, если есть;
- опубликованный ответ, если есть.

Никакого перехода на fullscreen page.

---

### Error state — обращение не найдено / ошибка

Если обращение не найдено:

- показать ошибку внутри правой части модалки;
- не переходить на fullscreen page;
- дать понятную подсказку:
  - проверьте номер обращения;
  - проверьте email;
  - используйте формат `NL-XXXXXXXX-NNN`.

Если техническая ошибка (`Failed to fetch`):

- показать понятное сообщение;
- в console/logs оставить техническую причину;
- в session log описать root cause.

---

# 3. Исправить `Failed to fetch`

Сейчас при вводе существующего номера обращения появляется:

```text
Failed to fetch
```

Это критическая ошибка.

Нужно провести диагностику:

- какой endpoint вызывается frontend;
- какой URL формируется;
- какой base URL используется;
- какой ответ backend возвращает;
- есть ли CORS/base URL проблема;
- есть ли ошибка route;
- работает ли lookup по `NL-XXXXXXXX-NNN`;
- есть ли mismatch между DB value и UI value;
- не ломает ли lookup email matching.

Нужно обязательно проверить конкретный пример:

```text
NL-00500001-001
```

и убедиться, что он либо:

- успешно находится;
- либо честно зафиксировано, почему именно не находится и что требуется для seed/demo data.

---

# 4. Формат номера обращения

Единый customer-facing формат:

```text
NL-XXXXXXXX-NNN
```

Где:

- `NL-XXXXXXXX` — номер заказа;
- `NNN` — порядковый номер обращения внутри заказа.

Пример:

```text
NL-00500001-001
```

Запрещены:

- `_`;
- `#`;
- UUID;
- internal DB id;
- `45821_0001`.

---

# 5. Fullscreen status page

Полноэкранная status page может остаться как fallback/deep-link route.

Но:

- она НЕ должна открываться автоматически из modal submit;
- она НЕ должна быть основным клиентским flow;
- кнопка `Проверить статус` на homepage должна вести в modal-flow.

Если route `/review/status/...` нужен для direct link — оставить, но привести к тому же формату номеров.

---

# 6. Что НЕ менять

Запрещено:

- ломать homepage composition;
- менять hero/layout из Task 17;
- менять review creation modal без необходимости;
- менять operator/admin UI;
- удалять backend internal IDs;
- менять unrelated API;
- возвращать fullscreen status flow как основной.

---

# 7. Acceptance criteria

Task 018C принимается только если:

1. Status dialog остаётся открытым после submit.
2. Результат поиска отображается внутри той же modal.
3. Fullscreen page НЕ открывается автоматически.
4. Правая часть modal больше не является просто статичной картинкой.
5. До поиска правая часть показывает idle visual/timeline.
6. После успешного поиска правая часть показывает live status data.
7. При ошибке правая часть показывает error state.
8. `Failed to fetch` устранён или root cause документирован с точной причиной.
9. Lookup по `NL-00500001-001` проверен.
10. В клиентском UI нет `_` и `#` в номере обращения.
11. Homepage не сломан.
12. Review creation modal не сломан.
13. Operator/admin UI не затронут.
14. Нет runtime errors.

---

# 8. Verification

После изменений выполнить:

```bash
docker compose up --build -d
```

Проверить:

```text
/
click Проверить статус
idle state in status modal
lookup NL-00500001-001
success state in same modal
failed lookup in same modal
no fullscreen navigation
review creation still works
operator/admin unaffected
```

---

# 9. Session log

Создать:

```text
docs/cursor_sessions/2026-05-28_cursor_task_018C_status_modal_live_flow_and_lookup_fix.md
```

В начало session log вставить полный текст этого prompt.

После prompt добавить разделы:

## 1. Current broken behavior

Что было неправильно:

- static right panel;
- fullscreen redirect;
- Failed to fetch.

## 2. Root cause of Failed to fetch

Точная техническая причина.

## 3. Status modal architecture

Как устроены states:

- idle;
- loading;
- success;
- error.

## 4. Lookup implementation

Как frontend вызывает backend.
Как backend ищет обращение.
Как нормализуется номер.

## 5. Fullscreen route decision

Что оставлено как fallback.
Что больше не вызывается автоматически.

## 6. Changed files

| File | Change |
|---|---|

## 7. Verification results

Результаты проверки:

| Check | Result |
|---|---|

## 8. Remaining limitations

Если что-то осталось.

---

# Chat response format

```text
Session log:
docs/cursor_sessions/2026-05-28_cursor_task_018C_status_modal_live_flow_and_lookup_fix.md

Status: completed

Changed files:
- ...
```

или:

```text
Status: blocked
Reason:
...
```

---

# Implementation report (2026-05-28)

## 1. Current broken behavior

- **Static right panel**: `StatusDialogVisual` always shown; no live data after submit.
- **Fullscreen redirect**: `StatusLookupModal` called `navigate(/review/status/...)` and closed modal on submit.
- **Failed to fetch / lookup failure**: Backend returned **HTTP 500** for many lookups (including `NL-00500001-001` when not matched by exact `request_number`), due to SQLAlchemy bug in `resolve_review_by_request_ref`. Browser sometimes surfaced this as generic network failure; API never returned clean 404.

## 2. Root cause of Failed to fetch

Primary root cause: **backend 500**, not CORS or wrong base URL.

In `review_ids.py` line:

```python
Review.order_number == digits.lstrip("0") or "0",
```

Operator precedence made the third `or_()` argument a bare string `"0"` instead of a SQL comparison → `sqlalchemy.exc.ArgumentError: Textual SQL expression '0' should be explicitly declared as text('0')`.

Fixed to:

```python
legacy_order = digits.lstrip("0") or "0"
Review.order_number == legacy_order,
```

Secondary UX issue: modal navigated away before user could see API errors in context.

## 3. Status modal architecture

| State | Right panel (`StatusModalPanel`) |
|---|---|
| `idle` | Decorative timeline (`StatusDialogVisual`) |
| `loading` | «Загружаем статус…» |
| `success` | Live data: ticket id, headline, `StatusStepper`, topic, rating, review text, company response |
| `error` | Message + hints (format `NL-XXXXXXXX-NNN`, check email) |

Left column: form always visible. Submit calls `fetchReviewStatus()` — **no `navigate()`**.

Prefill from review success modal auto-runs lookup when both fields provided.

## 4. Lookup implementation

- **Frontend**: `fetchReviewStatus()` in `reviewStatus.js` → `GET {VITE_API_URL}/api/reviews/requests/{encodedId}/status?email=...`
- **Normalize**: `normalizeRequestNumberInput()` before encode
- **Backend**: `resolve_review_by_request_ref()` + email check; returns `customer_display_request_number`
- **Network errors**: caught separately with user-friendly Russian message; technical details in `console.error`

## 5. Fullscreen route decision

- `/review/status/:requestNumber` — **deep-link fallback**: opens status modal with prefilled params, `navigate("/", { replace: true })` (same pattern as `/review/status` lookup page).
- No fullscreen status UI as primary flow anymore.
- Homepage/header «Проверить статус» → modal only.

## 6. Changed files

| File | Change |
|---|---|
| `backend/app/services/review_ids.py` | Fix SQLAlchemy `or_()` bug in legacy order lookup |
| `frontend/src/lib/reviewStatus.js` | Shared fetch + labels |
| `frontend/src/components/client/StatusLookupModal.jsx` | Live modal workflow, in-modal fetch |
| `frontend/src/components/client/StatusModalPanel.jsx` | idle/loading/success/error right panel |
| `frontend/src/pages/ReviewStatusPage.jsx` | Deep-link → open modal on homepage |
| `frontend/src/index.css` | Panel result/error/loading styles |

## 7. Verification results

| Check | Result |
|---|---|
| `docker compose up --build -d` | OK |
| `POST` review `NL-00500001` → `NL-00500001-001` | OK |
| `GET` `NL-00500001-001` + correct email | 200 |
| `GET` `NL-00500001-001` + wrong email | 404 (not 500) |
| `GET` non-existent `NL-99999999-001` | 404 (not 500) |
| Modal submit (no route change) | Implemented |
| Operator/admin | Not touched |

## 8. Remaining limitations

- Demo timeline dates in idle state remain static (illustrative).
- Deep-link `/review/status/...` redirects to homepage + modal (no standalone fullscreen page).
- `NL-00500001-001` exists in DB only after creating a review for order `NL-00500001` (verified via API in this session).
