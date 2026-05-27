# Session log: Cursor Task 011 — GigaChat provider and smoke

## Исходный промпт (полный текст)

# Cursor Task 011 — Full GigaChat provider integration and multi-provider smoke test

## Контекст

Проект: `review-flow`.

Milestone 7 добавил AI provider settings/runtime switching:
- mock;
- openai;
- proxyapi;
- gigachat.

После Task 010 GigaChat env semantics исправлены:
- `.env.example` использует корректные GigaChat variables;
- GigaChat честно отображается как `stub/not_implemented`;
- GigaChat не активируется как будто он OpenAI-compatible provider.

Теперь нужно сделать следующий шаг:

```text
реализовать полноценный GigaChat provider
```

и затем провести smoke test всех провайдеров:

- mock;
- openai;
- gigachat;
- proxyapi.

---

# Важный бизнес-контекст

Оператору важно использовать:

- OpenAI;
- GigaChat.

ProxyAPI использовать осторожно:
- только для smoke test;
- без лишних платных вызовов;
- не делать его default;
- не делать его fallback по умолчанию.

---

# Главная цель

Сделать GigaChat рабочим runtime provider в общей provider architecture:

```text
AIProviderSettingsService → AIProviderFactory → AIProviderRuntime → GigaChatProvider
```

GigaChat должен поддерживать:

- `classify_review(...)`;
- `generate_response(...)`.

---

# Env model

Использовать существующую env-схему:

```env
GIGACHAT_CLIENT_ID=
GIGACHAT_CLIENT_SECRET=
GIGACHAT_AUTH_KEY=
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_MODEL=GigaChat-Max
GIGACHAT_MAX_TOKENS=500
```

Правила:

- secrets НЕ хранить в БД;
- secrets НЕ показывать в UI;
- secrets НЕ логировать;
- `.env.example` — только пустые placeholder values;
- если используется `GIGACHAT_AUTH_KEY`, не выводить его значение в logs/errors.

---

# Жёсткие ограничения

НЕ делать:

- secrets editor в UI;
- хранение GigaChat token в БД;
- billing dashboard;
- streaming;
- embeddings;
- RAG;
- async queues;
- retries с большим числом повторов;
- expensive test calls;
- provider marketplace;
- большой redesign settings page.

Разрешено:

- реализовать token exchange/client;
- кэшировать access token in-memory с TTL, если это просто;
- добавить timeout;
- добавить controlled errors;
- добавить lightweight provider test;
- обновить readiness/status UI;
- обновить logs.

---

# 1. Изучить текущую provider architecture

Перед изменениями найти и понять:

- `AIProvider`
- `AIProviderFactory`
- `AIProviderRuntime`
- `MockProvider`
- `OpenAICompatibleProvider`
- текущий `GigaChatProvider` stub
- `AIProviderSettingsService`
- schemas for provider settings
- `/settings/ai-providers` UI

Не ломать существующую OpenAI/ProxyAPI логику.

---

# 2. Реализовать GigaChatProvider

Файл может быть:

```text
backend/app/services/ai_providers/gigachat_provider.py
```

или текущий существующий файл.

Provider должен реализовать общий интерфейс:

```text
classify_review(...)
generate_response(...)
```

---

## 2.1 Auth/token

Реализовать авторизацию через имеющиеся env-переменные.

Ожидаемая модель:

- использовать `GIGACHAT_AUTH_KEY`, если текущая архитектура Assistant Flow уже использует его как готовый Authorization credential;
- использовать `GIGACHAT_SCOPE`;
- модель брать из:
  - settings `model_name`, если задан;
  - иначе `GIGACHAT_MODEL`;
  - иначе fallback `GigaChat-Max`;
- max tokens брать из:
  - provider settings `max_tokens`, если задан;
  - иначе `GIGACHAT_MAX_TOKENS`;
  - иначе 500.

Если для конкретной реализации требуется token exchange:
- сделать отдельный приватный метод;
- не логировать credential;
- использовать timeout;
- возвращать controlled error при auth failure.

---

## 2.2 HTTP client

Использовать существующий HTTP stack проекта, если он уже есть.

Если нет — можно использовать `httpx`.

Требования:

- timeout;
- controlled exception handling;
- no secret leakage;
- concise error messages;
- operational logs через existing logging service/runtime.

---

## 2.3 Classification

`classify_review(...)` должен возвращать структуру, совместимую с текущим `ClassificationService`.

Если GigaChat возвращает текст:
- попросить модель вернуть JSON;
- parse JSON defensively;
- fallback/controlled error при invalid JSON;
- не ломать pipeline.

Не делать сложный repair layer.

---

## 2.4 Generation

`generate_response(...)` должен возвращать draft response string, совместимый с текущим `ResponseGenerationService`.

Использовать:

- active prompt;
- rendered user prompt;
- selected template;
- classification context;
- review data.

---

# 3. Readiness semantics

После реализации GigaChat больше не должен быть `not_implemented`.

Readiness logic:

## Ready

Если:

- provider implementation exists;
- required env присутствуют;
- provider enabled.

## Not ready

Если:

- missing required env;
- auth fails;
- test call fails.

UI/API должны показывать:

- implementation_status = implemented;
- credentials_check_applicable = true;
- api_key_configured или equivalent readiness flag;
- related env keys без значений.

---

# 4. Provider settings behavior

Проверить:

- GigaChat можно enable;
- после enable можно test;
- после successful test можно activate;
- fallback можно оставить mock;
- при ошибке GigaChat runtime должен fallback to mock, если mock fallback enabled.

Не делать GigaChat fallback по умолчанию.

---

# 5. Backend API checks

Проверить endpoints:

```text
GET  /api/settings/ai-providers
GET  /api/settings/ai-providers/effective
PATCH /api/settings/ai-providers/gigachat
POST /api/settings/ai-providers/gigachat/test
POST /api/settings/ai-providers/gigachat/activate
```

Expected:

- before env/enable: not ready with clear missing env;
- after env + enable: test can run;
- after activate: effective provider = gigachat;
- no secrets returned.

---

# 6. Frontend update

На `/settings/ai-providers`:

- убрать stub-only messaging для GigaChat;
- показывать status implemented/ready/not_ready;
- показывать related env keys без значений;
- allow enable/test/activate when implementation exists;
- keep clear warnings for missing env/auth error.

Не делать redesign.

---

# 7. Multi-provider smoke test

После реализации выполнить smoke test.

---

## 7.1 Baseline

```bash
docker compose up --build -d
curl http://localhost:8700/health
curl -H "X-Role: administrator" http://localhost:8700/api/settings/ai-providers
```

---

## 7.2 Mock smoke

- ensure mock enabled;
- activate mock;
- submit review;
- confirm pipeline works;
- confirm `generation_metadata.provider=mock`.

---

## 7.3 OpenAI smoke

Only if `OPENAI_API_KEY` exists.

Steps:

- enable openai;
- test openai;
- activate openai;
- submit one review;
- confirm classification/generation completed;
- confirm `generation_metadata.provider=openai`;
- confirm fallback not used unless error.

Limit to 1 actual review call.

---

## 7.4 GigaChat smoke

Only if GigaChat env exists.

Steps:

- enable gigachat;
- test gigachat;
- activate gigachat;
- submit one review;
- confirm classification/generation completed;
- confirm `generation_metadata.provider=gigachat`;
- confirm fallback not used unless error;
- if fallback used, inspect operational logs and fix if implementation bug.

Limit to 1 actual review call unless debugging is required.

---

## 7.5 ProxyAPI smoke

ProxyAPI is cost-sensitive.

Only if `PROXYAPI_KEY` exists and operator explicitly wants the check.

If run:

- enable proxyapi;
- test proxyapi;
- activate proxyapi;
- submit one very short review;
- confirm metadata;
- then restore active provider to preferred provider.

Limit to 1 actual review call.

---

# 8. Preferred final state

After smoke tests, set final active provider to:

```text
gigachat
```

if GigaChat smoke passes.

Fallback:

```text
mock
```

If GigaChat fails but OpenAI passes:

```text
active=openai
fallback=mock
```

If both fail:

```text
active=mock
fallback=mock
```

Do not leave ProxyAPI active by default.

---

# 9. Operational logs

Ensure logs for:

- ai_provider_tested;
- ai_provider_activated;
- ai_provider_error;
- ai_provider_fallback_used;
- review pipeline events with provider metadata.

No secret values in logs.

---

# 10. Verification output

In session log, include:

- whether GigaChat implementation is complete;
- env keys checked, names only;
- provider test results;
- smoke results for mock/openai/gigachat/proxyapi;
- final active provider;
- final fallback provider;
- any known limitations.

---

# Что НЕ делать

Не делать:

- billing/cost tracking;
- retry storms;
- more than minimal smoke calls;
- secret printing;
- ProxyAPI as default;
- RAG/embeddings;
- streaming;
- full evaluation run for every provider.

---

# Сессионный лог

Создать файл:

```text
docs/cursor_sessions/2026-05-26_cursor_task_011_gigachat_provider_and_smoke.md
```

В начало файла вставить полный текст этого промпта.

Ниже зафиксировать:

- GigaChat implementation details;
- changed files;
- provider readiness changes;
- smoke test commands/results;
- final provider state;
- operational logs;
- known limitations;
- TODO.

---

# Формат ответа в чат

После выполнения написать:

```text
Session log: docs/cursor_sessions/2026-05-26_cursor_task_011_gigachat_provider_and_smoke.md
Status: GigaChat provider implemented and smoke tested
```

или:

```text
Status: GigaChat provider blocked
Reason: ...
```

---

## Выполнение

### GigaChat implementation

- `gigachat_auth.py` — OAuth `POST https://ngw.devices.sberbank.ru:9443/api/v2/oauth` с `Authorization: Basic` из `GIGACHAT_AUTH_KEY` или base64(`CLIENT_ID:CLIENT_SECRET`); in-memory token cache (~25 min TTL); `httpx` + timeout; `verify=False` для Sber TLS.
- `gigachat_provider.py` — `complete_json` / `complete_text` через `POST .../api/v1/chat/completions`; defensive JSON parse; lightweight `test_connection` (OAuth only).
- `factory.py`: `gigachat` → `implemented`.
- `AIProviderSettingsService`: readiness по `GIGACHAT_AUTH_KEY` или client id/secret; без stub bypass.

### Changed files

- `backend/app/services/ai_providers/gigachat_auth.py` (new)
- `backend/app/services/ai_providers/gigachat_provider.py`
- `backend/app/services/ai_provider_gigachat.py`
- `backend/app/services/ai_provider_settings.py`
- `backend/app/services/ai_providers/factory.py`
- `frontend/src/pages/AiProvidersPage.jsx`
- `.env.example`
- `backend/app/main.py` (v0.7.1)

### Provider readiness

- `implementation_status=implemented`
- `credentials_check_applicable=true`
- Ready when `GIGACHAT_AUTH_KEY` (or CLIENT_ID+SECRET) present and enabled
- Activate/test allowed; not_implemented guard removed for GigaChat

### Smoke test results (env key names only)

| Provider | Env present | Test | Review pipeline | metadata.provider |
|----------|-------------|------|-----------------|-------------------|
| mock | n/a | ok | ok | mock |
| openai | OPENAI_API_KEY | ok | ok | openai |
| gigachat | GIGACHAT_AUTH_KEY | OAuth ok | ok | gigachat / GigaChat-Max |
| proxyapi | PROXYAPI_KEY | ok | ok (1 call) | proxyapi |

### Final provider state

- **active:** `gigachat` (GigaChat smoke passed)
- **fallback:** `mock`
- ProxyAPI disabled after smoke (`is_enabled=false`); not left active

### Operational logs

- `ai_provider_tested`, `ai_provider_activated`, pipeline events with `provider_key` in metadata
- No secret values in logs/errors

### Known limitations

- Token cache in-process only (restarts clear cache)
- `verify=False` for GigaChat TLS (Sber CA)
- No streaming / retries / billing
- `GIGACHAT_CLIENT_ID` optional if `GIGACHAT_AUTH_KEY` set

### TODO

- Persistent token cache optional
- stricter TLS if corporate CA bundle available
- Reduce ProxyAPI smoke to test-only in CI
