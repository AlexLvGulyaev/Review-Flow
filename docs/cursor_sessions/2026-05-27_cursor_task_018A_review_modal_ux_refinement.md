# Cursor Task 018A — Review modal UX refinement and customer-facing review ID normalization

## Контекст

Task 018 успешно перевёл fullscreen review flow в centered customer modal dialog на homepage.

Теперь нужно провести UX refinement customer-facing review dialog.

Это НЕ redesign.
Это НЕ новая архитектура.
Это refinement существующего modal UX.

Visual foundation уже хорошая.
Теперь нужно привести modal к более зрелому customer support UX.

---

# Главная задача

Доработать review creation modal:

1. улучшить customer-facing UX формы;
2. привести порядок полей к более естественному support flow;
3. убрать ощущение “технической тикет-системы”;
4. нормализовать customer-facing review/order ID format;
5. сохранить существующую backend/business logic.

---

# Важное правило

Красные `*` оставляем.

Но:

- rating НЕ должен быть обязательным;
- optional fields не должны иметь `*`.

---

# Новый порядок полей

## 1. Номер заказа

required

Label:

Номер заказа *

Placeholder:

Например: NL-00481257

---

## 2. Тема обращения

required

---

## 3. Описание

required

---

## 4. Email для ответа

required

---

## 5. Как к вам обращаться

optional

Без `*`.

Label:

Как к вам обращаться

Placeholder:

Например: Александр

---

## 6. Оцените сервис

optional

Перенести rating block В САМЫЙ НИЗ формы.

Rating НЕ должен быть required.

Красную `*` убрать.

Label:

Оцените сервис

Не писать:
- необязательно;
- optional;
- не обязательно.

---

# Helper text about required fields

Под subtitle добавить helper text:

Поля, отмеченные *, обязательны для заполнения

---

# Customer-facing review ID logic

ВАЖНО.

Ранее предполагался format:

NL-XXXXXXXX

Но это НЕ финальное решение.

## Финальное customer-facing правило

Номер обращения является производным от номера заказа.

Формат:

NL-XXXXXXXX-NNN

Где:

- `NL-XXXXXXXX` — номер заказа;
- `NNN` — порядковый номер обращения внутри заказа.

Примеры:

Первое обращение:
NL-00481257-001

Второе обращение:
NL-00481257-002

Третье обращение:
NL-00481257-003

Нужно заложиться минимум на:
- 999 обращений внутри одного заказа.

---

# UX rationale

Это решение:
- customer-friendly;
- легко читается;
- легко диктуется голосом;
- логически понятно клиенту;
- показывает связь обращения с заказом;
- выглядит как mature support workflow.

---

# IMPORTANT

Backend можно НЕ ломать.

Допустимо:
- internal UUID;
- timestamps;
- internal IDs;
- existing DB identifiers

оставить как есть.

Но customer-facing identifier должен быть:

NL-XXXXXXXX-NNN

Если нужно:
- public_review_id;
- display_review_id;
- customer_reference_id;
- mapping layer.

Главное — customer-facing UX consistency.

---

# Success state update

После submit success state должен показывать:

Ваш номер обращения: NL-00481257-001

А НЕ:
- UUID;
- timestamped ID;
- internal identifier.

---

# Modal layout requirements

Centered modal остаётся.

Backdrop остаётся.

Homepage visible behind modal.

---

# What NOT to do

Запрещено:

- redesign modal from scratch;
- fullscreen mode;
- drawer mode;
- changing homepage layout;
- changing operator/admin UI;
- removing stars globally;
- making rating required;
- showing internal UUIDs to customers.

---

# Acceptance criteria

Task 018A принимается только если:

1. Поля идут в порядке:
   - номер,
   - тема,
   - описание,
   - email,
   - как к вам обращаться,
   - оцените сервис.

2. Rating moved to bottom.
3. Rating no longer required.
4. Rating has no red star.
5. Required fields still use red stars.
6. Helper text about required fields added.
7. New optional field added.
8. Customer-facing review ID format:
   - NL-XXXXXXXX-NNN
9. Success state uses:
   - NL-XXXXXXXX-NNN
10. Existing review submit logic still works.
11. Modal still visually matches homepage design language.
12. No operator/admin regressions.

---

# Verification

Проверить:

- open modal
- submit valid review
- success state
- review ID format
- optional fields
- rating optional
- existing API flow

---

# Session log

Создать:

docs/cursor_sessions/2026-05-27_cursor_task_018A_review_modal_ux_refinement.md

В начало session log вставить полный текст этого prompt.

После prompt добавить:

## 1. UX changes

| Change | Reason |
|---|---|

## 2. Field order update

Старый vs новый порядок полей.

## 3. Customer-facing ID normalization

Как реализован format:
NL-XXXXXXXX-NNN

## 4. Backend compatibility

Что сохранено без поломки.

## 5. Changed files

| File | Change |
|---|---|

## 6. Verification

Результаты проверки.

## 7. Remaining limitations

Если есть.

---

# Chat response format

Session log:
docs/cursor_sessions/2026-05-27_cursor_task_018A_review_modal_ux_refinement.md

Status: completed

Changed files:
- ...

---


## 1. UX changes

| Change | Reason |
|---|---|
| Helper text under subtitle (“Поля, отмеченные *, обязательны…”) | Clarifies required fields without making optional fields feel “broken” |
| Added optional “Как к вам обращаться” field (no `*`) | More natural support flow and less “technical ticket” feel |
| Rating moved to bottom, optional, no red star | Matches requirement: rating should not be required |
| Order placeholder updated to `NL-00481257` style | Matches normalized customer-friendly format |

## 2. Field order update

Old order:
- Номер заказа
- Тема
- Rating
- Описание
- Email

New order:
- Номер заказа *
- Тема обращения *
- Описание *
- Email для ответа *
- Как к вам обращаться (optional)
- Оцените сервис (optional)

## 3. Customer-facing ID normalization

Implemented customer-facing display ID:

- Normalized order input to `NL-XXXXXXXX` (accepts `NL00481257` or `NL-00481257`).
- Extracted per-order sequence from backend `request_number` when it matches `_(\d+)` (e.g. `45821_0001` → `001`).
- Display format:

```text
NL-XXXXXXXX-NNN
```

Shown in modal success state as:

```text
Ваш номер обращения: NL-00481257-001
```

Copy button copies the display ID.

## 4. Backend compatibility

- Backend API unchanged (`POST /api/reviews`).
- Internal identifiers (`request_number`) still used for status lookup route.
- Payload semantics preserved; `order_number` now sent normalized (`NL-XXXXXXXX`) and `customer_name` uses optional input or email local-part fallback.

## 5. Changed files

| File | Change |
|---|---|
| `frontend/src/hooks/useReviewForm.js` | rating optional; normalize order; compute `displayRequestId` |
| `frontend/src/components/client/ReviewFormFields.jsx` | field reorder; optional name; rating moved to bottom |
| `frontend/src/components/client/ReviewCreationModal.jsx` | helper text; success uses display ID; copy uses display ID |
| `frontend/src/index.css` | helper text styles |
| `docs/cursor_sessions/2026-05-27_cursor_task_018A_review_modal_ux_refinement.md` | session log |

## 6. Verification

- `docker compose up --build -d`
- `GET http://localhost:5180/` → 200

Manual UI checks recommended:
- open review modal
- submit valid review
- verify success shows `NL-XXXXXXXX-NNN`
- confirm rating can be left unset

## 7. Remaining limitations

- Display sequence `NNN` is derived from backend `request_number` suffix if present; if backend format changes, default is `001`.

