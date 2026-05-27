# Cursor Task 004 — Milestone 4 prompt management and evaluation foundation

## Контекст

Проект: `review-flow`.

Milestone 1 завершён:
- infrastructure bootstrap;
- PostgreSQL;
- FastAPI;
- React shell.

Milestone 2 завершён:
- review ingestion;
- classification;
- AI/mock response generation;
- operational logs.

Milestone 3 завершён:
- operator workflow;
- moderation lifecycle;
- mock publication;
- client status page;
- human-in-the-loop flow.

Теперь задача — Milestone 4:

```text
prompt management + evaluation foundation
```

Цель:
перевести AI-часть системы из hardcoded black-box поведения
в управляемый operational lifecycle:

- versioned prompts;
- controllable active prompt;
- traceability;
- evaluation dataset;
- manual quality review foundation.

---

# Главные архитектурные принципы

На этом milestone НЕ строить:

- полноценный admin platform;
- auth/RBAC;
- analytics dashboard;
- async workers;
- queues;
- RAG/vector DB;
- embeddings;
- automated AI evaluation;
- experimentation framework;
- LangSmith-like platform.

Нужно реализовать:
минимальный, но production-style controllable AI layer.

---

# 1. Database: prompt registry

Добавить таблицу:

```text
prompt_versions
```

Минимальные поля:

| field | type |
|---|---|
| id | uuid |
| prompt_key | text |
| version | integer |
| title | text |
| system_prompt | text |
| user_prompt_template | text |
| is_active | boolean |
| created_at | timestamp |
| updated_at | timestamp |

---

## Prompt keys

На текущем milestone достаточно:

```text
review_response_generation
```

Но архитектура должна позволять добавлять другие prompt types позже.

---

# 2. Seed prompts

Добавить initial seed.

Пример:

```text
prompt_key = review_response_generation
version = 1
is_active = true
```

System prompt и template можно взять из текущего hardcoded implementation.

---

# 3. Backend: prompt service abstraction

Создать abstraction:

```text
PromptService
```

или аналогичный слой.

Он должен:

- получать active prompt;
- возвращать system_prompt;
- рендерить user template;
- использоваться review generation pipeline.

---

# 4. Remove hardcoded prompt logic

Текущий AI generation pipeline должен перестать использовать hardcoded prompts.

Вместо этого:

```text
DB prompt → PromptService → AI generation
```

---

# 5. Response traceability

Добавить traceability между generated response и prompt version.

Использовать существующую таблицу `review_responses`
или расширить её.

Добавить поля:

| field | type |
|---|---|
| prompt_version_id | uuid |
| generation_metadata | json/text nullable |

---

## generation_metadata

Минимально можно хранить:

```json
{
  "provider": "mock|openai",
  "model": "...",
  "prompt_key": "...",
  "prompt_version": 1
}
```

---

# 6. Backend: prompt API

Реализовать endpoints:

```text
GET  /api/prompts
GET  /api/prompts/{id}
POST /api/prompts
POST /api/prompts/{id}/activate
```

---

## GET /api/prompts

Вернуть список prompt versions.

Минимальные поля:

- id;
- prompt_key;
- version;
- title;
- is_active;
- created_at.

---

## GET /api/prompts/{id}

Полная карточка:

- system_prompt;
- user_prompt_template;
- metadata.

---

## POST /api/prompts

Создание новой версии prompt.

Input:

```json
{
  "prompt_key": "review_response_generation",
  "title": "v2 more empathetic",
  "system_prompt": "...",
  "user_prompt_template": "..."
}
```

Логика:

- version auto increment;
- new prompt inactive by default.

---

## POST /activate

Активирует выбранную prompt version.

Логика:

- deactivate previous active;
- activate selected version;
- operational log event:
  - `prompt_version_activated`.

---

# 7. Frontend: Prompt Management UI

Создать страницу:

```text
/prompts
```

---

## Prompt list

Показать:

- prompt_key;
- version;
- title;
- active status;
- created_at.

---

## Prompt details

При выборе prompt:

- system prompt;
- user template;
- active badge;
- activate button.

---

## New prompt form

Форма:

- title;
- system prompt;
- user template.

---

## UX требования

- простой operational layout;
- без heavy UI framework;
- loading/error states;
- читаемое отображение длинных prompt textareas.

---

# 8. Evaluation foundation

На этом milestone НЕ делать полноценный evaluation subsystem.

Но нужно заложить foundation.

---

## Database

Добавить таблицу:

```text
evaluation_cases
```

Минимальные поля:

| field | type |
|---|---|
| id | uuid |
| review_id | uuid |
| expected_quality_notes | text nullable |
| operator_score | integer nullable |
| operator_comment | text nullable |
| created_at | timestamp |

---

# 9. Backend: evaluation API

Endpoints:

```text
POST /api/evaluation/cases
GET  /api/evaluation/cases
```

---

## POST

Создать evaluation case для review.

Input:

```json
{
  "review_id": "...",
  "expected_quality_notes": "..."
}
```

---

## GET

Вернуть evaluation cases.

---

# 10. Frontend: lightweight evaluation page

Создать:

```text
/evaluation
```

Минимально показать:

- review text;
- generated response;
- final response;
- prompt version;
- operator score;
- operator comment.

---

## Manual evaluation

Добавить возможность:

- score 1-5;
- comment;
- save.

Без charts/dashboards.

---

# 11. Operational logs

Добавить события:

- prompt_version_created;
- prompt_version_activated;
- evaluation_case_created;
- evaluation_scored.

---

# 12. Verification

Проверить:

1. migrations apply;
2. seed prompt created;
3. review generation использует active DB prompt;
4. новая prompt version создаётся;
5. activation переключает active version;
6. новые responses сохраняют prompt_version_id;
7. `/prompts` работает;
8. evaluation case создаётся;
9. operator score сохраняется;
10. operational logs пишутся.

---

# Что НЕ делать

Не реализовывать:

- automatic evaluation;
- LLM judge;
- embeddings;
- vector search;
- prompt playground;
- prompt diff viewer;
- auth;
- analytics dashboard;
- async jobs;
- queues;
- RAG.

---

# Архитектурная цель milestone

К концу Milestone 4 система должна перейти от:

```text
hardcoded AI generation
```

к:

```text
controlled operational AI lifecycle
```

с:

- versioned prompts;
- active prompt switching;
- response traceability;
- evaluation foundation;
- operational auditability.

---

# Сессионный лог

Создать файл:

```text
docs/cursor_sessions/2026-05-26_cursor_task_004_milestone4_prompt_management.md
```

В начало файла вставить полный текст этого промпта.

Ниже зафиксировать:

- schema changes;
- prompt registry implementation;
- prompt activation lifecycle;
- generation traceability;
- evaluation foundation;
- frontend pages;
- operational logs;
- verification results;
- проблемы;
- TODO для Milestone 5.

---

# Формат ответа в чат

После выполнения написать:

```text
Session log: docs/cursor_sessions/2026-05-26_cursor_task_004_milestone4_prompt_management.md
Status: Milestone 4 completed
```

или:

```text
Status: Milestone 4 blocked
Reason: ...
```

---

# Результат выполнения (Cursor, 2026-05-26)

## Schema changes

Migration `003_milestone4_prompt_registry.sql` (+ `backend/migrations/` для startup):

| Change | Details |
|---|---|
| `prompt_versions` extended | `prompt_key`, `version`, `title`, `system_prompt`, `user_prompt_template`, `updated_at` |
| Legacy migrate | existing row → `review_classification` v1 |
| Seed | `review_response_generation` v1 active |
| `review_responses` | `generation_metadata` JSONB |
| `evaluation_cases` | id, review_id, expected_quality_notes, operator_score, operator_comment, timestamps |

Startup: `run_pending_migrations()` в FastAPI lifespan.

## Prompt registry

- `PromptService`: get_active(key), render_template, create_version, activate
- Keys: `review_classification`, `review_response_generation`
- Pipeline: classification uses classification prompt; generation uses generation prompt + metadata traceability

## API endpoints

| Method | Path |
|---|---|
| GET/POST | `/api/prompts` |
| GET | `/api/prompts/{id}` |
| POST | `/api/prompts/{id}/activate` |
| POST/GET | `/api/evaluation/cases` |
| PATCH | `/api/evaluation/cases/{id}` (score 1–5) |

## Frontend

- `/prompts` — list, detail, activate, create form
- `/evaluation` — cases list, manual score/comment, create case by review_id

## Operational logs

- `prompt_version_created`, `prompt_version_activated`
- `evaluation_case_created`, `evaluation_scored`

## Verification

- [x] migrations apply on backend startup
- [x] seed prompts (classification + generation)
- [x] generation uses `review_response_generation` in `generation_metadata`
- [x] new prompt version + activate
- [x] evaluation case + score
- [x] operational logs written

## TODO Milestone 5

- Analytics dashboard
- Admin knowledge base UI
- Automated evaluation / LLM judge
- Auth/RBAC

## Operator commands

```bash
docker compose up --build -d
curl http://localhost:8700/api/prompts
open http://localhost:5180/prompts
open http://localhost:5180/evaluation
```
