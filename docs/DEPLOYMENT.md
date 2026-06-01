# Запуск и деплой (локально через Docker Compose)

Этот документ описывает запуск **в текущем состоянии репозитория**. Команды и порты взяты из `docker-compose.yml`, `.env.example`, `backend/Dockerfile`, `frontend/Dockerfile`.

---

## 1. Требования

- Docker + Docker Compose (плагин `docker compose`)

---

## 2. Быстрый локальный запуск

Из корня репозитория:

```bash
cp .env.example .env
docker compose up --build
```

Ожидаемые порты (из `docker-compose.yml`):

- Frontend: `http://localhost:5180` (порт хоста 5180 → контейнерный 5173)
- Backend API: `http://localhost:8700`
- Health: `http://localhost:8700/health`

---

## 3. Переменные окружения

Пример конфигурации: `.env.example`.

Ключевые параметры:

- **DB**: `DATABASE_URL` (по умолчанию указывает на сервис `postgres` внутри compose‑сети)
- **Frontend → Backend**: `VITE_API_URL` (по умолчанию `http://localhost:8700`)
- **Controlled Hybrid**: `CH_PIPELINE_ENABLED=true|false`
- **AI провайдеры**: `OPENAI_*`, `PROXYAPI_*`, `GIGACHAT_*` (опционально)

---

## 4. Миграции и инициализация БД (как устроено)

В проекте есть два механизма применения SQL:

### 4.1 Инициализация Postgres при первом старте volume

`docker-compose.yml` монтирует в `postgres` контейнер SQL‑файлы в каталог `docker-entrypoint-initdb.d/`.
Они применяются **только при создании нового volume** (первый старт “чистой” БД):

- `infra/db/migrations/001_initial_schema.sql`
- `infra/db/migrations/002_seed_data.sql`
- `infra/db/migrations/003_milestone4_prompt_registry.sql`
- `infra/db/migrations/004_milestone5_observability_metadata.sql`

### 4.2 Миграции backend при каждом старте (с проверкой “применено/нет”)

Backend при старте запускает применение SQL‑миграций из `backend/migrations/*.sql` и фиксирует применённые версии в таблице `schema_migrations`.

Если база уже существует, новые миграции применяются автоматически, а повторно — не накатываются.

---

## 5. Пересоздание “чистой” БД (для демо)

Если нужно заново применить init‑скрипты Postgres и seed‑данные, потребуется пересоздать volume.

```bash
docker compose down -v
docker compose up --build
```

Примечание: `-v` удалит volume `postgres_data` и все данные внутри.

---

## 6. Проверка работоспособности

После старта:

```bash
curl http://localhost:8700/health
```

Если что-то не запускается:

```bash
docker compose ps
docker compose logs backend
docker compose logs frontend
docker compose logs postgres
```

---

## 7. Что требует ручной проверки при развёртывании вне локальной машины

Этот репозиторий даёт локальный compose‑контур. Для “серверного” развёртывания (VPS/CI) требуется вручную уточнить:

- где хранить `.env` и секреты (ключи AI‑провайдеров);
- нужна ли прокси‑конфигурация/домен/HTTPS (в compose этого нет);
- стратегия резервного копирования volume Postgres.

