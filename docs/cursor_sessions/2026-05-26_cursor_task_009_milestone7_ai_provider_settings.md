# Session log: Cursor Task 009 — Milestone 7 AI provider settings

## Исходный промпт (полный текст)

# Cursor Task 009 — Milestone 7 AI provider settings and runtime switching

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

После UI smoke test и ProtectedRoute polish проект стабилен как multi-contour operational prototype.

Теперь задача — Milestone 7:

```text
AI provider settings + runtime switching
```

Цель:
научить систему выбирать активного AI provider/model через настройки в админке,
не редактируя код и не пересобирая контейнеры.

---

# Главный принцип

Секреты НЕ хранятся в БД и НЕ редактируются через UI.

Правильная модель:

```text
.env хранит credentials/base URLs
Admin settings выбирает active provider/model/profile
Pipeline читает effective settings из БД + env
```

---

# Что должно получиться

Администратор в UI может выбрать:

- active provider:
  - mock
  - openai
  - proxyapi
  - gigachat
- active model;
- fallback provider;
- temperature;
- max_tokens;
- enabled/disabled для provider profile.

Pipeline использует эти настройки runtime.

---

# Жёсткие ограничения

НЕ делать:

- хранение API keys в БД;
- ввод API keys в UI;
- secrets editor;
- vault;
- encryption layer;
- OAuth;
- billing dashboard;
- async workers;
- queues;
- RAG/vector DB;
- embeddings;
- complex provider marketplace;
- streaming responses.

Разрешено:

- хранить non-secret provider config в БД;
- читать secrets/base URLs из env;
- добавить health/check endpoint;
- fallback to mock при недоступном provider;
- логировать provider selection и errors.

---

# 1. Database: AI provider settings

Добавить таблицу:

```text
ai_provider_settings
```

Минимальные поля:

| field | type |
|---|---|
| id | uuid |
| provider_key | text |
| display_name | text |
| model_name | text |
| base_url_env_key | text nullable |
| api_key_env_key | text nullable |
| is_enabled | boolean |
| is_active | boolean |
| is_fallback | boolean |
| temperature | numeric nullable |
| max_tokens | integer nullable |
| created_at | timestamp |
| updated_at | timestamp |

---

## Provider keys

Минимально поддержать:

```text
mock
openai
proxyapi
gigachat
```

---

## Seeds

Создать seed rows:

### mock

```text
provider_key=mock
display_name=Mock provider
model_name=mock-local
is_enabled=true
is_active=true
is_fallback=true
```

### openai

```text
provider_key=openai
display_name=OpenAI
model_name=gpt-4o-mini
api_key_env_key=OPENAI_API_KEY
base_url_env_key=OPENAI_BASE_URL
is_enabled=false
is_active=false
```

### proxyapi

```text
provider_key=proxyapi
display_name=ProxyAPI OpenAI-compatible
model_name=gpt-4o-mini
api_key_env_key=PROXYAPI_KEY
base_url_env_key=PROXYAPI_BASE_URL
is_enabled=false
is_active=false
```

### gigachat

```text
provider_key=gigachat
display_name=GigaChat
model_name=gigachat
api_key_env_key=GIGACHAT_API_KEY
base_url_env_key=GIGACHAT_BASE_URL
is_enabled=false
is_active=false
```

---

# 2. Effective settings service

Создать сервис:

```text
AIProviderSettingsService
```

Он должен:

- получить active provider;
- получить fallback provider;
- проверить enabled flag;
- прочитать env по `api_key_env_key` и `base_url_env_key`;
- собрать effective runtime config;
- не возвращать secret values в API responses;
- отдавать redacted readiness info.

---

# 3. Provider abstraction

Проверить или создать abstraction:

```text
AIProvider
```

или аналогичный layer.

Минимальные методы:

```text
classify_review(...)
generate_response(...)
```

---

## Provider implementations

Минимально:

- MockProvider — уже существующая/локальная логика;
- OpenAICompatibleProvider — для openai/proxyapi;
- GigaChatProvider — можно сделать stub/placeholder, если полноценная интеграция требует отдельной настройки.

---

## Важно

Если GigaChat полноценная интеграция уже есть — использовать её.
Если нет — не делать большую интеграцию в этом milestone.

Сделать безопасный placeholder:

```text
provider configured but not implemented
```

и fallback to mock.

---

# 4. Runtime provider switching

ClassificationService и ResponseGenerationService должны использовать:

```text
AIProviderSettingsService → AIProviderFactory → selected provider
```

а не hardcoded mock/openai branch.

---

## Fallback policy

Если active provider:

- disabled;
- не имеет env secret;
- падает на вызове;
- not implemented;

то:

1. записать operational log:
   - `ai_provider_error`
   - `ai_provider_fallback_used`
2. использовать fallback provider, если он enabled;
3. если fallback недоступен — вернуть controlled error.

---

# 5. Backend API

Добавить endpoints:

```text
GET  /api/settings/ai-providers
GET  /api/settings/ai-providers/effective
PATCH /api/settings/ai-providers/{provider_key}
POST /api/settings/ai-providers/{provider_key}/activate
POST /api/settings/ai-providers/{provider_key}/set-fallback
POST /api/settings/ai-providers/{provider_key}/test
```

---

## GET list

Вернуть provider settings без secrets.

Поля:

- provider_key;
- display_name;
- model_name;
- is_enabled;
- is_active;
- is_fallback;
- temperature;
- max_tokens;
- api_key_configured: boolean;
- base_url_configured: boolean;
- implementation_status.

---

## GET effective

Вернуть:

- active provider;
- fallback provider;
- effective model;
- readiness;
- missing env keys;
- no secrets.

---

## PATCH provider

Позволить менять:

- display_name;
- model_name;
- is_enabled;
- temperature;
- max_tokens.

НЕ позволять менять:

- api key value;
- base url value.

Env key names можно менять только если это уже предусмотрено архитектурой и безопасно. Если нет — оставить read-only.

---

## POST activate

Деактивировать previous active.
Активировать выбранный provider.

Если provider disabled — вернуть 400 с понятной ошибкой.

---

## POST set-fallback

Сделать provider fallback.

Если provider disabled — вернуть 400.

---

## POST test

Проверить readiness:

- env present;
- implementation available;
- если возможно — lightweight provider call;
- не делать дорогой generation.

Для mock всегда OK.

---

# 6. Frontend: AI settings page

Создать страницу:

```text
/settings/ai-providers
```

Доступ:
administrator only.

---

## UI blocks

### Provider cards/table

Показать:

- provider;
- model;
- enabled;
- active;
- fallback;
- api key configured;
- base URL configured;
- implementation status.

---

### Edit panel

Для выбранного provider:

- model_name;
- enabled;
- temperature;
- max_tokens.

---

### Actions

- save settings;
- activate;
- set fallback;
- test provider.

---

### Effective settings block

Показать:

- active provider;
- fallback provider;
- readiness;
- missing env keys;
- warnings.

---

# 7. Navigation

Добавить ссылку для administrator:

```text
AI settings
```

или:

```text
AI providers
```

в admin navigation.

---

# 8. .env.example

Обновить `.env.example`.

Добавить:

```text
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-4o-mini

PROXYAPI_KEY=
PROXYAPI_BASE_URL=https://api.proxyapi.ru/openai/v1

GIGACHAT_API_KEY=
GIGACHAT_BASE_URL=
```

Не добавлять реальные значения.

---

# 9. Operational logs

Добавить события:

- ai_provider_settings_updated
- ai_provider_activated
- ai_provider_fallback_changed
- ai_provider_tested
- ai_provider_error
- ai_provider_fallback_used

---

# 10. Verification

Проверить:

1. migrations apply;
2. seed provider settings exist;
3. `/api/settings/ai-providers` returns redacted settings;
4. `/api/settings/ai-providers/effective` works;
5. UI `/settings/ai-providers` opens for administrator;
6. client/operator roles do not access AI settings page;
7. mock provider active by default;
8. activate disabled provider returns clear error;
9. enabling provider without env shows missing env warning;
10. fallback to mock works when provider not configured;
11. generation_metadata includes provider/model from effective settings;
12. operational logs written.

---

# Что НЕ делать

Не реализовывать:

- secrets UI;
- real key storage;
- billing;
- streaming;
- embeddings;
- vector DB;
- RAG;
- complex GigaChat integration if not already present;
- provider marketplace.

---

# Архитектурная цель milestone

К концу Milestone 7 система должна поддерживать:

```text
runtime AI provider control
```

с:

- env-based secrets;
- DB-based non-secret settings;
- admin provider switching;
- safe fallback;
- traceable generation metadata;
- operational logs.

---

# Сессионный лог

Создать файл:

```text
docs/cursor_sessions/2026-05-26_cursor_task_009_milestone7_ai_provider_settings.md
```

В начало файла вставить полный текст этого промпта.

Ниже зафиксировать:

- schema changes;
- provider settings service;
- provider abstraction/factory;
- runtime switching;
- fallback policy;
- frontend page;
- env example changes;
- operational logs;
- verification;
- known limitations;
- TODO.

---

# Формат ответа в чат

После выполнения написать:

```text
Session log: docs/cursor_sessions/2026-05-26_cursor_task_009_milestone7_ai_provider_settings.md
Status: Milestone 7 completed
```

или:

```text
Status: Milestone 7 blocked
Reason: ...
```

---

## Выполнение

### Schema changes

- Migration `backend/migrations/006_milestone7_ai_provider_settings.sql`
- Table `ai_provider_settings` + seed rows: mock (active+fallback), openai, proxyapi, gigachat
- ORM `AIProviderSetting` in `entities.py`

### Provider settings service

- `AIProviderSettingsService` — list, effective overview, patch, activate, set-fallback, test
- Secrets read from env via `api_key_env_key` / `base_url_env_key` only; never returned in API
- `api_key_configured`, `base_url_configured`, `implementation_status` in list response

### Provider abstraction / factory

- `AIProvider` base + `MockProvider`, `OpenAICompatibleProvider` (openai/proxyapi), `GigaChatProvider` (stub)
- `AIProviderFactory`, `AIProviderRuntime` with fallback policy and operational logs

### Runtime switching

- `ReviewPipeline` → `AIProviderRuntime.resolve()` → `ClassificationService` / `ResponseGenerationService`
- `generation_metadata`: `provider`, `model`, `used_fallback`, `requested_provider`
- Events: `ai_provider_error`, `ai_provider_fallback_used`

### Backend API

- `GET/PATCH /api/settings/ai-providers`
- `GET /api/settings/ai-providers/effective`
- `POST .../activate`, `.../set-fallback`, `.../test`
- Admin-only (`require_admin`)

### Frontend

- `/settings/ai-providers` — `AiProvidersPage.jsx` (cards, edit, activate, fallback, test, effective block)
- Nav link «AI settings» for administrator

### Env example

- Updated `.env.example` and `docker-compose.yml` with PROXYAPI_*, GIGACHAT_*

### Operational logs

- `ai_provider_settings_updated`, `ai_provider_activated`, `ai_provider_fallback_changed`, `ai_provider_tested`, `ai_provider_error`, `ai_provider_fallback_used`

### Verification

```bash
docker compose up --build -d
GET /api/settings/ai-providers (admin) → 4 providers, mock active
GET /api/settings/ai-providers/effective → readiness ready
GET as client → 403
POST activate openai (disabled) → 400
POST test mock → ok
POST /api/reviews → pending_review; generation_metadata provider=mock
POST activate gigachat (enabled) → 400 not implemented
```

### Known limitations

- GigaChat — placeholder only (`not_implemented`), safe fallback to mock
- `LLMClient` retained but unused by pipeline (legacy)
- OpenAI test calls `models.list` (lightweight ping)
- No secrets in UI/DB

### TODO

- Full GigaChat HTTP integration
- Optional: remove deprecated `LLMClient` after cleanup
- Playwright smoke for AI settings page
- Per-provider request timeout/retry tuning

API version: `0.7.0`.
