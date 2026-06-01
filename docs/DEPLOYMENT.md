# Развёртывание Review Flow (локально через Docker Compose)

Пошаговая инструкция для человека, который **впервые открыл репозиторий** и хочет запустить демо на своём компьютере **без чтения исходного кода**. Все команды и порты взяты из [`docker-compose.yml`](../docker-compose.yml), [`.env.example`](../.env.example), [`backend/Dockerfile`](../backend/Dockerfile), [`frontend/Dockerfile`](../frontend/Dockerfile).

Дополнительно о работе с интерфейсом: [Руководство пользователя](USER_GUIDE.md).

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

Три контейнера объединены в одну сеть Docker Compose. Данные PostgreSQL сохраняются в именованном volume `postgres_data` (переживают перезапуск контейнеров, но удаляются командой `docker compose down -v`).

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
| `postgres` | `postgres:16-alpine` | `review-flow-postgres` | не проброшен наружу | — |
| `backend` | `build: ./backend` | `review-flow-backend` | **8700** → 8700 | `postgres` (healthy) |
| `frontend` | `build: ./frontend` | `review-flow-frontend` | **5180** → 5173 | `backend` (healthy) |

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
| `OPENAI_*`, `PROXYAPI_*`, `GIGACHAT_*` | пусто | Опционально: реальный LLM вместо mock |

**Важно:** `VITE_API_URL` должен указывать на адрес backend **с хоста** (`http://localhost:8700`), а не на имя сервиса `backend` — иначе браузер не достучится до API.

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

1. Откройте http://localhost:5180/company
2. Войдите демо-учётной записью (пароли указаны на экране входа):

| Роль | Email | Пароль |
|------|-------|--------|
| Оператор | `operator@northline.local` | `demo` |
| Администратор | `admin@northline.local` | `demo` |

Аутентификация **только в браузере** (localStorage); отдельного сервиса SSO в Compose нет.

**Проверка:** после входа оператор попадает на `/operator/reviews`, администратор — на `/reports`.

---

## 12. Как проверить операторский сценарий

1. Войдите как **оператор** (§11).
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
2. Войдите как **администратор** (`admin@northline.local` / `demo`).
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
| Черновик ответа — явная заглушка | AI-провайдер | В демо часто активен **mock**; ключи в `.env` + настройка в `/settings/ai-providers` (см. [CH pipeline forensics](architecture/ch_pipeline_forensics_after_ch_integration.md)) |
| Init-скрипты не применились | Старый volume | `docker compose down -v` и полный перезапуск (§15) |
| Backend падает на миграции | Логи | `docker compose logs backend` — имя файла в `schema_migrations` / текст SQL-ошибки |

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
- [ ] Оператор (`operator@northline.local`) видит обращение в `/operator/reviews`
- [ ] Админ (`admin@northline.local`) видит типовые ситуации на `/admin/response-cases`
- [ ] Отчёты открываются на `/reports` без ошибки загрузки

---

## Связанные документы

- [README.md](../README.md) — обзор проекта
- [USER_GUIDE.md](USER_GUIDE.md) — сценарии по ролям
- [TZ_COMPLIANCE_REPORT.md](TZ_COMPLIANCE_REPORT.md) — соответствие ТЗ и SQL-источники данных
