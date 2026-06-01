# Отчёт о соответствии ТЗ

**Проект:** Review Flow — «ИИ-ассистент для работы с отзывами клиентов»  
**Дата среза:** 2026-06-01  
**Источник ТЗ:** [ТЗ ИИ-ассистент для работы с отзывами.md](../ТЗ%20ИИ-ассистент%20для%20работы%20с%20отзывами.md)

Документ описывает **фактическую реализацию** в репозитории и БД PostgreSQL (контейнер `review-flow-postgres`, БД `reviewflow`). Не содержит планов и маркетинговых формулировок.

---

## 1. Цель проекта

### Формулировка из ТЗ

> Создание нейроассистента, который поможет быстро и грамотно обрабатывать отзывы клиентов, формировать корректные ответы и выявлять повторяющиеся проблемы.

### Соответствие

| Требование ТЗ | Реализация (факт на 2026-06-01) | Статус |
|---------------|----------------------------------|--------|
| Обработка отзывов клиентов | Web-MVP: клиентский контур (`/review`), приём обращений, статус, публикация ответа | **Выполнено** |
| Быстрая и грамотная обработка | Controlled Hybrid pipeline: retrieval → confidence → draft по policy типовой ситуации; операторская модерация | **Выполнено** |
| Корректные ответы | Утверждённый текст и `response_policy` на уровне Response Case; LLM только адаптирует формулировку | **Выполнено** |
| Выявление повторяющихся проблем | Отчёты (`/reports`): распределения по темам, сценариям, «Бизнес-сводка»; накопление retrieval-примеров | **Выполнено** |
| Платформа ChatGPT / OpenAI Playground (техн. ТЗ) | Отдельное приложение FastAPI + React + PostgreSQL; OpenAI-compatible API опционально | **Частично** — см. §10 |
| База знаний в Google Таблице / CSV | PostgreSQL: `response_cases`, `response_case_examples`; экспорт отчётов CSV/XLSX/PDF | **Частично** — другой носитель, тот же смысл |
| Документация в Google Docs | Markdown в репозитории (`docs/`, SOT, README) | **Частично** |

---

## 2. Какие бизнес-задачи закрывает

**Почему Controlled Hybrid.** Вместо LLM-first (модель сама классифицирует и решает) и полного RAG (ответ собирается из фрагментов без жёсткой политики) выбран **Controlled Hybrid** — управляемая альтернатива: retrieval подбирает типовую ситуацию, а **бизнес-решение (сценарий, тональность, приоритет, политика ответа) зафиксировано в типовой ситуации**, а не принимается LLM. Модель только адаптирует утверждённый текст. Подробное сравнение вариантов: [Обоснование выбора Controlled Hybrid](architecture/controlled_hybrid_architecture_rationale.pdf).

### 2.1 Классификация отзывов по тональности и теме

**Как реализовано (Controlled Hybrid MVP, основной контур):**

- **Классификация обращения** = подбор **типовой ситуации (Response Case)** через retrieval по примерам (`response_case_examples`).
- Атрибуты **тональность**, **сценарий**, **приоритет**, **направление (product_area)**, **тема (topic)** хранятся на типовой ситуации (FK к НСИ), а не как свободный вывод LLM.
- Результат фиксируется в `response_case_decisions`, детали retrieval — в `case_match_results`.
- **LLM не классифицирует обращение** в CH-контуре.

**Legacy path** (`CH_PIPELINE_ENABLED=false`): классификация через `review_classifications` и промпт `review_classification` (сценарий, sentiment, priority, topic, product_area) — сохранена для регрессии.

**Ограничения:**

- При низкой уверенности retrieval оператор выбирает или создаёт candidate.
- Клиент не видит внутреннюю классификацию и confidence.

**Сущности:** `response_cases`, `response_case_examples`, `response_case_decisions`, `case_match_results`, справочники `interaction_scenarios`, `sentiment_profiles`, `review_topics`, `product_areas`.

---

### 2.2 Быстрая генерация ответов

| Компонент | Роль |
|-----------|------|
| **Response Case** | SOT: `response_policy` + `approved_response_text` — что можно и нельзя говорить клиенту |
| **Retrieval** | Подбирает типовую ситуацию по похожим примерам; задаёт основу решения |
| **LLM** | Адаптирует утверждённый текст под конкретное обращение (активный промпт `review_response_generation` v7); **не выбирает** типовую ситуацию |
| **Оператор** | Редактирует draft, публикует финальный ответ |

**Ограничения демо:** при активном провайдере `mock` текст ответа может быть заглушкой (см. [ch_pipeline_forensics_after_ch_integration.md](architecture/ch_pipeline_forensics_after_ch_integration.md)).

---

### 2.3 Подготовка сводок и аналитики

**Реализованные отчёты** (экран `/reports`, API `/api/admin/reports/*`):

| Отчёт в UI | Endpoint | Показатели (факт из кода) |
|------------|----------|---------------------------|
| **Обращения клиентов** | `customer-reviews` | всего обращений, обработано, в работе, средний rating, среднее время обработки; динамика по дням; распределения по направлению, сценарию, тональности, приоритету; топ тем |
| **Бизнес-сводка** | `business-problems` | топ жалоб, предложений, благодарностей; новые темы; сводный текст |
| **Качество Controlled Hybrid** | `ch-quality` | coverage %, override rate %, low confidence rate %; новые ТС и примеры; кандидаты; проблемные ТС по override |

Экспорт: CSV, XLSX, PDF (сервис `report_export.py`).

Дополнительно: `/analytics` (legacy сводка), `/logs` (operational_logs), `/evaluation`, `/admin/ch-quality`.

---

### 2.4 Снижение нагрузки на поддержку

**Механизмы (реализованы):**

1. **Human-in-the-Loop** — публикация только после действия оператора (`moderation_status=approved`, `publication_status=published`).
2. **Повторное использование знаний** — типовые ситуации и retrieval-примеры; при высокой confidence оператор быстрее подтверждает готовое решение.
3. **Candidate learning loop** — новые кейсы из операционной практики попадают в KB без разработки кода.
4. **Очередь оператора** — `/operator/reviews` с фильтрами и карточкой обращения.

**Ограничения:** полная автоматизация без оператора не реализована (и не заявлена в CH-MVP).

---

## 3. Системный промпт

Промпты хранятся в таблице `prompt_versions` (версионируются, активируется одна версия на `prompt_key`).

### Назначение промптов в проекте

| `prompt_key` | Назначение | Активная версия (БД) | Использование |
|--------------|------------|----------------------|---------------|
| `review_classification` | Классификация С/Т/П (JSON) | v1, **active** | **Legacy pipeline** (`CH_PIPELINE_ENABLED=false`) |
| `review_response_generation` | Адаптация текста ответа | v7, **active** | **CH pipeline** — генерация draft; также legacy generation |

### Активный промпт классификации (legacy)

**Полный текст** (`prompt_versions`, `review_classification`, `is_active=true`):

```text
Ты — ассистент классификации отзывов клиентов. Классифицируй отзыв по: scenario, sentiment, priority, topic, product_area. Не генерируй ответы. Соблюдай tone policy. При низкой уверенности указывай needs_phrase_review.
```

### Активный промпт генерации / адаптации ответа (CH)

**Полный текст** (`review_response_generation`, version 7, `is_active=true`):

```text
Сформируй проект ответа клиенту на основе утверждённой основы ответа и правил адаптации.

Правила:

• Соблюдай структуру и обязательные элементы утверждённого шаблона.
• Не обещай компенсации, возврат денежных средств и юридические гарантии, если они явно не предусмотрены утверждённой основой ответа.
• Не добавляй факты, отсутствующие в обращении клиента или утверждённой основе ответа.
• Используй профессиональный и доброжелательный стиль общения.
• Результат должен содержать только текст ответа клиенту.
• Не используй JSON, XML, Markdown и другие служебные форматы.
```

**Примечание:** в CH-контуре в LLM передаются также `response_policy` и `approved_response_text` выбранной типовой ситуации (сборка в `CaseDraftGenerationService`), но выбор case выполняет retrieval, не промпт.

Стиль общения из ТЗ (вежливый, корректный) отражён в промпте генерации и в `response_policy` типовых ситуаций.

---

## 4. Сценарии взаимодействия

ТЗ требует сценарии: **жалоба**, **благодарность**, **предложение**.

В НСИ (`interaction_scenarios`) также есть сценарий **question** (вопрос) — используется в типовых ситуациях, в ТЗ отдельно не назван.

| Сценарий ТЗ | Код в НСИ | Реализован | Как реализован |
|-------------|-----------|------------|----------------|
| Жалоба | `complaint` | **Да** | 12 типовых ситуаций со сценарием «Жалоба»; retrieval-примеры; отчёт «топ жалоб» |
| Благодарность | `gratitude` | **Да** | 2 типовые ситуации; примеры благодарностей; отчёт «топ благодарностей» |
| Предложение | `suggestion` | **Да** | 1 типовая ситуация `service_improvement_suggestion`; 6 retrieval-примеров |

### Примеры из БД

**Жалоба** (`complaint`), ТС `courier_behavior_complaint`:

- «Курьер был груб при вручении»
- «Жалоба на поведение курьера по заказу NL-00501043»

**Благодарность** (`gratitude`), ТС `employee_gratitude_message`:

- «Спасибо менеджеру Анне за помощь с возвратом»
- «Хочу отметить отличную работу сотрудника на линии»

**Предложение** (`suggestion`), ТС `service_improvement_suggestion`:

- «Предлагаю упростить форму обратной связи на сайте»
- «Добавьте уведомления о статусе доставки в приложении»

---

## 5. Ограничения ассистента

| Требование ТЗ | Факт в системе | Статус |
|---------------|----------------|--------|
| Ассистент не публикует ответы самостоятельно | Публикация: `ReviewResponse.publication_status=published` только после действия оператора (approve); клиент видит `final_response` после publish | **Выполнено** |
| Ассистент не удаляет сообщения | В MVP нет функции удаления обращений клиентом или оператором | **Выполнено** (не реализовано как фича) |
| Финальное решение — оператор | Human-in-the-Loop: confirm/override case, редактирование draft, publish | **Выполнено** |
| LLM не принимает бизнес-решения | В CH: retrieval + оператор; LLM — адаптация текста в рамках policy | **Выполнено** |

Дополнительные ограничения зафиксированы в `response_policy` типовых ситуаций (например, не обещать компенсацию без согласования).

---

## 6. База знаний — типовые ситуации

Данные из PostgreSQL на 2026-06-01. Всего **20** активных типовых ситуаций.

| Код | Название | Продукт (направление) | Тема | Статус |
|-----|----------|----------------------|------|--------|
| app_technical_issue | Техническая ошибка приложения | Сайт / приложение | Ошибка приложения | active |
| courier_behavior_complaint | Жалоба на курьера | Доставка | Поведение курьера | active |
| damaged_packaging_report | Повреждённая упаковка при доставке | Качество товара | Повреждённая упаковка | active |
| delivery_delay_confirmed_order | Задержка поставки подтверждённого заказа | Доставка | Нарушение сроков поставки | active |
| delivery_delay_post_delivery_complaint | Жалоба на нарушение сроков поставки после получения товара | Доставка | Нарушение сроков поставки | active |
| double_payment_complaint | Двойное списание оплаты | Оплата | Двойное списание | active |
| employee_gratitude_message | Благодарность сотруднику | Поддержка | Благодарность сотруднику | active |
| general_company_question | Общий вопрос о компании | Общее | Общий вопрос | active |
| order_status_inquiry | Вопрос о статусе заказа | Доставка | Статус заказа | active |
| partial_delivery_complaint | Неполная комплектация заказа | Доставка | Неполная комплектация | active |
| payment_inquiry | Вопрос по оплате | Оплата | Вопрос по оплате | active |
| product_quality_complaint | Жалоба на качество товара | Качество товара | Недостаток товара | active |
| promo_code_not_applied | Промокод не применился | Оплата | Промокод не сработал | active |
| refund_timing_inquiry | Срок возврата денежных средств | Возврат | Статус возврата денег | active |
| return_initiation_request | Запрос на возврат товара | Возврат | Оформление возврата | active |
| service_improvement_suggestion | Предложение улучшения сервиса | Общее | Предложение улучшения сервиса | active |
| staff_praise_message | Благодарность сотруднику NM | Поддержка | Благодарность персоналу | active |
| support_wait_complaint | Долгое ожидание в поддержке | Поддержка | Долгое ожидание ответа | active |
| website_checkout_problem | Не удаётся оформить заказ на сайте | Сайт / приложение | Проблема оформления | active |
| wrong_item_delivered | Доставлен неверный товар | Качество товара | Неверный товар | active |

**Legacy KB** (параллельно, учебный контур): `review_phrase_patterns` — 4 записи; `response_templates` — 4 записи.

---

## 7. Retrieval-примеры

| Код / `case_code` | Количество примеров | Пример названия ТС |
|-------------------|---------------------|--------------------|
| delivery_delay_confirmed_order | 5 | Задержка поставки подтверждённого заказа |
| employee_gratitude_message | 6 | Благодарность сотруднику |
| order_status_inquiry | 5 | Вопрос о статусе заказа |
| partial_delivery_complaint | 4 | Неполная комплектация заказа |
| courier_behavior_complaint | 4 | Жалоба на курьера |
| product_quality_complaint | 4 | Жалоба на качество товара |
| payment_inquiry | 4 | Вопрос по оплате |
| service_improvement_suggestion | 6 | Предложение улучшения сервиса |
| app_technical_issue | 3 | Техническая ошибка приложения |
| damaged_packaging_report | 3 | Повреждённая упаковка при доставке |
| double_payment_complaint | 3 | Двойное списание оплаты |
| promo_code_not_applied | 3 | Промокод не применился |
| refund_timing_inquiry | 3 | Срок возврата денежных средств |
| return_initiation_request | 3 | Запрос на возврат товара |
| support_wait_complaint | 3 | Долгое ожидание в поддержке |
| staff_praise_message | 3 | Благодарность сотруднику NM |
| website_checkout_problem | 3 | Не удаётся оформить заказ на сайте |
| wrong_item_delivered | 3 | Доставлен неверный товар |
| delivery_delay_post_delivery_complaint | 2 | Жалоба на нарушение сроков поставки после получения товара |
| general_company_question | 1 | Общий вопрос о компании |
| **Итого** | **71** | |

---

## 8. НСИ проекта

Данные из PostgreSQL.

### Продукты (`product_areas`)

| code | name | active |
|------|------|--------|
| delivery | Доставка | да |
| digital | Сайт / приложение | да |
| general | Общее | да |
| payment | Оплата | да |
| product_quality | Качество товара | да |
| return | Возврат | да |
| support | Поддержка | да |

### Темы (`review_topics`)

| code | name |
|------|------|
| app_bug | Ошибка приложения |
| checkout_issue | Проблема оформления |
| courier_behavior | Поведение курьера |
| damaged_packaging | Повреждённая упаковка |
| delivery_delay | Нарушение сроков поставки |
| double_charge | Двойное списание |
| employee_gratitude | Благодарность сотруднику |
| general_inquiry | Общий вопрос |
| order_status | Статус заказа |
| partial_delivery | Неполная комплектация |
| payment_question | Вопрос по оплате |
| product_defect | Недостаток товара |
| promo_not_applied | Промокод не сработал |
| refund_status | Статус возврата денег |
| return_request | Оформление возврата |
| service_improvement | Предложение улучшения сервиса |
| staff_praise | Благодарность персоналу |
| support_wait | Долгое ожидание ответа |
| wrong_item | Неверный товар |

### Типовые ситуации

См. §6 (20 записей).

### Processing Policies (`processing_policies`)

| code | name_ru |
|------|---------|
| auto_draft_if_confident | Авточерновик при уверенности |
| operator_required | Требуется оператор |
| operator_review_with_llm_draft | Операторская проверка с LLM-черновиком |

### Статусы обращения (клиентский контур)

Маппинг в API (`backend/app/api/reviews.py`) из `review_responses`:

| `client_status` (клиент видит) | Условие |
|--------------------------------|---------|
| `processing` | нет ответа / ранняя стадия |
| `pending_review` | на проверке |
| `needs_revision` | требуется доработка |
| `approved` | одобрено, ещё не опубликовано |
| `published` | опубликовано — показ `final_response` |
| `rejected` | отклонено |

В БД на срезе: зафиксированы записи с `moderation_status=approved`, `publication_status=published`.

### Статусы кандидатов (`response_case_candidates.status`)

| status | Количество (БД) |
|--------|-----------------|
| approved | 7 |
| merged | 2 |
| rejected | 1 |

Типы кандидатов: `new_response_case` (новая ТС), `response_case_example` (пример к существующей ТС).

### Роли

Роли не хранятся в отдельной таблице НСИ; реализованы в UI и API через заголовок `X-Role` / localStorage:

| Роль | Код | Контур |
|------|-----|--------|
| Клиент | `client` | `/`, `/review`, `/review/status` |
| Оператор | `operator` | `/operator/reviews` |
| Администратор | `administrator` | `/reports`, `/admin/*`, `/settings/*`, … |

Источник: `frontend/src/lib/role.js`.

---

## 9. Отчётность

### Реализованные отчёты (UI `/reports`)

1. **Обращения клиентов** — объём, обработка, SLA, динамика, срезы по направлению / сценарию / тональности / приоритету / темам.
2. **Бизнес-сводка** — топ жалоб, предложений, благодарностей; новые темы.
3. **Качество Controlled Hybrid** — coverage, override, low confidence, новые ТС/примеры, кандидаты, проблемные ТС.

Периоды: сегодня, 7/30/90 дней, произвольный диапазон.

### Дополнительная наблюдаемость

- `/logs` — operational_logs (этапы pipeline)
- `/admin/ch-quality` — консоль качества CH
- `/analytics` — legacy аналитика

---

## 10. Техническая реализация

| Компонент | Реализация |
|-----------|------------|
| **Frontend** | React 19, Vite, React Router; контуры ClientLayout / CompanyLayout |
| **Backend** | FastAPI, Python 3.12; Controlled Hybrid в `app/services/controlled_hybrid/` |
| **PostgreSQL** | 16; 29 таблиц; миграции `backend/migrations/*.sql` |
| **AI Providers** | `ai_provider_settings`: mock (демо), OpenAI-compatible, GigaChat, ProxyAPI — настраиваются в `/settings/ai-providers` |
| **Docker** | `docker-compose.yml`: postgres, backend :8700, frontend :5180 |

**Срез данных БД:** 18 обращений (`reviews`), 36 решений по case (`response_case_decisions`), 10 кандидатов.

**Отличие от исходного тех. ТЗ:** вместо «только ChatGPT Playground» — полноценный web-прототип с БД и ролями. Смысл ТЗ (AI-ассистент для отзывов) сохранён и расширен до операционного MVP.

---

## 11. Итоговое соответствие ТЗ

| Требование ТЗ | Статус | Пояснение |
|---------------|--------|-----------|
| Цель: обработка отзывов и корректные ответы | **Выполнено** | Web-MVP + CH + оператор |
| Выявление повторяющихся проблем | **Выполнено** | Отчёты, топики, бизнес-сводка |
| Классификация по тональности и теме | **Выполнено** | Через атрибуты Response Case и retrieval; legacy — LLM-классификация |
| Быстрая генерация ответов | **Выполнено** | Draft по policy + адаптация LLM |
| Сводки и аналитика | **Выполнено** | Три отчёта на `/reports` + экспорт |
| Снижение нагрузки на поддержку | **Частично выполнено** | HITL и KB есть; нет интеграции с внешней CRM/тикет-системой |
| Системный промпт (стиль, ограничения) | **Выполнено** | Версии в БД; активные тексты §3 |
| Сценарии: жалоба, благодарность, предложение | **Выполнено** | НСИ + типовые ситуации + примеры |
| Ограничение: не публиковать самостоятельно | **Выполнено** | Только оператор |
| База: формулировки и готовые ответы | **Выполнено** | `response_case_examples` + `approved_response_text` |
| База: сводки по темам/оценкам | **Выполнено** | Отчёты customer-reviews / business-problems |
| Документация и инструкция обновления | **Частично выполнено** | Markdown в репозитории, не Google Docs. Загрузка демо-данных в PostgreSQL — SQL-миграции: **НСИ** — [002_seed_data.sql](../infra/db/migrations/002_seed_data.sql) (сценарии, тональности), [010_classification_reference_fk.sql](../backend/migrations/010_classification_reference_fk.sql) (приоритеты), [011_ch_data_model_foundation.sql](../backend/migrations/011_ch_data_model_foundation.sql) (направления, темы), [012_nm_reference_dataset.sql](../backend/migrations/012_nm_reference_dataset.sql) (расширение тем NM), [015_processing_policies_reference.sql](../backend/migrations/015_processing_policies_reference.sql) (политики обработки); **типовые ситуации** — [011_ch_data_model_foundation.sql](../backend/migrations/011_ch_data_model_foundation.sql), [012_nm_reference_dataset.sql](../backend/migrations/012_nm_reference_dataset.sql); **retrieval-примеры** — те же файлы (`INSERT INTO response_case_examples`); **системные промпты** — [002_seed_data.sql](../infra/db/migrations/002_seed_data.sql) (`review_classification`), [003_milestone4_prompt_registry.sql](../backend/migrations/003_milestone4_prompt_registry.sql) (реестр, `review_response_generation`) |
| Платформа ChatGPT / Google Таблицы | **Не реализовано** | Заменено на Docker + PostgreSQL + web UI — осознанное расширение scope MVP |
| Удаление сообщений ассистентом | **Не применимо** | Функция не требовалась в коде; отсутствует |

### Итог для аудитории

По **функциональному смыслу** учебного ТЗ проект **выполнен и превышен**: реализован работающий прототип с Controlled Hybrid, операторским и административным контурами, базой типовых ситуаций, candidate learning и отчётностью.

По **форме поставки** из исходного тех. ТЗ (ChatGPT, Google Docs, Google Sheets) соответствие **частичное**: артефакты перенесены в репозиторий и PostgreSQL, что задокументировано в [README.md](../README.md), [SOT](../Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md) и [IMPLEMENTATION_PLAN](../IMPLEMENTATION_PLAN.md).

---

## Источники данных для отчёта

| Источник | Использование |
|----------|----------------|
| [ТЗ ИИ-ассистент для работы с отзывами.md](../ТЗ%20ИИ-ассистент%20для%20работы%20с%20отзывами.md) | Требования |
| [README.md](../README.md), [ARCHITECTURE.md](ARCHITECTURE.md), [CONTROLLED_HYBRID.md](CONTROLLED_HYBRID.md) | Фактическая архитектура |
| [Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md](../Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md) | Нормативная модель |
| PostgreSQL `reviewflow` | Таблицы §6–§8, промпты §3 |
| `backend/app/services/reports.py`, `frontend/src/ops/reports/ReportsWorkspace.jsx` | Отчётность §9 |
| `prompt_versions` | Полные тексты промптов §3 |
