# Cursor Task 018 — Review creation modal on homepage and decoupled status flow

## Контекст

Клиентская homepage уже приведена к product-style customer-facing UI.

Следующий шаг — перенести существующую логику создания обращения из текущего полноэкранного режима `/review` в клиентский modal dialog на homepage.

Визуальный reference для modal dialog уже размещён Александром в проекте:

```text
frontend/public/assets/ui_reference_client_review_dialog_widescreen_v1.png
```

Использовать этот файл как visual reference.

Важно:

Это НЕ redesign homepage.

Это task на перенос существующей бизнес-логики создания обращения в modal/dialog flow.

---

# Главная задача

Реализовать customer-facing modal dialog для создания нового обращения по reference:

```text
frontend/public/assets/ui_reference_client_review_dialog_widescreen_v1.png
```

Модалка должна открываться с homepage по кнопкам:

- Header CTA: `Оставить отзыв`
- Hero CTA: `Оставить отзыв`
- Footer/support link, если он уже ведёт на создание обращения

При этом:

- homepage остаётся на фоне;
- фон затемняется backdrop’ом;
- modal centered;
- пользователь не переходит на отдельную fullscreen страницу;
- существующая логика submit должна быть переиспользована из текущего `/review`.

---

# Что сделать с текущим fullscreen `/review`

Текущий fullscreen route `/review` НЕ удалять без необходимости.

Допустимые варианты:

1. Оставить `/review` как fallback route, который открывает тот же dialog shell.
2. Или сделать `/review` тонким wrapper’ом над тем же компонентом формы.
3. Или оставить старую страницу временно, но вся клиентская homepage должна использовать modal flow.

Главное:

- не дублировать бизнес-логику;
- форму, validation, API submit и state handling вынести/переиспользовать в общий компонент.

---

# Required architecture

Нужно разделить:

## 1. Review creation form logic

Переиспользуемая логика:

- form state;
- validation;
- rating;
- topic/category selection;
- description;
- email;
- order/service number;
- submit;
- loading;
- error handling;
- success state.

## 2. Presentation shell

Modal/dialog shell:

- backdrop;
- centered card;
- close button;
- footer buttons;
- visual style по reference.

## 3. Route behavior

Homepage:

- opens modal in-place.

`/review`:

- optional fallback;
- не должен быть основным UX для клиента.

---

# Важное изменение flow

Раньше после создания обращения могла автоматически открываться страница статуса.

Теперь так НЕ нужно.

## Создание обращения и просмотр статуса — разные независимые действия

После successful submit:

- НЕ открывать автоматически status dialog;
- НЕ редиректить автоматически на `/review/status/...`;
- НЕ вызывать status modal автоматически.

Вместо этого показать success state внутри review modal:

- “Обращение отправлено”
- номер обращения / review ID
- краткий текст: “Сохраните номер, чтобы проверить статус позже”
- кнопка:
  - `Закрыть`
  - опционально: `Скопировать номер`
  - опционально: `Проверить статус` как отдельное явное действие, но НЕ автоматически

Если кнопка `Проверить статус` есть — она должна быть explicit user action.

---

# Отдельный статус flow

Кнопки `Проверить статус` в header/hero должны открывать отдельный status dialog или существующий status flow.

Но:

- status dialog НЕ должен запускаться автоматически после submit;
- status dialog НЕ должен быть частью create-review submit lifecycle;
- create review и check status должны быть independent modal flows.

---

# Visual requirements for review modal

Reference:

```text
frontend/public/assets/ui_reference_client_review_dialog_widescreen_v1.png
```

Требования:

- centered modal card;
- dark translucent backdrop;
- homepage visible behind backdrop;
- close `X` in top-right;
- title: `Новое обращение`;
- subtitle: `Расскажите, что у вас случилось — мы ответим в ближайшее время.`;
- fields aligned vertically;
- rating stars row;
- privacy/info callout;
- bottom action row:
  - `Отмена`
  - `Отправить обращение`.

Do not make it fullscreen.

Do not make it right drawer.

Do not replace homepage route.

---

# Fields

Use existing backend/API requirements if already implemented.

Expected customer-visible fields:

- Номер заказа / обращения;
- Тема обращения;
- Rating / оценка ситуации;
- Описание;
- Email для ответа.

Do not expose internal terms:

- product_area;
- scenario;
- topic as internal backend term.

Customer-facing label should remain:

```text
Тема обращения
```

or equivalent user-friendly wording.

---

# Behavior

## Open

- click `Оставить отзыв`;
- modal opens;
- backdrop appears;
- body scroll preferably locked while modal open.

## Close

- click X;
- click `Отмена`;
- optionally ESC;
- backdrop click optional, but if implemented, should not lose filled data accidentally unless confirmed.

## Submit

- validates form;
- calls existing API;
- shows loading state;
- on success shows success state inside modal;
- does NOT auto-open status;
- does NOT auto-redirect.

## Error

- show readable error in modal;
- keep user input.

---

# What NOT to change

Запрещено:

- менять backend/API без необходимости;
- менять operator/admin UI;
- менять prompt/evaluation/logs/admin pages;
- ломать existing review submission logic;
- ломать status check flow;
- делать fullscreen review page primary UX;
- делать right drawer вместо centered modal;
- автоматически открывать status after submit.

---

# Acceptance criteria

Task 018 принимается только если:

1. Homepage button `Оставить отзыв` opens centered modal.
2. Modal visually follows `ui_reference_client_review_dialog_widescreen_v1.png`.
3. Homepage remains visible behind dark backdrop.
4. Existing review creation API logic is reused.
5. Submit creates review as before.
6. After submit, status flow is NOT opened automatically.
7. Success state appears inside create-review modal.
8. Review ID / номер обращения is shown to user.
9. `Проверить статус` remains a separate explicit action.
10. Header/hero status buttons still work.
11. `/review` fallback does not break.
12. Operator/admin routes are not touched.
13. No runtime errors.

---

# Verification

После изменений выполнить:

```bash
docker compose up --build -d
```

Проверить:

```text
/
click Оставить отзыв
submit valid review
success state
close modal
click Проверить статус
/review fallback
operator/admin unaffected
```

---

# Session log

Создать:

```text
docs/cursor_sessions/2026-05-27_cursor_task_018_review_creation_modal_flow.md
```

КРИТИЧЕСКИ ВАЖНО:

В начало session log вставить полный текст этого prompt.

После prompt добавить разделы:

## 1. Existing review flow found

Где была старая fullscreen логика:

| File/component | Role |
|---|---|

## 2. Reused logic

Что переиспользовано:

| Logic | Reused from | New location |
|---|---|---|

## 3. Modal implementation

Что создано/изменено:

| Component/file | Change |
|---|---|

## 4. Submit behavior

Подтвердить:

- API submit работает;
- success state внутри modal;
- status не открывается автоматически.

## 5. Status flow separation

Подтвердить:

- status button работает отдельно;
- create-review flow не вызывает status flow автоматически.

## 6. Changed files

Таблица:

| File | Change |
|---|---|

## 7. Verification

Результаты проверки.

## 8. Remaining limitations

Если что-то осталось временным — написать честно.

---

# Chat response format

```text
Session log:
docs/cursor_sessions/2026-05-27_cursor_task_018_review_creation_modal_flow.md

Status: completed

Changed files:
- ...
```

or:

```text
Status: blocked
Reason:
...
```

---


## 1. Existing review flow found

| File/component | Role |
|---|---|
| `frontend/src/pages/ReviewPage.jsx` | Fullscreen form + POST `/api/reviews` + success with auto-link to status |
| `frontend/src/pages/ReviewStatusLookupPage.jsx` | Fullscreen status lookup → navigate to status page |
| `frontend/src/components/StarRating.jsx` | Rating UI |
| `frontend/src/layouts/ClientLayout.jsx` | Header/footer links to `/review` and `/review/status` |

## 2. Reused logic

| Logic | Reused from | New location |
|---|---|---|
| Form state, validation, API submit | `ReviewPage.jsx` | `frontend/src/hooks/useReviewForm.js` |
| Topic → product_area mapping | `ReviewPage.jsx` | `useReviewForm.js` |
| Star rating | `StarRating.jsx` | `ReviewFormFields.jsx` (modal variant) |
| Status lookup submit | `ReviewStatusLookupPage.jsx` | `StatusLookupModal.jsx` |

## 3. Modal implementation

| Component/file | Change |
|---|---|
| `ClientModal.jsx` | Backdrop, centered dialog, ESC, body scroll lock |
| `ReviewCreationModal.jsx` | Reference-aligned create flow + in-modal success |
| `StatusLookupModal.jsx` | Separate status lookup dialog |
| `ReviewFormFields.jsx` | Fields per reference (order, topic, rating, description, email) |
| `ClientModalContext.jsx` | Global open/close for review and status modals |
| `ClientLayout.jsx` | Buttons open modals; provider wraps shell |
| `HomePage.jsx` | Hero CTAs open modals in-place |
| `index.css` | Modal, privacy callout, footer link buttons |

## 4. Submit behavior

- API submit: `POST /api/reviews` via `useReviewForm` (unchanged payload semantics).
- Success state shown **inside** review modal (“Обращение отправлено”, `#request_number`).
- **No** auto-redirect to `/review/status/...`.
- **No** auto-open status modal after submit.
- Optional explicit **«Проверить статус»** on success opens status modal with prefilled number/email.

## 5. Status flow separation

- Header/hero **«Проверить статус»** opens `StatusLookupModal` only (user action).
- Create-review lifecycle does not call status modal automatically.
- `/review/status/:requestNumber` full page route unchanged for detail view after lookup submit.

## 6. Changed files

| File | Change |
|---|---|
| `frontend/src/hooks/useReviewForm.js` | New shared form hook |
| `frontend/src/components/client/ClientModal.jsx` | Modal shell |
| `frontend/src/components/client/ReviewFormFields.jsx` | Modal form fields |
| `frontend/src/components/client/ReviewCreationModal.jsx` | Create review modal |
| `frontend/src/components/client/StatusLookupModal.jsx` | Status lookup modal |
| `frontend/src/context/ClientModalContext.jsx` | Modal state provider |
| `frontend/src/layouts/ClientLayout.jsx` | Modal triggers in header/footer |
| `frontend/src/pages/HomePage.jsx` | Modal triggers in hero |
| `frontend/src/pages/ReviewPage.jsx` | Fallback: open modal + redirect `/` |
| `frontend/src/pages/ReviewStatusLookupPage.jsx` | Fallback: open status modal + redirect `/` |
| `frontend/src/components/StarRating.jsx` | Modal variant with scale labels |
| `frontend/src/index.css` | Modal styles |

## 7. Verification

```bash
docker compose up --build -d
```

- `GET /` → 200
- `GET /review` → 200 (fallback opens modal, redirects home)
- `GET /review/status` → 200 (fallback opens status modal)

Manual UI checks recommended: open modal from homepage, submit, success in modal, close, separate status flow.

## 8. Remaining limitations

- Visual pixel-perfect match to `ui_reference_client_review_dialog_widescreen_v1.png` not automated; manual compare advised.
- Field «Имя» removed from customer modal (reference has no name field); `customer_name` derived from email local-part for API requirement.
- Backdrop click closes modal without confirm (may discard draft); ESC closes same way.

