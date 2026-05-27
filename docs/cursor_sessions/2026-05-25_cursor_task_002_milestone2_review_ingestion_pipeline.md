# Cursor Task 002 — Milestone 2 review ingestion pipeline

## Контекст

Проект: `review-flow`

Milestone 1 завершён:

- repository bootstrap;
- Docker Compose;
- PostgreSQL schema;
- seed data;
- FastAPI skeleton;
- React shell;
- healthchecks.

Теперь начинается Milestone 2:

```text
review submission -> persistence -> phrase matching -> classification -> template selection -> draft generation
```

Важно:

- не уходить в полноценный enterprise workflow;
- не строить сложную DDD-архитектуру;
- не добавлять async queues;
- не добавлять Celery/Redis;
- не делать production-hardening.

Цель:

Сделать первый end-to-end pipeline одного отзыва.

---

# Важный infrastructure fix

Перед началом Milestone 2:

Нужно устранить конфликт портов с Assistant Flow.

## Что изменить

### Backend

Было:

```text
8000
```

Нужно:

```text
8700
```

### Frontend

Было:

```text
5173
```

Нужно:

```text
5180
```

## Где обновить

- `docker-compose.yml`
- frontend config
- README
- `.env.example`
- healthcheck examples
- operator commands

Postgres наружу по-прежнему не публиковать.

---

# Основная задача — Milestone 2

## Что нужно реализовать

---

# 1. Backend architecture cleanup

Перед добавлением pipeline:

## Нужно добавить

### SQLAlchemy 2.0

Перевести backend с raw psycopg2-only подхода на:

- SQLAlchemy 2.0;
- session lifecycle;
- declarative models.

Важно:

- не строить сложный repository abstraction;
- не делать Unit of Work;
- не делать CQRS.

Нужен нормальный operational CRUD foundation.

---

## Нужно реализовать

Минимальные модели:

- Customer
- ServiceCase
- Review
- ReviewClassification
- ReviewResponse
- ReviewPhrasePattern
- ResponseTemplate
- PromptVersion

Можно не покрывать ORM все таблицы SOT сразу.

Только те, которые нужны pipeline.

---

# 2. Client review form

## Frontend

Реализовать страницу:

```text
/review
```

Форма:

- customer name
- email
- service case title
- product area
- rating
- review text

Требования:

- простой UI;
- без UI framework;
- базовая validation;
- loading/error state;
- success state.

После отправки:

показывать:

- review id;
- processing status.

---

# 3. Review ingestion API

## Backend endpoint

Создать:

```text
POST /api/reviews
```

Pipeline:

1. Создание/поиск customer
2. Создание service_case
3. Создание review
4. Operational log
5. Запуск processing pipeline

Возвращать:

- review_id
- status

---

# 4. PhraseMatchingService

## Реализовать базовый matching

Без embeddings.

Без vector DB.

Без RAG.

## Допустимые подходы

- keyword matching;
- trigram similarity;
- simple fuzzy matching.

## Нужно сохранять

- matched_phrase_id
- phrase_match_score
- classification_source
- needs_phrase_review

## Логика

Если similarity ниже порога:

```text
classification_source = llm_fallback
needs_phrase_review = true
```

Иначе:

```text
classification_source = phrase_match
```

---

# 5. ClassificationService

## Реализовать AI classification

Использовать:

- OpenAI-compatible API abstraction;
- prompt version из БД;
- structured JSON response.

## На этом этапе

Поддержать:

- OpenAI provider;
- env configuration.

GigaChat пока не добавлять.

---

## Классификация

Нужно определять:

- scenario
- sentiment
- priority
- topic
- product_area
- confidence

---

## В prompt передавать

- review text
- rating
- matched phrase
- available scenarios
- available sentiments

---

## Очень важно

Не делать свободный reasoning output.

Нужен:

- deterministic JSON contract;
- parsing;
- validation.

---

# 6. TemplateSelectionService

Реализовать selection logic:

```text
scenario + sentiment + priority
-> fallback
```

Fallback order:

1. scenario + sentiment + priority
2. scenario + sentiment
3. scenario only
4. generic safe template

---

# 7. ResponseGenerationService

## Реализовать draft generation

Использовать:

- review
- classification
- template
- prompt version

## Ограничение

Это:

```text
template-guided constrained generation
```

а не свободный AI chat.

---

## Сохранять

В `review_responses`:

- draft_response
- moderation_status = pending_review
- publication_status = not_published

---

# 8. Processing orchestration

## Реализовать простой synchronous flow

Без async workers.

Flow:

```text
review created
-> phrase matching
-> classification
-> template selection
-> draft generation
-> save results
```

---

# 9. Operational logging

Добавить базовые operational logs:

- review_received
- phrase_matching_completed
- classification_completed
- template_selected
- draft_generated
- pipeline_failed

---

# 10. API endpoints

Нужно реализовать:

```text
POST /api/reviews
GET  /api/reviews/{id}
GET  /health
```

---

# Что НЕ делать

Не реализовывать:

- Operator UI
- Admin UI
- analytics
- prompt editor
- evaluation UI
- RBAC
- auth
- queues
- async workers
- embeddings
- vector DB
- RAG
- observability UI

---

# Сессионный лог

Создать:

```text
docs/cursor_sessions/2026-05-25_cursor_task_002_milestone2_review_ingestion_pipeline.md
```

В начало вставить полный текст этого промпта.

Ниже зафиксировать:

- какие модели добавлены;
- какие endpoints реализованы;
- как работает pipeline;
- какие env нужны для OpenAI;
- как устроен matching;
- как устроен classification contract;
- какие ограничения введены;
- какие TODO остаются на Milestone 3.

---

# Формат ответа в чат

После выполнения:

- указать session log;
- указать:

```text
Milestone 2 completed
```

или

---

# Результат выполнения (Cursor, 2026-05-25)

## Infrastructure fix

| Сервис | Было | Стало |
|---|---|---|
| Backend | 8000 | **8700** |
| Frontend (host) | 5173 | **5180** (container internal 5173) |

Обновлены: `docker-compose.yml`, `backend/Dockerfile`, `.env.example`, `README.md`.

## ORM модели (SQLAlchemy 2.0)

`backend/app/models/entities.py`: Customer, ServiceCase, Review, ReviewPhrasePattern, ResponseTemplate, PromptVersion, ReviewClassification, ReviewResponse, OperationalLog.

## Endpoints

| Method | Path | Описание |
|---|---|---|
| GET | `/health` | DB connectivity check |
| POST | `/api/reviews` | Ingest + sync pipeline |
| GET | `/api/reviews/{id}` | Review detail + classification + draft |

## Pipeline flow

```text
POST /api/reviews
  -> get/create customer (by email)
  -> create service_case
  -> create review
  -> log: review_received
  -> commit ingestion
  -> PhraseMatchingService (rapidfuzz token_set_ratio)
  -> ClassificationService (OpenAI JSON or mock)
  -> TemplateSelectionService (4-level fallback)
  -> ResponseGenerationService (template-guided text)
  -> save classification + review_response
  -> operational logs
  -> return status: pending_review | failed
```

## OpenAI env

| Variable | Назначение |
|---|---|
| `OPENAI_API_KEY` | API key (пустой = mock mode) |
| `OPENAI_BASE_URL` | Default `https://api.openai.com/v1` |
| `OPENAI_MODEL` | Default `gpt-4o-mini` |
| `PHRASE_MATCH_THRESHOLD` | Default `55` (0–100 scale) |

Без `OPENAI_API_KEY` используется heuristic mock (classification JSON + draft text).

## Phrase matching

- Библиотека: `rapidfuzz.fuzz.token_set_ratio`
- Порог: `PHRASE_MATCH_THRESHOLD` (default 55)
- `score >= threshold` → `classification_source=phrase_match`, `needs_phrase_review=false`
- иначе → `classification_source=llm_fallback`, `needs_phrase_review=true`

## Classification contract

Pydantic `ClassificationResult`:

```json
{
  "scenario": "complaint|gratitude|suggestion|question",
  "sentiment": "positive|neutral|negative|aggressive",
  "priority": "low|medium|high|critical",
  "topic": "string",
  "product_area": "string",
  "confidence": 0.0-1.0
}
```

OpenAI: `response_format=json_object`. При `phrase_match` поля scenario/sentiment/topic/priority могут усиливаться из matched pattern.

## Ограничения (соблюдены)

- Sync pipeline, без Celery/Redis/queues
- Без Operator/Admin UI, RBAC, RAG, embeddings
- Без repository/UoW/CQRS abstractions
- Template-guided generation (не free-form chat)

## Verification

```bash
curl http://localhost:8700/health
# {"status":"ok","database":"connected"}

curl -X POST http://localhost:8700/api/reviews -H "Content-Type: application/json" \
  -d '{"customer_name":"Иван","email":"ivan@test.com","service_case_title":"Заказ #1001","product_area":"logistics","rating":2,"review_text":"опять задержали доставку"}'
# status: pending_review, phrase_match score 1.0

curl http://localhost:5180/review  # HTTP 200
```

Operational logs: review_received → phrase_matching_completed → classification_completed → template_selected → draft_generated.

## TODO Milestone 3

- Operator UI `/operator/reviews`
- Moderation workflow (edit/approve/reject)
- Mock publication + client status page
- Role-based access (simple)

## Operator commands

```bash
cd /opt/review-flow
docker compose up --build -d
curl http://localhost:8700/health
curl -X POST http://localhost:8700/api/reviews -H "Content-Type: application/json" -d '{...}'
open http://localhost:5180/review
docker compose ps
git status
```

## Git status

Изменения не закоммичены (commit не запрашивался).