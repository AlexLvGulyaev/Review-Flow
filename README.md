# Review Flow

AI-ассистент для работы с отзывами клиентов: template-guided workflow, human-in-the-loop moderation, versioned prompts, analytics и operational observability.

## Project overview

Review Flow — учебно-портфельный web-прототип для обработки клиентских отзывов:

- клиент отправляет отзыв;
- система классифицирует и формирует draft-ответ по шаблону;
- оператор модерирует и публикует mock-ответ;
- администратор управляет промптами и оценивает качество;
- аналитика и логи доступны для демонстрации lifecycle.

## UI contours (architecture)

Система проектируется с **разделением интерфейсов** (см. SOT §4.6 и [UI contour plan](docs/architecture/ui_contour_separation_plan.md)):

| Контур | Аудитория | Назначение |
|--------|-----------|------------|
| **Клиентский** | Покупатель / пользователь сервиса | Customer-facing сайт компании: оставить отзыв, проверить статус |
| **Контур компании — оператор** | Сотрудник поддержки | Очередь отзывов, модерация, mock publication |
| **Контур компании — администратор** | Админ / методолог | Промпты, evaluation, analytics, logs, AI providers, knowledge base |

Текущий MVP: одно React-приложение с role selector; целевое состояние — визуально раздельные client site и company workspace (следующий UI milestone).

## Architecture

```text
Client contour (/review) → FastAPI pipeline → PostgreSQL
                              ↓
                    phrase match → classification → template → generation
                              ↓
Company contour: Operator (/operator/reviews) → moderation → mock publication
Company contour: Admin (/prompts, /evaluation, /settings/ai-providers, /admin/*)
Observability (/analytics, /logs) → aggregates + operational_logs
```

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, React Router |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2.0 |
| Database | PostgreSQL 16 |
| AI | OpenAI-compatible API (mock fallback без ключа) |
| Deploy | Docker Compose |

## Setup

```bash
cp .env.example .env
# опционально: OPENAI_API_KEY=sk-...
docker compose up --build -d
```

## Local run

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost:5180 |
| Backend API | http://localhost:8700 |
| Health | http://localhost:8700/health |
| Postgres | internal (docker network) |

### Frontend routes (текущий MVP)

| Route | Контур | Назначение |
|-------|--------|------------|
| `/` | Клиентский | Главная страница компании (demo) |
| `/review` | Клиентский | Форма отправки отзыва |
| `/review/status` | Клиентский | Форма поиска статуса |
| `/review/status/:requestNumber` | Клиентский | Статус обращения (по номеру обращения) |
| `/company` | Компания | Entry point в рабочее пространство (redirect по роли) |
| `/operator/reviews` | Компания (operator) | Очередь оператора |
| `/prompts` | Компания (admin) | Управление промптами |
| `/evaluation` | Компания (admin) | Ручная оценка качества |
| `/analytics` | Компания (admin) | Сводная аналитика |
| `/logs` | Компания (admin) | Operational logs |
| `/settings/ai-providers` | Компания (admin) | Настройки AI-провайдеров |
| `/admin/phrases`, `/admin/templates`, … | Компания (admin) | Knowledge base |

### API (основное)

```bash
POST /api/reviews
GET  /api/reviews/requests/{request_number}/status?email=...
GET  /api/reviews/{id}/status
GET  /api/operator/reviews
POST /api/operator/reviews/{id}/approve
GET  /api/prompts
POST /api/prompts/{id}/activate
GET  /api/analytics/overview
GET  /api/logs
```

## Demo workflow

1. Отправить отзыв на `/review` (форма просит **номер заказа**)
2. Проверить pipeline в `/logs`
3. Модерировать в `/operator/reviews` → Approve
4. Клиент видит ответ на `/review/status/:requestNumber` (по номеру обращения)
5. Создать/активировать prompt на `/prompts`
6. Добавить evaluation case на `/evaluation`
7. Посмотреть метрики на `/analytics`

Подробнее: [docs/demo_scenarios.md](docs/demo_scenarios.md)

## Operational lifecycle

- **Ingestion** — customer, service_case, review
- **AI pipeline** — phrase matching, classification, template selection, draft generation (DB prompts)
- **Moderation** — pending_review → approved/rejected/needs_revision
- **Publication** — mock publication для клиента
- **Prompt management** — versioned prompts per `prompt_key`
- **Evaluation** — manual operator score 1–5
- **Observability** — `operational_logs` с `latency_ms` и metadata

## Screenshots

<!-- Placeholder: добавьте скриншоты demo в docs/screenshots/ -->

- `docs/screenshots/` — placeholders для портфолио

## Documentation

- SOT: `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`
- Plan: `IMPLEMENTATION_PLAN.md`
- [UI contour separation plan](docs/architecture/ui_contour_separation_plan.md)
- [User guide](docs/user_guide.md)
- [Demo scenarios](docs/demo_scenarios.md)

## Environment

См. `.env.example`:

- `POSTGRES_*`, `DATABASE_URL`
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `VITE_API_URL`, `PHRASE_MATCH_THRESHOLD`

Migrations применяются автоматически при старте backend.
