# ⚙️ Review Flow — руководство по эксплуатации

**Проект:** review-flow  
**Дата:** 2026-08-09  
**Статус:** Актуален: логи, мониторинг, резервное копирование, AI-провайдеры, обновление системы.

---

## 🎯 1. Назначение

Это руководство по **эксплуатации** Review Flow. Оно описывает:

- как смотреть логи и health;
- как делать backup и restore PostgreSQL;
- как менять AI-провайдеры и runtime-параметры Controlled Hybrid;
- как обновлять систему;
- типовые инциденты и их устранение.

Перед эксплуатацией разверните стенд по [🚀 `DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md).

---

## 📊 2. Мониторинг и health

### 2.1. Backend health

```bash
curl http://localhost:8700/health
```

**Ожидаемый ответ:**

```json
{"status":"ok","database":"connected"}
```

Публичный demo: `https://review-flow-api.alex-n8n.site/health`.

---

### 2.2. Состояние контейнеров

```bash
docker compose ps
```

**Ожидается:** все сервисы `running`, `postgres` и `backend` — `healthy`.

---

### 2.3. OpenAPI / docs

```bash
curl -I http://localhost:8700/docs
```

Должен вернуться `HTTP 200`. Swagger UI доступен по `/docs`, альтернативная схема — `/openapi.json`.

---

## 📜 3. Логи

### 3.1. Все сервисы

```bash
docker compose logs
```

---

### 3.2. Один сервис

```bash
docker compose logs backend
docker compose logs frontend
docker compose logs postgres
```

---

### 3.3. Логи в реальном времени

```bash
docker compose logs -f backend
```

---

### 3.4. Что искать при проблемах

| Паттерн | Значение |
|---|---|
| `connection refused` к `postgres` | Postgres ещё не healthy; проверьте `docker compose ps` |
| `relation "..." does not exist` | Миграции не применились; см. раздел 7 |
| `timeout` в запросах к LLM | Провайдер медленно отвечает или недоступен |
| повторяющиеся `422` | Невалидные запросы от frontend; проверьте `VITE_API_URL` |

---

## 💾 4. Резервное копирование и восстановление

### 4.1. Backup PostgreSQL

Локально:

```bash
docker compose exec postgres pg_dump -U reviewflow -d reviewflow > backup_reviewflow_$(date +%Y%m%d).sql
```

На VPS:

```bash
docker compose -f docker-compose.prod.yml exec review-flow-apl-postgres pg_dump -U reviewflow -d reviewflow > backup_reviewflow_$(date +%Y%m%d).sql
```

**Проверка:** файл ненулевого размера.

> 💡 **Совет:** регулярно копируйте backup с сервера на внешнее хранилище. Backup не кладите в git.

---

### 4.2. Восстановление из backup

1. Остановите backend и frontend (опционально):

```bash
docker compose stop backend frontend
```

2. Восстановите дамп:

```bash
cat backup_reviewflow_20260601.sql | docker compose exec -T postgres psql -U reviewflow -d reviewflow
```

3. Запустите сервисы:

```bash
docker compose up -d
```

4. Проверьте health:

```bash
curl http://localhost:8700/health
```

> ⚠️ **Внимание:** для полной замены данных часто проще сделать `docker compose down -v`, затем `up -d`, дождаться healthy postgres, и только потом заливать backup. Иначе возможны конфликты с существующими строками.

---

### 4.3. Сброс демо-БД

**Удаляет все данные** PostgreSQL:

```bash
docker compose down -v
docker compose up --build
```

---

## 🤖 5. AI-провайдеры

### 5.1. Просмотр текущих провайдеров

```bash
curl http://localhost:8700/api/settings/ai-providers/effective \
  -H "X-Role: administrator"
```

---

### 5.2. Смена активного провайдера

```bash
curl -X POST http://localhost:8700/api/settings/ai-providers/openai/activate \
  -H "Content-Type: application/json" \
  -H "X-Role: administrator"
```

Возможные `provider_key`: `openai`, `gigachat`, `proxyapi`, `mock`.

---

### 5.3. Проверка готовности провайдера

```bash
curl -X POST http://localhost:8700/api/settings/ai-providers/openai/test \
  -H "Content-Type: application/json" \
  -H "X-Role: administrator"
```

**Важно:** API-ключи задаются в `.env` (`OPENAI_API_KEY`, `GIGACHAT_*`, `PROXYAPI_KEY`). Изменения `.env` требуют пересборки и перезапуска контейнеров.

---

### 5.4. Когда mock-провайдер не подходит

Mock возвращает шаблонный черновик. Для демо работы с реальной адаптацией текста активируйте реального провайдера и убедитесь, что:

- ключ в `.env` задан;
- провайдер **enabled**;
- проверка `/test` проходит без `missing_env_keys`.

---

## ⚙️ 6. Настройка Controlled Hybrid runtime

### 6.1. Просмотр текущих настроек

```bash
curl http://localhost:8700/api/settings/ch-runtime \
  -H "X-Role: administrator"
```

---

### 6.2. Изменение параметров

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

| Параметр | Зачем |
|---|---|
| `retrieval_top_n` | Сколько альтернатив показывать оператору |
| `minimum_match_score` | Минимальный score совпадения примера |
| `default_confidence_threshold` | Порог уверенности по умолчанию |
| `confidence_medium_delta` | Дельта для границы «средней» уверенности |
| `draft_on_medium` | Генерировать черновик при средней уверенности |
| `auto_decision_on_high` | Автоматическое решение при высокой уверенности (в demo обычно выключено) |

---

## 🔁 7. Обновление системы

### 7.1. Обычное обновление

```bash
git pull
docker compose up -d --build
```

---

### 7.2. Обновление с миграциями

Backend при старте автоматически применяет новые SQL-миграции из `backend/migrations/`. Если добавились init-скрипты Postgres, может потребоваться сброс volume:

```bash
docker compose down -v
docker compose up --build
```

> ⚠️ **Внимание:** `-v` удаляет все данные. Сделайте backup перед сбросом.

---

### 7.3. Проверка после обновления

1. `docker compose ps` — все сервисы running/healthy.
2. `curl http://localhost:8700/health` — OK.
3. Создайте тестовое обращение через UI или API.
4. Проверьте операторскую очередь с `X-Role: operator`.

---

## 🗄️ 8. Операционные логи через API

### 8.1. Просмотр логов

```bash
curl "http://localhost:8700/api/logs?limit=100" \
  -H "X-Role: administrator"
```

Фильтры:

- `event_type` — тип события;
- `review_id` — UUID обращения.

---

### 8.2. Экспорт отчётов

```bash
curl "http://localhost:8700/api/admin/reports/customer-reviews/export?format=csv&period=30" \
  -H "X-Role: administrator" \
  --output customer-reviews-30d.csv
```

Доступные `report_key`: `customer-reviews`, `business-problems`, `ch-quality`.  
Доступные `format`: `csv`, `xlsx`, `pdf`.

---

## 🛠️ 9. Типовые инциденты

| Симптом | Причина | Решение |
|---|---|---|
| `port is already allocated` | Занят порт 5180 или 8700 | Остановите конфликтующий процесс или измените проброс портов |
| Frontend открывается, API не отвечает | Backend не healthy | `docker compose logs backend`, проверьте `curl http://localhost:8700/health` |
| Пустая очередь оператора | Обращение не создано или сброшена БД | Создайте обращение; убедитесь, что не делали `down -v` |
| CORS / сеть: запросы к API падают | Неверный `VITE_API_URL` | В `.env` должен быть адрес API с точки зрения браузера; пересоберите frontend |
| Черновик ответа — явная заглушка | Активен **mock** | Активируйте реального провайдера и проверьте ключи |
| Низкая уверенность у всех обращений | Мало retrieval-примеров или завышен порог | Добавьте примеры в типовые ситуации, скорректируйте `default_confidence_threshold` |
| Backend падает на миграции | Конфликт в `schema_migrations` | `docker compose logs backend`, найдите имя файла и текст SQL-ошибки |
| Init-скрипты не применились | Старый volume | `docker compose down -v` и полный перезапуск |

---

## 📚 Связанные документы

- [🏠 `README.md`](../README.md) — главная страница проекта.
- [🚀 `docs/DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) — развёртывание.
- [🔌 `docs/API_CONTRACT.md`](API_CONTRACT.md) — REST API контракт.
- [🎛️ `docs/ADMIN_GUIDE.md`](ADMIN_GUIDE.md) — управление типовыми ситуациями, кандидатами, настройками.
- [🔧 `docs/OPERATOR_GUIDE.md`](OPERATOR_GUIDE.md) — операторская работа.
- [🧠 `docs/CONTROLLED_HYBRID.md`](CONTROLLED_HYBRID.md) — архитектурная модель.
