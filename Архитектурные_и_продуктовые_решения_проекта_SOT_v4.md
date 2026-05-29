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
- AI классифицирует отзыв;
- система подбирает шаблон;
- LLM формирует draft-ответ;
- оператор проверяет и утверждает;
- клиент видит статус и опубликованный ответ;
- администратор управляет промптом, шаблонами и аналитикой.

---

## 3. Основная архитектурная концепция

### 3.1 Зафиксированное направление (Sprint 022B, C1)

**Целевой архитектурой проекта является Controlled Hybrid (CH).**

Документ описывает два слоя:

| Слой | Где в SOT | Статус |
|------|---------|--------|
| **Целевая архитектура CH** | §3A | Нормативный SOT бизнес-решений (частично **не реализовано**) |
| **Текущая runtime-реализация (MVP)** | §4.1, §5–§10, §12 | Фактическое поведение кода на момент Sprint 021A–022A |

Не смешивать целевое и реализованное. Если функция отсутствует в репозитории — в тексте указано: **«Целевая архитектура (не реализовано)»**.

### 3.2 Текущая реализация (as-is)

Проект **сейчас** реализован как:

- web-based AI system;
- human-in-the-loop workflow;
- **template-guided LLM architecture** (LLM участвует в классификации С/Т/П);
- operator-moderated response pipeline;
- prompt evaluation system.

Система **не публикует ответы автоматически** без проверки оператором (кроме явного действия оператора «Одобрить и отправить»).

Целевая CH-архитектура (§3A) **заменяет** LLM-primary business decision на retrieval типовой ситуации + правила backend.

---

## 3A. Controlled Hybrid — целевая архитектура

> **Статус:** **C6:** runtime pipeline CH при `CH_PIPELINE_ENABLED=true`. **C4/C5/C7 UI** реализованы (оператор, admin KB, аналитика качества `/admin/ch-quality`). Регрессия **C3** — не завершена. Операционная модель: `docs/architecture/controlled_hybrid_operational_model.md`.

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

**Целевая архитектура (не реализовано):** ветвление по confidence, привязка `review` → `response_case_decisions` → `response_cases`, политика публикации на уровне case.

### 3A.3 Разрыв: текущее vs целевое

| Аспект | Текущая реализация (MVP) | Целевое CH |
|--------|--------------------------|------------|
| Сущность «типовая ситуация» | **Отсутствует** (`response_cases` нет) | `response_cases` — SOT |
| Поиск | Fuzzy match **фраз** (`review_phrase_patterns`, rapidfuzz) | Retrieval **типовых ситуаций** + `case_match_results` |
| Бизнес-решение | **LLM classification** С/Т/П (+ опциональный override из фразы) | Выбор **response case** по правилам и порогам |
| Шаблон | Scoring `response_templates` по FK `scenario_id` / `sentiment_id` / `priority_id` | **Один утверждённый** template/policy на case |
| Генерация | LLM draft по выбранному шаблону | LLM **адаптация** в рамках policy case |
| Обратная связь | `rejection_feedback` на уровне review | `response_case_feedback`, `knowledge_base_change_requests` |
| Auto-publish | Не реализовано | **Целевая архитектура (не реализовано):** по политике case |

Controlled Hybrid **должен устранить** зависимость бизнес-решения от LLM-классификации и эвристического подбора шаблона по С/Т/П.

Forensic-основа: `docs/cursor_sessions/2026-05-30_sprint_022a_ch_transition_inventory_forensics.md`, `docs/cursor_sessions/2026-05-30_sprint_021b_pipeline_forensics_template_selection_and_classification.md`.

### 3A.3.1 Операционная модель (Sprint 023)

Нормативный документ: **`docs/architecture/controlled_hybrid_operational_model.md`**.

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

**Целевая архитектура (не реализовано):** отображение клиенту идентификатора или названия «типовой ситуации».

#### 3A.4.2 Операторская консоль

**Сохранить (акцептировано, sprints 020E–020J, 021A):**

- левая очередь + правая рабочая область;
- «Одобрить и отправить»;
- модалка отклонения (`reject-feedback`) с причинами;
- блокировка действий после `approved` + `published`;
- lifecycle / operational logs;
- RU display labels (`displayLabels.js`).

**Целевые сценарии (не реализовано):**

1. Очередь обращений — **реализовано** (базовая очередь).
2. Карточка обращения — **реализовано**.
3. Просмотр **выбранной типовой ситуации** — **реализовано** (C4).
4. Просмотр **confidence** — **реализовано** (C4, band HIGH/MEDIUM/LOW).
5. Просмотр **альтернативных кандидатов** cases — **реализовано** (C4).
6. Подтверждение ответа — **реализовано** (approve).
7. Редактирование ответа — **реализовано**.
8. Отклонение — **реализовано** (reject-feedback).
9. **Предложение новой типовой ситуации** — **реализовано** (C4, modal + API).
10. **Обратная связь в KB** на уровне case — частично (`rejection_feedback` без case entity).

#### 3A.4.3 Административный интерфейс

**Сейчас реализовано:** KB по фразам, шаблонам, сценариям, тональностям; промпты; evaluation; analytics; logs; AI providers.

**Целевые сценарии (не реализовано):**

1. Управление **типовыми ситуациями** (`response_cases`).
2. Управление **примерами обращений** (`response_case_patterns` ← эволюция `review_phrase_patterns`).
3. Управление **типовыми ответами** на case (`response_case_templates`).
4. **Версионирование** case (`response_case_versions`).
5. Активация / деактивация case.
6. Очередь **предложений операторов** (`knowledge_base_change_requests`).
7. Аналитика промахов retrieval.
8. Аналитика неизвестных ситуаций.
9. Аналитика частых исправлений операторов.

Справочники С/Т/П **остаются**; в CH используются как **атрибуты** типовой ситуации, не как самостоятельный SOT решения.

### 3A.5 Целевая модель данных

**C2 реализовано (Sprint 022D):** миграция `011_ch_data_model_foundation.sql`, детальный дизайн — `docs/cursor_sessions/2026-05-30_sprint_022c_ch_data_model_foundation.md`.

**Справочники направления и темы (реализовано):**

| Таблица | Назначение |
|---------|------------|
| `product_areas` | Продукт / услуга / направление (НСИ, FK в `response_cases`) |
| `review_topics` | Узкая тема обращения (НСИ, FK в `response_cases`, опционально связь с `product_area_id`) |

**Не хранить** `product_area` и `topic` как свободные строки в `response_cases` — только FK.

| Сущность | Назначение | Связь с текущим | Статус | Цикл |
|----------|------------|-----------------|--------|------|
| `response_cases` | Типовая ситуация — SOT; поля `response_policy`, `approved_response_text`, `review_policy`, `confidence_threshold` | Legacy: `response_templates` (до C6) | **Таблица + seed + admin CRUD API** | C2 ✓; C5 ✓ |
| `response_case_examples` | Примеры обращений 1:N | Legacy: `review_phrase_patterns` | **Таблица + seed + admin CRUD** | C2 ✓; C5 ✓ |
| `response_case_candidates` | Кандидат на новую ситуацию | — | **Таблица + operator create + admin queue** | C4 ✓; C5 ✓ |
| `response_case_decisions` | Решение по review | `review_classifications` | **Таблица + analytics** | C6, C7 |
| `case_match_results` | Результаты retrieval | `phrase_match_score` | **Таблица** | C6, C7 |
| `response_case_feedback` | Обратная связь по case | `rejection_feedback` | **Таблица + analytics** | C4, C7 |
| `response_case_versions` | Версии case | Нет | **Не реализовано** | C5 |
| `knowledge_base_change_requests` | Очередь предложений | Заменено `response_case_candidates` | **Не реализовано** | C5 |

**Миграция legacy KB (решение владельца, Sprint 022D):** не выполнять неоднозначный backfill из `review_phrase_patterns` / `response_templates`; CH-база создаётся **с нуля** (seed). Legacy-таблицы остаются для MVP pipeline до C6.

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
| **C2** | Data model foundation | Сущности case, миграции, read API | DB, backend models | `response_cases` (+ связанные), seed CH | Не ломать MVP pipeline до C6 | **Реализовано** (022D); акцепт владельца |
| **C3** | Customer UI preservation | Регрессия клиентского контура | Customer UI | Тест-план NL-number, status, published response | Без изменения CH backend contract для клиента | **Проектирование ✓** (023); реализация — акцепт владельца |
| **C4** | Operator CH scenarios | Case UI в консоли | Operator UI + API | Кандидаты, confidence, select case, KB feedback | Сохранить 020J lock, reject modal | **Реализовано** (C4); акцепт владельца |
| **C5** | Admin case management | KB вокруг case | Admin UI + API | CRUD cases, examples, policies, candidate queue | С/T/P как атрибуты | **Реализовано** (C5) |
| **C6** | Pipeline transition | CH pipeline вместо LLM-primary | Backend services | Retrieval → policy → bounded LLM | `CH_PIPELINE_ENABLED` | **Реализовано** (Sprint C6); UI C4/C5 отдельно |
| **C7** | Audit / analytics / quality | Метрики CH, eval | Admin analytics, logs | Hit rate, misses, operator overrides | — | **Реализовано** (C7) |

**Зависимости:** C1 → C2 → C6 (критический путь); C3 параллельно после C2; C4 и C5 после C2; C7 после C6.

**Статус на момент Sprint C7:** C1, C2, C6 pipeline, **C4 operator UI**, **C5 admin UI**, **C7 CH quality** (`/admin/ch-quality`). **C3** регрессия — не завершена. Откат pipeline: `CH_PIPELINE_ENABLED=false`.

---

## 4. Основные контуры системы

### 4.1 Основной контур обработки отзывов (текущая реализация MVP)

> Целевой CH-pipeline — §3A.2. Ниже — **фактический** контур кода до перехода C6.

1. Клиент оставляет отзыв.
2. Backend принимает отзыв.
3. Raw-отзыв сохраняется.
4. Выполняется предобработка текста.
5. Загружается активная версия системного промпта.
6. Выполняется поиск похожей типовой формулировки.
7. Выполняется AI-классификация.
8. Выполняется подбор шаблона ответа.
9. Загружается история взаимодействия.
10. Выполняется template-guided generation.
11. Draft-ответ сохраняется.
12. Оператор проверяет ответ.
13. Выполняется финализация модерации.
14. Ответ публикуется или имитируется публикация.
15. Клиент видит статус обработки и опубликованный ответ.

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

Текущая реализация frontend (единое приложение с role selector) — **временный MVP**. Целевая архитектура UI зафиксирована в `docs/architecture/ui_contour_separation_plan.md` и будет реализована отдельным UI milestone без изменения backend pipeline.

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

> **Текущая реализация (MVP).** Целевая логика Controlled Hybrid — §3A. После C6 этот раздел должен отражать case-based pipeline или явно разделять legacy vs CH path.

### 5.1 Общая логика (as-is)

Система **не использует свободную генерацию ответа** без шаблона.

Применяется:

**Template-guided constrained generation.**

Логика:

1. Система ищет похожую типовую формулировку отзыва.
2. LLM классифицирует отзыв с учётом найденной формулировки, текста отзыва и числовой оценки.
3. Система выбирает template.
4. Загружается conversational context.
5. LLM формирует draft-ответ внутри template constraints.
6. Оператор проверяет ответ.

### 5.2 Роль template layer (as-is; переопределяется в CH)

В **текущем MVP** template layer фактически выступает policy-уровнем **вместо** отсутствующей сущности response case.

В **целевом CH** policy/SOT — **типовая ситуация** (`response_cases`); template — утверждённый артефакт case, не независимая тройка С/Т/П.

Template layer (текущий) является policy/SOT уровнем **на уровне шаблона**, что **конфликтует** с CH (§3A.3).

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
