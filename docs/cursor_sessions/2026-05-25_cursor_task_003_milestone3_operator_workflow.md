# Cursor Task 003 — Milestone 3 operator workflow and mock publication

## Контекст

Проект: `review-flow`.

Milestone 1 завершён:
- Docker Compose;
- PostgreSQL;
- FastAPI skeleton;
- React shell;
- migrations;
- seed data;
- healthchecks.

Milestone 2 завершён:
- `POST /api/reviews`;
- `GET /api/reviews/{id}`;
- synchronous review pipeline;
- phrase matching;
- AI/mock classification;
- template selection;
- draft generation;
- operational logs;
- frontend page `/review`.

Теперь задача — Milestone 3:

```text
operator workflow -> moderation -> final response -> mock publication -> client status page
```

Цель:
сделать human-in-the-loop контур, чтобы AI-generated draft не считался финальным ответом без оператора.

---

# Важные ограничения

Не реализовывать:

- полноценную authentication system;
- RBAC;
- Admin UI;
- prompt editor;
- analytics;
- evaluation UI;
- async workers;
- Redis/Celery/queues;
- RAG/vector DB/embeddings;
- marketplace integrations;
- production security layer.

На этом milestone допускается простая роль через UI-route/placeholder, но без login/password.

---

# 1. Backend: moderation API

Нужно реализовать endpoints:

```text
GET  /api/operator/reviews
GET  /api/operator/reviews/{review_id}
POST /api/operator/reviews/{review_id}/approve
POST /api/operator/reviews/{review_id}/reject
POST /api/operator/reviews/{review_id}/revision
```

## GET /api/operator/reviews

Возвращает список отзывов для оператора.

Минимальные поля:

- review_id;
- customer_name;
- service_case_title;
- product_area;
- rating;
- review_text preview;
- scenario;
- sentiment;
- priority;
- moderation_status;
- publication_status;
- created_at;
- updated_at.

Фильтры можно сделать минимально:

- `moderation_status`;
- `publication_status`.

Если фильтры не переданы — вернуть последние отзывы.

---

## GET /api/operator/reviews/{review_id}

Возвращает полную карточку:

- customer;
- service_case;
- review;
- matched phrase;
- classification;
- selected template;
- draft_response;
- final_response;
- moderation_status;
- publication_status;
- operational log events по этому review.

---

## POST /approve

Input:

```json
{
  "final_response": "string"
}
```

Логика:

1. Найти `review_response`.
2. Сохранить `final_response`.
3. Выставить:
   - `moderation_status = approved`
   - `publication_status = published`
4. Записать operational logs:
   - `moderation_approved`
   - `mock_publication_completed`
5. Вернуть обновлённую карточку или статус.

---

## POST /reject

Input:

```json
{
  "reason": "string"
}
```

Логика:

1. Выставить:
   - `moderation_status = rejected`
   - `publication_status = not_published`
2. Записать operational log:
   - `moderation_rejected`
3. Вернуть статус.

---

## POST /revision

Input:

```json
{
  "reason": "string"
}
```

Логика:

1. Выставить:
   - `moderation_status = needs_revision`
   - `publication_status = not_published`
2. Записать operational log:
   - `moderation_revision_requested`
3. Вернуть статус.

На этом milestone не нужно автоматически перегенерировать draft.

---

# 2. Backend: client status API

Добавить endpoint:

```text
GET /api/reviews/{review_id}/status
```

Возвращает:

- review_id;
- processing/moderation status;
- publication_status;
- review_text;
- rating;
- final_response, если опубликован;
- draft_response не возвращать клиенту.

Клиент не должен видеть внутренний draft до approve.

---

# 3. Frontend: Operator UI

Создать страницу:

```text
/operator/reviews
```

## Список

Слева или сверху — список отзывов.

Показать:

- customer name;
- rating;
- scenario;
- sentiment;
- priority;
- moderation_status;
- short review preview.

## Карточка отзыва

При выборе отзыва показать:

- полный текст отзыва;
- customer;
- service case;
- product area;
- rating;
- classification;
- matched phrase;
- template;
- draft response;
- textarea для final response;
- кнопки:
  - Approve / Publish mock;
  - Reject;
  - Needs revision.

## UX требования

- простой, читаемый layout;
- без UI framework;
- без сложных компонентов;
- loading/error/success states;
- после approve/reject/revision карточка обновляется.

---

# 4. Frontend: client status page

Создать страницу:

```text
/review/status/:reviewId
```

или простой query-based вариант, если router ещё не используется:

```text
/review-status?review_id=...
```

Страница должна показывать:

- review text;
- rating;
- status;
- publication status;
- final response, если published.

Если final response ещё не опубликован — показать понятный статус без internal draft.

---

# 5. Frontend: review form improvement

После успешной отправки на `/review` добавить ссылку на client status page.

Пример:

```text
Ваш отзыв принят.
ID: ...
Проверить статус: ...
```

---

# 6. Operational logs

Добавить события:

- operator_review_opened, если удобно;
- moderation_approved;
- moderation_rejected;
- moderation_revision_requested;
- mock_publication_completed.

Не делать отдельный logs UI.

---

# 7. Data model

Использовать существующие поля:

- `review_responses.moderation_status`;
- `review_responses.publication_status`;
- `review_responses.final_response`;
- `review_responses.operator_id`.

Если `operator_id` пока не используется — можно оставить null или placeholder.

Не добавлять таблицу users на этом milestone, если без неё можно выполнить задачу.

---

# 8. Verification

После реализации проверить:

1. `docker compose up --build -d`
2. `GET /health`
3. Отправить отзыв через `/review`.
4. Убедиться, что он появился в `/operator/reviews`.
5. Открыть карточку.
6. Отредактировать final response.
7. Approve.
8. Убедиться, что client status page показывает опубликованный ответ.
9. Проверить reject и needs_revision хотя бы через API или UI.
10. Проверить operational logs в БД.

---

# Что НЕ делать

Не начинать Milestone 4.

Не реализовывать:

- prompt version editor;
- evaluation subsystem UI;
- analytics dashboard;
- RBAC/auth;
- Admin UI;
- real publication integrations;
- email/Telegram notifications;
- background jobs.

---

# Сессионный лог

Создать файл:

```text
docs/cursor_sessions/2026-05-25_cursor_task_003_milestone3_operator_workflow.md
```

В начало файла вставить полный текст этого промпта.

Ниже зафиксировать:

- какие backend endpoints добавлены;
- какие frontend pages добавлены;
- как устроен moderation lifecycle;
- как устроен mock publication;
- как клиент видит статус;
- какие operational logs добавлены;
- что проверено;
- какие проблемы возникли;
- TODO для Milestone 4.

---

# Формат ответа в чат

После выполнения написать кратко:

```text
Session log: docs/cursor_sessions/2026-05-25_cursor_task_003_milestone3_operator_workflow.md
Status: Milestone 3 completed
```

или:

```text
Status: Milestone 3 blocked
Reason: ...
```

---

# Результат выполнения (Cursor, 2026-05-25)

## Backend endpoints

| Method | Path | Назначение |
|---|---|---|
| GET | `/api/operator/reviews` | Список отзывов (фильтры `moderation_status`, `publication_status`) |
| GET | `/api/operator/reviews/{id}` | Полная карточка + operational logs |
| POST | `/api/operator/reviews/{id}/approve` | Утверждение + mock publication |
| POST | `/api/operator/reviews/{id}/reject` | Отклонение |
| POST | `/api/operator/reviews/{id}/revision` | Запрос доработки |
| GET | `/api/reviews/{id}/status` | Клиентский статус (без draft) |

Файлы: `backend/app/api/operator.py`, `backend/app/services/moderation.py`, `backend/app/schemas/operator.py`.

## Frontend pages

| Route | Страница |
|---|---|
| `/operator/reviews` | Очередь оператора: список + карточка + действия |
| `/review/status/:reviewId` | Клиентский статус и опубликованный ответ |
| `/review` | Ссылка на статус после отправки (без показа draft) |

## Moderation lifecycle

```text
pending_review → approved (publication: published)
pending_review → rejected (not_published)
pending_review → needs_revision (not_published)
```

`operator_id` = `operator-ui` (placeholder).

## Mock publication

При `approve`: `final_response` сохраняется, `moderation_status=approved`, `publication_status=published`. Логи: `moderation_approved`, `mock_publication_completed`.

## Клиентский статус

`GET /api/reviews/{id}/status` возвращает `final_response` только при `publication_status=published`. Draft клиенту не отдаётся.

## Operational logs (новые)

- `operator_review_opened` (при открытии карточки)
- `moderation_approved`
- `moderation_rejected` (reason в `error_message`)
- `moderation_revision_requested` (reason в `error_message`)
- `mock_publication_completed`

## Проверено

1. `docker compose up --build -d` — OK
2. `GET /health` — OK
3. POST review — OK
4. Список в `/api/operator/reviews` — OK
5. Approve — status `published`, final_response виден клиенту
6. Reject / revision — OK через API
7. Frontend `/operator/reviews`, `/review/status/:id` — HTTP 200

## Проблемы

Не выявлено.

## TODO Milestone 4

- Prompt version editor (`/admin/prompts`)
- Evaluation subsystem UI
- Admin knowledge base UI
- Analytics dashboard

## Operator commands

```bash
docker compose up --build -d
curl http://localhost:8700/health
curl -X POST http://localhost:8700/api/reviews -H "Content-Type: application/json" -d '{...}'
curl http://localhost:8700/api/operator/reviews
curl -X POST http://localhost:8700/api/operator/reviews/{id}/approve -H "Content-Type: application/json" -d '{"final_response":"..."}'
open http://localhost:5180/operator/reviews
open http://localhost:5180/review/status/{review_id}
```
