# Архитектурные и продуктовые решения проекта

## 1. Назначение документа

Документ фиксирует согласованные архитектурные и продуктовые решения по учебному проекту:

**«ИИ-ассистент для работы с отзывами клиентов»**.

Документ является рабочим Source of Truth проекта и используется как опорный документ для реализации, отчёта, портфолио и постановки задач в Cursor.

---

## 2. Цели проекта

### 2.1 Основная цель

Создание AI-assisted системы обработки клиентских отзывов:

- классификация отзывов;
- подбор шаблонов ответов;
- генерация draft-ответов;
- операторская модерация;
- публикация или имитация публикации финального ответа;
- накопление аналитики;
- оценка влияния промптов на качество классификации.

### 2.2 Учебная цель

Показать навыки промпт-инжиниринга:

- разработка системного промпта;
- сценарии взаимодействия;
- ограничения поведения ассистента;
- работа с типовыми формулировками отзывов;
- готовые ответы для разных ситуаций;
- примеры аналитики и сводок;
- инструкция по обновлению ассистента.

### 2.3 Портфельная цель

Сделать не только документ с промптом, а работающий web-прототип:

- клиент оставляет отзыв;
- система через retrieval подбирает типовую ситуацию (Response Case) и формирует draft-ответ;
- LLM адаптирует текст ответа в рамках утверждённой политики (не выбирает типовую ситуацию);
- оператор проверяет, подтверждает или меняет решение и публикует ответ;
- клиент видит статус и опубликованный ответ;
- администратор управляет базой типовых ситуаций, кандидатами, отчётностью и настройками.

---

## 3. Основная архитектурная концепция

### 3.1 Три слоя описания

| Слой | Содержание | Где в SOT |
|------|------------|-----------|
| **Исторический (legacy)** | template-guided pipeline: phrase match → классификация С/Т/П → подбор шаблона → генерация draft | §5.1 (legacy path); отключаемый флагом `CH_PIPELINE_ENABLED=false` |
| **Актуальный MVP (2026-06-01)** | **Controlled Hybrid**: Response Case — SOT бизнес-решения; retrieval; confidence; адаптация текста LLM; operator/admin contours | §3A, §3B, §4.1, §5 (CH path) |
| **Future work** | Полное визуальное разделение client/company UI; auto-publish по policy case; versioning cases; production auth | §3B |

Документация проекта: [README.md](README.md), [Архитектура](docs/ARCHITECTURE.md), [Controlled Hybrid](docs/CONTROLLED_HYBRID.md), [История проекта](docs/PROJECT_HISTORY.md), [Галерея экранов](docs/SCREENSHOTS.md), [Обоснование выбора CH (PDF)](docs/controlled-hybrid-architecture-rationale.pdf).

### 3.2 Нормативная архитектура: Controlled Hybrid (реализована в MVP)

**Controlled Hybrid (CH)** — зафиксированная архитектура проекта и **основной runtime** при `CH_PIPELINE_ENABLED=true` (значение по умолчанию в `.env.example`).

Система **не публикует ответы автоматически** без действия оператора «Одобрить и отправить».

Корректная семантика (обязательна для всех описаний):

- retrieval подбирает типовую ситуацию по примерам; результат подбора используется как классификация обращения;
- confidence рассчитывается системой на основе retrieval;
- **LLM не выбирает типовую ситуацию и не принимает бизнес-решение**;
- LLM адаптирует текст ответа в рамках `approved_response_text` / `response_policy`;
- оператор подтверждает, меняет или эскалирует решение;
- администратор управляет типовыми ситуациями, retrieval-примерами и кандидатами.

### 3.3 Legacy path (исторический этап)

До внедрения CH в коде использовался template-guided workflow с участием LLM в классификации С/Т/П и подборе шаблона по справочникам. Путь сохранён при `CH_PIPELINE_ENABLED=false` для регрессии и сравнения; **не является основным контуром демонстрационного MVP**.

---

## 3A. Controlled Hybrid — нормативная модель и реализация в MVP

> **Статус (2026-06-01):** CH pipeline, operator workflow, admin response cases, candidate learning, отчётность и системные настройки **реализованы** в демонстрационном MVP. Операционная модель: операционная модель Controlled Hybrid.

### 3A.1 Бизнес-модель и принципы

**Типовая ситуация (Response Case)** — единственный **Source of Truth (SOT)** бизнес-решения по ответу на обращение.

| Принцип | Формулировка |
|---------|--------------|
| SOT бизнес-решения | Типовая ситуация (`response_cases`) |
| Атрибуты ситуации | Сценарий, тональность, приоритет — **атрибуты** типовой ситуации (справочники `interaction_scenarios`, `sentiment_profiles`, `priority_levels` сохраняются) |
| Типовой ответ | Утверждённый шаблон/политика ответа **привязаны к типовой ситуации**, а не к свободной тройке С/Т/П |
| Retrieval | Находит наиболее подходящую типовую ситуацию; **не публикует** ответ самостоятельно |
| LLM | Может: адаптировать текст, извлекать признаки, помогать с черновиком. **Не принимает** бизнес-решение |
| Backend | Правила, пороги уверенности, lifecycle, аудит, статусы, персистентность |
| Оператор | Финальная инстанция для спорных случаев; участвует в развитии базы знаний |

### 3A.2 Целевой pipeline обработки

```text
Входящее обращение (review)
  → нормализация и извлечение признаков
  → поиск типовой ситуации (retrieval / matching)
  → оценка уверенности (confidence)
  → выбор ветки обработки:
        высокая уверенность   → привязка к типовой ситуации
        средняя уверенность   → оператор выбирает из кандидатов
        низкая уверенность    → оператор обрабатывает; может предложить новую типовую ситуацию
  → политика ответа выбранной типовой ситуации (approved template / response policy)
  → LLM-адаптация текста (если политика разрешает)
  → операторская проверка и/или auto-publication (по политике ситуации)
  → обратная связь в базу знаний (feedback loop)
```

**Реализовано в MVP:** ветвление по confidence (high/medium/low), привязка `review` → `response_case_decisions` → `response_cases`, запись `case_match_results`, draft по policy case.

**Future work:** auto-publication по политике case без участия оператора (в MVP публикация — только через оператора).

### 3A.3 Эволюция: legacy path vs Controlled Hybrid MVP

| Аспект | Legacy path (`CH_PIPELINE_ENABLED=false`) | Controlled Hybrid MVP (по умолчанию) |
|--------|-------------------------------------------|--------------------------------------|
| Сущность «типовая ситуация» | Не используется как SOT | `response_cases` — SOT бизнес-решения |
| Поиск | Fuzzy match фраз (`review_phrase_patterns`) | Retrieval типовых ситуаций + `case_match_results` |
| Бизнес-решение | Классификация С/Т/П + подбор шаблона | Подбор **response case** retrieval + пороги confidence |
| Основа ответа | Scoring `response_templates` по С/Т/П | `response_policy` + `approved_response_text` на case |
| Генерация | LLM draft по шаблону | LLM **адаптация** в рамках policy case (или mock-провайдер в демо) |
| Обратная связь / KB | `rejection_feedback`, legacy KB | `response_case_candidates`, `response_case_feedback`; admin CRUD cases |
| Auto-publish | Не реализовано | **Future work** |

Forensics CH pipeline: [ch_pipeline_forensics_after_ch_integration.md](docs/ch-pipeline-forensics.md).

### 3A.3.1 Операционная модель (Sprint 023)

Нормативный документ: операционная модель Controlled Hybrid.

Содержит: customer / operator / admin journeys; confidence и override workflows; candidate lifecycle; feedback loop; state machines обращения и response case; противоречия as-is vs target; **Acceptance Criteria для C6**.

### 3A.4 Целевые UI-контуры

#### 3A.4.1 Клиентский интерфейс

**Сохранить (акцептировано владельцем, session logs 018B, 014+):**

- создание обращения;
- номер обращения `NL-XXXXXXXX-NNN`;
- поиск по номеру и e-mail;
- статусная диаграмма (stepper);
- отображение **опубликованного** ответа (`final_response`);
- отсутствие внутренних UUID, AI draft, метаданных классификации в customer UI.

**Воздействие CH:** минимальное. Изменения преимущественно в контурах компании (оператор, администратор) и backend.

**Future work:** отображение клиенту идентификатора или названия «типовой ситуации» (в MVP клиент этого не видит — по дизайну).

#### 3A.4.2 Операторская консоль

**Реализовано в MVP:**

- левая очередь + правая рабочая область;
- просмотр выбранной типовой ситуации, confidence (HIGH/MEDIUM/LOW), альтернатив Top-N;
- подтверждение / override типовой ситуации;
- «Одобрить и отправить»; редактирование draft; отклонение (`reject-feedback`);
- эскалация «ни одна типовая ситуация не подходит» → создание candidate;
- блокировка действий после `approved` + `published`;
- lifecycle / operational logs; RU display labels.

#### 3A.4.3 Административный интерфейс

**Реализовано в MVP (Controlled Hybrid + упаковка):**

- управление **типовыми ситуациями** (`/admin/response-cases`): CRUD, политика, утверждённый текст;
- управление **retrieval-примерами** (`response_case_examples`);
- очередь и обработка **кандидатов** (`response_case_candidates`): создание новой ТС или присоединение к существующей;
- активация / архивация case;
- **отчётность** (`/reports`): демо-отчёты по обращениям и CH;
- **системные настройки** (`/settings/system`, `/settings/ai-providers`);
- legacy KB (фразы, шаблоны, сценарии, тональности); промпты; evaluation; logs; CH quality (`/admin/ch-quality`).

**Future work:**

- **Версионирование** case (`response_case_versions`);
- отдельная сущность `knowledge_base_change_requests` (в MVP — `response_case_candidates`);
- расширенная аналитика промахов retrieval и неизвестных ситуаций (базовые метрики — в CH quality / reports).

Справочники С/Т/П **остаются**; в CH используются как **атрибуты** типовой ситуации, не как самостоятельный SOT решения.

### 3A.5 Целевая модель данных

**C2 реализовано (Sprint 022D):** миграция `011_ch_data_model_foundation.sql`, детальный дизайн — миграция `011_ch_data_model_foundation.sql`.

**Справочники направления и темы (реализовано):**

| Таблица | Назначение |
|---------|------------|
| `product_areas` | Продукт / услуга / направление (НСИ, FK в `response_cases`) |
| `review_topics` | Узкая тема обращения (НСИ, FK в `response_cases`, опционально связь с `product_area_id`) |

**Не хранить** `product_area` и `topic` как свободные строки в `response_cases` — только FK.

| Сущность | Назначение | Связь с текущим | Статус | Цикл |
|----------|------------|-----------------|--------|------|
| `response_cases` | Типовая ситуация — SOT; поля `response_policy`, `approved_response_text`, `review_policy`, `confidence_threshold` | Legacy: `response_templates` | **Таблица + seed + admin CRUD API** | C2 ✓; C5 ✓ |
| `response_case_examples` | Примеры обращений 1:N | Legacy: `review_phrase_patterns` | **Таблица + seed + admin CRUD** | C2 ✓; C5 ✓ |
| `response_case_candidates` | Кандидат на новую ситуацию | — | **Таблица + operator create + admin queue** | C4 ✓; C5 ✓ |
| `response_case_decisions` | Решение по review | `review_classifications` | **Таблица + pipeline C6** | C6 ✓ |
| `case_match_results` | Результаты retrieval | `phrase_match_score` | **Таблица + pipeline C6** | C6 ✓ |
| `response_case_feedback` | Обратная связь по case | `rejection_feedback` | **Таблица** | C4 ✓ |
| `response_case_versions` | Версии case | Нет | **Future work** | — |
| `knowledge_base_change_requests` | Очередь предложений | Заменено `response_case_candidates` | **Не вводится** (используются candidates) | — |

**Миграция legacy KB (решение владельца, Sprint 022D):** CH-база создана **с нуля** (seed). Legacy-таблицы (`review_phrase_patterns`, `response_templates`) сохранены для legacy path и учебных экранов; **основной MVP использует CH**.

**Минимальные связи (целевые):**

```text
reviews → response_case_decisions → response_cases
response_cases → response_case_templates
response_cases → response_case_patterns
response_case_decisions → case_match_results
feedback → response_case_feedback
```

Существующие таблицы `reviews`, `review_responses`, `customers`, `service_cases`, справочники С/Т/П, `operational_logs`, `prompt_versions` — **сохраняются**; расширяются связями, без обязательного удаления исторических данных (см. §3A.6).

### 3A.6 Принципы миграции к CH

1. **Сохранять** акцептированный клиентский UI (§3A.4.1).
2. **Сохранять** акцептированную операторскую консоль (layout, approve, reject modal, post-publish lock).
3. **Не ломать** существующие сценарии без необходимости; параллельный или поэтапный перевод pipeline.
4. **Сначала** внедрить типовые ситуации как новый SOT (C2), затем перевести pipeline (C6).
5. **Избегать** разрушительных изменений схемы; additive migrations, backfill где возможно.
6. **Сохранять** исторические данные (`review_classifications`, `rejection_feedback`, logs).
7. **Обеспечить** наблюдаемость перехода (`operational_logs`, метрики промахов — C7).
8. **Не передавать** бизнес-решения исключительно LLM после перехода C6.

### 3A.7 Циклы реализации (C1–C7)

**Правило приёмки:** любой цикл считается завершённым **только после акцепта владельцем системы**.

| Цикл | Название | Цель | Область | Результаты (план) | Ограничения | Критерий завершения |
|------|----------|------|---------|-------------------|-------------|---------------------|
| **C1** | SOT / CH architecture | Зафиксировать CH в документации | SOT, IMPLEMENTATION_PLAN | §3A, план перехода | Без кода | Акцепт владельца + этот sprint |
| **C2** | Data model foundation | Сущности case, миграции, read API | DB, backend models | `response_cases` (+ связанные), seed CH | Additive migrations | **Реализовано** (022D) |
| **C3** | Customer UI preservation | Регрессия клиентского контура | Customer UI | Тест-план NL-number, status, published response | Без изменения CH backend contract для клиента | **Проектирование ✓** (023); реализация — акцепт владельца |
| **C4** | Operator CH scenarios | Case UI в консоли | Operator UI + API | Кандидаты, confidence, select case, KB feedback | Сохранить 020J lock, reject modal | **Реализовано** (C4); акцепт владельца |
| **C5** | Admin case management | KB вокруг case | Admin UI + API | CRUD cases, examples, policies, candidate queue | С/T/P как атрибуты | **Реализовано** (C5) |
| **C6** | Pipeline transition | CH pipeline вместо LLM-primary | Backend services | Retrieval → policy → bounded LLM | `CH_PIPELINE_ENABLED` | **Реализовано** (Sprint C6); UI C4/C5 отдельно |
| **C7** | Audit / analytics / quality | Метрики CH, eval | Admin analytics, logs | Hit rate, misses, operator overrides | — | **Реализовано** (C7) |

**Зависимости:** C1 → C2 → C6 (критический путь); C4, C5, C7 после C2/C6.

**Статус на 2026-06-01:** циклы C1–C7 **реализованы** в демонстрационном MVP. Откат на legacy pipeline: `CH_PIPELINE_ENABLED=false`. Формальная регрессия клиентского контура (C3) — в backlog (см. §3B).

---

## 3B. Текущее состояние MVP на 2026-06-01

### Реализовано (демонстрационный MVP)

| Область | Состояние |
|---------|-----------|
| **CH pipeline** | retrieval → confidence → decision → draft (policy + bounded LLM); `CH_PIPELINE_ENABLED=true` по умолчанию |
| **Response Case как SOT** | `response_cases`, примеры, решения, match results |
| **Оператор** | очередь, case/confidence/alternatives, confirm/override, candidate, публикация |
| **Администратор** | CRUD типовых ситуаций и примеров; обработка candidates |
| **Candidate learning loop** | демонстрационный сценарий end-to-end (оператор → admin → retrieval) |
| **Отчётность** | `/reports` (клиентские, CH, бизнес-сводка) |
| **Системные настройки** | `/settings/system`, `/settings/ai-providers` |
| **Клиентский контур** | submit, `NL-…`, status, published `final_response` |
| **Документация (GitHub)** | [README](README.md), [ARCHITECTURE](docs/ARCHITECTURE.md), [CONTROLLED_HYBRID](docs/CONTROLLED_HYBRID.md), [SCREENSHOTS](docs/SCREENSHOTS.md), [PROJECT_HISTORY](docs/PROJECT_HISTORY.md), [DEPLOYMENT](docs/DEPLOYMENT_GUIDE.md) |

### Ограничения демо (не скрывать)

- Возможен **mock**-провайдер LLM (заглушка текста, не адаптация по policy) — см. forensics.
- UI контуров — одно приложение с переключением роли (полное визуальное разделение — future work).
- Legacy KB и prompt evaluation сохранены параллельно CH.

### Future work (кратко)

- C3: формализованная регрессия клиентского UX при изменениях CH backend.
- Auto-publish по `review_policy` case.
- `response_case_versions`; production SSO/RBAC.
- Визуальное разделение client site / company workspace (план разделения UI-контуров).

---

## 4. Основные контуры системы

### 4.1 Основной контур обработки отзывов (Controlled Hybrid MVP)

> Нормативная модель — §3A.2. Legacy path — §3.3, §5.1.

**CH path** (`CH_PIPELINE_ENABLED=true`, по умолчанию):

1. Клиент оставляет отзыв.
2. Backend принимает и сохраняет обращение.
3. Retrieval подбирает типовую ситуацию по примерам; записываются `case_match_results`.
4. Система вычисляет confidence и фиксирует `response_case_decision`.
5. Формируется draft на основе `response_policy` и `approved_response_text` выбранной типовой ситуации; LLM выполняет **адаптацию текста** (не выбор case).
6. Оператор подтверждает или меняет типовую ситуацию, редактирует ответ, публикует.
7. При отсутствии подходящей ситуации — candidate → администратор расширяет KB.
8. Клиент видит статус и опубликованный `final_response`.

### 4.2 Контур управления промптами

Контур предназначен для:

- редактирования системного промпта;
- хранения версий промптов;
- тестирования качества классификации;
- сравнения результатов между версиями.

Pipeline:

1. Администратор изменяет промпт.
2. Версия промпта сохраняется.
3. Тестовые отзывы прогоняются через pipeline.
4. Выполняется сравнение expected vs actual.
5. Формируется статистика качества.

### 4.3 Контур аналитики

Контур аналитики отвечает за:

- агрегацию отзывов;
- повторяющиеся проблемы;
- статистику тональности;
- статистику числовых оценок;
- статистику по темам;
- статистику по продуктам/услугам;
- примеры сводок.

### 4.4 Контур наблюдаемости

Логируются:

- входящие отзывы;
- числовые оценки;
- результаты matching по типовым формулировкам;
- результаты классификации;
- выбранные шаблоны;
- версии промптов;
- AI draft responses;
- operator edits;
- финальные ответы;
- ошибки pipeline;
- latency;
- publication status.

Отдельный контур security observability в MVP не вводится. Безопасность фиксируется через роли, ограничения AI, operator review и operational logs.

### 4.5 Технологический контур

Отвечает за:

- VPS deployment;
- Docker Compose;
- запуск сервисов;
- конфигурацию;
- управление environment variables.

### 4.6 Разделение интерфейсных контуров (UI)

На уровне продукта и UX система разделяется на **два визуальных контура**, не смешивая customer-facing сайт и internal operational workspace.

Текущая реализация frontend (единое приложение с role selector, раздельные `ClientLayout` / `CompanyLayout`) — **демонстрационный MVP**. Дальнейшее визуальное разделение зафиксировано в план разделения UI-контуров (future work).

#### 4.6.1 Клиентский контур (customer-facing)

Внешний сайт вымышленной компании. Не админка, не тренажёр, не operational UI.

Цель: ощущение обычного customer-facing web-сайта (маркетплейс / доставка / e-commerce / support portal).

Функции MVP:

- **Оставить отзыв** — публичная форма;
- **Проверить статус обращения** — по review ID / ссылке после отправки.

Клиент видит только свой отзыв, статусы обработки и опубликованный ответ. Не видит draft AI, промпты, очередь оператора, аналитику.

Целевые маршруты (план UI): публичная главная, `/review`, `/review/status/:id`. Отдельный visual identity (header, footer, branding компании).

#### 4.6.2 Контур компании (internal operational)

Внутреннее рабочее пространство компании. Единый internal layout (sidebar, operational tables, dense data).

Включает подконтуры по ролям:

| Подконтур | Назначение |
|-----------|------------|
| Operator | Очередь отзывов, модерация, mock publication |
| Administrator | Промпты, evaluation, analytics, logs, AI providers, knowledge base (фразы, шаблоны, сценарии, тональности) |

Operator и Administrator — **роли внутри одного company workspace**, а не отдельные «сайты». Навигация и визуальный стиль отличаются от клиентского контура.

#### 4.6.3 Клиентская точка входа для отзывов

Точка входа на customer-facing сайте: явный CTA «Оставить отзыв» / «Обратная связь», без ссылок на internal routes.

После отправки — redirect или ссылка на страницу статуса. Backend endpoint без изменений: `POST /api/reviews`, `GET /api/reviews/{id}/status`.

#### 4.6.4 Человеко-понятные категории обращений

На клиентской форме поле **«К чему относится отзыв?»** (направление обращения). Не показывать клиенту внутренние термины: `product_area`, `scenario`, `topic`.

Пример значений для UI (план):

- Доставка
- Качество товара
- Оплата
- Возврат
- Поддержка
- Сайт / приложение
- Другое

Сопоставление с backend (при реализации UI milestone, без обязательного изменения схемы на этом шаге):

| Клиентская категория | Подсказки для pipeline |
|----------------------|-------------------------|
| Доставка | `product_area=logistics`, topic delivery |
| Качество товара | `product_area=retail`, topic quality |
| Оплата | topic payment |
| Возврат | topic return |
| Поддержка | topic support |
| Сайт / приложение | topic digital |
| Другое | topic general, classification без жёсткого hint |

До внедрения UI milestone допустимо сохранять поле `product_area` как текстовый ввод; целевое состояние — select/radio с фиксированным справочником на frontend.

#### 4.6.5 Соответствие текущему MVP и ролям

Role-based access (§14) сохраняется. Разделение контуров — **визуальное и навигационное**, не замена RBAC:

- client → только customer-facing routes;
- operator → company workspace, moderation;
- administrator → company workspace, admin tools.

---

## 5. Архитектура response pipeline

> **Актуальный MVP:** Controlled Hybrid path — §3A.2, §4.1. **Legacy path** — §5.1 (только при `CH_PIPELINE_ENABLED=false`).

### 5.1 Legacy path (template-guided)

> Исторический контур. Не описывает основной демонстрационный MVP с 2026-06-01.

Система **не использует свободную генерацию ответа** без шаблона.

Применяется **template-guided constrained generation** (legacy):

1. Система ищет похожую типовую формулировку отзыва (phrase matching).
2. Выполняется классификация по справочникам С/Т/П (в т.ч. с участием LLM в legacy-контуре).
3. Система выбирает `response_template` по scoring.
4. LLM формирует draft-ответ в рамках шаблона.
5. Оператор проверяет и публикует ответ.

### 5.2 Controlled Hybrid path (основной MVP)

1. Retrieval подбирает типовую ситуацию (`response_cases`) по примерам.
2. Система вычисляет confidence; оператор видит предложение и альтернативы.
3. Draft формируется из `response_policy` + `approved_response_text`; LLM **адаптирует текст**, не выбирая case.
4. Оператор подтверждает/override, редактирует, публикует или создаёт candidate.

Детали: [CONTROLLED_HYBRID.md](docs/CONTROLLED_HYBRID.md), [ch_pipeline_forensics_after_ch_integration.md](docs/ch-pipeline-forensics.md).

### 5.3 Роль template layer (legacy path)

В **legacy path** template layer выступает policy-уровнем через `response_templates` и scoring по С/Т/П.

В **Controlled Hybrid MVP** policy/SOT — **типовая ситуация** (`response_cases`); `approved_response_text` и `response_policy` — утверждённые артефакты case, не независимая тройка С/Т/П.

Template задаёт:

- обязательные элементы ответа;
- запрещённые элементы;
- tone policy;
- структуру ответа;
- ограничения;
- правила эскалации.

LLM отвечает только за:

- адаптацию текста;
- персонализацию;
- contextual rendering;
- вариативность формулировок;
- привязку ответа к конкретной истории обращения.

---

## 6. Модель классификации отзывов

> **Архитектура (Sprint 021A):** scenario / sentiment / priority — справочные сущности (`interaction_scenarios`, `sentiment_profiles`, `priority_levels`). Рабочие таблицы (`review_classifications`, `review_phrase_patterns`, `response_templates`, `rejection_feedback`) хранят связи через FK (`*_id`). Коды (`complaint`, `negative`, `high`) — уникальные business codes внутри справочников. UI — select по справочникам; строковые поля `scenario` / `sentiment` / `priority` / `priority_hint` в рабочих таблицах deprecated (синхронизируются при записи, не source of truth).

### 6.1 Основные признаки

Каждый отзыв классифицируется по:

- scenario;
- sentiment;
- priority;
- topic;
- product_area;
- rating;
- confidence.

### 6.2 Rating

`rating` — числовая оценка клиента.

Примеры:

- 1–5 звёзд;
- NPS;
- иная числовая шкала, если она предусмотрена входной формой.

`rating` является структурированным сигналом, но не заменяет `sentiment`.

Пример:

- оценка 5 + текст «всё отлично» → позитивный отзыв;
- оценка 5 + текст «ставлю 5 за менеджера, но доставка ужасная» → смешанная ситуация;
- оценка 1 + текст «больше никогда не обращусь» → критический негатив.

### 6.3 Scenario

Основные сценарии:

- complaint — жалоба;
- gratitude — благодарность;
- suggestion — предложение;
- question — вопрос.

### 6.4 Sentiment

Тональность:

- positive;
- neutral;
- negative;
- aggressive.

Тональность **не эквивалентна** числовой оценке.

### 6.5 Priority

Приоритет:

- low;
- medium;
- high;
- critical.

### 6.6 Topic

`topic` — тема отзыва, то есть предмет обсуждения внутри обращения.

Примеры:

- delivery;
- support;
- payment;
- product quality;
- integration;
- service.

### 6.7 Product area

`product_area` — продукт, услуга или направление бизнеса, к которому относится отзыв.

Примеры:

- конкретный продукт;
- тариф;
- услуга;
- подразделение;
- клиентский сегмент.

`topic` и `product_area` не смешиваются:

- topic = о чём жалоба или отзыв;
- product_area = к какому продукту/услуге это относится.

---

## 7. Формулировки отзывов

### 7.1 Семантика понятия

«Формулировка отзыва» трактуется как:

**типовой текстовый паттерн клиентского сообщения.**

Это не категория качества и не итоговая классификация.

Примеры:

- «опять задержали доставку»;
- «никто не отвечает»;
- «спасибо менеджеру»;
- «добавьте оплату через СБП».

### 7.2 Роль формулировок

Формулировки используются для:

- поиска похожих отзывов;
- определения сценария;
- определения темы;
- определения product_area;
- повышения стабильности классификации;
- пополнения базы знаний.

### 7.3 Matching logic

Для входящего отзыва система пытается найти похожую типовую формулировку.

Результаты matching:

- `matched_phrase_id`;
- `phrase_match_score`;
- `classification_source`;
- `needs_phrase_review`;
- `suggested_new_phrase`.

### 7.4 Classification source

Возможные источники классификации:

- `phrase_match` — классификация основана на найденной типовой формулировке;
- `llm_fallback` — подходящая формулировка не найдена, классификацию выполнила LLM;
- `operator_override` — оператор вручную скорректировал классификацию.

### 7.5 Fallback logic

Если подходящая формулировка не найдена:

1. LLM выполняет самостоятельную классификацию.
2. Оператор получает пометку: «нет подходящей формулировки в базе знаний».
3. Система предлагает `suggested_new_phrase`.
4. Оператор может добавить новую формулировку в базу знаний.
5. После добавления новая формулировка используется в следующих классификациях.

---

## 8. Шаблоны ответов

### 8.1 Функция выбора шаблона

Template selection:

```text
template = f(scenario, sentiment, priority)
```

Дополнительные модификаторы:

- rating;
- topic;
- product_area;
- phrase_match_score;
- повторность обращения.

Формулировка отзыва используется на стадии matching и классификации, но не обязательно является прямым ключом выбора шаблона.

### 8.2 Rating как модификатор

`rating` может усиливать или понижать приоритет.

Пример:

- complaint + negative + rating 1 → escalation template;
- complaint + negative + rating 3 → standard apology template;
- gratitude + positive + rating 5 → gratitude template.

### 8.3 Fallback templates

Порядок fallback:

1. scenario + sentiment + priority;
2. scenario + sentiment;
3. scenario only;
4. generic safe template.

---

## 9. Conversational context

При генерации ответа учитываются:

- история предыдущих обращений;
- предыдущие ответы операторов;
- предыдущие обещания;
- эскалации;
- повторные жалобы.

LLM получает:

- current review;
- rating;
- template constraints;
- interaction history;
- policy instructions.

Контекст используется не для свободной генерации, а для адаптации template-guided ответа под историю взаимодействия.

---

## 10. Moderation model

### 10.1 Human-in-the-loop

Ответ не отправляется автоматически.

Operator workflow:

- review;
- edit;
- approve;
- reject.

### 10.2 Moderation status

Внутренний moderation lifecycle:

- pending_review;
- approved;
- needs_revision;
- rejected.

### 10.3 Publication status

Публикация ответа:

- not_published;
- published;
- failed.

### 10.4 Mock publication

В MVP публикация может быть реализована как mock-publication:

- клиент оставляет отзыв на демо-странице;
- оператор утверждает ответ;
- финальный ответ отображается под отзывом;
- статус меняется на `published`.

Интеграция с реальными внешними площадками не входит в MVP.

---

## 11. Prompt engineering subsystem

### 11.1 Prompt versions

Системные промпты:

- редактируются через UI;
- версионируются;
- используются в evaluation runs.

### 11.2 Prompt evaluation

Для тестового набора отзывов сохраняются:

- expected scenario;
- predicted scenario;
- expected sentiment;
- predicted sentiment;
- expected priority;
- predicted priority;
- expected topic;
- predicted topic;
- expected product_area;
- predicted product_area.

### 11.3 Цель evaluation

Evaluation предназначен для:

- оценки влияния промпта;
- анализа ошибок классификации;
- сравнения версий промптов;
- проверки влияния типовых формулировок на классификацию.

---

## 12. PostgreSQL schema

> **Sprint 021A:** добавлена таблица `priority_levels`; в `review_phrase_patterns`, `response_templates`, `review_classifications`, `rejection_feedback` (и при наличии — `evaluation_results`) — FK `scenario_id`, `sentiment_id`, `priority_id`. API `GET /api/reference/classification` отдаёт active rows `{ id, code, name }`.

### 12.1 Состав схемы данных

#### customers

Минимальная operational-сущность клиента. Используется для связи `customer -> service_case -> review` в основном pipeline. Не является enterprise CRM.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор клиента |
| customer_external_id | Внешний идентификатор клиента (опционально, для интеграций) |
| customer_name | Имя или отображаемое имя клиента |
| email | Email клиента |
| phone | Телефон клиента |
| customer_segment | Сегмент клиента (например retail, b2b, vip) |
| created_at | Дата создания записи |
| updated_at | Дата последнего обновления |
| metadata | Дополнительные данные и служебная информация |

#### reviews

Исходные отзывы клиентов.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор отзыва |
| customer_id | Идентификатор клиента |
| service_case_id | Идентификатор заказа, обращения или услуги, к которой относится отзыв |
| review_text | Исходный текст отзыва |
| rating | Числовая оценка клиента |
| product_area | Продукт, услуга или направление бизнеса |
| source_channel | Канал поступления отзыва |
| created_at | Дата и время создания отзыва |
| raw_metadata | Дополнительные исходные данные и техническая информация |

#### service_cases

Клиентские случаи, заказы, обращения или оказанные услуги, по которым могут оставляться отзывы.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор клиентского случая |
| customer_id | Идентификатор клиента |
| case_type | Тип случая: заказ, обращение, доставка, услуга и т.д. |
| case_title | Краткое описание случая |
| product_area | Продукт или услуга, к которой относится случай |
| created_at | Дата создания случая |
| closed_at | Дата завершения случая |
| metadata | Дополнительные данные и служебная информация |

#### review_phrase_patterns

Типовые формулировки отзывов.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор формулировки |
| phrase_text | Текст типовой формулировки |
| scenario | Связанный сценарий взаимодействия |
| sentiment | Типовая тональность формулировки |
| topic | Тема обращения |
| product_area | Продукт или услуга |
| priority_hint | Рекомендуемый уровень приоритета |
| is_active | Признак активности формулировки |
| created_at | Дата создания |
| updated_at | Дата последнего обновления |

#### interaction_scenarios

Сценарии взаимодействия.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор сценария |
| scenario_code | Системный код сценария |
| scenario_name | Название сценария |
| description | Описание сценария |
| required_response_elements | Обязательные элементы ответа |
| forbidden_response_elements | Запрещённые элементы ответа |
| escalation_rules | Правила эскалации оператору |

#### sentiment_profiles

Профили тональности.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор профиля |
| sentiment_code | Системный код тональности |
| sentiment_name | Название тональности |
| tone_policy | Правила tone of voice |
| forbidden_tone | Недопустимые элементы коммуникации |
| escalation_hint | Рекомендация по эскалации |

#### response_templates

Шаблоны ответов.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор шаблона |
| scenario | Сценарий применения шаблона |
| sentiment | Тональность шаблона |
| priority | Приоритет ситуации |
| rating_min | Минимальная оценка клиента |
| rating_max | Максимальная оценка клиента |
| topic | Тема обращения |
| product_area | Продукт или услуга |
| template_text | Текст шаблона |
| required_elements | Обязательные элементы ответа |
| forbidden_elements | Запрещённые элементы |
| is_active | Признак активности шаблона |

#### review_classifications

Результаты классификации.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор классификации |
| review_id | Ссылка на отзыв |
| prompt_version_id | Использованная версия промпта |
| matched_phrase_id | Найденная типовая формулировка |
| phrase_match_score | Степень совпадения формулировки |
| classification_source | Источник классификации |
| scenario | Определённый сценарий |
| sentiment | Определённая тональность |
| priority | Определённый приоритет |
| topic | Определённая тема |
| product_area | Определённый продукт или услуга |
| rating | Числовая оценка клиента |
| confidence | Уверенность классификации |
| needs_phrase_review | Требуется ли проверка формулировки |
| suggested_new_phrase | Предлагаемая новая формулировка |
| created_at | Дата создания классификации |

#### review_responses

Draft и final ответы.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор ответа |
| review_id | Ссылка на отзыв |
| classification_id | Ссылка на классификацию |
| template_id | Использованный шаблон |
| prompt_version_id | Версия промпта |
| draft_response | AI-generated draft |
| final_response | Финальный ответ после модерации |
| moderation_status | Статус модерации |
| publication_status | Статус публикации |
| operator_id | Идентификатор оператора |
| created_at | Дата создания |
| updated_at | Дата обновления |

#### prompt_versions

Версии системных промптов.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор версии |
| version_number | Номер версии промпта |
| prompt_text | Текст системного промпта |
| comment | Комментарий к версии |
| is_active | Признак активной версии |
| created_at | Дата создания |
| created_by | Автор версии |

#### evaluation_runs

Прогоны проверки промптов.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор прогона |
| prompt_version_id | Проверяемая версия промпта |
| run_name | Название evaluation run |
| created_at | Дата запуска |
| created_by | Автор запуска |

#### evaluation_results

Expected vs actual.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор результата |
| evaluation_run_id | Ссылка на evaluation run |
| review_text | Текст тестового отзыва |
| rating | Числовая оценка |
| expected_scenario | Ожидаемый сценарий |
| predicted_scenario | Предсказанный сценарий |
| expected_sentiment | Ожидаемая тональность |
| predicted_sentiment | Предсказанная тональность |
| expected_priority | Ожидаемый приоритет |
| predicted_priority | Предсказанный приоритет |
| expected_topic | Ожидаемая тема |
| predicted_topic | Предсказанная тема |
| expected_product_area | Ожидаемый продукт/услуга |
| predicted_product_area | Предсказанный продукт/услуга |
| is_match | Совпадение expected vs predicted |
| error_notes | Комментарии по ошибкам |

#### review_analytics

Агрегированная аналитика.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор записи аналитики |
| period_start | Начало периода |
| period_end | Конец периода |
| topic | Тема аналитики |
| product_area | Продукт или услуга |
| sentiment | Тональность |
| rating_avg | Средняя оценка |
| review_count | Количество отзывов |
| repeated_issue_count | Количество повторяющихся проблем |

#### operational_logs

Логи pipeline.

Состав полей:

| Поле | Назначение |
|---|---|
| id | Уникальный идентификатор лога |
| event_type | Тип события |
| entity_type | Тип сущности |
| entity_id | Идентификатор сущности |
| prompt_version_id | Версия промпта |
| model_name | Использованная AI-модель |
| latency_ms | Время выполнения |
| status | Статус выполнения |
| error_message | Текст ошибки |
| created_at | Дата и время события |

---

## 13. Технологический стек

### Frontend

- React;
- Vite.

### Backend

- FastAPI;
- Python.

### Database

- PostgreSQL.

### AI providers

- OpenAI;
- GigaChat.

### Deployment

- VPS;
- Docker Compose.

---

## 14. Авторизация и доступ

### 14.1 Authentication model

Для MVP используется простая role-based authentication model.

Поддерживаются роли:

- client;
- operator;
- administrator.

### 14.2 Access model

#### Client access

Client имеет доступ только:

- к собственному отзыву;
- к статусу обработки;
- к опубликованному ответу.

#### Operator access

Operator имеет доступ:

- к очереди отзывов;
- к AI draft responses;
- к moderation workflow.

#### Administrator access

Administrator имеет доступ:

- к prompt management;
- к analytics;
- к evaluation subsystem;
- к operational logs;
- к управлению шаблонами;
- к управлению типовыми формулировками.

---

## 15. Соответствие ТЗ

### 15.1 Реализуется напрямую

- AI-классификация отзывов;
- готовые ответы;
- сценарии;
- аналитика;
- база знаний;
- документирование;
- примеры сводок;
- часто встречающиеся формулировки отзывов;
- инструкция по обновлению ассистента.

### 15.2 Расширения относительно ТЗ

- web application;
- operator workflow;
- prompt versioning;
- prompt evaluation;
- observability;
- PostgreSQL;
- VPS deployment;
- Admin UI;
- mock publication flow.

---

## 16. Роли и безопасность

### 16.1 Роли системы

#### Client

Клиент:

- оставляет отзыв;
- видит статус обработки;
- видит опубликованный ответ.

Client не имеет доступа:

- к внутренней аналитике;
- к prompt management;
- к moderation workflow.

#### Operator

Оператор:

- просматривает отзывы;
- видит AI-классификацию;
- проверяет draft-ответы;
- редактирует ответы;
- утверждает или отклоняет ответы.

Operator не имеет доступа:

- к редактированию системных промптов;
- к системным настройкам.

#### Administrator

Администратор:

- управляет промптами;
- управляет шаблонами;
- управляет типовыми формулировками отзывов;
- просматривает аналитику;
- управляет evaluation runs;
- просматривает operational logs.

### 16.2 Безопасность

#### Основные принципы

Система проектируется как:

- operator-moderated;
- non-autonomous;
- policy-constrained.

#### Ограничения AI

LLM не должна:

- публиковать ответы самостоятельно;
- удалять отзывы;
- обещать компенсации;
- предоставлять юридические гарантии;
- генерировать токсичные ответы;
- выдумывать факты;
- противоречить предыдущим ответам оператора.

#### Prompt constraints

System prompt должен содержать:

- tone policy;
- запрет на агрессивные ответы;
- запрет на выдумывание фактов;
- запрет на ложные обещания;
- инструкцию эскалации сложных случаев оператору;
- инструкцию сохранять границы template constraints.

#### Human moderation

Все AI-generated ответы проходят operator review перед публикацией.

#### Логирование

Сохраняются:

- версии промптов;
- AI draft responses;
- operator edits;
- финальные ответы;
- publication status;
- ошибки pipeline;
- результаты matching по типовым формулировкам.

#### Тестовые данные

Проект использует:

- тестовые отзывы;
- вымышленные данные;
- mock customer information.

Персональные данные реальных клиентов не используются.

---

## 17. Принятые архитектурные ограничения

Система не реализует:

- autonomous auto-publishing;
- Kubernetes;
- distributed queues;
- multi-tenant architecture;
- full document RAG;
- production marketplace integrations;
- отдельный security observability subsystem.

Эти направления фиксируются как вне рамок текущего MVP.
