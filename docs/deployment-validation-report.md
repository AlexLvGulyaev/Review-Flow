# Deployment Validation Report: Review Flow

**Кейс:** `review-flow`  
**Дата последней Validation:** 2026-09-01  
**Окружение:** изолированный Docker-in-Docker хост (`docker:29.7.2-dind`) — чистое окружение.  
**Источник инструкций:** [`docs/DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md).  
**Статус Validation:** ✅ PASS (после устранения одной находки — см. раздел «Выявленные дефекты»)

---

## Повторная Validation (2026-09-01) — чистое окружение dind

**Зачем:** волны изменений 31.08–01.09 (аудит-подсистема с миграциями 018/019, demo sessions 016, gap-banding 017, RBAC по Bearer-токенам, наблюдаемость) не были покрыты Validation от 09.08 (эпоха `X-Role`).

**Чистота окружения:** контейнер `docker:29.7.2-dind` с собственным Docker-демоном; внутри — свежий `git clone` публичного репозитория `AlexLvGulyaev/Review-Flow` (HEAD `88338c9`) + дельта рабочих изменений, применённая патчем (`git apply`): `docs/ARCHITECTURE.md` (docs-only, на деплоймент не влияет) и `docker-compose.yml` (исправление дефекта №1, см. ниже). Никаких знаний, кроме публичного репозитория и гайда, не использовалось. Прогон — строго по разделам DEPLOYMENT_GUIDE; браузерные шаги (§8.3 визуально, §9–§13 клики в UI) выполнены на уровне API/HTML, визуальную приёмку осуществляет владелец.

### Результаты по шагам DEPLOYMENT_GUIDE

| № | Шаг гайда | Действие | Ожидаемо | Фактически | Статус |
|---|-----------|----------|----------|------------|--------|
| 1 | §3–§4 | Требования к машине, состав сервисов | Docker + Compose v2, порты 5180/8700 | dind: Docker 29.7.2, Compose v2, порты свободны | PASS |
| 2 | §5 | `git clone` + `ls docker-compose.yml .env.example` | Оба файла на месте | Оба файла на месте | PASS |
| 3 | §6 | `cp .env.example .env` | `.env` создан, дефолты локального демо | Создан; `OPS_*` = `dev-*-token`, `DEMO_LIMITER_ENABLED=false` | PASS |
| 4 | §7 | `docker compose up --build -d` | Сборка и старт 3 сервисов | Собраны; backend `Healthy`, frontend стартовал после healthy backend | PASS |
| 5 | §8.1 | `GET /health` | `{"status":"ok","database":"connected"}` | Точное совпадение | PASS |
| 6 | §8.2 | `docker compose ps` | 3 × running; postgres/backend healthy | Все 3 running; postgres/backend healthy | PASS |
| 7 | §8.3 | `GET http://localhost:5180/` | HTTP 200, главная | HTTP 200, HTML клиентского портала | PASS |
| 8 | §11 | `GET /api/auth/whoami` с тремя токенами | `administrator` / `operator` / `demo` | **Сначала FAIL** (все → `client`, дефект №1); после исправления compose — точное совпадение | PASS после фикса |
| 9 | §11a | Мутация с demo-токеном | `403` | `403` (PATCH `/api/settings/ch-runtime`) | PASS |
| 10 | §11a | Мутация без токена | `401` | `401` | PASS |
| 11 | §10 | `POST /api/reviews` (лимитер выключен) | Обращение создано, номер `NL-...` | `request_number: NL-00999999-001`, `pending_review` | PASS |
| 10→ | §10 | `GET .../status?email=...` | Статус обращения | `pending_review`, данные корректны | PASS |
| 12 | §12 | `GET /api/operator/reviews` + карточка | Очередь и карточка с CH-предложением | Очередь 200; карточка содержит обращение и CH-контекст | PASS |
| 13 | §12 | `POST .../confirm-case` → `POST .../approve` | Подтверждение и публикация | Оба `200`; `moderation_status: approved`, `publication_status: published` | PASS |
| 14 | §12 | Повторная проверка статуса клиентом | Клиент видит опубликованный ответ | `status: published`, `final_response` заполнен | PASS |
| 15 | §13 | `GET /api/admin/response-cases` | Демо-набор ~20 записей | `200` | PASS |
| 16 | §13 | Отчёты `GET /api/admin/reports/{customer-reviews,ch-quality,business-problems}` | Отчёты отдаются без ошибок API | Все `200` | PASS |
| 17 | §11b | Лимитер: `DEMO_LIMITER_ENABLED=true`, `POST /api/demo/start` | Токен 32 hex, квота `20/20` | Точное совпадение (`requests_remaining: 20`, TTL) | PASS |
| 18 | §11b | `POST /api/reviews` без токена / с токеном | `403` / `201` | `403` / `201`; лимитер возвращён в `false` | PASS |
| 19 | §14 | Миграции: `schema_migrations` | Полный список, включая 016–019 | 17 миграций: `...015` + `016_demo_sessions`, `017_ch_confidence_gap_banding`, `018_audit_logs`, `019_audit_seq_number` | PASS |
| 20 | §14 | Таблицы новых подсистем | `audit_logs`, `demo_sessions` созданы | Обе таблицы на месте | PASS |
| 21 | — | Наблюдаемость: `GET /api/logs`, `GET /api/audit` | `200` | Оба `200` | PASS |
| 22 | — | Аудит-подсистема пишет события | События с ролью, IP, seq_number | `review_submitted`, `operator_case_confirmed`, `moderation_approved`, `review_status_checked` — с IP и монотонным `seq_number`; демо-обращение помечено `demo_mode: true` | PASS |

### Выявленные дефекты и их устранение

| # | Дефект | Симптом | Root cause | Исправление |
|---|--------|---------|------------|-------------|
| 1 | Локальный `docker-compose.yml` не пробрасывал `OPS_ADMIN_TOKEN`/`OPS_OPERATOR_TOKEN`/`OPS_DEMO_TOKEN`, `DEMO_LIMITER_ENABLED` и параметры лимитера в backend, а `VITE_OPS_DEMO_TOKEN` — во frontend | §11/§11a невыполнимы: `whoami` со всеми dev-токенами возвращает `role: client`, мутации дают `403` на всё | Волна 12.08–01.09 добавила токен-аутентификацию в код (prod-состав получает `env_file: .env`), но локальный compose с явным списком `environment` не обновили | В `docker-compose.yml` (локальный сценарий) добавлены 9 переменных в `environment` backend и `VITE_OPS_DEMO_TOKEN` во frontend; шаг §11 повторён — PASS |

**Ход валидации:** находка №1 обнаружена на шаге §11 → исправление внесено в репозиторий → шаг повторён успешно → валидация продолжена и завершена. По правилам APL дефект чинится в ходе прогона с повтором шага, а не останавливает валидацию.

### Teardown

`docker compose down -v` (volume `review-flow-apl-postgres-data` удалён), контейнер dind удалён, временные файлы (патч дельты) удалены.

### Вывод (2026-09-01)

**Validation PASS.** Развёртывание Review Flow с нуля по `docs/DEPLOYMENT_GUIDE.md` в чистом окружении воспроизводимо; система работоспособна целиком, включая волны 31.08–01.09: токен-RBAC (§11/§11a), demo-лимитер (§11b), клиентский и операторский циклы, миграции 016–019, наблюдаемость и аудит. Обязательное условие для будущих волн: локальный `docker-compose.yml` при добавлении новых переменных окружения должен дополняться синхронно с backend.

---

## Исторический прогон (2026-08-09) — эпоха `X-Role`, до волны токен-аутентификации

> Результаты ниже зафиксированы на 09.08 и отражают состояние до введения Bearer-токенов, demo-лимитера, наблюдаемости/аудита и gap-banding (волны 12.08–01.09). Сохранены как история; актуальной считается Validation от 01.09 выше.

**Дата Validation:** 2026-08-09  
**Окружение:** Локальный Docker Compose контур.  
**Источник инструкций:** [`docs/DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md).  
**Статус Validation:** ✅ PASS

---

## Краткая сводка

Validation подтверждает, что развёртывание Review Flow по `docs/DEPLOYMENT_GUIDE.md` приводит к работоспособной системе. Все сервисы стартовали, миграции применились, health endpoint отвечает, frontend и API доступны. Проведены smoke-тесты клиентского, операторского и административного контуров.

**Примечание:** публичное prod-размещение с HTTPS-эндпоинтами зафиксировано отдельно в [🚀 `docs/deployment-validation-report-prod.md`](deployment-validation-report-prod.md).

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

Эта Validation подтверждает воспроизводимость развёртывания локально по `docs/DEPLOYMENT_GUIDE.md`. Публичное prod-размещение на выделенных HTTPS-субдоменах прошло отдельную проверку и задокументировано в [🚀 `deployment-validation-report-prod.md`](deployment-validation-report-prod.md).

## Вывод

Процесс развёртывания Review Flow по `docs/DEPLOYMENT_GUIDE.md` воспроизводим и приводит к работоспособной системе. Все обязательные проверки пройдены.

---

**Дата:** 2026-08-09