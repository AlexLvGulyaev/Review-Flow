# Cursor Task 018B — Диалог проверки статуса и нормализация номеров обращений

## Контекст

Текущая реализация режима «Проверить статус» нарушает ранее согласованные правила клиентского UX и правила нумерации обращений.

Сейчас в интерфейсе одновременно встречаются разные форматы номеров:

- `#NL-00250001_0001`
- `45821_0001`
- форматы с `_`
- форматы с `#`
- внутренние технические идентификаторы

Это недопустимо для customer-facing UI.

Также текущий диалог проверки статуса визуально не соответствует целевому варианту.

Целевой reference уже размещён в проекте:

```text
docs/ui_reference_client_status_dialog_widescreen_v1.png
```

---

# Главная задача

Выполнить связанные работы:

1. Провести инвентаризацию всех номеров заказов/обращений в БД, backend и frontend.
2. Привести генерацию, хранение, отображение и поиск обращений к единому customer-facing формату.
3. Перестроить диалог проверки статуса по визуальному reference.
4. Не допустить утечки внутренних идентификаторов в клиентский интерфейс.

---

# Обязательный формат номеров

## Номер заказа

Формат номера заказа:

```text
NL-XXXXXXXX
```

Где:

- `NL-` — фиксированный префикс;
- `XXXXXXXX` — 8 цифр.

Пример:

```text
NL-00481257
```

---

## Номер обращения

Номер обращения является производным от номера заказа.

Формат:

```text
NL-XXXXXXXX-NNN
```

Где:

- `NL-XXXXXXXX` — номер заказа;
- `NNN` — порядковый номер обращения внутри заказа;
- `NNN` всегда состоит из 3 цифр.

Примеры:

```text
NL-00481257-001
NL-00481257-002
NL-00481257-003
```

---

# Жёсткие запреты по номерам

В customer-facing UI запрещены:

- `_`;
- `#`;
- UUID;
- внутренние database ID;
- timestamp-based ID;
- формат `45821_0001`;
- формат `#NL-00250001_0001`.

Во всех клиентских экранах должен отображаться только формат:

```text
NL-XXXXXXXX-NNN
```

---

# 1. Инвентаризация номеров обращений

Перед исправлением выполнить полную инвентаризацию:

- схема БД;
- таблицы с заказами/обращениями;
- существующие значения номеров;
- генераторы номеров;
- mock/demo data;
- fixtures/seeds;
- backend serializers;
- frontend formatters;
- status lookup logic;
- success state после создания обращения;
- status page;
- status dialog.

Нужно найти:

- где появляется `_`;
- где появляется `#`;
- где формируется `45821_0001`;
- где формируется `#NL-00250001_0001`;
- где внутренний ID попадает в клиентский UI;
- где frontend и backend используют разные представления одного обращения.

---

# 2. Нормализация данных

Привести существующие demo/mock/test обращения к customer-facing формату:

```text
NL-XXXXXXXX-NNN
```

Если в БД или seed-данных есть старые значения:

- нормализовать их;
- либо добавить migration/compatibility layer;
- либо создать display ID поверх internal ID.

Важно:

backend может продолжать хранить внутренние ID, UUID, timestamps и технические ключи.

Но клиенту показывается только:

```text
NL-XXXXXXXX-NNN
```

---

# 3. Исправление генерации новых обращений

При создании нового обращения:

1. Пользователь вводит номер заказа:

```text
NL-00481257
```

2. Система определяет порядковый номер обращения внутри этого заказа.

3. Первое обращение получает:

```text
NL-00481257-001
```

4. Второе:

```text
NL-00481257-002
```

5. И так далее до `999`.

Если сейчас backend не умеет считать sequence внутри заказа, реализовать минимально корректный механизм или clearly documented compatibility fallback.

---

# 4. Исправление success state

После создания обращения success state должен показывать:

```text
Ваш номер обращения: NL-00481257-001
```

Запрещено показывать:

- `#NL-00250001_0001`;
- `45821_0001`;
- UUID;
- internal request number.

---

# 5. Исправление status lookup

Диалог проверки статуса должен принимать customer-facing номер:

```text
NL-00481257-001
```

Backend/status lookup должен уметь находить обращение по этому номеру.

Если есть legacy values, обеспечить совместимость, но не показывать legacy format клиенту.

---

# 6. Диалог проверки статуса

Текущий диалог выглядит слишком примитивно и не соответствует reference.

Использовать visual reference:

```text
frontend/public/assets/ui_reference_client_status_dialog_widescreen_v1.png
```

Требуется реализовать centered widescreen modal.

## Левая часть

- заголовок: `Проверить статус обращения`;
- пояснение;
- поле `Номер обращения *`;
- поле `Email *`;
- основная зелёная кнопка `Проверить статус`;
- privacy/security note.

## Правая часть

- декоративно-информационный блок;
- визуальная timeline/pipeline композиция;
- спокойная customer-care иллюстрация;
- не обязательно pixel-perfect, но композиционно близко к reference.

Диалог НЕ должен быть:

- узкой debug-формой;
- fullscreen page;
- техническим popup;
- примитивной формой без правого visual блока.

---

# 7. Страница/экран статуса

На экране статуса отображать только нормализованный номер:

```text
Обращение NL-00481257-001
```

или:

```text
Статус обращения NL-00481257-001
```

Без `#`.

Если обращение не найдено, сообщение должно быть понятным:

```text
Обращение не найдено
```

Но номер всё равно должен отображаться в правильном формате, если пользователь ввёл customer-facing ID.

---

# 8. Что НЕ менять

Запрещено:

- ломать создание обращения;
- ломать operator/admin UI;
- менять unrelated homepage layout;
- удалять backend internal IDs;
- ломать status pipeline;
- менять review/status modal architecture без необходимости;
- выводить internal IDs клиенту.

---

# 9. Обязательный forensic report

В session log обязательно объяснить:

1. Почему старые форматы номеров сохранились.
2. Где именно формировался `_`.
3. Где именно формировался `#`.
4. Почему frontend показывал internal-style ID.
5. Почему предыдущий отчёт мог заявить, что формат исправлен, хотя UI показывал другой формат.
6. Какие конкретные файлы исправлены.
7. Как теперь гарантируется единый формат.

---

# 10. Acceptance criteria

Task 018B принимается только если:

1. Все customer-facing номера обращений имеют формат `NL-XXXXXXXX-NNN`.
2. В клиентском UI больше нет `_` в номерах обращений.
3. В клиентском UI больше нет `#` перед номером обращения.
4. Success state после создания обращения показывает `NL-XXXXXXXX-NNN`.
5. Status dialog принимает `NL-XXXXXXXX-NNN`.
6. Status screen показывает `NL-XXXXXXXX-NNN`.
7. Internal IDs не выводятся клиенту.
8. Status dialog визуально близок к `ui_reference_client_status_dialog_widescreen_v1.png`.
9. Существующий backend flow не сломан.
10. Operator/admin UI не затронут.
11. Нет runtime errors.

---

# 11. Verification

После изменений выполнить:

```bash
docker compose up --build -d
```

Проверить:

```text
/
Оставить отзыв
создание обращения
success state
Проверить статус
status dialog
status screen
поиск по NL-XXXXXXXX-NNN
operator/admin unaffected
```

Особенно проверить:

- нет `_`;
- нет `#`;
- нет UUID/internal ID в клиентском UI.

---

# 12. Session log

Создать:

```text
docs/cursor_sessions/2026-05-27_cursor_task_018B_status_dialog_and_review_id_normalization.md
```

В начало session log вставить полный текст этого prompt.

После prompt добавить разделы:

## 1. ID inventory

Таблица:

| Source | Current format | Problem | Fix |
|---|---|---|---|

## 2. Database/backend findings

Что найдено в БД/backend.

## 3. Frontend findings

Что найдено во frontend.

## 4. Normalization implementation

Как реализован формат:

```text
NL-XXXXXXXX-NNN
```

## 5. Status dialog implementation

Что изменено в диалоге проверки статуса.

## 6. Changed files

Таблица:

| File | Change |
|---|---|

## 7. Verification results

Результаты проверки.

## 8. Remaining limitations

Если есть.

---

# Chat response format

```text
Session log:
docs/cursor_sessions/2026-05-27_cursor_task_018B_status_dialog_and_review_id_normalization.md

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

# Implementation report (2026-05-27)

## 1. ID inventory

| Source | Current format (before) | Problem | Fix |
|---|---|---|---|
| `backend/app/services/pipeline.py` | `{order}_{seq:04d}` e.g. `45821_0001` | Root generator used `_` and 4-digit seq | `format_request_number()` → `NL-XXXXXXXX-NNN` |
| `backend/app/api/reviews.py` create | Raw `review.request_number` from DB | Could return legacy or UUID fallback | `customer_display_request_number()` on response |
| `backend/app/api/reviews.py` status GET | Exact match on `request_number` column | Lookup failed for `NL-00481257-001` | `resolve_review_by_request_ref()` + legacy fallbacks |
| `frontend/src/hooks/useReviewForm.js` | Client-side `normalizeOrder + extractSequence(_)` | Masked backend format; fragile | Use API `request_number` as canonical display id |
| `frontend/src/pages/ReviewStatusPage.jsx` | `#{requestNumber}` in heading | `#` prefix in customer UI | Show `ticketId` without `#`; normalize lookup URL |
| `frontend/src/components/client/StatusLookupModal.jsx` | Narrow form, placeholder `45821_0001` | No widescreen layout, legacy placeholder | Two-column modal + `NL-00481257-001` placeholder |
| Task 018A session claim | “format fixed” | Display-only mapping in frontend | 018B fixes storage + API + all client surfaces |
| DB `reviews` (pre-migration) | Mixed `order_number` / `request_number` | Legacy rows | Migration `009_normalize_request_numbers.sql` |

## 2. Database/backend findings

- Columns: `reviews.order_number`, `reviews.request_sequence`, `reviews.request_number` (migration 008).
- Legacy generator (Task 015): `f"{order_number}_{seq:04d}"` in `pipeline.py`.
- Status endpoint matched only stored `request_number` string — customer-facing `NL-…-NNN` did not match `45821_0001`.
- Migration `009` normalizes existing rows: `order_number` → `NL-XXXXXXXX`, `request_number` → `NL-XXXXXXXX-NNN`.
- New module `backend/app/services/review_ids.py`: normalize, format, parse, resolve (with legacy compatibility).

## 3. Frontend findings

- `#` only in `ReviewStatusPage.jsx` heading (not anchor links).
- `_` in placeholders and 018A `extractSequence` workaround.
- Status modal was single-column ~560px card without visual panel.
- Shared logic duplicated in `useReviewForm` — moved to `frontend/src/lib/reviewIds.js`.

## 4. Normalization implementation

- **Order**: `normalize_order_number()` → `NL-XXXXXXXX` (8 digits, zero-padded).
- **Request**: `format_request_number(order, seq)` → `NL-XXXXXXXX-NNN` (seq 001–999).
- **Storage**: pipeline writes canonical id to `request_number` and normalized order to `order_number`.
- **API responses**: always `customer_display_request_number()` (never UUID on client paths).
- **Lookup**: parse `NL-XXXXXXXX-NNN`, match `(order_number, request_sequence)`, fallback exact legacy `request_number` and unnormalized order digits.

## 5. Status dialog implementation

- Widescreen modal (`client-modal-dialog-wide`, ~920px).
- Left: title «Проверить статус обращения», subtitle, fields, full-width green CTA, privacy note.
- Right: `StatusDialogVisual.jsx` — envelope illustration, demo timeline (4 steps), trust line.
- Submit navigates with `normalizeRequestNumberInput()` + `encodeURIComponent`.

## 6. Changed files

| File | Change |
|---|---|
| `backend/app/services/review_ids.py` | New: format, parse, display, resolve |
| `backend/app/services/pipeline.py` | Canonical id generation |
| `backend/app/api/reviews.py` | Display ids + lookup resolver |
| `backend/migrations/009_normalize_request_numbers.sql` | Backfill legacy rows |
| `frontend/src/lib/reviewIds.js` | Shared client id helpers |
| `frontend/src/hooks/useReviewForm.js` | Use API request_number directly |
| `frontend/src/components/client/StatusLookupModal.jsx` | Widescreen two-column dialog |
| `frontend/src/components/client/StatusDialogVisual.jsx` | Right visual panel |
| `frontend/src/components/client/ClientModal.jsx` | `dialogClassName` prop |
| `frontend/src/components/client/ReviewCreationModal.jsx` | Status handoff uses display id |
| `frontend/src/pages/ReviewStatusPage.jsx` | No `#`; normalized fetch/display |
| `frontend/src/index.css` | Status modal layout/styles |

## 7. Verification results

- `docker compose up --build -d` — success (backend healthy, migration 009 applied on startup).
- `POST /api/reviews` with `NL-00481257` → `request_number`: `NL-00481257-001` (no `_`, no UUID).
- `GET /api/reviews/requests/NL-00481257-001/status?email=...` → 200, `request_number` in body: `NL-00481257-001`.
- Python unit checks on `review_ids` pure functions — pass.
- Operator/admin pages not modified.

## 8. Remaining limitations

- Reference placeholder in PNG still shows `RF-2026-0152_0001`; UI uses `NL-00481257-001` per product spec.
- Demo timeline in status dialog is illustrative (static), not live API data until user opens status page.
- Visual parity with reference is compositional, not pixel-perfect.

## 9. Forensic summary

1. **Why legacy formats persisted**: Task 015 introduced human ids as `{order}_{seq:04d}`; 018A only reformatted on the client for success state.
2. **`_` source**: `pipeline.py` line `f"{order_number}_{seq:04d}"`.
3. **`#` source**: `ReviewStatusPage.jsx` template `#{requestNumber}`.
4. **Why frontend showed internal-style ids**: API returned DB `request_number`; UI either showed it raw or re-derived display from `_` suffix.
5. **Why 018A report was misleading**: Success modal showed `NL-…-NNN` via `displayRequestId` while DB/API still stored `45821_0001`; status lookup and status page unchanged.
6. **Files fixed**: see table §6.
7. **Guarantee now**: single generator + migration + API display/lookup + shared `reviewIds.js` on client; UUID only as internal `review_id` in JSON (not rendered in client pages).
