# Архитектура Review Flow

Документ описывает **реализованную архитектуру** Review Flow как демонстрационного MVP, а также отделяет:

- **as‑is (реализовано в коде)**;
- **target (описано в SOT/архитдоках, но может быть не реализовано целиком)**;
- **roadmap/future work**.

Нормативный источник решений: `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`.

---

## 1. Общая схема системы (as‑is)

```text
Browser (React UI)
  ├─ Клиентский контур: /, /review, /review/status
  └─ Контур компании:
       ├─ Оператор: /operator/reviews
       └─ Администратор: /reports, /logs, /prompts, /evaluation, /settings/*, /admin/*
            ↓
Backend API (FastAPI, Python)
  ├─ Ingestion: приём обращения клиента
  ├─ Controlled Hybrid pipeline (опционально, по флагу):
  │     retrieval → confidence → decision → draft generation (bounded LLM / mock)
  ├─ Operator workflow: подтверждение/override, публикация
  └─ Admin workflow: KB (Response Cases), кандидаты, отчёты, настройки
            ↓
PostgreSQL
  ├─ обращения/ответы/статусы
  ├─ Response Cases + retrieval‑примеры + кандидаты (Controlled Hybrid)
  └─ операционные логи и отчётность
```

Запуск: `docker-compose.yml` поднимает `postgres`, `backend`, `frontend`.

---

## 2. Контуры и роли

### 2.1 Клиентский контур

**Назначение:** анонимный доступ клиента к созданию обращения и просмотру статуса.  
**Ключевой инвариант (Controlled Hybrid):** клиент **не видит** внутренних сущностей `Response Case`, confidence и результаты retrieval (см. `docs/architecture/controlled_hybrid_operational_model.md`, раздел о C3).

Реализованные маршруты (frontend):

- `/` — главная
- `/review` — отправка обращения
- `/review/status` и `/review/status/:requestNumber` — проверка статуса и просмотр опубликованного ответа

### 2.2 Контур компании — оператор

**Назначение:** обработка очереди обращений и human‑in‑the‑loop контроль.

Реализованные сценарии (as‑is):

- очередь обращений и карточка обращения;
- просмотр предложенной типовой ситуации и confidence (в режиме Controlled Hybrid);
- редактирование текста ответа и публикация;
- эскалация через “ни одна ситуация не подходит” (создание candidate).

### 2.3 Контур компании — администратор

**Назначение:** управление знаниями и качеством.

Реализованные области (as‑is):

- отчёты: `/reports`
- логи: `/logs`
- промпты: `/prompts`
- evaluation: `/evaluation`
- настройки AI‑провайдеров: `/settings/ai-providers`
- системные настройки: `/settings/system`
- справочники/KB: `/admin/*` (включая `response-cases`)

---

## 3. Backend API (as‑is)

Backend — FastAPI приложение (`backend/app/main.py`), использует PostgreSQL и хранит доменные сущности в БД.

### 3.1 Примеры ключевых API (не полный список)

- **Клиентский сценарий**:
  - `POST /api/reviews` — создать обращение
  - `GET /api/reviews/requests/{request_number}/status?email=...` — получить статус по номеру и email
- **Оператор**:
  - `GET /api/operator/reviews` — очередь
  - действия по модерации/публикации и Controlled Hybrid решениям (confirm/override/candidate) — см. реализацию в `backend/app/api/operator.py` и сервисах `backend/app/services/controlled_hybrid/*`
- **Администратор**:
  - CRUD и управление типовыми ситуациями: `GET/POST /api/admin/response-cases...`
  - отчётность: `/api/admin/reports...`
  - настройки: `/api/settings/*`

Документация пользователя опирается на UI‑маршруты и “видимые” функции; точный контракт API лучше сверять по OpenAPI схеме backend.

---

## 4. PostgreSQL и миграции (as‑is)

### 4.1 Инициализация БД в Docker Compose

`docker-compose.yml` монтирует SQL‑файлы в `postgres` контейнер как `docker-entrypoint-initdb.d/*`. Эти файлы применяются **только на первом старте** нового volume:

- `infra/db/migrations/001_initial_schema.sql`
- `infra/db/migrations/002_seed_data.sql`
- `infra/db/migrations/003_milestone4_prompt_registry.sql`
- `infra/db/migrations/004_milestone5_observability_metadata.sql`

### 4.2 Применение миграций backend (as‑is)

Backend при старте выполняет `run_pending_migrations()` и применяет SQL‑миграции из `backend/migrations/*.sql`, записывая версию в таблицу `schema_migrations`.

Это позволяет донакатывать изменения поверх уже созданной БД без ручного запуска SQL.

---

## 5. Controlled Hybrid pipeline (as‑is + норматив)

Семантика Controlled Hybrid (важно):

- **retrieval** подбирает наиболее подходящую типовую ситуацию (`Response Case`) по примерам;
- система вычисляет **confidence** на основе результатов retrieval;
- **LLM не принимает бизнес‑решение** и не “выбирает” ситуацию;
- LLM (или mock‑провайдер) используется для **адаптации текста** в рамках `response_policy` и `approved_response_text`;
- оператор подтверждает или меняет решение, а при отсутствии подходящей ситуации запускает learning loop через candidate.

Нормативное описание: `docs/architecture/controlled_hybrid_operational_model.md`.  
Forensics после интеграции CH: `docs/architecture/ch_pipeline_forensics_after_ch_integration.md`.

### 5.1 Переключение режима

Поведение pipeline определяется флагом окружения:

- `CH_PIPELINE_ENABLED=true` — Controlled Hybrid pipeline
- `CH_PIPELINE_ENABLED=false` — legacy‑режим (для сравнения/регрессии)

См. `.env.example`.

---

## 6. Lifecycle обращения (as‑is)

Упрощённый цикл жизни обращения:

```text
Создано клиентом
→ обработка в backend (retrieval + draft)
→ на проверке у оператора
→ опубликовано (клиент видит final_response)
```

Детальная семантика статусов для клиентского UX описана в `docs/architecture/controlled_hybrid_operational_model.md` (раздел о C3: клиент не должен видеть внутренние статусы/сущности).

---

## 7. Lifecycle новой типовой ситуации (learning loop)

Реализованный демонстрационный цикл (в терминах UI):

```text
Оператор: “нет подходящей типовой ситуации” → создать candidate
→ Администратор: обработать candidate
   ├─ создать новую типовую ситуацию
   └─ или присоединить candidate к существующей
→ candidate становится retrieval‑примером
→ последующие похожие обращения находят ситуацию через retrieval с большей уверенностью
```

---

## 8. Роли retrieval / LLM / оператора / администратора

- **Retrieval**: поиск похожих примеров и ранжирование типовых ситуаций.
- **LLM**: адаптация текста ответа (bounded generation) в рамках утверждённой политики; в демо может работать `mock`‑провайдер.
- **Оператор**: финальная инстанция по решению и публикации; источник корректировок и кандидатов.
- **Администратор**: владелец базы знаний (Response Cases, примеры, кандидаты), отвечает за качество и эволюцию KB.

---

## 9. Ограничения MVP (as‑is)

- UI контуры реализованы как одно приложение с role‑переключением (см. `docs/architecture/ui_contour_separation_plan.md`).
- Возможен `mock`‑провайдер AI, который **не является LLM** и возвращает шаблонный текст (см. forensics документ).
- Содержимое KB и справочников — демонстрационные seed‑данные.

---

## 10. Roadmap / future work (строго как планы)

Ниже — направления, которые в документах помечены как целевые, но не обязательно реализованы целиком в текущем MVP:

- визуальное разделение client site и company workspace (`docs/architecture/ui_contour_separation_plan.md`);
- усиление контракта “operational console” (AF‑alignment) для рабочих мест (`docs/architecture/review_flow_af_operational_semantics_alignment.md`);
- развитие аналитики качества Controlled Hybrid (ошибки retrieval, частые override, coverage KB).

