# Controlled Hybrid — операционная модель (C3 + C4 + C5)

**Версия:** 1.0  
**Дата:** 2026-05-30  
**Спринт проектирования:** 023  
**Статус:** нормативный документ уровня SOT (проектирование; **не реализация**)

**Связанные материалы:**

- SOT §3A — `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`
- Физическая модель C2 — `docs/cursor_sessions/2026-05-30_sprint_022c_ch_data_model_foundation.md`, миграция `011`
- Инвентаризация as-is — `docs/cursor_sessions/2026-05-30_sprint_022a_ch_transition_inventory_forensics.md`

---

## 1. Назначение и главный принцип

Документ фиксирует **пользовательскую и операционную модель** Controlled Hybrid (CH) до реализации **C6** (pipeline). После акцепта владельцем C6 должен быть **прямой перевод требований в код**, без повторного архитектурного исследования.

### 1.1 Роли и объекты работы

| Роль | Работает с | Не работает с |
|------|------------|---------------|
| **Клиент** | Обращением (`review`), номером `NL-XXXXXXXX-NNN`, статусом, опубликованным ответом | `response_case`, confidence, кандидаты, внутренние ID |
| **Оператор** | Типовой ситуацией (`response_case`) для конкретного обращения | Первичной классификацией С/Т/П как SOT-решением |
| **Администратор** | Базой типовых ситуаций (cases, examples, policy, candidates) | Очередью отдельных обращений как основным рабочим объектом |

### 1.2 Инварианты CH

1. **Response Case** — единственный SOT бизнес-решения по ответу.
2. Сценарий / тональность / приоритет / направление / тема — **атрибуты** case (справочники).
3. **LLM** не выбирает case и не меняет policy; только адаптирует текст в рамках policy (если разрешено).
4. **Retrieval** предлагает case и confidence; **оператор** — финальная инстанция при средней/низкой уверенности и при override.
5. Клиентский UX при переходе на CH **не меняется** (см. §2).

---

## 2. Customer Journey (C3 — сохранение UX)

### 2.1 Цель

Клиент взаимодействует только с **обращением**. Переход на CH **не добавляет** экранов, полей и терминов про типовые ситуации.

### 2.2 Полный путь клиента

```text
[Главная / Review]
    │
    ├─► Создать обращение (modal / форма)
    │       • текст отзыва, контакты, опционально заказ
    │       • POST /api/reviews (без X-Role)
    │       • ответ: request_number (NL-…), review_id (не показывать в UI)
    │       • backend: ingest + обработка (в CH: case retrieval + draft — клиенту не видно)
    │
    └─► Проверить статус (modal lookup или /review/status)
            • номер NL-… + email
            • GET /api/reviews/requests/{n}/status?email=
            • StatusStepper + StatusDialogVisual
            • при published → final_response (только опубликованный текст)
```

### 2.3 Экраны и контракт (без изменений при CH)

| Шаг | UI | API | Видимые данные |
|-----|-----|-----|----------------|
| 1 | Home `/` | — | CTA: отзыв / статус |
| 2 | Review modal `/`, `/review` | `POST /api/reviews` | Успех + **NL-номер** |
| 3 | Status lookup | `GET .../status?email=` | Stepper, label статуса |
| 4 | Status page `/review/status/:n` | тот же GET | `final_response` если published |

### 2.4 Статусы для клиента (внешний вид)

Клиент видит **упрощённый** `client_status` (маппинг из `moderation_status` + `publication_status`). CH **не вводит** новых клиентских статусов.

| client_status | Смысл для клиента |
|---------------|-------------------|
| `processing` | Обращение принято, ответ готовится |
| `pending_review` | На проверке |
| `needs_revision` | Требуется доработка (внутренний; клиенту — нейтральная формулировка в labels) |
| `approved` | Ответ подготовлен (до публикации) |
| `published` | Ответ опубликован — показать `final_response` |
| `rejected` | Обращение отклонено (редкий сценарий) |

**C3 (реализация):** регрессионный тест-план — submit, NL-format, email gate, stepper, published text; **контракт API для клиента не расширять** полями case/confidence.

### 2.5 Что клиент никогда не видит

- `response_case_id`, `case_code`, title case
- `match_confidence`, `case_match_results`
- AI draft до публикации
- С/Т/П, classification, operator notes
- UUID review/customer

---

## 3. Operator Journey (C4)

### 3.1 Смена роли оператора

| Было (MVP) | Станет (CH) |
|------------|-------------|
| Оператор косвенно «исправляет классификацию» С/Т/П | Оператор **подтверждает или меняет типовую ситуацию** |
| Карточка центрирована на classification + template | Карточка центрирована на **selected case** + policy + draft |
| Reject modal → correction С/Т/П | Reject/override → **case-level feedback** (+ опционально legacy поля на переходе) |

Оператор **не обязан** вручную подбирать сценарий как первичное решение; С/Т/П отображаются как **атрибуты выбранного case** (read-only или derived).

### 3.2 Карточка обращения (целевая структура)

**Блок A — Данные обращения** (сохранить)

- NL-номер, дата, текст клиента, клиент/заказ, lifecycle timeline (`operational_logs`).

**Блок B — Типовая ситуация (новый, обязательный)**

| Поле | Источник |
|------|----------|
| Название case | `response_cases.title` |
| Код (опционально в UI) | `case_code` |
| Confidence | `response_case_decisions.match_confidence` или max из `case_match_results` |
| Уровень уверенности | вычисляемый band: high / medium / low (§4) |
| Атрибуты | scenario, sentiment, priority, product_area, topic (refs) |

**Блок C — Альтернативы** (при medium/low)

- Список Top-N из `case_match_results` (rank, score, title).
- Действие: «Выбрать другую ситуацию» → override (§5).

**Блок D — Policy и основа ответа**

| Поле | Содержание |
|------|------------|
| Response policy | `response_cases.response_policy` (read-only для оператора) |
| Approved response text | `response_cases.approved_response_text` (основа, read-only или collapsible) |
| Review policy | `review_policy` — badge: требуется оператор / auto-draft / auto-publish (информирование) |

**Блок E — Draft response** (сохранить)

- Редактор `draft_response`; финализация в `final_response` при approve.

**Блок F — Действия** (сохранить layout 020J)

- Одобрить и отправить
- Отклонить / обратная связь (расширить case-aware)
- Блокировка после `approved` + `published`

### 3.3 Действия оператора (полный перечень)

| # | Действие | Условие | Системный эффект |
|---|----------|---------|------------------|
| O1 | Открыть обращение из очереди | — | Загрузка detail + decision + match_results |
| O2 | **Подтвердить** выбранный case | high confidence или operator согласен | `decision_source=retrieval_operator`, `is_operator_override=false`; разрешить approve path |
| O3 | **Выбрать другой case** (override) | medium/low или несогласие | Новая `response_case_decision` (supersede), `is_operator_override=true`; пересборка draft по policy нового case; `response_case_feedback` |
| O4 | **Редактировать draft** | до approve | Обновление `review_responses.draft_response`; log |
| O5 | **Одобрить и опубликовать** | policy требует оператора; draft готов | `moderation_status=approved`, `publication_status=published`, `final_response`; client видит ответ |
| O6 | **Отклонить draft** (feedback) | неверный case / policy / текст | `response_case_feedback` + при необходимости смена case (O3); **не** публикация |
| O7 | **Создать candidate** | нет подходящего case | INSERT `response_case_candidates` (§6); обращение остаётся в очереди |
| O8 | **Отложить / оставить в очереди** | low + нет решения | Без publish; статус `pending_review` |

### 3.4 Ветки обработки (сводка)

```text
                    ┌─ HIGH confidence ─► O2 confirm ─► O4 edit? ─► O5 approve
                    │
Открыто обращение ──┼─ MEDIUM ─► показать alternatives ─► O2 или O3 ─► …
                    │
                    └─ LOW ─► alternatives + акцент на O3 / O7
```

### 3.5 Очередь оператора

- Сортировка/фильтры: сохранить moderation filters; **добавить** фильтр «нет подтверждённого case», «низкая уверенность» (C4 UI).
- В элементе очереди: NL-номер, фрагмент текста, **название case** (если есть), badge confidence band.

---

## 4. Confidence Workflow

Уровни задаются **относительно** `response_cases.confidence_threshold` (per-case), без фиксированных глобальных процентов в нормативе.

### 4.1 Определение band

| Band | Условие (норматив) | Пример реализации C6 |
|------|-------------------|----------------------|
| **HIGH** | `match_score >= confidence_threshold` | score 0.87, threshold 0.85 |
| **MEDIUM** | `match_score < threshold` AND `match_score >= threshold - δ` | δ настраиваемо (напр. 0.10) или второй порог |
| **LOW** | нет результата выше минимального порога ИЛИ лучший score < medium | пустой top-1 или score 0.42 при threshold 0.85 |

*Конкретные δ и минимальный порог — **параметры C6** (config), не UI.*

### 4.2 Матрица: система × оператор × аудит

#### HIGH

| | |
|--|--|
| **Система** | Автовыбор top-1 case → `response_case_decisions` (`retrieval_auto`); заполнить `case_match_results`; сгенерировать draft по policy (если `review_policy` допускает auto-draft — иначе ждать оператора) |
| **Оператор** | Просмотр; быстрое подтверждение (O2); approve (O5) при согласии |
| **Аудит** | `operational_logs`: `case_retrieval_completed`, `case_decision_auto`; `case_match_results` |

#### MEDIUM

| | |
|--|--|
| **Система** | Предзаполнить decision top-1 **как предложение** (не финал); показать alternatives; **не** auto-publish |
| **Оператор** | Обязательный осознанный выбор: confirm (O2) или override (O3) |
| **Аудит** | `decision_source=retrieval_operator` или `operator_override`; feedback при override |

#### LOW

| | |
|--|--|
| **Система** | Не фиксировать финальный case без оператора; создать placeholder decision **или** оставить без `is_current`; флаг «требуется решение» |
| **Оператор** | Override (O3) или candidate (O7); draft только после выбора case |
| **Аудит** | `response_case_feedback` (`new_case_needed`); candidate row; log `case_retrieval_low_confidence` |

---

## 5. Override Workflow

### 5.1 Триггеры override

1. Оператор выбирает другой case из списка alternatives.
2. Оператор указывает case через поиск (reference picker).
3. Оператор отклоняет все предложения → candidate (§6) — **это не override**, а отсутствие case.

### 5.2 Lifecycle override

```text
[Текущая decision is_current=true]
        │
        │ оператор O3: выбрать case B
        ▼
[Старая decision: is_current=false]
[Новая decision: case B, is_operator_override=true, decision_source=operator_override]
        │
        ├─► INSERT response_case_feedback (feedback_type=wrong_case, suggested_case_id=B)
        ├─► UPDATE case_match_results.is_selected для выбранного rank
        ├─► operational_log: operator_case_override
        └─► Regenerate draft (bounded LLM от approved_text + policy case B)
                │
                ▼
        [Оператор O4 редактирует draft при необходимости]
                │
                ▼
        [O5 approve] или [O6 reject feedback]
```

### 5.3 Изменение только текста (без смены case)

- Разрешено: O4 edit draft.
- Если причина — «неверная policy / основа», а case верный: O6 с `wrong_policy` / `wrong_response_text` → admin KB loop (§8).
- Если case неверный: сначала O3, потом при необходимости O4.

### 5.4 Отказ от всех case

```text
Оператор: «Ни один case не подходит»
    → O7 candidate (status=pending_operator → pending_admin)
    → decision не финализируется (или case_id=null + flag)
    → draft не публикуется до появления case (admin promote)
```

---

## 6. Candidate Workflow

### 6.1 Создание (оператор)

**Триггер:** LOW confidence или явный отказ от alternatives.

**Минимальные поля candidate:**

| Поле | Обязательность |
|------|----------------|
| `proposed_title` | да |
| `proposed_description` | да |
| Пример обращения | да — `review.review_text` или отдельное поле + link `source_review_id` |
| Комментарий оператора | рекомендуется (`optional_comment` / в description) |
| Предлагаемые атрибуты (S/T/P, area, topic) | опционально — prefill из лучшего match или пусто |

**Статус:** `pending_admin` (если оператор сразу отправил) или `pending_operator` → заполнение → `pending_admin`.

**Система:** INSERT `response_case_candidates`; log `case_candidate_created`; **не** создавать `response_cases` до admin.

### 6.2 Рассмотрение (администратор)

```text
pending_admin
    │
    ├─► APPROVE → создать response_cases + examples
    │              promoted_response_case_id = new id
    │              status = approved
    │              (опционально) уведомить оператора / пересчитать decision для review
    │
    ├─► MERGE → merged_into_case_id = existing
    │           добавить example из review в существующий case
    │           status = merged
    │
    └─► REJECT → rejection_comment
                 status = rejected
```

### 6.3 После promote

- Admin может вручную связать исходное `review` с новым case (или C6 batch job).
- Оператор возвращается к O2/O5 для исходного обращения.

---

## 7. Admin Journey (C5)

### 7.1 Объекты управления

| Объект | Операции |
|--------|----------|
| `response_cases` | CRUD, activate/deactivate, edit policy & approved text |
| `response_case_examples` | CRUD, activate/deactivate, import from review |
| `product_areas`, `review_topics` | CRUD справочников (редко) |
| `response_case_candidates` | Queue: list, approve, merge, reject |
| Справочники С/Т/П | Существующий контур (атрибуты case) |

### 7.2 Рабочие процессы

**WF-A: Создание новой типовой ситуации**

```text
Admin → New case form
  → title, description, attributes (S/T/P, area, topic)
  → response_policy + approved_response_text
  → confidence_threshold, review_policy
  → 2+ examples
  → is_active=true
  → operational_log: case_created
```

**WF-B: Редактирование case**

- Изменение policy/text → влияет на **новые** обращения; исторические decisions не переписывать.
- Версионирование (`response_case_versions`) — **вне scope C5 MVP**; до внедрения — `updated_at` + session log admin.

**WF-C: Деактивация / архив**

- `is_active=false` → case не участвует в retrieval (C6).
- Существующие decisions сохраняются.

**WF-D: Очередь candidates**

- Список `pending_admin` → карточка с текстом review, предложением оператора → approve / merge / reject.

**WF-E: Развитие examples из feedback**

- Admin просматривает analytics (C7) → добавляет example в case для снижения промахов.

### 7.3 Навигация (целевая)

- Новый раздел **«Типовые ситуации»** (`/admin/response-cases`) — primary KB.
- Legacy **phrases/templates** — read-only или deprecated banner до cutover C6.
- **Candidates** — `/admin/response-case-candidates`.

---

## 8. Feedback Loop (развитие базы знаний)

```text
┌─────────────────────────────────────────────────────────────┐
│                    Источники сигналов                        │
├─────────────────────────────────────────────────────────────┤
│ operator override (wrong_case)                               │
│ operator feedback (wrong_policy, wrong_response_text)        │
│ candidate creation (new_case_needed)                         │
│ частые LOW confidence (C7 metrics)                           │
│ повторные overrides на один case (C7)                        │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
              ┌────────────────────────┐
              │ response_case_feedback │
              │ + operational_logs     │
              └───────────┬────────────┘
                          ▼
         ┌────────────────────────────────┐
         │ Admin / KB owner actions        │
         ├────────────────────────────────┤
         │ • добавить example              │
         │ • уточнить policy/text          │
         │ • скорректировать threshold     │
         │ • merge candidate → new case    │
         │ • деактивировать плохой case    │
         └────────────────────────────────┘
                          ▼
              ┌────────────────────────┐
              │ Улучшение retrieval   │
              │ (больше examples,       │
              │  точнее policy)         │
              └────────────────────────┘
```

**Правило:** каждое значимое действие оператора по case (O3, O6, O7) **должно** оставлять след в `response_case_feedback` и/или `operational_logs`.

**Переходный период C6:** dual-write в `rejection_feedback` опционально для совместимости отчётов; SOT case-feedback — primary.

---

## 9. State Machine — обращение (Review)

Состояния объединяют **жизненный цикл обращения** и **модерацию ответа**. CH добавляет внутренние флаги, **не меняя** клиентский контракт.

### 9.1 Состояния (нормативные)

| State ID | Описание | Клиентский label (пример) |
|----------|----------|---------------------------|
| `R_RECEIVED` | Обращение создано | processing |
| `R_CASE_RETRIEVAL` | Выполняется поиск case (внутренний) | processing |
| `R_AWAITING_OPERATOR_CASE` | LOW / нет decision | pending_review |
| `R_CASE_CONFIRMED` | Есть `is_current` decision | pending_review |
| `R_DRAFT_READY` | Есть draft_response | pending_review |
| `R_APPROVED` | moderation approved | approved |
| `R_PUBLISHED` | published + final_response | published |
| `R_REJECTED` | обращение отклонено | rejected |
| `R_NEEDS_REVISION` | внутренняя доработка | needs_revision |
| `R_CANDIDATE_PENDING` | ждёт admin по candidate | pending_review |

### 9.2 Диаграмма переходов

```text
                    POST /reviews
                         │
                         ▼
                   [R_RECEIVED]
                         │
                         ▼
                 [R_CASE_RETRIEVAL] ──── C6 pipeline
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
    [R_CASE_CONFIRMED] [R_AWAITING_    [R_CANDIDATE_
           │          OPERATOR_CASE]   PENDING]
           │             │             │
           └──────┬──────┘             │
                  ▼                    │
            [R_DRAFT_READY]◄───────────┘ (после promote)
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
  [R_NEEDS_    [R_APPROVED] [R_REJECTED]
   REVISION]        │
        │           ▼
        │     [R_PUBLISHED]
        └────────►(back to draft path)
```

### 9.3 Действия на переходах

| Переход | Actor | Действие |
|---------|-------|----------|
| → R_CASE_RETRIEVAL | System | retrieval + match_results + decision draft |
| → R_AWAITING_OPERATOR_CASE | System | low confidence flag |
| → R_CASE_CONFIRMED | Operator O2 / System high | finalize decision |
| → R_DRAFT_READY | System | generate draft from case policy |
| → R_PUBLISHED | Operator O5 | approve + publish |
| → R_CANDIDATE_PENDING | Operator O7 | create candidate |

**MVP сегодня:** фактически `R_RECEIVED` → (legacy classify) → `R_DRAFT_READY` → … без case states.

---

## 10. State Machine — Response Case

### 10.1 Состояния

| State | DB / поле | Участие в retrieval |
|-------|-----------|---------------------|
| `C_DRAFT` | создаётся admin, `is_active=false` | нет |
| `C_ACTIVE` | `is_active=true` | да |
| `C_INACTIVE` | `is_active=false` (архив) | нет |

Версионирование (C5 future): `C_SUPERSEDED` — вне C6 MVP.

### 10.2 Диаграмма

```text
[Создание admin / promote candidate]
         │
         ▼
    [C_DRAFT] ── activate ──► [C_ACTIVE]
                                  │
                    deactivate      │
                         ▼          │
                   [C_INACTIVE] ── reactivate ──► [C_ACTIVE]
```

### 10.3 Правила

- Редактирование policy/text в `C_ACTIVE` разрешено; retrieval использует актуальные данные с момента сохранения.
- Деактивация не удаляет examples; не каскадирует на старые reviews.

---

## 11. Противоречия: текущий UI vs целевая модель

| # | As-is (MVP) | Target CH | Разрешение |
|---|-------------|-----------|------------|
| 1 | Оператор видит **classification** С/Т/П как центр | Центр — **response case** | C4: новый блок case; classification → collapsible «audit (legacy)» или скрыть после C6 |
| 2 | Reject modal исправляет **С/Т/П** | Feedback по **case** | C4: расширить modal; mapping `classification_error` → `wrong_case` где уместно |
| 3 | Причины reject: classification / template / history | `wrong_case`, `wrong_policy`, `wrong_response_text`, `new_case_needed` | C4/C6: новые reason codes + backward compat |
| 4 | Admin KB: phrases + templates | Cases + examples | C5: новый раздел; legacy с deprecation banner |
| 5 | Нет confidence / alternatives в UI | Обязательны при medium/low | C4 UI + C6 API fields в operator detail |
| 6 | Pipeline: LLM classify + template score | Retrieval + case policy | **C6 only** (вне C4/C5) |
| 7 | `POST .../reject` exists, UI uses `reject-feedback` only | Unified feedback model | C4: оставить один путь; case feedback primary |
| 8 | Customer API returns no case fields | Без изменений | C3: явный запрет расширения |
| 9 | Operator filters by scenario/sentiment | Фильтр по case / confidence band | C4: добавить фильтры; старые — secondary |
| 10 | Admin read-only cases (C2) | Full CRUD + candidates queue | C5 implementation |

---

## 12. Открытые вопросы (только где решение не зафиксировано)

| # | Вопрос | Рекомендация по умолчанию |
|---|--------|---------------------------|
| Q1 | δ для MEDIUM band | Config `CONFIDENCE_MEDIUM_DELTA=0.10` |
| Q2 | Auto-publish при HIGH + `auto_publish_if_confident` | C6 phase 2; MVP C6 — только auto-**draft** |
| Q3 | Dual-write `rejection_feedback` | Да, 1 релиз C6; затем deprecate |
| Q4 | Показывать ли оператору legacy classification | Да, свёрнутый блок «до C6» 1 спринт |
| Q5 | Очередь: блокировать approve без confirmed case | Да, при включённом CH pipeline |

*Требуют акцепта владельца перед C6, если отклоняются от рекомендации.*

---

## 13. Acceptance Criteria для Sprint C6

> **C6 реализует backend pipeline и контракты данных** для operator/admin UI (C4/C5 могут идти параллельно, но operator detail **блокируется** без пунктов API ниже).

### 13.1 Pipeline — замена business decision

| ID | Критерий | Проверка |
|----|----------|----------|
| C6-P1 | При `POST /api/reviews` **не** использовать LLM classification как SOT решения | Code review: decision до classify; classify опционален/audit-only |
| C6-P2 | Выполнять retrieval по `response_case_examples` (active cases) | Unit/integration: match_method `example_fuzzy` |
| C6-P3 | Записывать `case_match_results` (Top-N, rank, score) для каждого review | SQL count > 0 после ingest |
| C6-P4 | Создавать `response_case_decisions` с `is_current=true` и корректным `decision_source` | One current per review (unique index) |
| C6-P5 | Вычислять confidence band относительно `case.confidence_threshold` | Logs/metadata содержат band |
| C6-P6 | Генерировать draft из `approved_response_text` + `response_policy` (bounded LLM) | Draft ссылается на case_id в metadata |
| C6-P7 | Feature flag `CH_PIPELINE_ENABLED` (или аналог) для отката на legacy | Env toggle воспроизводит MVP |

### 13.2 Ветки confidence

| ID | Критерий |
|----|----------|
| C6-C1 | HIGH: auto decision `retrieval_auto`; оператор может подтвердить без обязательного override |
| C6-C2 | MEDIUM: decision предзаполнена, **обязательна** operator confirm/override перед approve (API 409 если нет) |
| C6-C3 | LOW: нет финального decision без operator action; approve заблокирован |

### 13.3 Override и feedback

| ID | Критерий |
|----|----------|
| C6-O1 | API operator: выбор другого case → новая decision, старая `is_current=false` |
| C6-O2 | Каждый override пишет `response_case_feedback` |
| C6-O3 | Перегенерация draft после смены case |

### 13.4 Candidate (backend)

| ID | Критерий |
|----|----------|
| C6-K1 | API operator: создать candidate с review_id + proposed fields |
| C6-K2 | Admin promote создаёт case + example; обновляет candidate.status |

### 13.5 Клиентский контур (регрессия C3)

| ID | Критерий |
|----|----------|
| C6-X1 | `GET .../status` — без новых полей case/confidence |
| C6-X2 | NL-номер, email gate, stepper, published `final_response` — без регрессий |
| C6-X3 | E2E: submit → status published — проходит на CH pipeline |

### 13.6 Наблюдаемость

| ID | Критерий |
|----|----------|
| C6-L1 | `operational_logs` для: retrieval, decision, override, draft_gen, low_confidence |
| C6-L2 | Legacy tables не удалены; transactional history сохранена |

### 13.7 Явно вне scope C6

- Admin CRUD UI (C5) — отдельный спринт; C6 — API достаточно для operator paths.
- Полная аналитика C7.
- Embedding retrieval (`embedding_future`).
- Auto-publish в prod без отдельного акцепта.

---

## 14. Связь циклов C3–C7 после этого документа

| Цикл | Статус проектирования | Реализация |
|------|----------------------|------------|
| **C3** | Customer journey §2 зафиксирован | Регрессия + тест-план (отдельный спринт) |
| **C4** | Operator journey §3–§5 | UI + operator API |
| **C5** | Admin journey §7 | Admin UI + CRUD API |
| **C6** | Acceptance §13 | Pipeline + контракты |
| **C7** | Feedback §8 (метрики) | Analytics |

**Рекомендуемый порядок реализации:** C6 (pipeline + operator API contract) → C4 UI → C5 admin UI → C3 regression gate → C7.

---

## 15. История изменений

| Версия | Дата | Изменение |
|--------|------|-----------|
| 1.0 | 2026-05-30 | Первичная версия (Sprint 023) |
