# Deployment Validation Report: Review Flow в AI Automation Portfolio Lab

**Кейс:** `review-flow`  
**Дата Validation:** 2026-08-09  
**Окружение:** Репозиторий `cases/review-flow/` в AI Automation Portfolio Lab, изолированный Docker Compose контур.  
**Источник инструкций:** [`docs/DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md).  
**Статус Validation:** ✅ PASS

---

## Краткая сводка

Validation подтверждает, что развёртывание Review Flow из публичного репозитория по `docs/DEPLOYMENT_GUIDE.md` приводит к работоспособной системе в контексте AI Automation Portfolio Lab. Проверка выполнена как часть официального переноса кейса в `cases/review-flow/`: использованы только публичные файлы репозитория, без опоры на внутренние артефакты лаборатории. Все сервисы стартовали, миграции применились, health endpoint отвечает, frontend и API доступны. Проведены smoke-тесты клиентского, операторского и административного контуров.

**Примечание:** публичное prod-размещение с HTTPS-эндпоинтами зафиксировано отдельно в [`docs/deployment-validation-report-prod.md`](deployment-validation-report-prod.md).

---

## Результаты по шагам DEPLOYMENT_GUIDE

| № | Шаг в DEPLOYMENT_GUIDE | Выполненное действие | Ожидаемый результат | Фактический результат | Статус |
|---|------------------------|----------------------|---------------------|-----------------------|--------|
| 1 | §5: подготовка репозитория | `ls docker-compose.yml .env.example` | Оба файла на месте | Оба файла присутствуют | PASS |
| 2 | §6: настройка `.env` | `cp .env.example .env` | Файл `.env` создан | `.env` создан и используется Compose | PASS |
| 3 | §7: первый запуск | `docker compose up --build -d` | Сборка образов и запуск трёх сервисов | Образы backend/frontend собраны, контейнеры запущены | PASS |
| 4 | §8.2: состояние контейнеров | `docker compose ps` | `review-flow-apl-*` — running; postgres/backend — healthy | Все три running с префиксом `review-flow-apl-`; postgres/backend healthy | PASS |
| 5 | §8.1: backend health | `curl http://localhost:8700/health` | `{"status":"ok","database":"connected"}` | `{"status":"ok","database":"connected"}` | PASS |
| 6 | §8.3: frontend | `curl -I http://localhost:5180/` | HTTP 200 и главная страница | HTTP 200, `<title>Review Flow</title>` | PASS |
| 7 | §10: клиентский сценарий | `POST /api/reviews` с тестовыми данными | Обращение создано, возвращён номер | `review_id` и `request_number: NL-00712345-001` получены | PASS |
| 8 | §10: проверка статуса | `GET /api/reviews/{id}/status?email=...` | Страница/ответ со статусом обращения | `status: pending_review`, данные обращения корректны | PASS |
| 9 | §12: операторский сценарий | `GET /api/operator/reviews` с `X-Role: operator` | Очередь содержит созданное обращение | Очередь содержит 1 обращение с корректными полями | PASS |
| 10 | §11/§13: админ-сценарий | `GET /api/admin/scenarios` и `/api/admin/templates` с `X-Role: administrator` | Справочники доступны | Сценарии и шаблоны возвращены в JSON | PASS |

---

## Дополнительные проверки

| Проверка | Команда / Действие | Результат | Статус |
|----------|---------------------|-----------|--------|
| Миграции применены | Лог backend не содержит ошибок SQL; таблицы `schema_migrations`, `reviews`, `rejection_feedback` и другие созданы | БД поднята корректно | PASS |
| Изоляция данных | Использованы уникальные имена volume, network и контейнеров (`review-flow-apl-postgres-data`, `review-flow-apl`, `review-flow-apl-*`) | Конфликтов с другими проектами и с исходным `/opt/review-flow` не обнаружено | PASS |
| OpenAPI документация | `GET http://localhost:8700/docs` | Swagger UI доступен | PASS |

---

## Проблемы, выявленные и устранённые в ходе Validation

| Проблема | Причина | Исправление | Статус |
|----------|---------|-------------|--------|
| `relation "rejection_feedback" does not exist` | `docker-compose.yml` монтировал только init-скрипты 001–004; backend-миграция 010 пыталась изменить несуществующую таблицу | Добавлен `infra/db/migrations/005_rejection_feedback.sql` в init-скрипты Postgres | ✅ Устранено |
| `unterminated dollar-quoted string` | Разделитель миграций наивно разбивал SQL по `;`, ломая PL/pgSQL блоки `DO $$ ... $$;` | В `_split_statements` добавлено отслеживание dollar-quoted блоков | ✅ Устранено |
| `A value is required for bind parameter 'true'` | SQLAlchemy `text()` интерпретировала JSON литерал `true` в `{"nm_demo":true}` как именованный параметр | Выполнение миграций переведено на сырой DBAPI cursor, bypass SQLAlchemy | ✅ Устранено |

---

## Ограничения и область применения

Эта Validation подтверждает воспроизводимость развёртывания внутри AI Automation Portfolio Lab на стандартной машине разработки. Она не является проверкой на абсолютно «голом» VPS — отдельный чистый хост не использовался. Публичное prod-размещение на выделенных HTTPS-субдоменах прошло отдельную проверку и задокументировано в [`deployment-validation-report-prod.md`](deployment-validation-report-prod.md).

## Вывод

Процесс развёртывания Review Flow в `cases/review-flow/` из публичной документации (`DEPLOYMENT_GUIDE.md`) воспроизводим и приводит к работоспособной системе. Все обязательные проверки пройдены. Кейс готов к дальнейшему этапу — подготовке демо-продакшн контура.

---

**Подпись:** AI Automation Portfolio Lab  
**Дата:** 2026-08-09
