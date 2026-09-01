# 🔌 API_CONTRACT.md — Review Flow Backend

**Проект:** review-flow  
**Версия API:** `0.7.1`  
**Дата актуализации:** 2026-08-09  
**Статус:** Актуален. Покрывает создание обращений, классификацию, операторскую модерацию, администрирование базы знаний, аналитику, отчёты и настройки AI-провайдеров.

---

## 📌 1. Общие соглашения

### 1.1 Базовые URL

| Среда | URL |
|---|---|
| Локальная разработка (Docker Compose) | `http://localhost:8700` |
| Публичный demo | `https://review-flow-api.alex-n8n.site` |

Все пути из этого документа добавляются к базовому URL.

### 1.2 Формат обмена

- Все ответы — `application/json`, кроме endpoints экспорта отчётов, которые возвращают бинарные файлы.
- Для запросов с телом обязательно передавать:

```http
Content-Type: application/json
```

### 1.3 Даты и идентификаторы

- Даты возвращаются в формате ISO 8601 с UTC-оффсетом: `2026-08-09T14:32:11.123456+00:00`.
- `review_id`, `case_id`, `example_id`, `prompt_id` и другие внутренние ID — UUID v4 (строка).
- `request_number` — отображаемый номер обращения для клиента, формируется автоматически на основе `order_number` и внутреннего порядкового номера.

### 1.4 Пагинация

Классическая пагинация в API отсутствует. List-эндпоинты возвращают ограниченный набор (обычно последние 100 записей) и/или поддерживают фильтры через query-параметры.

---

## 🔐 2. Аутентификация и ролевая модель

Review Flow использует два независимых механизма защиты:

1. **Ops/admin консоль — Bearer-токены (read-only demo RBAC).** Когда в окружении задан `OPS_ADMIN_TOKEN`, все ops-эндпоинты требуют заголовок `Authorization: Bearer <token>`. Роль выводится из токена: `administrator` / `operator` / `demo`. Роль `demo` — **только чтение**: мутации (POST/PATCH/PUT/DELETE) отклоняются с `403` и фиксируются в операционном логе.
2. **Публичный клиентский контур — tokenized demo sessions.** Когда `DEMO_LIMITER_ENABLED=true`, дорогой эндпоинт `POST /api/reviews` требует заголовок `X-Demo-Token`, выпущенный `POST /api/demo/start`, и списывает пер-сессионную квоту с rate-limit и IP-лимитом. Дешёвые GET status/detail остаются открытыми.

### 2.1 Роли

| Роль | Источник | Доступ |
|---|---|---|
| Клиент | публичный (без токена) | публичные эндпоинты создания и проверки статуса |
| Оператор | `OPS_OPERATOR_TOKEN` (Bearer) | операторская очередь и модерация |
| Администратор | `OPS_ADMIN_TOKEN` (Bearer) | все эндпоинты, включая администрирование, аналитику, настройки |
| Демо | `OPS_DEPS_TOKEN` (`OPS_DEMO_TOKEN`, Bearer) | **только чтение** ops-консоли; мутации отклоняются |

### 2.2 Заголовки

| Заголовок | Контур | Назначение |
|---|---|---|
| `Authorization: Bearer <token>` | ops/admin | Авторизация ops-пользователя. Валидируется через `GET /api/auth/whoami`. |
| `X-Demo-Token <token>` | публичный | Демо-сессия для `POST /api/reviews` (только при `DEMO_LIMITER_ENABLED=true`). |
| `X-Role <role>` | fallback (dev) | Используется только когда `OPS_ADMIN_TOKEN` не задан (локальная разработка/тесты). В продакшене игнорируется. |

> **Обратная совместимость:** если `OPS_ADMIN_TOKEN` пуст (или начинается с `YOUR`), ops-аутентификация считается выключенной и роль берётся из заголовка `X-Role` (legacy). Это сохраняет работоспособность локальной разработки и существующих тестов. В продакшене токены обязательны.

### 2.3 Коды аутентификации

| Статус | Когда возникает |
|---|---|
| `401 Unauthorized` | Ops-токен отсутствует (продакшен); `WWW-Authenticate: Bearer`. Демо-сессия истекла (`X-Demo-Token`). |
| `403 Forbidden` | Недействительный ops-токен; роль не допущена (напр. `demo` на мутации); `X-Demo-Token` отсутствует при включённом лимитере. |
| `429 Too Many Requests` | Превышен IP-лимит демо-сессий, rate-limit сессии или исчерпана квота (`Retry-After` на rate-limit). |

---

## 📊 3. Общие HTTP-статусы и формат ошибок

| Статус | Когда возникает | Тело ответа |
|---|---|---|
| `200 OK` | Успешный GET/POST/PATCH | См. схему эндпоинта |
| `201 Created` | Успешное создание ресурса | См. схему эндпоинта |
| `204 No Content` | Успешное действие без тела | Пустое тело |
| `400 Bad Request` | Невалидное тело или параметры | `{"detail": "..."}` |
| `401 Unauthorized` | Ops-токен отсутствует / демо-сессия истекла | `{"detail": "..."}`, `WWW-Authenticate: Bearer` |
| `403 Forbidden` | Недействительный токен / недостаточно прав для роли / нет `X-Demo-Token` | `{"detail": "Access denied for role '...'"}` |
| `404 Not Found` | Ресурс не найден | `{"detail": "..."}` |
| `409 Conflict` | Конфликт (например, дублирование кода) | `{"detail": "..."}` |
| `422 Unprocessable Entity` | Ошибка валидации Pydantic | `{"detail": [...]}` |
| `429 Too Many Requests` | Превышен лимит демо-сессий | `{"detail": "..."}`, `Retry-After` |
| `500 Internal Server Error` | Внутренняя ошибка сервера | `{"detail": "Internal server error"}` |
| `503 Service Unavailable` | База данных недоступна | `{"detail": "Database unavailable"}` |

Пример ошибки валидации (`422`):

```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "customer_name"],
      "msg": "Field required",
      "input": null
    }
  ]
}
```

---

## ❤️ 4. Health

Базовый префикс: `/health`.  
Роль: публичный, `X-Role` не требуется.

### `GET /health`

Проверка доступности API и подключения к базе данных.

- **Параметры:** отсутствуют.
- **Тело запроса:** отсутствует.
- **Ответ:** `200 OK`

| Поле | Тип | Описание |
|---|---|---|
| `status` | `string` | всегда `"ok"` |
| `database` | `string` | `"connected"` или сообщение об ошибке |

```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## 🔑 4a. Auth — валидация ops-токена

Базовый префикс: `/api/auth`.

### `GET /api/auth/whoami`

Возвращает авторитетную роль по предъявленному ops-токену (или X-Role fallback). Используется frontend-консолью для валидации введённого токена и определения read-only demo-режима.

- **Заголовки:** `Authorization: Bearer <ops_token>` (продакшен) либо `X-Role` (dev fallback).
- **Тело запроса:** отсутствует.
- **Ответ:** `200 OK`

| Поле | Тип | Описание |
|---|---|---|
| `role` | `string` | `administrator` / `operator` / `demo` / `client` |

```json
{ "role": "administrator" }
```

- **Ошибки:** `401` (токен отсутствует в продакшене, `WWW-Authenticate: Bearer`), `403` (недействительный токен).

---

## 🔒 4b. Demo — публичные демо-сессии (tokenized demo limiter)

Базовый префикс: `/api/demo`. Доступны только при `DEMO_LIMITER_ENABLED=true` (иначе `POST /api/demo/start` возвращает `403`).

### `POST /api/demo/start`

Выпускает новую демо-сессию с квотой, rate-limit и TTL. Токен передаётся как `X-Demo-Token` в `POST /api/reviews`.

- **Тело запроса:**

| Поле | Тип | Описание |
|---|---|---|
| `session_id` | `string?` | Необязательный клиентский идентификатор сессии (≤255). |

```json
{ "session_id": "550e8400-e29b-41d4-a716-446655440000" }
```

- **Ответ:** `200 OK`

| Поле | Тип | Описание |
|---|---|---|
| `token` | `string` | Непрозрачный токен демо-сессии (32 hex) |
| `session_id` | `string?` | Идентификатор сессии |
| `requests_limit` | `int` | Квота запросов на сессию (`DEMO_MAX_REQUESTS_PER_SESSION`) |
| `requests_remaining` | `int` | Остаток квоты |
| `rate_limit_per_minute` | `int` | `DEMO_RATE_LIMIT_PER_MINUTE` |
| `expires_at` | `string` | ISO-8601 момент истечения сессии |

- **Ошибки:** `403` (лимитер выключен), `429` (превышен IP-лимит сессий в час — `DEMO_MAX_SESSIONS_PER_IP_PER_HOUR`).

### `GET /api/demo/status`

Текущее состояние квоты и TTL токена. Токен читается из заголовка.

- **Заголовки:** `X-Demo-Token: <token>` (обязателен).
- **Ответ:** `200 OK`

| Поле | Тип | Описание |
|---|---|---|
| `token` | `string` | Токен |
| `session_id` | `string?` | Идентификатор сессии |
| `requests_used` | `int` | Использовано запросов |
| `requests_limit` | `int` | Квота |
| `requests_remaining` | `int` | Остаток |
| `expires_at` | `string?` | ISO-8601 истечения |
| `is_active` | `bool` | Активна и не истекла |

- **Ошибки:** `401` (заголовок отсутствует), `404` (токен не найден).

> Квота списывается в `POST /api/reviews` на этапе валидации токена (до запуска AI-пайплайна), поэтому намеренно ошибочный payload не возвращает квоту. См. заголовок `X-Demo-Token` в `POST /api/reviews`.

---

## 📝 5. Reviews — публичный клиентский API

Базовый префикс: `/api/reviews`.  
Роль: `client` (заголовок `X-Role` не обязателен).

### `POST /api/reviews`

Создание нового обращения (отзыва/заявки). Запускает автоматическую классификацию и генерацию ответа.

- **Заголовки:** при `DEMO_LIMITER_ENABLED=true` требуется `X-Demo-Token: <token>` (выпускается `POST /api/demo/start`). Без токена — `403`. Квота списывается до запуска пайплайна; при исчерпании — `429`, при истёкшей сессии — `401`, при превышении rate-limit — `429` с `Retry-After`. При `DEMO_LIMITER_ENABLED=false` эндпоинт открыт. Созданные в demo-режиме отзывы помечаются `demo_mode=true`.
- **Ответ:** `201 Created`

**Тело запроса — `ReviewCreateRequest`:**

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `customer_name` | `string` (1–255) | ✅ | Имя клиента |
| `email` | `string` (1–255) | ❌ | Email для проверки статуса |
| `service_case_title` | `string` (1–255) | ❌ | Устаревшее поле; используется как fallback для `order_number` |
| `order_number` | `string` (1–64) | ✅ | Номер заказа/сделки |
| `product_area` | `string` (1–128) | ✅ | Продуктовая область |
| `rating` | `integer` (1–5) | ❌ | Оценка |
| `review_text` | `string` (мин. 3) | ✅ | Текст обращения |

**Тело ответа — `ReviewCreateResponse`:**

| Поле | Тип | Описание |
|---|---|---|
| `review_id` | `UUID` | Внутренний ID |
| `request_number` | `string` | Отображаемый номер обращения для клиента |
| `status` | `string` | Начальный статус обработки |

**Пример запроса:**

```bash
curl -X POST http://localhost:8700/api/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Иван Петров",
    "email": "ivan.petrov@example.com",
    "order_number": "NL-00999999",
    "product_area": "Доставка",
    "rating": 4,
    "review_text": "Заказ пришёл быстро, но упаковка была повреждена."
  }'
```

**Пример ответа:**

```json
{
  "review_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "request_number": "NL-00999999-REQ-42",
  "status": "processing"
}
```

### `GET /api/reviews/requests/{request_number}/status`

Клиентская проверка статуса обращения по отображаемому номеру.

- **Query-параметры:**

| Параметр | Тип | Обязательное | Описание |
|---|---|---|---|
| `email` | `string` | ✅ | Email, указанный при создании |

- **Ответ:** `200 OK`, схема `ReviewStatusResponse`.

| Поле | Тип | Описание |
|---|---|---|
| `review_id` | `UUID` | Внутренний ID |
| `request_number` | `string` | Номер обращения |
| `status` | `string` | Клиентский статус: `processing`, `pending_review`, `approved`, `rejected`, `needs_revision`, `published` |
| `moderation_status` | `string` \| `null` | Внутренний статус модерации |
| `publication_status` | `string` \| `null` | Статус публикации |
| `review_text` | `string` | Текст обращения |
| `rating` | `integer` \| `null` | Оценка |
| `product_area` | `string` \| `null` | Продуктовая область |
| `final_response` | `string` \| `null` | Опубликованный ответ (только при `status=published`) |

**Пример запроса:**

```bash
curl "http://localhost:8700/api/reviews/requests/NL-00999999-REQ-42/status?email=ivan.petrov@example.com"
```

**Пример ответа:**

```json
{
  "review_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "request_number": "NL-00999999-REQ-42",
  "status": "published",
  "moderation_status": "approved",
  "publication_status": "published",
  "review_text": "Заказ пришёл быстро, но упаковка была повреждена.",
  "rating": 4,
  "product_area": "Доставка",
  "final_response": "Иван, спасибо за отзыв. Приносим извинения за повреждение упаковки — мы передадим информацию в службу доставки."
}
```

### `GET /api/reviews/{review_id}/status`

Проверка статуса по внутреннему UUID обращения.

- **Query-параметры:**

| Параметр | Тип | Обязательное | Описание |
|---|---|---|---|
| `email` | `string` | ❌ | Если передан, выполняется проверка владельца |

- **Ответ:** `200 OK`, `ReviewStatusResponse`.

### `GET /api/reviews/{review_id}`

Детальная информация об обращении (классификация, черновик ответа).

- **Path-параметры:**

| Параметр | Тип | Описание |
|---|---|---|
| `review_id` | `UUID` | Внутренний ID обращения |

- **Ответ:** `200 OK`, схема `ReviewDetailResponse`.

| Поле | Тип | Описание |
|---|---|---|
| `review_id` | `UUID` | ID обращения |
| `status` | `string` | Текущий статус |
| `customer_name` | `string` \| `null` | Имя клиента |
| `service_case_title` | `string` \| `null` | Тема сервисного случая |
| `product_area` | `string` \| `null` | Продуктовая область |
| `rating` | `integer` \| `null` | Оценка |
| `review_text` | `string` | Текст обращения |
| `created_at` | `datetime` | Дата создания |
| `classification` | `ClassificationOut` \| `null` | Результат классификации |
| `response` | `ReviewResponseOut` \| `null` | Черновик и статус ответа |

**Пример ответа:**

```json
{
  "review_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pending_review",
  "customer_name": "Иван Петров",
  "service_case_title": null,
  "product_area": "Доставка",
  "rating": 4,
  "review_text": "Заказ пришёл быстро, но упаковка была повреждена.",
  "created_at": "2026-08-09T10:15:30.123456+00:00",
  "classification": {
    "scenario": { "id": "...", "code": "complaint", "name": "Жалоба" },
    "sentiment": { "id": "...", "code": "negative", "name": "Негатив" },
    "priority": { "id": "...", "code": "medium", "name": "Средний" },
    "topic": "Повреждение упаковки",
    "product_area": "Доставка",
    "confidence": 0.87,
    "classification_source": "phrase_match",
    "phrase_match_score": 0.92,
    "matched_phrase_text": "упаковка была повреждена"
  },
  "response": {
    "draft_response": "Иван, спасибо за обращение...",
    "moderation_status": "pending_review",
    "publication_status": "pending"
  }
}
```

---

## 👷 6. Operator

Базовый префикс: `/api/operator/reviews`.  
Роль: `operator` или `administrator`.

### `GET /api/operator/reviews`

Список обращений, требующих работы оператора.

- **Query-параметры:**

| Параметр | Тип | Обязательное | Описание |
|---|---|---|---|
| `moderation_status` | `string` | ❌ | Фильтр по статусу модерации |
| `publication_status` | `string` | ❌ | Фильтр по статусу публикации |

- **Ответ:** `200 OK`, список `OperatorReviewListItem`.

| Поле | Тип | Описание |
|---|---|---|
| `review_id` | `UUID` | ID |
| `request_number` | `string` \| `null` | Номер обращения |
| `customer_name` | `string` \| `null` | Имя клиента |
| `service_case_title` | `string` \| `null` | Тема |
| `product_area` | `string` \| `null` | Продуктовая область |
| `rating` | `integer` \| `null` | Оценка |
| `review_text_preview` | `string` | Сокращённый текст |
| `scenario` | `string` \| `null` | Код сценария |
| `sentiment` | `string` \| `null` | Код тональности |
| `priority` | `string` \| `null` | Код приоритета |
| `moderation_status` | `string` \| `null` | Статус модерации |
| `publication_status` | `string` \| `null` | Статус публикации |
| `created_at` | `datetime` | Дата создания |
| `updated_at` | `datetime` \| `null` | Дата последнего обновления |

### `GET /api/operator/reviews/{review_id}`

Детальная операторская карточка обращения.

- **Ответ:** `200 OK`, `OperatorReviewDetail`.

Ключевые поля ответа:

| Поле | Тип | Описание |
|---|---|---|
| `review_id`, `request_number`, `order_number` | `UUID` / `string` | Идентификаторы |
| `customer_name`, `customer_email` | `string` \| `null` | Клиент |
| `service_case_title`, `product_area` | `string` \| `null` | Тема и область |
| `rating` | `integer` \| `null` | Оценка |
| `review_text` | `string` | Полный текст |
| `created_at`, `updated_at` | `datetime` | Даты |
| `classification` | `ClassificationOut` \| `null` | Классификация |
| `matched_phrase_text` | `string` \| `null` | Сработавшая фраза |
| `template` | `TemplateOut` \| `null` | Подобранный шаблон |
| `draft_response` | `string` \| `null` | Черновик |
| `final_response` | `string` \| `null` | Финальный ответ |
| `moderation_status`, `publication_status` | `string` \| `null` | Статусы |
| `operational_logs` | `[OperationalLogOut]` | Логи по обращению |
| `llm_model` | `string` \| `null` | Использованная модель |
| `ai_review_mode` | `string` | Режим ревью (по умолчанию `"review"`) |
| `pipeline_mode` | `string` | `"legacy"` или `"controlled_hybrid"` |
| `selected_response_case` | `SelectedResponseCaseOut` \| `null` | Выбранная типовая ситуация (CH) |
| `case_alternatives` | `[ResponseCaseAlternativeOut]` | Альтернативные типовые ситуации |
| `case_resolved` | `boolean` | Разрешён ли кейс |
| `operator_editor_enabled` | `boolean` | Редактор включён |
| `case_escalated` | `boolean` | Эскалирован ли кейс |
| `case_confirmation_not_required` | `boolean` | Требуется ли подтверждение |
| `escalation_reason` | `string` \| `null` | Причина эскалации |
| `retrieval_suggestion` | `RetrievalSuggestionOut` \| `null` | Рекомендация ретривала |

### `POST /api/operator/reviews/{review_id}/approve`

Утвердить и опубликовать финальный ответ.

- **Тело запроса — `ApproveRequest`:**

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `final_response` | `string` (мин. 1) | ✅ | Финальный текст ответа |

- **Ответ:** `200 OK`, `OperatorReviewDetail`.

**Пример запроса:**

```bash
curl -X POST http://localhost:8700/api/operator/reviews/a1b2c3d4-e5f6-7890-abcd-ef1234567890/approve \
  -H "Content-Type: application/json" \
  -H "X-Role: operator" \
  -d '{"final_response": "Иван, спасибо за отзыв. Мы компенсируем повреждение и передадим замечание в доставку."}'
```

### `POST /api/operator/reviews/{review_id}/reject`

Отклонить черновик/обращение.

- **Тело запроса — `ModerationActionRequest`:**

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `reason` | `string` (мин. 1) | ✅ | Причина отклонения |

- **Ответ:** `200 OK`, `ModerationActionResponse`.

| Поле | Тип | Описание |
|---|---|---|
| `review_id` | `UUID` | ID |
| `moderation_status` | `string` | Новый статус |
| `publication_status` | `string` | Новый статус публикации |
| `message` | `string` | `"Review rejected"` |

### `POST /api/operator/reviews/{review_id}/reject-feedback`

Отправить обратную связь по отклонённому AI-черновику с корректировкой классификации.

- **Тело запроса — `RejectionFeedbackRequest`:**

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `rejection_reason` | `string` (мин. 1) | ✅ | Причина отказа от черновика |
| `operator_corrected_scenario_id` | `UUID` \| `null` | ❌ | Правильный сценарий |
| `operator_corrected_sentiment_id` | `UUID` \| `null` | ❌ | Правильная тональность |
| `operator_corrected_priority_id` | `UUID` \| `null` | ❌ | Правильный приоритет |
| `optional_comment` | `string` \| `null` | ❌ | Дополнительный комментарий |

- **Ответ:** `200 OK`, `OperatorReviewDetail`.

### `POST /api/operator/reviews/{review_id}/confirm-case`

Подтвердить автоматически выбранную типовую ситуацию (CH).

- **Тело запроса:** отсутствует.
- **Ответ:** `200 OK`, `OperatorReviewDetail`.

### `POST /api/operator/reviews/{review_id}/override-case`

Заменить автоматически выбранную типовую ситуацию на другую.

- **Тело запроса — `ResponseCaseOverrideRequest`:**

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `response_case_id` | `UUID` | ✅ | ID новой типовой ситуации |
| `comment` | `string` \| `null` | ❌ | Комментарий оператора |

- **Ответ:** `200 OK`, `OperatorReviewDetail`.

### `POST /api/operator/reviews/{review_id}/case-candidates`

Создать кандидата на новую типовую ситуацию.

- **Тело запроса — `CaseCandidateCreateRequest`:**

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `proposed_title` | `string` (мин. 1) | ✅ | Название кандидата |
| `proposed_description` | `string` (мин. 1) | ✅ | Описание |
| `operator_comment` | `string` \| `null` | ❌ | Комментарий |
| `proposed_scenario_id` | `UUID` \| `null` | ❌ | Сценарий |
| `proposed_sentiment_id` | `UUID` \| `null` | ❌ | Тональность |
| `proposed_priority_id` | `UUID` \| `null` | ❌ | Приоритет |
| `proposed_product_area_id` | `UUID` \| `null` | ❌ | Продуктовая область |
| `proposed_topic_id` | `UUID` \| `null` | ❌ | Тема |
| `proposed_response_policy` | `string` \| `null` | ❌ | Политика ответа |
| `proposed_approved_response_text` | `string` \| `null` | ❌ | Утверждённый текст |

- **Ответ:** `200 OK`, `OperatorReviewDetail`.

### `POST /api/operator/reviews/{review_id}/escalate`

Эскалировать обращение оператором.

- **Тело запроса — `OperatorEscalationRequest`:**

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `escalation_reason` | `string` (мин. 1) | ✅ | Причина эскалации |
| `comment` | `string` (мин. 1) | ✅ | Комментарий |
| `scenario_id` | `UUID` \| `null` | ❌ | Уточнение сценария |
| `sentiment_id` | `UUID` \| `null` | ❌ | Уточнение тональности |
| `priority_id` | `UUID` \| `null` | ❌ | Уточнение приоритета |

- **Ответ:** `200 OK`, `OperatorReviewDetail`.

### `POST /api/operator/reviews/{review_id}/revision`

Запросить доработку ответа.

- **Тело запроса — `ModerationActionRequest`:**

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `reason` | `string` (мин. 1) | ✅ | Причина доработки |

- **Ответ:** `200 OK`, `ModerationActionResponse`.

---

## 🛠️ 7. Admin — сценарии, шаблоны, фразы, тональности

Базовый префикс: `/api/admin`.  
Роль: `administrator`.

### Фразы (`/api/admin/phrases`)

Общая схема `PhraseOut`:

| Поле | Тип | Описание |
|---|---|---|
| `id` | `UUID` | ID |
| `phrase_text` | `string` | Текст фразы |
| `scenario` | `ClassificationRefOut` \| `null` | Сценарий |
| `sentiment` | `ClassificationRefOut` \| `null` | Тональность |
| `priority` | `ClassificationRefOut` \| `null` | Приоритет |
| `is_active` | `boolean` | Активна ли |
| `created_at`, `updated_at` | `datetime` | Даты |

Схемы создания/обновления:

| Поле | Тип | Обязательное |
|---|---|---|
| `phrase_text` | `string` (мин. 1) | ✅ |
| `scenario_id` | `UUID` \| `null` | ❌ |
| `sentiment_id` | `UUID` \| `null` | ❌ |
| `priority_id` | `UUID` \| `null` | ❌ |
| `is_active` | `boolean` | ❌ (create default `true`) |

Эндпоинты:

- `GET /api/admin/phrases` → `200 OK`, список `PhraseOut`.
- `GET /api/admin/phrases/{item_id}` → `200 OK`, `PhraseOut`.
- `POST /api/admin/phrases` → `201 Created`, `PhraseCreate` → `PhraseOut`.
- `PATCH /api/admin/phrases/{item_id}` → `200 OK`, `PhraseUpdate` → `PhraseOut`.

### Шаблоны (`/api/admin/templates`)

Общая схема `TemplateOut`:

| Поле | Тип | Описание |
|---|---|---|
| `id` | `UUID` | ID |
| `title` | `string` \| `null` | Название |
| `scenario` | `ClassificationRefOut` \| `null` | Сценарий |
| `sentiment` | `ClassificationRefOut` \| `null` | Тональность |
| `priority` | `ClassificationRefOut` \| `null` | Приоритет |
| `template_text` | `string` | Текст шаблона |
| `is_fallback` | `boolean` | Fallback-шаблон |
| `is_active` | `boolean` | Активен ли |

Схемы создания/обновления:

| Поле | Тип | Обязательное |
|---|---|---|
| `title` | `string` (мин. 1) | ✅ |
| `scenario_id` | `UUID` \| `null` | ❌ |
| `sentiment_id` | `UUID` \| `null` | ❌ |
| `priority_id` | `UUID` \| `null` | ❌ |
| `template_text` | `string` (мин. 1) | ✅ |
| `is_fallback` | `boolean` | ❌ (default `false`) |
| `is_active` | `boolean` | ❌ (default `true`) |

Эндпоинты:

- `GET /api/admin/templates` → `200 OK`, список `TemplateOut`.
- `GET /api/admin/templates/{item_id}` → `200 OK`, `TemplateOut`.
- `POST /api/admin/templates` → `201 Created`, `TemplateCreate` → `TemplateOut`.
- `PATCH /api/admin/templates/{item_id}` → `200 OK`, `TemplateUpdate` → `TemplateOut`.

**Пример запроса создания шаблона:**

```bash
curl -X POST http://localhost:8700/api/admin/templates \
  -H "Content-Type: application/json" \
  -H "X-Role: administrator" \
  -d '{
    "title": "Благодарность за положительный отзыв",
    "scenario_id": "11111111-1111-1111-1111-111111111111",
    "sentiment_id": "22222222-2222-2222-2222-222222222222",
    "priority_id": "33333333-3333-3333-3333-333333333333",
    "template_text": "{{customer_name}}, спасибо за ваш отзыв! Рады, что вам понравилось.",
    "is_fallback": false,
    "is_active": true
  }'
```

### Сценарии (`/api/admin/scenarios`)

Схема `ScenarioOut`:

| Поле | Тип | Описание |
|---|---|---|
| `id` | `UUID` | ID |
| `code` | `string` | Уникальный код |
| `title` | `string` | Название |
| `description` | `string` \| `null` | Описание |
| `is_active` | `boolean` | Активен ли |

Схемы создания/обновления:

| Поле | Тип | Обязательное |
|---|---|---|
| `code` | `string` (1–64) | ✅ |
| `title` | `string` (мин. 1) | ✅ |
| `description` | `string` \| `null` | ❌ |
| `is_active` | `boolean` | ❌ (default `true`) |

Эндпоинты:

- `GET /api/admin/scenarios` → `200 OK`, список `ScenarioOut`.
- `GET /api/admin/scenarios/{item_id}` → `200 OK`, `ScenarioOut`.
- `POST /api/admin/scenarios` → `201 Created`, `ScenarioCreate` → `ScenarioOut`.
- `PATCH /api/admin/scenarios/{item_id}` → `200 OK`, `ScenarioUpdate` → `ScenarioOut`.

> При дублировании `code` возвращается `409 Conflict`.

### Тональности (`/api/admin/sentiments`)

Схема `SentimentOut`:

| Поле | Тип | Описание |
|---|---|---|
| `id` | `UUID` | ID |
| `code` | `string` | Уникальный код |
| `title` | `string` | Название |
| `description` | `string` \| `null` | Описание |
| `is_active` | `boolean` | Активен ли |

Схемы создания/обновления аналогичны сценариям.

Эндпоинты:

- `GET /api/admin/sentiments` → `200 OK`, список `SentimentOut`.
- `GET /api/admin/sentiments/{item_id}` → `200 OK`, `SentimentOut`.
- `POST /api/admin/sentiments` → `201 Created`, `SentimentCreate` → `SentimentOut`.
- `PATCH /api/admin/sentiments/{item_id}` → `200 OK`, `SentimentUpdate` → `SentimentOut`.

> При дублировании `code` возвращается `409 Conflict`.

---

## 🧩 8. Response Cases Admin — управление базой знаний CH

Базовый префикс: `/api/admin`.  
Роль: `administrator`.

### `GET /api/admin/ch-catalog`

Справочник для создания/редактирования типовых ситуаций: продуктовые области, темы, политики обработки.

- **Ответ:** `200 OK`, `ChCatalogOut`.

| Поле | Тип | Описание |
|---|---|---|
| `product_areas` | `[ProductAreaOut]` | Продуктовые области |
| `review_topics` | `[ReviewTopicOut]` | Темы отзывов |
| `processing_policies` | `[ProcessingPolicyOut]` | Политики обработки |

`ProductAreaOut`, `ReviewTopicOut`, `ProcessingPolicyOut` содержат поля: `id`, `code`, `name` / `name_ru`, `description`, `is_active`.

### `GET /api/admin/response-cases`

Список типовых ситуаций (Response Cases) с фильтрами.

- **Query-параметры:**

| Параметр | Тип | Описание |
|---|---|---|
| `is_active` | `boolean` \| `null` | Активные/неактивные |
| `scenario_id` | `UUID` \| `null` | Фильтр по сценарию |
| `sentiment_id` | `UUID` \| `null` | Фильтр по тональности |
| `priority_id` | `UUID` \| `null` | Фильтр по приоритету |
| `product_area_id` | `UUID` \| `null` | Фильтр по области |
| `topic_id` | `UUID` \| `null` | Фильтр по теме |
| `search` | `string` \| `null` | Поиск по названию/коду |

- **Ответ:** `200 OK`, список `ResponseCaseListItemAdmin`.

Ключевые поля: `id`, `case_code`, `title`, `description`, `scenario`, `sentiment`, `priority`, `product_area`, `topic`, `confidence_threshold`, `processing_policy_id`, `processing_policy`, `review_policy`, `is_active`, `updated_at`, `examples_count`.

### `POST /api/admin/response-cases`

Создать новую типовую ситуацию.

- **Тело запроса — `ResponseCaseCreate`:**

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `case_code` | `string` (1–64) | ✅ | Уникальный код |
| `title` | `string` (1–255) | ✅ | Название |
| `description` | `string` \| `null` | ❌ | Описание |
| `scenario_id` | `UUID` | ✅ | Сценарий |
| `sentiment_id` | `UUID` | ✅ | Тональность |
| `priority_id` | `UUID` | ✅ | Приоритет |
| `product_area_id` | `UUID` | ✅ | Продуктовая область |
| `topic_id` | `UUID` | ✅ | Тема |
| `response_policy` | `string` (мин. 1) | ✅ | Политика ответа |
| `approved_response_text` | `string` (мин. 1) | ✅ | Утверждённый текст |
| `confidence_threshold` | `decimal` | ❌ (default `0.75`) | Порог уверенности |
| `processing_policy_id` | `UUID` \| `null` | ❌ | Политика обработки |

- **Ответ:** `201 Created`, `ResponseCaseOut`.

**Пример запроса:**

```bash
curl -X POST http://localhost:8700/api/admin/response-cases \
  -H "Content-Type: application/json" \
  -H "X-Role: administrator" \
  -d '{
    "case_code": "DAMAGE-PACKAGE-001",
    "title": "Повреждение упаковки при доставке",
    "description": "Клиент получил заказ с повреждённой упаковкой.",
    "scenario_id": "11111111-1111-1111-1111-111111111111",
    "sentiment_id": "22222222-2222-2222-2222-222222222222",
    "priority_id": "33333333-3333-3333-3333-333333333333",
    "product_area_id": "44444444-4444-4444-4444-444444444444",
    "topic_id": "55555555-5555-5555-5555-555555555555",
    "response_policy": "Извиниться, предложить компенсацию, передать замечание в доставку.",
    "approved_response_text": "Приносим извинения за повреждение упаковки. Мы компенсируем неудобства и передадим замечание службе доставки.",
    "confidence_threshold": 0.80
  }'
```

### `GET /api/admin/response-cases/{case_id}`

Детальная информация о типовой ситуации, включая примеры.

- **Ответ:** `200 OK`, `ResponseCaseOut`.

### `PATCH /api/admin/response-cases/{case_id}`

Обновление типовой ситуации.

- **Тело запроса — `ResponseCaseUpdate`:**

| Поле | Тип | Обязательное |
|---|---|---|
| `title` | `string` (1–255) \| `null` | ❌ |
| `description` | `string` \| `null` | ❌ |
| `scenario_id` | `UUID` \| `null` | ❌ |
| `sentiment_id` | `UUID` \| `null` | ❌ |
| `priority_id` | `UUID` \| `null` | ❌ |
| `product_area_id` | `UUID` \| `null` | ❌ |
| `topic_id` | `UUID` \| `null` | ❌ |
| `response_policy` | `string` (мин. 1) \| `null` | ❌ |
| `approved_response_text` | `string` (мин. 1) \| `null` | ❌ |
| `confidence_threshold` | `decimal` \| `null` | ❌ |
| `processing_policy_id` | `UUID` \| `null` | ❌ |
| `is_active` | `boolean` \| `null` | ❌ |

- **Ответ:** `200 OK`, `ResponseCaseOut`.

### `POST /api/admin/response-cases/{case_id}/archive`

Архивировать типовую ситуацию (`is_active=false`).

- **Ответ:** `200 OK`, `ResponseCaseOut`.

### `POST /api/admin/response-cases/{case_id}/activate`

Активировать типовую ситуацию (`is_active=true`).

- **Ответ:** `200 OK`, `ResponseCaseOut`.

### `POST /api/admin/response-cases/{case_id}/examples`

Добавить пример к типовой ситуации.

- **Тело запроса — `ResponseCaseExampleCreate`:**

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `example_text` | `string` (мин. 1) | ✅ | Текст примера |
| `source` | `string` | ❌ (default `"admin_manual"`) | Источник |

- **Ответ:** `201 Created`, `ResponseCaseExampleOut`.

### `PATCH /api/admin/response-case-examples/{example_id}`

Обновить пример.

- **Тело запроса — `ResponseCaseExampleUpdate`:**

| Поле | Тип | Обязательное |
|---|---|---|
| `example_text` | `string` (мин. 1) \| `null` | ❌ |
| `is_active` | `boolean` \| `null` | ❌ |

- **Ответ:** `200 OK`, `ResponseCaseExampleOut`.

### `GET /api/admin/response-case-candidates`

Список кандидатов на новые типовые ситуации.

- **Query-параметры:**

| Параметр | Тип | Описание |
|---|---|---|
| `status` | `string` | `"pending_admin"` (default), `"new"`, `"approved"`, `"rejected"` и др. |

- **Ответ:** `200 OK`, список `ResponseCaseCandidateOut`.

Ключевые поля: `id`, `review_id`, `status`, `candidate_type`, `proposed_title`, `proposed_description`, `proposed_response_policy`, `proposed_approved_response_text`, `match_score`, `retrieval_threshold`, `gap`, `created_at`, `updated_at`.

### `GET /api/admin/response-case-candidates/{candidate_id}`

Детальная карточка кандидата с контекстом отзыва, анализом и альтернативами.

- **Ответ:** `200 OK`, `ResponseCaseCandidateDetailOut`.

### `POST /api/admin/response-case-candidates/{candidate_id}/complete`

Привязать кандидата к существующей типовой ситуации.

- **Тело запроса — `CandidateCompleteBody`:**

| Поле | Тип | Обязательное |
|---|---|---|
| `response_case_id` | `UUID` | ✅ |

- **Ответ:** `204 No Content`.

### `POST /api/admin/response-case-candidates/{candidate_id}/approve`

Одобрить кандидата (создать/слить новую типовую ситуацию).

- **Тело запроса — `CandidatePromoteBody` (опционально):**

| Поле | Тип | Описание |
|---|---|---|
| `merge_into_case_id` | `UUID` \| `null` | ID существующей типовой ситуации для слияния |

- **Ответ:** `200 OK`, `ResponseCaseOut`.

### `POST /api/admin/response-case-candidates/{candidate_id}/reject`

Отклонить кандидата.

- **Тело запроса — `CandidateRejectBody` (опционально):**

| Поле | Тип | Описание |
|---|---|---|
| `rejection_comment` | `string` \| `null` | Причина отклонения |

- **Ответ:** `200 OK`, `ResponseCaseCandidateOut`.

---

## 🧠 9. Prompts

Базовый префикс: `/api/prompts`.  
Роль: `administrator`.

Общая схема `PromptDetail`:

| Поле | Тип | Описание |
|---|---|---|
| `id` | `UUID` | ID версии |
| `prompt_key` | `string` | Ключ промпта |
| `version` | `integer` | Номер версии |
| `title` | `string` | Название |
| `system_prompt` | `string` | Системный промпт |
| `user_prompt_template` | `string` | Шаблон пользовательского промпта |
| `is_active` | `boolean` | Активна ли версия |
| `created_at`, `updated_at` | `datetime` | Даты |

### `GET /api/prompts`

- **Ответ:** `200 OK`, список `PromptListItem`.

| Поле | Тип |
|---|---|
| `id` | `UUID` |
| `prompt_key` | `string` |
| `version` | `integer` |
| `title` | `string` |
| `is_active` | `boolean` |
| `created_at` | `datetime` |

### `GET /api/prompts/{prompt_id}`

- **Ответ:** `200 OK`, `PromptDetail`.

### `POST /api/prompts`

Создать новую версию промпта.

- **Тело запроса — `PromptCreateRequest`:**

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `prompt_key` | `string` (max 128) | ❌ (default `"review_response_generation"`) | Ключ |
| `title` | `string` (1–255) | ✅ | Название |
| `system_prompt` | `string` (мин. 1) | ✅ | Системный промпт |
| `user_prompt_template` | `string` (мин. 1) | ✅ | Шаблон |

- **Ответ:** `201 Created`, `PromptDetail`.

**Пример запроса:**

```bash
curl -X POST http://localhost:8700/api/prompts \
  -H "Content-Type: application/json" \
  -H "X-Role: administrator" \
  -d '{
    "prompt_key": "review_response_generation",
    "title": "Генерация ответа на отзыв v2",
    "system_prompt": "Ты — вежливый менеджер службы поддержки. Отвечай кратко, по существу, на русском языке.",
    "user_prompt_template": "Отзыв клиента:\n{{review_text}}\n\nСценарий: {{scenario}}\nТональность: {{sentiment}}\nПриоритет: {{priority}}\n\nПодготовь ответ."
  }'
```

### `POST /api/prompts/{prompt_id}/activate`

Активировать выбранную версию промпта.

- **Ответ:** `200 OK`, `PromptDetail`.

---

## ✅ 10. Evaluation

Базовый префикс: `/api/evaluation`.  
Роль: `administrator`.

### `POST /api/evaluation/cases`

Добавить обращение в набор для ручной оценки качества.

- **Тело запроса — `EvaluationCaseCreate`:**

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `review_id` | `UUID` | ✅ | ID обращения |
| `expected_quality_notes` | `string` \| `null` | ❌ | Ожидания по качеству |

- **Ответ:** `201 Created`, `EvaluationCaseOut`.

### `GET /api/evaluation/cases`

Список кейсов для оценки (последние 100).

- **Ответ:** `200 OK`, список `EvaluationCaseOut`.

Ключевые поля: `id`, `review_id`, `review_text`, `draft_response`, `final_response`, `prompt_key`, `prompt_version`, `prompt_version_id`, `expected_quality_notes`, `operator_score`, `operator_comment`, `created_at`, `updated_at`.

### `PATCH /api/evaluation/cases/{case_id}`

Проставить операторскую оценку кейсу.

- **Тело запроса — `EvaluationScoreUpdate`:**

| Поле | Тип | Обязательное | Описание |
|---|---|---|---|
| `operator_score` | `integer` (1–5) | ✅ | Оценка качества |
| `operator_comment` | `string` \| `null` | ❌ | Комментарий |

- **Ответ:** `200 OK`, `EvaluationCaseOut`.

**Пример запроса:**

```bash
curl -X PATCH http://localhost:8700/api/evaluation/cases/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Content-Type: application/json" \
  -H "X-Role: administrator" \
  -d '{
    "operator_score": 5,
    "operator_comment": "Ответ точный, вежливый, по существу."
  }'
```

---

## 📈 11. Analytics

Базовый префикс: `/api/analytics`.  
Роль: `administrator`.

### `GET /api/analytics/overview`

Сводка по обращениям, классификации и активным промптам.

- **Ответ:** `200 OK`, `AnalyticsOverview`.

| Поле | Тип | Описание |
|---|---|---|
| `total_reviews` | `integer` | Всего обращений |
| `published_reviews` | `integer` | Опубликовано |
| `pending_reviews` | `integer` | В ожидании |
| `rejected_reviews` | `integer` | Отклонено |
| `needs_revision_reviews` | `integer` | Требует доработки |
| `average_rating` | `float` \| `null` | Средний рейтинг |
| `ratings_distribution` | `[DistributionItem]` | Распределение по оценкам |
| `sentiment_distribution` | `[DistributionItem]` | Распределение по тональности |
| `scenario_distribution` | `[DistributionItem]` | Распределение по сценариям |
| `priority_distribution` | `[DistributionItem]` | Распределение по приоритетам |
| `active_prompt_versions` | `[ActivePromptItem]` | Активные версии промптов |
| `evaluated_cases` | `integer` | Оценённых кейсов |
| `average_operator_score` | `float` \| `null` | Средняя оценка оператора |
| `fallback_template_rate` | `float` | Доля fallback-шаблонов |
| `phrase_review_rate` | `float` | Доля phrase-ревью |

`DistributionItem`: `label`, `count`.  
`ActivePromptItem`: `prompt_key`, `version`, `title`.

**Пример ответа:**

```json
{
  "total_reviews": 1250,
  "published_reviews": 980,
  "pending_reviews": 120,
  "rejected_reviews": 80,
  "needs_revision_reviews": 70,
  "average_rating": 4.2,
  "ratings_distribution": [
    { "label": "5", "count": 600 },
    { "label": "4", "count": 350 },
    { "label": "3", "count": 150 },
    { "label": "2", "count": 100 },
    { "label": "1", "count": 50 }
  ],
  "sentiment_distribution": [
    { "label": "positive", "count": 700 },
    { "label": "neutral", "count": 300 },
    { "label": "negative", "count": 250 }
  ],
  "scenario_distribution": [
    { "label": "gratitude", "count": 500 },
    { "label": "complaint", "count": 400 },
    { "label": "suggestion", "count": 200 },
    { "label": "question", "count": 150 }
  ],
  "priority_distribution": [
    { "label": "low", "count": 600 },
    { "label": "medium", "count": 400 },
    { "label": "high", "count": 200 },
    { "label": "critical", "count": 50 }
  ],
  "active_prompt_versions": [
    { "prompt_key": "review_response_generation", "version": 3, "title": "Генерация ответа v3" }
  ],
  "evaluated_cases": 45,
  "average_operator_score": 4.6,
  "fallback_template_rate": 0.05,
  "phrase_review_rate": 0.12
}
```

---

## 🔎 12. CH Analytics

Базовый префикс: `/api/admin/ch-analytics`.  
Роль: `administrator`.

### `GET /api/admin/ch-analytics/dashboard`

Дашборд аналитики controlled-hybrid (уверенность, переопределения, кандидаты, качество базы знаний).

- **Query-параметры:**

| Параметр | Тип | Диапазон | Описание |
|---|---|---|---|
| `days` | `integer` | 1–365 | Период, default `30` |
| `product_area_id` | `UUID` \| `null` | | Фильтр по области |
| `topic_id` | `UUID` \| `null` | | Фильтр по теме |
| `case_quality_limit` | `integer` | 1–200 | Лимит строк качества, default `50` |
| `misses_limit` | `integer` | 1–200 | Лимит промахов, default `50` |

- **Ответ:** `200 OK`, `ChAnalyticsDashboard`.

Ключевые секции:

| Секция | Тип | Содержание |
|---|---|---|
| `overview` | `ChOverviewMetrics` | total_decisions, total_matched_cases, total_low_confidence, total_overrides, total_candidates, approved_candidates, rejected_candidates, period_days |
| `confidence` | `ConfidenceAnalytics` | распределение high/medium/low по общему/области/теме |
| `overrides` | `OverrideAnalytics` | количество и % переопределений, топ кейсов, причины |
| `candidates` | `CandidateAnalytics` | распределение кандидатов по статусу/области/теме |
| `case_quality` | `[ResponseCaseQualityRow]` | качество каждой типовой ситуации |
| `retrieval_misses` | `[RetrievalMissRow]` | промахи ретривала |
| `kb_health` | `KbHealthMetrics` | здоровье базы знаний |

### `GET /api/admin/ch-analytics/audit`

Аудит-лог изменений в CH.

- **Query-параметры:**

| Параметр | Тип | Диапазон | Описание |
|---|---|---|---|
| `days` | `integer` | 1–365 | default `30` |
| `limit` | `integer` | 1–500 | default `100` |

- **Ответ:** `200 OK`, `ChAuditTrail`.

| Поле | Тип | Описание |
|---|---|---|
| `items` | `[ChAuditEntry]` | События аудита |
| `period_days` | `integer` | Период |

`ChAuditEntry`: `id`, `event_type`, `entity_type`, `entity_id`, `status`, `created_at`, `metadata`.

---

## 📑 13. Reports

Базовый префикс: `/api/admin/reports`.  
Роль: `administrator`.

Общие query-параметры для всех report-эндпоинтов:

| Параметр | Тип | Описание |
|---|---|---|
| `period` | `string` | `"today"`, `"7"`, `"30"`, `"90"`, `"custom"` (default `"30"`) |
| `date_from` | `datetime` (ISO 8601) \| `null` | Начало периода для `custom` |
| `date_to` | `datetime` (ISO 8601) \| `null` | Конец периода для `custom` |

### `GET /api/admin/reports/customer-reviews`

- **Ответ:** `200 OK`, `CustomerReviewsReport`.

Ключевые поля: `period`, `total_reviews`, `processed_reviews`, `in_progress_reviews`, `average_rating`, `average_processing_hours`, `reviews_by_day`, `by_product_area`, `by_scenario`, `by_sentiment`, `by_priority`, `top_topics`, `export_bundle`, `summary`.

### `GET /api/admin/reports/business-problems`

- **Ответ:** `200 OK`, `BusinessProblemsReport`.

Ключевые поля: `period`, `top_complaints`, `top_suggestions`, `top_gratitude`, `new_topics`, `summary`.

### `GET /api/admin/reports/ch-quality`

- **Ответ:** `200 OK`, `ChQualityReport`.

Ключевые поля: `period`, `coverage_pct`, `override_rate_pct`, `low_confidence_rate_pct`, `new_cases`, `new_examples`, `candidates_created`, `coverage_by_day`, `override_by_day`, `low_confidence_by_day`, `problematic_cases`, `summary`.

### `GET /api/admin/reports/{report_key}/export`

Экспорт отчёта в файл.

- **Path-параметр:**

| Параметр | Допустимые значения |
|---|---|
| `report_key` | `customer-reviews`, `business-problems`, `ch-quality` |

- **Query-параметры:**

| Параметр | Тип | Описание |
|---|---|---|
| `format` | `string` | `"csv"`, `"xlsx"`, `"pdf"` (default `"csv"`) |
| `period` | `string` | стандартный period |
| `date_from` | `datetime` \| `null` | ISO 8601 |
| `date_to` | `datetime` \| `null` | ISO 8601 |

- **Ответ:** `200 OK`, бинарный файл с заголовком `Content-Disposition: attachment; filename="..."`.

> При неизвестном `report_key` возвращается `404 Not Found`. При `format`, для которого не реализован обработчик, — `501 Not Implemented`.

---

## 📋 14. Logs — трейсы обработки обращений

Базовый префикс: `/api/logs`.  
Роль: `administrator` или `demo`.

Журнал построен как **проекция по обращениям** (канон AIC OperationalLogs):
одна строка списка = одно обращение пользователя — на входе текст обращения,
на выходе — итоговый статус и ответ. Логирует сам пайплайн обработки
(`operational_logs`, `entity_type = "review"`); действия персонала в консоли —
раздел 14a «Audit».

**Чтения журнала не логируются.** Открытия экранов и запросы списков/отчётов
не создают записей (принцип AIC: read-only views are intentionally not logged,
чтобы журнал не генерировал шум о самом себе). Единственное экспортируемое
действие — выгрузка CSV (`logs_exported`).

### `GET /api/logs`

Список обращений с итогами обработки, пагинация.

- **Query-параметры:**

| Параметр | Тип | Описание |
|---|---|---|
| `review_id` | `UUID` \| `null` | Фильтр по обращению |
| `status` | `string` \| `null` | `ok` (обработано) / `error` / `pending` (в обработке) |
| `request_number` | `string` \| `null` | Поиск по номеру обращения или ID (UUID) |
| `date_from` / `date_to` | ISO datetime | Окно времени по `reviews.created_at` |
| `limit` | `integer` (1–500) | default `100` |
| `offset` | `integer` | default `0` |

- **Ответ:** `200 OK`, `ReviewTraceListResponse {items, total, limit, offset}`.

`ReviewTraceSummary` (одна строка = одно обращение):

| Поле | Тип | Описание |
|---|---|---|
| `review_id` | `UUID` | Идентификатор обращения (ключ детализации) |
| `request_number` | `string` \| `null` | Номер обращения (`NL-…`) |
| `created_at` | `datetime` | Время поступления обращения |
| `request_preview` | `string` \| `null` | Начало текста обращения (до 200 символов) |
| `status` | `string` | `ok` — ответ сформирован; `error` — сбой этапа; `pending` — ответа ещё нет |
| `latency_ms` | `integer` \| `null` | Latency всего pipeline, мс (из `draft_generated` → `pipeline_total_ms`) |
| `model_name` | `string` \| `null` | AI-модель генерации ответа |
| `response_preview` | `string` \| `null` | Начало ответа (до 200 символов) |
| `demo_mode` | `boolean` | Демо-обращение |
| `event_count` | `integer` | Количество событий трейса |

### `GET /api/logs/{review_id}`

Развёрнутый трейс одного обращения: вход → цепочка обработки → выход.
Роль: `administrator` или `demo`. Ответ `200 OK`, `ReviewTraceDetail`; при
неизвестном `review_id` — `404 Not Found`.

Тексты не дублируются в `operational_logs` — подтягиваются на чтение из
`reviews` (обращение) и `review_responses` (ответ: опубликованный
`final_response`, а до модерации — `draft_response`).

`ReviewTraceDetail` — над полями `ReviewTraceSummary` (без превью) +
`request_text` / `response_text` (полные тексты входа и выхода),
`moderation_status`, `publication_status`, `error` (сообщение последнего
сбойного этапа), и:

| Поле | Тип | Описание |
|---|---|---|
| `stages` | `list[ReviewStage]` | Таймлайн pipeline: события по обращению, по возрастанию времени |
| `pipeline_summary` | `string` \| `null` | Строка вида `review_received → draft_generated → …` |

`ReviewStage`: `event_type`, `status` (`ok`/`error`), `latency_ms`,
`model_name`, `created_at`, `message` (сообщение сбоя), `metadata` (объект).

### `GET /api/logs/export`

Выгрузка построчная по обращениям (те же фильтры, что у списка, без
`limit`/`offset`; лимит выгрузки — 10 000 строк). CSV, UTF-8 BOM — корректное
открытие кириллицы в Excel. Ответ: `200 OK`, `Content-Disposition: attachment`.
Выгрузка логируется (`logs_exported`).

Колонки CSV: `номер обращения`, `дата (UTC)`, `статус`,
`latency pipeline, мс`, `модель`, `обращение (вход)`, `ответ системы (выход)`,
`модерация`, `этапы обработки` (`review_received(38мс) → …`),
`id обращения`, `демо`.

---

## 🛡️ 14a. Audit — журнал пользовательской активности

Базовый префикс: `/api/audit`.  
Роль: `administrator` или `demo`.

Журнал аудита фиксирует пользовательскую активность в трёх контурах:
действия персонала (мутации НСИ, модерация, настройки), активность клиентов
(`review_submitted` — отправка обращения, `review_status_checked` — проверка
статуса) и демо-режим (`demo_session_started`). Роль берётся из токена
доступа (клиентский контур — `client`, демо — `demo`); IP-адрес берётся из
прокси-заголовков (`X-Forwarded-For` / `X-Real-IP`) или соединения.

### `GET /api/audit`

- **Query-параметры:**

| Параметр | Тип | Описание |
|---|---|---|
| `action` | `string` \| `null` | Фильтр по действию |
| `resource_type` | `string` \| `null` | Тип ресурса (`review`, `phrase`, …, `demo_session`) |
| `user_role` | `string` \| `null` | Роль (`administrator`, `operator`, `client`, `demo`) |
| `date_from` / `date_to` | ISO datetime | Окно времени |
| `limit` | `integer` (1–500) | default `100` |
| `offset` | `integer` | default `0` |

- **Ответ:** `200 OK`, `AuditListResponse {items, total, limit, offset}`.

`AuditEntry`:

| Поле | Тип | Описание |
|---|---|---|
| `id` | `UUID` | Идентификатор события |
| `timestamp` | `datetime` | Время события |
| `user_id` | `string` \| `null` | Идентификатор пользователя (зарезервировано) |
| `user_name` | `string` \| `null` | Имя пользователя (зарезервировано) |
| `user_role` | `string` | Роль действия |
| `action` | `string` | Код действия (общий словарь с event_type логов) |
| `resource_type` | `string` | Тип ресурса |
| `resource_id` | `string` \| `null` | Идентификатор ресурса |
| `ip_address` | `string` \| `null` | IP источника |
| `details` | `object` | Детали действия (например, причина отказа, код сценария) |

### `GET /api/audit/{entry_id}`

Детализация события. Ответ `200 OK`, `AuditEntry`; при неизвестном
`entry_id` — `404 Not Found`.

### `GET /api/audit/export`

Выгрузка журнала аудита в CSV (UTF-8 BOM), колонки: id, дата (UTC), роль,
пользователь, действие, тип ресурса, id ресурса, IP, детали. Ответ
`200 OK`, `Content-Disposition: attachment; filename="rf_audit_YYYY-MM-DD.csv"`.

---

## 🗂️ 15. Reference data

Базовый префикс: `/api/reference`.  
Роль: `operator` или `administrator`.

### `GET /api/reference/classification`

Получить справочник сценариев, тональностей и приоритетов для операторского UI.

- **Ответ:** `200 OK`, `ClassificationReferenceBundle`.

| Поле | Тип | Описание |
|---|---|---|
| `scenarios` | `[ClassificationRefOut]` | Сценарии |
| `sentiments` | `[ClassificationRefOut]` | Тональности |
| `priorities` | `[ClassificationRefOut]` | Приоритеты |

`ClassificationRefOut`: `id`, `code`, `name`.

**Пример ответа:**

```json
{
  "scenarios": [
    { "id": "11111111-1111-1111-1111-111111111111", "code": "complaint", "name": "Жалоба" },
    { "id": "22222222-2222-2222-2222-222222222222", "code": "gratitude", "name": "Благодарность" }
  ],
  "sentiments": [
    { "id": "33333333-3333-3333-3333-333333333333", "code": "positive", "name": "Позитив" },
    { "id": "44444444-4444-4444-4444-444444444444", "code": "negative", "name": "Негатив" }
  ],
  "priorities": [
    { "id": "55555555-5555-5555-5555-555555555555", "code": "low", "name": "Низкий" },
    { "id": "66666666-6666-6666-6666-666666666666", "code": "high", "name": "Высокий" }
  ]
}
```

---

## 🤖 16. AI Provider Settings

Базовый префикс: `/api/settings/ai-providers`.  
Роль: `administrator`.

### `GET /api/settings/ai-providers`

Список настроенных провайдеров AI.

- **Ответ:** `200 OK`, список `AIProviderSettingOut`.

Ключевые поля:

| Поле | Тип | Описание |
|---|---|---|
| `id` | `UUID` | ID |
| `provider_key` | `string` | Ключ провайдера |
| `display_name` | `string` | Отображаемое имя |
| `model_name` | `string` | Модель |
| `is_enabled` | `boolean` | Включён |
| `is_active` | `boolean` | Является активным |
| `is_fallback` | `boolean` | Является fallback |
| `temperature` | `float` \| `null` | Температура |
| `max_tokens` | `integer` \| `null` | Макс. токенов |
| `api_key_configured` | `boolean` | Настроен ли API-ключ |
| `base_url_configured` | `boolean` | Настроен ли base URL |
| `implementation_status` | `string` | Статус реализации |
| `readiness_reason` | `string` \| `null` | Причина неготовности |
| `api_key_env_key` | `string` \| `null` | Имя переменной окружения для ключа |
| `base_url_env_key` | `string` \| `null` | Имя переменной окружения для URL |
| `effective_base_url` | `string` \| `null` | Итоговый base URL |
| `created_at`, `updated_at` | `datetime` | Даты |

### `GET /api/settings/ai-providers/effective`

Текущие эффективные настройки (активный и fallback провайдеры).

- **Ответ:** `200 OK`, `AIProviderEffectiveOut`.

| Поле | Тип | Описание |
|---|---|---|
| `active` | `EffectiveProviderInfo` \| `null` | Активный провайдер |
| `fallback` | `EffectiveProviderInfo` \| `null` | Fallback-провайдер |
| `effective_model` | `string` \| `null` | Модель, которая будет использована |
| `readiness` | `string` | Готовность |
| `missing_env_keys` | `[string]` | Недостающие переменные окружения |
| `readiness_reason` | `string` \| `null` | Пояснение |
| `warnings` | `[string]` | Предупреждения |

`EffectiveProviderInfo`: `provider_key`, `display_name`, `model_name`, `is_enabled`, `readiness`, `missing_env_keys`, `readiness_reason`.

### `PATCH /api/settings/ai-providers/{provider_key}`

Обновить настройки провайдера.

- **Тело запроса — `AIProviderSettingPatch`:**

| Поле | Тип | Описание |
|---|---|---|
| `display_name` | `string` (мин. 1) \| `null` | Отображаемое имя |
| `model_name` | `string` (мин. 1) \| `null` | Модель |
| `is_enabled` | `boolean` \| `null` | Включён ли |
| `temperature` | `float` (0–2) \| `null` | Температура |
| `max_tokens` | `integer` (1–128000) \| `null` | Макс. токенов |

- **Ответ:** `200 OK`, `AIProviderSettingOut`.

### `POST /api/settings/ai-providers/{provider_key}/activate`

Сделать провайдера активным.

- **Ответ:** `200 OK`, `AIProviderSettingOut`.

### `POST /api/settings/ai-providers/{provider_key}/set-fallback`

Назначить провайдера fallback.

- **Ответ:** `200 OK`, `AIProviderSettingOut`.

### `POST /api/settings/ai-providers/{provider_key}/test`

Проверить готовность провайдера.

- **Ответ:** `200 OK`, `AIProviderTestOut`.

| Поле | Тип | Описание |
|---|---|---|
| `provider_key` | `string` | Ключ |
| `ok` | `boolean` | Успешно ли |
| `readiness` | `string` | Статус готовности |
| `message` | `string` | Сообщение |
| `missing_env_keys` | `[string]` | Недостающие env-переменные |
| `implementation_status` | `string` | Статус реализации |
| `readiness_reason` | `string` \| `null` | Пояснение |

---

## ⚙️ 17. CH Runtime Settings

Базовый префикс: `/api/settings/ch-runtime`.  
Роль: `administrator`.

### `GET /api/settings/ch-runtime`

Текущие runtime-настройки controlled-hybrid.

- **Ответ:** `200 OK`, `ChRuntimeSettingsOut`.

| Поле | Тип | Описание |
|---|---|---|
| `retrieval_top_n` | `integer` (1–20) | Количество кандидатов ретривала |
| `minimum_match_score` | `float` (0–1) | Минимальный score сопоставления |
| `confidence_medium_delta` | `float` (0–1) | Дельта для средней уверенности |
| `default_confidence_threshold` | `float` (0–1) | Порог уверенности по умолчанию (калибровка 31.08.2026: дефолт 0.60 — диапазон подтверждённых оператором выборов 0.48–0.71) |
| `confidence_score_floor` | `float` (0–1) | Абсолютный низ score: ниже — band low («мусорное» совпадение) |
| `confidence_gap_high` | `float` (0–1) | Минимальный отрыв top-1 от второго кандидата для band high |
| `draft_on_medium` | `boolean` | Генерировать черновик при средней уверенности |
| `auto_decision_on_high` | `boolean` | Автоматическое решение при высокой уверенности |
| `retrieval_algorithm_label` | `string` | Описание алгоритма |
| `updated_at` | `datetime` \| `null` | Дата обновления |

### `PATCH /api/settings/ch-runtime`

Изменить runtime-настройки CH.

- **Тело запроса — `ChRuntimeSettingsPatch`:**

| Поле | Тип | Описание |
|---|---|---|
| `retrieval_top_n` | `integer` (1–20) \| `null` | Количество кандидатов |
| `minimum_match_score` | `float` (0–1) \| `null` | Минимальный score |
| `confidence_medium_delta` | `float` (0–1) \| `null` | Дельта medium |
| `default_confidence_threshold` | `float` (0–1) \| `null` | Порог по умолчанию |
| `confidence_score_floor` | `float` (0–1) \| `null` | Абсолютный низ score для low |
| `confidence_gap_high` | `float` (0–1) \| `null` | Минимальный отрыв top-1 для high |
| `draft_on_medium` | `boolean` \| `null` | Генерация черновика |
| `auto_decision_on_high` | `boolean` \| `null` | Авторешение |

- **Ответ:** `200 OK`, `ChRuntimeSettingsOut`.

**Пример запроса:**

```bash
curl -X PATCH http://localhost:8700/api/settings/ch-runtime \
  -H "Content-Type: application/json" \
  -H "X-Role: administrator" \
  -d '{
    "retrieval_top_n": 5,
    "minimum_match_score": 0.65,
    "default_confidence_threshold": 0.75,
    "draft_on_medium": true,
    "auto_decision_on_high": false
  }'
```

---

## 🔗 18. Интеграционные примечания

### 18.1 Идемпотентность

API **не реализует ключи идемпотентности** (`Idempotency-Key`). При повторной отправке `POST /api/reviews` будет создано новое обращение. Клиенты должны самостоятельно:

- либо отслеживать успешный ответ и не повторять запрос;
- либо добавлять собственный уровень дедупликации перед вызовом API.

### 18.2 Формат `request_number`

`request_number` формируется автоматически на основе `order_number` и внутреннего порядкового номера обращения. Для проверки статуса используйте именно значение из `ReviewCreateResponse.request_number`. Не пытайтесь генерировать его самостоятельно.

### 18.3 CORS

В `main.py` включён либеральный CORS:

```python
allow_origins=["*"]
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```

Это означает, что запросы из браузерных виджетов, frontend-приложений и n8n будут приниматься без дополнительной настройки на стороне API.

### 18.4 Webhook-readiness

В текущей версии API **не предоставляет webhook-эндпоинтов** для внешних систем. Интеграторы должны использовать polling по эндпоинтам:

- `GET /api/reviews/requests/{request_number}/status` — для клиентских виджетов;
- `GET /api/operator/reviews` — для операторских панелей;
- `GET /api/admin/reports/...` — для регулярной выгрузки аналитики.

### 18.5 Интеграция с Kommo / Bitrix24

Типичный сценарий:

1. В CRM настроена автоматизация, которая при смене статуса сделки или получении сообщения клиента вызывает `POST /api/reviews`.
2. В теле передаётся `order_number` из CRM, `customer_name`, `email` и `review_text`.
3. Полученный `request_number` сохраняется в CRM-карточке для последующей проверки статуса.
4. После публикации ответа (`status=published`) CRM может забрать `final_response` через `GET /api/reviews/requests/{request_number}/status` и отправить клиенту.

### 18.6 Интеграция с n8n

- Все эндпоинты возвращают строгий JSON и совместимы с HTTP Request node.
- Для админских/операторских операций добавьте заголовок `X-Role: administrator` или `X-Role: operator`.
- Для публичного создания отзыва заголовок `X-Role` можно не передавать.
- Экспорт отчётов (`/api/admin/reports/{report_key}/export`) возвращает бинарный файл — в n8n используйте соответствующий режим обработки файлов.

### 18.7 Безопасность

- API-ключи AI-провайдеров не возвращаются в ответах; передаются только флаги `api_key_configured` / `missing_env_keys`.
- `X-Role` — это демо-ролевая модель. Для публичного продакшена рекомендуется добавить слой аутентификации (например, API-токены, OAuth2 или reverse-proxy с авторизацией).

---

## 📚 19. Связанные документы

- [🏠 `README.md`](../README.md) — главная страница проекта.
- [🚀 `docs/DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) — развёртывание.
- [⚙️ `docs/OPERATIONS.md`](OPERATIONS.md) — эксплуатация, логи, backup, AI-провайдеры.
- [🏗️ `docs/ARCHITECTURE.md`](ARCHITECTURE.md) — архитектура.
- [🧠 `docs/CONTROLLED_HYBRID.md`](CONTROLLED_HYBRID.md) — описание Controlled Hybrid pipeline.
- [💰 `docs/BUSINESS_VALUE.md`](BUSINESS_VALUE.md) — бизнес-ценность.
- [🎬 `docs/SYSTEM_DEMO.md`](SYSTEM_DEMO.md) — live demo и скриншоты.
- [🎬 `docs/E2E_SCENARIOS.md`](E2E_SCENARIOS.md) — сквозные бизнес-сценарии.
- [📖 `docs/USER_GUIDE.md`](USER_GUIDE.md) — руководство клиента.
- [🔧 `docs/OPERATOR_GUIDE.md`](OPERATOR_GUIDE.md) — руководство оператора.
- [🎛️ `docs/ADMIN_GUIDE.md`](ADMIN_GUIDE.md) — руководство администратора.
- [❓ `docs/FAQ.md`](FAQ.md) — ответы на частые вопросы.
- [🧪 `docs/examples/`](examples/) — примеры запросов и ответов API.

---

## 📝 20. Резюме ролевого доступа

| Роль | Разрешённые префиксы |
|---|---|
| `client` / без заголовка | `/health`, `/api/reviews` |
| `operator` | `/health`, `/api/reviews`, `/api/operator/reviews`, `/api/reference` |
| `administrator` | все перечисленные выше префиксы |
