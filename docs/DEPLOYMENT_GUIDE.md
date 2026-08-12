# Развёртывание Review Flow (локально через Docker Compose)

Пошаговая инструкция для человека, который **впервые открыл репозиторий** и хочет запустить демо на своём компьютере **без чтения исходного кода**. Все команды и порты взяты из [`docker-compose.yml`](../docker-compose.yml), [`.env.example`](../.env.example), [`backend/Dockerfile`](../backend/Dockerfile), [`frontend/Dockerfile`](../frontend/Dockerfile).

Дополнительно о работе с интерфейсом: [📖 Руководство пользователя](USER_GUIDE.md), [🔧 Руководство оператора](OPERATOR_GUIDE.md), [🎛️ Руководство администратора](ADMIN_GUIDE.md), [❓ Ответы на частые вопросы](FAQ.md).

**Deployment Validation:** инструкция прошла практическую проверку — см. [✅ `deployment-validation-report.md`](deployment-validation-report.md) (локальный Docker Compose) и [✅ `deployment-validation-report-prod.md`](deployment-validation-report-prod.md) (публичное размещение на VPS).

> ⚠️ **Требуется повторная Deployment Validation.** Добавление ops Bearer-токенов, demo-лимитера и build-arg `VITE_OPS_DEMO_TOKEN` меняет процесс развёртывания и конфигурацию (§6, §6a, §11, §11a, §11b). По операционной дисциплине APL (DEPLOYMENT_GUIDE — Source of Truth воспроизводимости) эти изменения требуют практического прохождения развёртывания с нуля в **чистом окружении** и отдельного отчёта `deployment-validation-report-*.md`. До его завершения настоящий документ считается обновлённым, но не валидированным для новой конфигурации. Проверки §11a/§11b — состав этого отчёта.

---

## 1. Для кого эта инструкция

- Разработчик или демонстратор, которому нужен **рабочий стенд на ноутбуке**.
- Аудитор, проверяющий соответствие ТЗ и сценарии Controlled Hybrid.
- Тот, кто **не будет** настраивать production-кластер — для этого в репозитории есть только локальный Compose-контур (см. §18).

Если вы уже знакомы с Docker и проектом, достаточно §6–§9; остальные разделы — для первого запуска и проверки ролей.

---

## 2. Что будет развёрнуто

После успешного запуска на вашей машине работают:

| Компонент | Назначение |
|-----------|------------|
| **PostgreSQL 16** | База данных: обращения, типовые ситуации, промпты, отчёты |
| **Backend (FastAPI)** | REST API, Controlled Hybrid pipeline, миграции при старте |
| **Frontend (React + Vite)** | Веб-интерфейс: клиент, оператор, администратор |

Три контейнера объединены в изолированную сеть `review-flow-apl`. Данные PostgreSQL сохраняются в именованном volume `review-flow-apl-postgres-data` (переживают перезапуск контейнеров, но удаляются командой `docker compose down -v`).

---

## 3. Требования к машине

**Обязательно:**

- ОС: Linux, macOS или Windows с **Docker Desktop** (или эквивалентный Docker Engine + Compose v2).
- Команда в терминале: `docker compose version` (плагин `docker compose`, не устаревший `docker-compose` как отдельный бинарник).
- Свободные порты на хосте: **5180**, **8700** (если заняты — остановите конфликтующие процессы или измените проброс в `docker-compose.yml` вручную; в стандартной инструкции порты не меняются).
- ~2–4 ГБ свободной RAM для сборки и одновременной работы трёх контейнеров (зависит от машины).

**Не обязательно для первого запуска:**

- Ключи OpenAI / ProxyAPI / GigaChat — без них система может работать с **mock**-провайдером (черновик ответа — заглушка; см. §17).
- Установленный Node.js или Python на хосте — всё собирается **внутри** Docker-образов.

**Проверка Docker перед началом:**

```bash
docker --version
docker compose version
```

Ожидается: обе команды завершаются без ошибки и показывают версии.

---

## 4. Состав сервисов Docker Compose

Имена и зависимости — из [`docker-compose.yml`](../docker-compose.yml):

| Сервис | Образ / сборка | Контейнер | Порт на хосте | Зависимости |
|--------|----------------|-----------|---------------|-------------|
| `postgres` | `postgres:16-alpine` | `review-flow-apl-postgres` | не проброшен наружу | — |
| `backend` | `build: ./backend` | `review-flow-apl-backend` | **8700** → 8700 | `postgres` (healthy) |
| `frontend` | `build: ./frontend` | `review-flow-apl-frontend` | **5180** → 5173 | `backend` (healthy) |

**Healthcheck:**

- Postgres: `pg_isready`
- Backend: HTTP `GET http://localhost:8700/health` внутри контейнера
- Frontend стартует только после healthy backend

---

## 5. Подготовка репозитория

1. Склонируйте или распакуйте репозиторий в каталог, например `review-flow`.
2. Откройте терминал **в корне репозитория** (там, где лежат `docker-compose.yml` и `.env.example`).

**Проверка:** в текущей директории есть файл `docker-compose.yml`:

```bash
ls docker-compose.yml .env.example
```

Ожидается: оба файла перечислены без ошибки «No such file».

---

## 6. Настройка `.env`

Скопируйте пример конфигурации:

```bash
cp .env.example .env
```

Файл [`.env.example`](../.env.example) содержит значения по умолчанию для локального демо. Для **первого запуска** обычно достаточно оставить файл как есть.

| Переменная | Значение по умолчанию | Зачем нужна |
|------------|----------------------|-------------|
| `POSTGRES_*`, `DATABASE_URL` | `reviewflow` / хост `postgres` | Подключение backend к БД внутри Compose |
| `BACKEND_HOST`, `BACKEND_PORT` | `0.0.0.0`, `8700` | Порт API |
| `VITE_API_URL` | `http://localhost:8700` | Адрес API с точки зрения **браузера на хосте** |
| `CH_PIPELINE_ENABLED` | `true` | Controlled Hybrid (основной контур) |
| `OPS_ADMIN_TOKEN`, `OPS_OPERATOR_TOKEN`, `OPS_DEMO_TOKEN` | `dev-*-token` | Bearer-токены ops-консоли (см. §6a). Пустые/`YOUR_*` → X-Role fallback |
| `VITE_OPS_DEMO_TOKEN` | `dev-demo-token` | Build-time demo-токен для кнопки read-only demo-входа; должен совпадать с `OPS_DEMO_TOKEN` |
| `DEMO_LIMITER_ENABLED` | `false` | Защита `POST /api/reviews` демо-сессиями (true в prod) |
| `DEMO_MAX_REQUESTS_PER_SESSION`, `DEMO_SESSION_TTL_MINUTES`, `DEMO_RATE_LIMIT_PER_MINUTE`, `DEMO_MAX_SESSIONS_PER_IP_PER_HOUR` | `20` / `30` / `12` / `5` | Параметры демо-лимитера |
| `OPENAI_*`, `PROXYAPI_*`, `GIGACHAT_*` | пусто | Опционально: реальный LLM вместо mock |

**Важно:** `VITE_API_URL` должен указывать на адрес backend **с хоста** (`http://localhost:8700`), а не на имя сервиса `backend` — иначе браузер не достучится до API.

### 6a. Генерация ops-токенов (продакшен)

Для **продакшена** сгенерируйте три сильных случайных токена и впишите их в `.env`:

```bash
openssl rand -hex 32  # → OPS_ADMIN_TOKEN
openssl rand -hex 32  # → OPS_OPERATOR_TOKEN
openssl rand -hex 32  # → OPS_DEMO_TOKEN
```

`VITE_OPS_DEMO_TOKEN` должен совпадать с `OPS_DEMO_TOKEN` — он вшивается в сборку ops-консоли (build-arg `VITE_OPS_DEMO_TOKEN` в [`frontend/Dockerfile.prod`](../frontend/Dockerfile.prod) и [`docker-compose.prod.yml`](../docker-compose.prod.yml)) и активирует кнопку «Войти в демо-режим (только просмотр)».

Пока `OPS_ADMIN_TOKEN` не пуст и не начинается с `YOUR`, ops-эндпоинты требуют Bearer-токен; роль `demo` получает read-only доступ. Для **локальной разработки** значения по умолчанию `dev-*-token` из `.env.example` уже включают ops-аутентификацию; если оставить токены пустыми — работает legacy `X-Role` fallback.

Включение лимитера публичного контура: `DEMO_LIMITER_ENABLED=true` (продакшен). Локально — `false` (эндпоинт `POST /api/reviews` открыт).

После изменения `.env` перезапустите контейнеры (§7).

---

## 7. Первый запуск

Из корня репозитория:

```bash
docker compose up --build
```

- Первый раз займёт несколько минут: сборка образов backend и frontend, скачивание Postgres.
- Логи всех сервисов идут в этот терминал; для остановки нажмите `Ctrl+C`.

**Запуск в фоне** (терминал освободится; логи смотреть через §16):

```bash
docker compose up --build -d
```

**Проверка:** дождитесь в логах backend сообщений о старте Uvicorn и отсутствия повторяющихся ошибок подключения к БД. При `docker compose up -d`:

```bash
docker compose ps
```

Ожидается: у `postgres`, `backend`, `frontend` статус `running`, у postgres и backend — `healthy`.

---

## 8. Проверка успешного запуска

### 8.1 Backend health

```bash
curl http://localhost:8700/health
```

**Ожидаемый ответ** (JSON):

```json
{"status":"ok","database":"connected"}
```

Если `curl` недоступен, откройте в браузере: http://localhost:8700/health

### 8.2 Состояние контейнеров

```bash
docker compose ps
```

**Ожидается:** три сервиса `running`; `postgres` и `backend` — healthy.

### 8.3 Frontend

Откройте в браузере: http://localhost:5180

**Ожидается:** главная страница Northline Market (клиентский сайт), без ошибки «не удаётся подключиться».

---

## 9. Где открыть интерфейс

| Контур | URL |
|--------|-----|
| Клиент (главная) | http://localhost:5180/ |
| Создание обращения | http://localhost:5180/review (открывает форму с главной) |
| Проверка статуса | http://localhost:5180/review/status |
| Вход сотрудников | http://localhost:5180/company |
| Оператор | http://localhost:5180/operator/reviews |
| Админ: типовые ситуации | http://localhost:5180/admin/response-cases |
| Отчёты | http://localhost:5180/reports |
| Backend API (документация OpenAPI) | http://localhost:8700/docs |

---

## 10. Как проверить клиентский сценарий

1. Откройте http://localhost:5180/
2. Нажмите кнопку создания обращения (на главной — переход к форме отзыва).
3. Заполните форму:
   - **Номер заказа** — обязателен (например `NL-00999999`);
   - **Тема** — выберите из списка;
   - **Текст обращения** — не короче 10 символов;
   - **Email** — обязателен (нужен для проверки статуса);
   - **Оценка** — по желанию.
4. Отправьте форму.

**Проверка:** после отправки отображается **номер обращения** (формат `NL-...`). Сохраните номер и email.

5. Откройте http://localhost:5180/review/status , введите номер и email.

**Проверка:** открывается страница статуса; до публикации оператором ответ клиенту может быть ещё не показан.

---

## 11. Как войти в контур компании

Вход в ops-консоль — по **Bearer-токену** (значения берутся из `.env`).

1. Откройте http://localhost:5180/company
2. Вставьте ops-токен в поле «Bearer токен» и нажмите **Войти**:

| Роль | Токен (значение по умолчанию для локального демо) |
|------|------|
| Оператор | `dev-operator-token` (`OPS_OPERATOR_TOKEN`) |
| Администратор | `dev-admin-token` (`OPS_ADMIN_TOKEN`) |

Либо нажмите **«Войти в демо-режим (только просмотр)»** — вход токеном `dev-demo-token` (`VITE_OPS_DEMO_TOKEN`), read-only.

Токен валидируется через `GET /api/auth/whoami`; сессия `{token, role}` хранится в localStorage. Роль `demo` открывает все страницы ops-консоли в режиме **только просмотр**: мутационные кнопки отключены, а прямая попытка мутации даёт понятное сообщение «Демо-режим: только просмотр. Изменения запрещены.» (backend отклоняет с `403`).

**Проверка:** после входа оператор попадает на `/operator/reviews`, администратор — на `/reports`, demo — на `/reports` (read-only). При demo-входе в подвале шапки виден бейдж «Демо-режим: только просмотр».

### 11a. Проверка read-only demo RBAC

1. Войдите через **демо-режим** (§11).
2. Откройте http://localhost:5180/prompts — страница загружается (GET разрешён).
3. Попробуйте активировать промпт или создать версию — кнопки отключены.
4. (Опционально, bypass UI) Прямой запрос с demo-токеном на мутацию возвращает `403`:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH \
  -H "Authorization: Bearer dev-demo-token" \
  -H "Content-Type: application/json" \
  -d '{"retrieval_top_n":5}' \
  http://localhost:8700/api/settings/ch-runtime
# → 403
```

```bash
curl -s http://localhost:8700/api/auth/whoami -H "Authorization: Bearer dev-demo-token"
# → {"role":"demo"}
```

### 11b. Проверка demo-лимитера публичного контура

При `DEMO_LIMITER_ENABLED=false` (локально) `POST /api/reviews` открыт. Чтобы проверить лимитер локально, временно установите `DEMO_LIMITER_ENABLED=true` в `.env` и перезапустите backend (`docker compose restart review-flow-apl-backend`):

```bash
# выпуск демо-токена
curl -s -X POST http://localhost:8700/api/demo/start -H "Content-Type: application/json" -d '{}'
# → {"token":"<32hex>","requests_limit":20,"requests_remaining":20,...}

# статус квоты
curl -s http://localhost:8700/api/demo/status -H "X-Demo-Token: <token>"

# отзыв без токена → 403
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8700/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"Тест","order_number":"R-1","product_area":"general","review_text":"тестовое обращение для проверки"}'
# → 403
```

---

## 12. Как проверить операторский сценарий

1. Войдите как **оператор** (токен `dev-operator-token`, §11).
2. Откройте http://localhost:5180/operator/reviews
3. В очереди найдите обращение из §10 (по номеру или времени).
4. Откройте карточку обращения.

**Проверка в карточке:**

- видна предложенная **типовая ситуация** и уровень **confidence**;
- есть черновик ответа (при mock-провайдере текст может быть шаблонным);
- доступны действия: подтвердить ситуацию, изменить, отредактировать текст, **опубликовать**.

5. Подтвердите типовую ситуацию (если требуется), при необходимости отредактируйте ответ и нажмите **опубликовать**.

6. Вернитесь в клиентский контур: http://localhost:5180/review/status — введите тот же номер и email.

**Проверка:** на странице статуса отображается **опубликованный** ответ.

---

## 13. Как проверить административный сценарий

1. Выйдите из учётки оператора (меню компании → выход) или откройте приватное окно браузера.
2. Войдите как **администратор** (токен `dev-admin-token`, §11).
3. Откройте **типовые ситуации**: http://localhost:5180/admin/response-cases

**Проверка:** список типовых ситуаций загружается (демо-набор из миграций, порядка 20 записей).

4. Откройте **отчёты**: http://localhost:5180/reports

**Проверка:** отображаются вкладки отчётов (обращения клиентов, бизнес-сводка, качество Controlled Hybrid); данные подгружаются без ошибки API в интерфейсе.

Дополнительно (по желанию): `/settings/ai-providers`, `/settings/system` — настройки провайдера и системные параметры.

---

## 14. Как устроены миграции и seed-данные

В проекте **два уровня** SQL-скриптов.

### 14.1 Init-скрипты Postgres (только при новом volume)

При **первом** создании volume `postgres_data` контейнер Postgres выполняет файлы из `docker-entrypoint-initdb.d/` (смонтированы в [`docker-compose.yml`](../docker-compose.yml)):

| Файл в репозитории | Содержимое |
|--------------------|------------|
| [`infra/db/migrations/001_initial_schema.sql`](../infra/db/migrations/001_initial_schema.sql) | Базовая схема таблиц |
| [`infra/db/migrations/002_seed_data.sql`](../infra/db/migrations/002_seed_data.sql) | Сценарии, тональности, legacy KB, начальный промпт классификации |
| [`infra/db/migrations/003_milestone4_prompt_registry.sql`](../infra/db/migrations/003_milestone4_prompt_registry.sql) | Реестр промптов |
| [`infra/db/migrations/004_milestone5_observability_metadata.sql`](../infra/db/migrations/004_milestone5_observability_metadata.sql) | Метаданные observability |

**Повторно эти файлы не выполняются**, пока volume не удалён.

Файлы `infra/db/migrations/005_*.sql` и `006_*.sql` в Compose **не** подключены — их логика дублируется или дополняется backend-миграциями.

### 14.2 Миграции backend (при каждом старте backend)

При запуске приложения вызывается `run_pending_migrations()` ([`backend/app/db/migrate.py`](../backend/app/db/migrate.py)): по очереди применяются все `backend/migrations/*.sql`, которых ещё нет в таблице `schema_migrations`.

Примеры файлов (полный список — каталог [`backend/migrations/`](../backend/migrations/)):

| Файл | Назначение (кратко) |
|------|---------------------|
| `010_classification_reference_fk.sql` | Справочник приоритетов |
| `011_ch_data_model_foundation.sql` | CH: направления, темы, первые типовые ситуации и примеры |
| `012_nm_reference_dataset.sql` | Демо-клиенты, заказы, расширенный набор ТС и примеров |
| `013_ch_runtime_settings.sql` | Параметры CH в БД |
| `014_candidate_type_and_example_learning.sql` | Candidate learning |
| `015_processing_policies_reference.sql` | Политики обработки |

**Проверка после первого старта** (опционально):

```bash
docker compose exec postgres psql -U reviewflow -d reviewflow -c "SELECT version FROM schema_migrations ORDER BY version;"
```

Ожидается: список имён файлов из `backend/migrations/`.

---

## 15. Как сбросить демо-БД и начать заново

Чтобы заново выполнить init-скрипты Postgres и очистить все обращения:

```bash
docker compose down -v
docker compose up --build
```

**Внимание:** флаг `-v` **удаляет volume** `postgres_data` и все данные в БД без восстановления.

**Проверка:** после старта снова выполните `curl http://localhost:8700/health` и создайте новое тестовое обращение (§10).

---

## 16. Как смотреть логи

Все сервисы:

```bash
docker compose logs
```

Один сервис (последние строки):

```bash
docker compose logs backend
docker compose logs frontend
docker compose logs postgres
```

Поток логов в реальном времени:

```bash
docker compose logs -f backend
```

**Проверка при ошибке старта:** в `backend` не должно быть бесконечных `connection refused` к postgres после того, как postgres стал healthy.

---

## 17. Частые проблемы

| Симптом | Что проверить | Действие |
|---------|---------------|----------|
| `port is already allocated` (5180 или 8700) | Занят порт | `docker compose ps`; остановите конфликтующий процесс или измените проброс портов в `docker-compose.yml` |
| Frontend открывается, API не отвечает | Backend не healthy | `docker compose logs backend`, `curl http://localhost:8700/health` |
| Пустая очередь оператора | Обращение не создано или сброшена БД | Повторите §10; убедитесь, что не делали `down -v` после создания |
| CORS / сеть: запросы к API падают | `VITE_API_URL` | В `.env` должно быть `http://localhost:8700`; после смены: `docker compose up --build` |
| Черновик ответа — явная заглушка | AI-провайдер | В демо часто активен **mock**; ключи в `.env` + настройка в `/settings/ai-providers` (см. [🎛️ ADMIN_GUIDE.md](ADMIN_GUIDE.md) раздел AI-провайдеры) |
| Init-скрипты не применились | Старый volume | `docker compose down -v` и полный перезапуск (§15) |
| Backend падает на миграции | Логи | `docker compose logs backend` — имя файла в `schema_migrations` / текст SQL-ошибки |

---

## Развёртывание на VPS через центральный Traefik

Инструкция для **демонстрационного стенда** на удалённом сервере (Ubuntu/Debian), когда на том же сервере уже работает центральный Traefik. Review Flow подключается к существующей внешней Docker-сети и получает HTTPS через Traefik-лейблы.

Публичные точки:

| Сервис | URL |
|--------|-----|
| Web UI (клиент) | https://review-flow.alex-n8n.site |
| Контур компании (оператор + администратор) | https://review-flow-admin.alex-n8n.site/company |
| Backend API | https://review-flow-api.alex-n8n.site/docs |
| Health | https://review-flow-api.alex-n8n.site/health |

Для локального запуска без публичного домена используйте [`docker-compose.yml`](../docker-compose.yml) (см. §6–§9). Для публичного размещения используйте [`docker-compose.prod.yml`](../docker-compose.prod.yml).

Подробные сценарии в UI: [📖 Руководство пользователя](USER_GUIDE.md), [🔧 Руководство оператора](OPERATOR_GUIDE.md), [🎛️ Руководство администратора](ADMIN_GUIDE.md).

### Когда нужен VPS-сценарий

- Показать MVP коллегам или заказчику **без** установки Docker на их ноутбуки.
- Держать **постоянно доступный** демо-стенд (IP или домен).
- Проверить работу CH pipeline в среде, близкой к «серверу», а не только на localhost.

Локальный запуск (§6–§9) и VPS отличаются главным образом **сетью и `.env`**: на VPS `localhost` в браузере пользователя — это **его компьютер**, а не сервер.

| | Локально (ноутбук) | На VPS |
|---|-------------------|--------|
| Где крутится Docker | Ваша машина | Удалённый сервер |
| `http://localhost:5180` | UI на вашем ПК | UI только **на самом сервере** (SSH/tunnel) |
| Доступ с другого ПК | Не нужен | Нужны **внешний IP/домен** и открытые порты или reverse proxy |
| `VITE_API_URL` в `.env` | `http://localhost:8700` | URL API **с точки зрения браузера пользователя** (см. ниже) |

### Минимальные требования к серверу

- **ОС:** Ubuntu 22.04/24.04 LTS или Debian 12 (инструкция ниже — под APT).
- **RAM:** от 2 ГБ (комфортнее 4 ГБ при первой сборке образов).
- **Диск:** от 10 ГБ свободного места (образы + volume PostgreSQL).
- **Сеть:** входящий доступ к портам **80** и **443** (они уже должны быть открыты для центрального Traefik).
- **Права:** пользователь с `sudo` для установки Docker.
- **Предварительно:** на сервере развёрнут центральный Traefik с сетью `n8n_default` и certResolver `myresolver`.

### Подготовка сервера

1. Войдите по SSH под непривилегированным пользователем (рекомендуется) с возможностью `sudo`.
2. Обновите пакеты и установите базовые утилиты:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
```

3. (Рекомендуется) настройте часовой пояс и при необходимости swap, если RAM ≤ 2 ГБ.

**Проверка:** `git --version` и `curl --version` выполняются без ошибки.

### Установка Docker и Docker Compose plugin

Установка через **официальный репозиторий Docker** (Ubuntu; на Debian замените `ubuntu` на `debian` в URL репозитория).

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Добавьте пользователя в группу `docker` (чтобы не писать `sudo` перед каждой командой compose):

```bash
sudo usermod -aG docker $USER
```

Выйдите из SSH и зайдите снова (или выполните `newgrp docker`).

**Проверка:**

```bash
docker --version
docker compose version
```

Ожидается: Docker Engine и плагин `docker compose` (v2).

Официальная справка: https://docs.docker.com/engine/install/ubuntu/

### Клонирование репозитория

```bash
cd ~
git clone <URL-вашего-репозитория> review-flow
cd review-flow
```

Замените `<URL-вашего-репозитория>` на фактический remote (HTTPS или SSH). Имя каталога может отличаться — далее команды из **корня клона**, где лежит `docker-compose.yml`.

**Проверка:** `ls docker-compose.yml .env.example`

### Подготовка `.env`

```bash
cp .env.example .env
nano .env
```

**Обязательно для публичного размещения через Traefik:**

```bash
# Адрес API с точки зрения браузера пользователя
VITE_API_URL=https://review-flow-api.alex-n8n.site

# Хосты, которые обслуживает Traefik (оставьте как есть для alex-n8n.site)
REVIEW_FLOW_WEB_HOST=review-flow.alex-n8n.site
REVIEW_FLOW_ADMIN_HOST=review-flow-admin.alex-n8n.site
REVIEW_FLOW_API_HOST=review-flow-api.alex-n8n.site

# PostgreSQL доступен только внутри Compose-сети Review Flow
POSTGRES_HOST=review-flow-apl-postgres
DATABASE_URL=postgresql+psycopg2://reviewflow:reviewflow@review-flow-apl-postgres:5432/reviewflow

# Ops Bearer-токены (сгенерируйте: openssl rand -hex 32)
OPS_ADMIN_TOKEN=<сгенерированный_админ_токен>
OPS_OPERATOR_TOKEN=<сгенерированный_оператор_токен>
OPS_DEMO_TOKEN=<сгенерированный_demo_токен>
# Build-time demo-токен для ops-консоли (== OPS_DEMO_TOKEN)
VITE_OPS_DEMO_TOKEN=<сгенерированный_demo_токен>

# Защита публичного AI-эндпоинта демо-сессиями
DEMO_LIMITER_ENABLED=true
```

**Секреты:**

- Задайте **надёжный** `POSTGRES_PASSWORD` (и обновите `DATABASE_URL` с тем же паролем).
- Ключи `OPENAI_API_KEY`, `PROXYAPI_KEY`, `GIGACHAT_*` — только в `.env` на сервере.
- `OPS_*_TOKEN` — только в `.env` на сервере; `VITE_OPS_DEMO_TOKEN` вшивается в сборку ops-консоли (build-arg в `docker-compose.prod.yml`), поэтому тоже хранится в `.env` и не коммитится.
- **Не коммитьте** `.env` в git (файл должен оставаться только на сервере).

Значения по умолчанию из [`.env.example`](../.env.example): `POSTGRES_USER=reviewflow`, `POSTGRES_DB=reviewflow`.

### Проверка портов и firewall

В [`docker-compose.prod.yml`](../docker-compose.prod.yml) порты 5180/8700 **не** пробрасываются на хост. Весь входящий трафик идёт через центральный Traefik на портах **80/443**.

Проверьте, что Traefik запущен и слушает 80/443:

```bash
docker compose ps
```

Traefik уже должен быть настроен на сервере.

### Добавление маршрутов в центральный Traefik

Отредактируйте файл динамической конфигурации центрального Traefik (обычно `dynamic.yml` рядом с Compose Traefik). Добавьте роутеры и сервисы для Review Flow:

```yaml
http:
  routers:
    # ... существующие роутеры ...

    review-flow-web:
      rule: "Host(`review-flow.alex-n8n.site`)"
      entryPoints:
        - websecure
      tls:
        certResolver: myresolver
      service: review-flow-web
      priority: 1

    review-flow-admin:
      rule: "Host(`review-flow-admin.alex-n8n.site`)"
      entryPoints:
        - websecure
      tls:
        certResolver: myresolver
      service: review-flow-admin
      priority: 1

    review-flow-api:
      rule: "Host(`review-flow-api.alex-n8n.site`)"
      entryPoints:
        - websecure
      tls:
        certResolver: myresolver
      service: review-flow-api
      priority: 1

  services:
    # ... существующие сервисы ...

    review-flow-web:
      loadBalancer:
        servers:
          - url: "http://review-flow-apl-web-ui:80"

    review-flow-admin:
      loadBalancer:
        servers:
          - url: "http://review-flow-apl-admin-console:80"

    review-flow-api:
      loadBalancer:
        servers:
          - url: "http://review-flow-apl-backend:8700"
```

Перезапустите Traefik, чтобы подхватить изменения:

```bash
cd /opt/n8n
docker compose restart traefik
```

### Первый запуск на VPS

Из корня репозитория:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Первая сборка может занять несколько минут: собираются backend, production-frontend (статика через nginx) и admin-консоль.

**Проверка:** `docker compose -f docker-compose.prod.yml ps` — сервисы `running`, у `review-flow-apl-postgres` и `review-flow-apl-backend` — `healthy`.

### Проверка контейнеров

```bash
docker compose -f docker-compose.prod.yml ps
```

Ожидаемые имена: `review-flow-apl-postgres`, `review-flow-apl-backend`, `review-flow-apl-web-ui`, `review-flow-apl-admin-console`.

### Проверка backend health

```bash
curl https://review-flow-api.alex-n8n.site/health
```

Ожидается: `{"status":"ok","database":"connected"}`

### Проверка frontend из браузера

Откройте в браузере на **своём компьютере**:

```text
https://review-flow.alex-n8n.site/
```

Админка:

```text
https://review-flow-admin.alex-n8n.site/
```

Если страница белая или API не отвечает — проверьте `VITE_API_URL` в `.env` (должен быть `https://review-flow-api.alex-n8n.site`), затем:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Проверка клиентского сценария

1. https://review-flow.alex-n8n.site/ → **«Оставить отзыв»** → заполнить форму → получить номер `NL-...`.
2. **«Проверить статус обращения»** → номер + email.

Подробнее: [📖 USER_GUIDE.md](USER_GUIDE.md).

### Проверка операторского сценария

1. https://review-flow-admin.alex-n8n.site/company
2. Вход по Bearer-токену: вставьте `OPS_OPERATOR_TOKEN` в поле «Bearer токен» → **«Войти»**
3. Очередь: `/operator/reviews` → открыть обращение → **«Одобрить и отправить»**

### Проверка административного сценария

1. Откройте https://review-flow-admin.alex-n8n.site/company и войдите по Bearer-токену: вставьте `OPS_ADMIN_TOKEN` в поле «Bearer токен» → **«Войти»**
2. `/admin/response-cases` — список типовых ситуаций
3. `/reports` — отчёты загружаются

### Обновление проекта на VPS

```bash
cd /opt/ai-automation-portfolio-lab/cases/review-flow
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

**Проверка:** `curl https://review-flow-api.alex-n8n.site/health` и открытие UI в браузере.

> В репозитории **нет** готового CI/CD: обновление — вручную `git pull` + пересборка контейнеров.

### Просмотр логов

```bash
docker compose -f docker-compose.prod.yml logs -f review-flow-apl-backend
```

```bash
docker compose -f docker-compose.prod.yml logs -f review-flow-apl-web-ui
```

```bash
docker compose -f docker-compose.prod.yml logs -f review-flow-apl-postgres
```

Остановка просмотра: `Ctrl+C` (контейнеры не останавливаются).

Последние строки без follow:

```bash
docker compose -f docker-compose.prod.yml logs --tail=100 review-flow-apl-backend
```

### Перезапуск сервисов

```bash
docker compose -f docker-compose.prod.yml restart
```

Только backend:

```bash
docker compose -f docker-compose.prod.yml restart review-flow-apl-backend
```

### Остановка сервисов

Остановить контейнеры, **сохранить** данные в volume:

```bash
docker compose -f docker-compose.prod.yml down
```

### Сброс демо-БД

**Удаляет все данные** PostgreSQL (обращения, KB, кандидаты):

```bash
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build
```

### Резервное копирование PostgreSQL

Имена пользователя и БД возьмите из `.env` (по умолчанию `reviewflow` / `reviewflow`):

```bash
docker compose -f docker-compose.prod.yml exec review-flow-apl-postgres pg_dump -U reviewflow -d reviewflow > backup_reviewflow_$(date +%Y%m%d).sql
```

**Проверка:** файл `backup_reviewflow_*.sql` ненулевого размера.

Скопируйте backup **с сервера** на безопасное хранилище (`scp`, object storage). Backup в git не кладите.

### Восстановление PostgreSQL из backup

1. Остановите приложение (опционально, чтобы не писали в БД во время restore):

```bash
docker compose stop backend frontend
```

2. Восстановите дамп (имя файла и учётные данные — как в вашем `.env`):

```bash
cat backup_reviewflow_20260601.sql | docker compose exec -T postgres psql -U reviewflow -d reviewflow
```

Для **полной** замены данных на чистой БД часто делают `docker compose down -v`, затем `up -d`, дождаться healthy postgres, и только потом `psql` из backup. Иначе возможны конфликты с существующими строками.

3. Запустите сервисы:

```bash
docker compose up -d
```

**Проверка:** `curl http://localhost:8700/health`

### Что делать с доменом и HTTPS

В текущем репозитории **нет** готовой конфигурации nginx, Traefik или Certbot в `docker-compose.yml`. Для публичного стенда рекомендуется **настроить отдельно** на хосте VPS:

1. DNS A-запись домена → IP сервера.
2. Reverse proxy (nginx / Caddy / Traefik) на **80/443** → проксирование на `127.0.0.1:5180` (UI) и при необходимости `/api` → `127.0.0.1:8700`.
3. TLS-сертификат (Let's Encrypt).
4. Обновить `VITE_API_URL` на публичный HTTPS URL API и пересобрать frontend: `docker compose up -d --build`.

Для **демо** допустимо открыть 5180/8700 напрямую по IP, но трафик не шифруется, а демо-пароли видны в руководствах: [📖 USER_GUIDE](USER_GUIDE.md), [🔧 OPERATOR_GUIDE](OPERATOR_GUIDE.md), [🎛️ ADMIN_GUIDE](ADMIN_GUIDE.md).

### Ограничения текущего VPS-сценария

- Тот же compose, что локально: **Vite dev** во frontend, не статическая production-сборка.
- Демо-аутентификация в браузере, без корпоративного SSO/RBAC на API.
- Нет встроенного HTTPS, мониторинга, автоматических backup по расписанию.
- Открытые порты 5180/8700 — упрощение для демо, не эталон безопасности.
- Это **демонстрационный** стенд, а не сертифицированный production deployment.

### Troubleshooting (VPS)

| Симптом | Вероятная причина | Действие |
|---------|-------------------|----------|
| С браузера ПК UI не открывается | Firewall / cloud security group | Открыть 5180; проверить `ufw` и правила провайдера |
| UI открывается, запросы к API падают | `VITE_API_URL=http://localhost:8700` | Заменить на `http://<IP>:8700` или HTTPS URL; `docker compose up -d --build` |
| `curl localhost:8700/health` OK, с ПК — timeout | Порт 8700 не проброшен наружу | Firewall; или доступ только через SSH tunnel |
| Backend unhealthy | Postgres / миграции | `docker compose logs backend` |
| После `git pull` старое поведение | Не пересобрали образы | `docker compose up -d --build` |
| Закончилось место на диске | Образы Docker | `docker system df`; `docker image prune` (осторожно) |

**SSH-туннель** (если порты наружу открывать нельзя):

```bash
ssh -L 5180:localhost:5180 -L 8700:localhost:8700 user@<IP-сервера>
```

После туннеля на ноутбуке: http://localhost:5180 и `VITE_API_URL=http://localhost:8700` в `.env` на сервере остаются согласованными.

### Чек-лист VPS

- [ ] `docker compose ps` — все сервисы healthy
- [ ] `curl http://localhost:8700/health` на сервере
- [ ] `http://<IP>:5180` открывается с рабочего ПК
- [ ] Клиент создаёт обращение; оператор и админ — по [📖 USER_GUIDE](USER_GUIDE.md), [🔧 OPERATOR_GUIDE](OPERATOR_GUIDE.md), [🎛️ ADMIN_GUIDE](ADMIN_GUIDE.md)
- [ ] `.env` не в git; backup БД снят

---

## 18. Что не входит в локальный compose-контур

Следующее **не поставляется** текущим `docker-compose.yml`:

- HTTPS, доменное имя, reverse proxy (nginx, Traefik).
- Production-сборка frontend (в контейнере запускается `npm run dev` / Vite на порту 5173).
- Отдельный сервис аутентификации (корпоративный SSO, OAuth) — только демо-логин в браузере.
- Резервное копирование PostgreSQL по расписанию.
- Kubernetes, Terraform, CI/CD для деплоя на VPS.
- Интеграция с внешней CRM или тикет-системой.

Для выноса на сервер нужно отдельно спланировать: секреты, статическая сборка frontend, прокси к backend, бэкапы volume.

---

## Чек-лист после развёртывания

Отметьте пункты после прохождения §8–§13:

- [ ] Frontend открыт: http://localhost:5180
- [ ] Backend health отвечает: `curl http://localhost:8700/health` → `{"status":"ok","database":"connected"}`
- [ ] Клиент может создать обращение и получить номер `NL-...`
- [ ] Оператор (вход по `OPS_OPERATOR_TOKEN`) видит обращение в `/operator/reviews`
- [ ] Админ (вход по `OPS_ADMIN_TOKEN`) видит типовые ситуации на `/admin/response-cases`
- [ ] Отчёты открываются на `/reports` без ошибки загрузки

---

## Связанные документы

- [README.md](../README.md) — обзор проекта
- [📖 USER_GUIDE.md](USER_GUIDE.md) — руководство клиента
- [🔧 OPERATOR_GUIDE.md](OPERATOR_GUIDE.md) — руководство оператора
- [🎛️ ADMIN_GUIDE.md](ADMIN_GUIDE.md) — руководство администратора
- [❓ FAQ.md](FAQ.md) — ответы на частые вопросы
- [📋 TZ_COMPLIANCE_REPORT.md](TZ_COMPLIANCE_REPORT.md) — соответствие ТЗ и SQL-источники данных
- [⚙️ OPERATIONS.md](OPERATIONS.md) — эксплуатация, логи, backup, AI-провайдеры
- [✅ deployment-validation-report.md](deployment-validation-report.md) — отчёт о локальном Deployment Validation
- [✅ deployment-validation-report-prod.md](deployment-validation-report-prod.md) — отчёт о публичном размещении
