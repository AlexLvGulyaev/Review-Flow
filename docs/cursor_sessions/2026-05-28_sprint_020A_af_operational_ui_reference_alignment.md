# 2026-05-28 — Sprint 020A: AF operational UI reference alignment

## Full original prompt text

Source: `cursor_tasks_local/2026-05-28_cursor_task_020A_af_operational_ui_reference_alignment.md`

---

# Sprint 020A — AF Operational UI Reference Alignment

## Контекст

Проект: Review Flow / Northline Market.

Текущий этап: Sprint 020 — Company/Admin Workspace Stabilization.

Проект уже прошёл:
- initial implementation sprint;
- customer-facing UI stabilization;
- operator data-fetch repair;
- PROJECT_SOT / IMPLEMENTATION_PLAN / operational discipline synchronization;
- Sprint 020 Phase 0 bootstrap / operational workspace forensics.

Теперь требуется выполнить reference alignment перед первым implementation task по company/operator/admin UI.

Это НЕ coding task.

Это:
- reference alignment;
- operational UI specification;
- preparation for shell-first implementation;
- фиксация target operational console architecture.

---

# Главная цель

Зафиксировать, какие именно operational UI patterns из Assistant Flow должны быть адаптированы для Review Flow, особенно для operator console.

В качестве reference использовать файлы:

```text
docs/text-adm.png
docs/logs-adm.png
```

Эти изображения показывают AF-style operational console:
- session list слева;
- detail workspace справа;
- filters/search toolbar;
- compact metadata;
- status-first hierarchy;
- user request block;
- system answer block;
- pipeline timeline;
- event/session thinking.

Важно:

НЕ копировать AF визуально один-в-один.

Использовать AF как reference по:
- структуре;
- hierarchy;
- density;
- split-panel behavior;
- operational semantics.

Цвета и визуальная стилистика должны быть адаптированы под NL-style / Northline Market, а не AF dark style.

---

# Обязательные reference materials

Перед анализом Cursor обязан изучить:

1. `docs/text-adm.png`
2. `docs/logs-adm.png`
3. PROJECT_SOT проекта
4. IMPLEMENTATION_PLAN проекта
5. `docs/architecture/operational_discipline_assistant_flow_ru.md`
6. свежий session log Sprint 020 Phase 0 bootstrap

Если некоторые пути отличаются, найти актуальные файлы по repository structure.

---

# Важнейшее ограничение

Запрещено:
- начинать implementation;
- менять код;
- переписывать UI;
- создавать новые компоненты;
- менять CSS;
- делать “быстрые улучшения”.

Этот task должен завершиться документами и session log, а не кодовыми изменениями UI.

---

# Target visual style

## НЕ использовать

Запрещено переносить напрямую:
- AF dark palette;
- тёмный фон консоли;
- neon-like green accents;
- dark terminal aesthetic.

## Использовать

Review Flow должен остаться в NL-style:

- светлая operational workspace база;
- мягкие белые/светло-серые surfaces;
- аккуратные cards;
- тонкие borders;
- умеренные shadows;
- clean enterprise look;
- Northline Market visual calmness;
- зелёный как positive/success;
- синий как primary operational action / selected state;
- оранжевый как warning / medium priority;
- красный как high/critical;
- серый как secondary metadata.

Цель:

```text
AF operational structure + NL visual language
```

---

# Основная аналитическая задача

Провести detailed mapping:

```text
AF Text/Logs console blocks
→
Review Flow operator console blocks
```

---

# Часть 1 — Общая структура operator console

Описать target structure operator console.

Обязательные зоны:

1. Unified company shell
2. Sidebar navigation
3. Operator queue/list panel
4. Review detail workspace
5. Header / quick actions
6. Customer request block
7. Classification / analysis block
8. Response processing block
9. Pipeline timeline
10. Internal notes / operator actions
11. Status and publication controls

---

# Часть 2 — Unified company shell

Описать, как должен выглядеть shell.

## Обязательные элементы

- fixed/consistent sidebar;
- workspace header;
- role-aware navigation;
- active section indicator;
- compact section grouping;
- no marketing header/footer;
- consistent page container;
- predictable content width;
- shared layout primitives.

## Sidebar semantics

Sidebar должна отражать company workspace:

Operator:
- Очередь обращений / отзывов;
- Мои задачи / assigned items, если есть;
- История / архив, если есть.

Administrator:
- Аналитика;
- Логи;
- Промпты;
- Evaluation;
- База знаний;
- AI providers.

Важно:
Operator и Administrator — роли внутри одного company workspace, а не два разных сайта.

---

# Часть 3 — Queue/List panel

AF reference:
- left session list in `text-adm.png`;
- left execution list in `logs-adm.png`.

Review Flow mapping:
- очередь обращений / отзывов.

## Required structure

List panel должен содержать:

### Toolbar
- time/status filters, если применимо;
- moderation status filter;
- priority filter;
- topic/scenario filter;
- search input;
- refresh button.

### Queue item

Каждый item должен иметь compact structure:

1. Primary line:
   - request number / review id;
   - customer name;
   - timestamp.

2. Semantic line:
   - topic/scenario;
   - sentiment;
   - priority.

3. Preview line:
   - короткий фрагмент обращения.

4. Status indicators:
   - moderation status;
   - publication status;
   - AI draft status;
   - assignment, если есть.

5. Visual accents:
   - selected state;
   - priority marker;
   - status badge.

## Important invariant

Queue item должен быть dense enough для scanning, но не превращаться в unreadable telemetry blob.

---

# Часть 4 — Detail workspace

AF reference:
- right session detail in `text-adm.png`;
- right trace detail in `logs-adm.png`.

Review Flow mapping:
- workspace выбранного обращения.

## Detail workspace должен быть split into semantic blocks:

1. Review header
2. Customer request
3. Customer/context metadata
4. Classification and analysis
5. Response processing
6. Pipeline timeline
7. Internal notes
8. Actions

---

# Часть 5 — Review header

Header должен содержать:

- request number;
- customer name;
- topic/category;
- priority;
- moderation status;
- publication status;
- assigned operator;
- created timestamp;
- updated timestamp;
- quick actions.

## Quick actions examples

- Назначить оператору;
- Изменить статус;
- Сохранить черновик;
- Отправить на модерацию;
- Утвердить;
- Отклонить;
- Вернуть на доработку.

Actions должны быть contextual:
не показывать хаотичный набор кнопок без lifecycle logic.

---

# Часть 6 — “Что спросил пользователь”

AF mapping:

```text
Что спросил пользователь
```

Review Flow mapping:

```text
Исходное обращение клиента
```

Этот блок должен показывать:

- original review/request text;
- customer-facing wording exactly as submitted;
- order number / service case;
- topic selected by customer;
- rating;
- source channel;
- email/contact if applicable;
- technical metadata separately:
  - IP;
  - user agent;
  - language;
  - submission timestamp.

## Important invariant

Customer-visible data and internal technical metadata must be visually separated.

---

# Часть 7 — Classification / Analysis block

Этот блок адаптирует AF metadata cards.

Показывать:

- scenario;
- sentiment;
- priority;
- topic;
- product area;
- classification source;
- phrase match;
- confidence;
- matched phrase;
- template selected;
- AI provider/model if relevant.

## Visual style

- compact table/metadata rows;
- status pills;
- priority indicator;
- confidence indicator;
- no giant raw JSON by default.

Raw/debug data можно скрывать за expandable technical block.

---

# Часть 8 — “Что ответила система” — адаптация под Review Flow

В AF один блок “Что ответила система” обычно соответствует итоговому system output.

В Review Flow это НЕ должно быть одним плоским блоком.

Здесь требуется response processing pipeline.

## Обязательные подблоки

### 1. AI Draft

Показывать:
- AI-generated draft;
- generation timestamp;
- provider/model;
- template used;
- policy/constraint hints;
- confidence/fallback if available.

### 2. Operator Revision

Показывать:
- текущий операторский текст;
- кто редактировал;
- timestamp;
- moderation status;
- diff/changed indicator, если реализуемо позже.

### 3. Published/Public Response

Показывать:
- final response;
- publication status;
- customer visibility state;
- published timestamp;
- publication error, если есть.

## Important invariant

Оператор должен ясно понимать:
- что сгенерировала AI;
- что отредактировал человек;
- что увидит клиент.

Нельзя смешивать эти три слоя в один indistinct textarea.

---

# Часть 9 — Pipeline timeline

AF reference:
- timeline pipeline in `text-adm.png`;
- execution trace in `logs-adm.png`.

Review Flow mapping:
- lifecycle обращения.

## Required timeline stages

Пример stages:

1. Обращение получено
2. Предобработка завершена
3. Формулировка найдена / fallback
4. Классификация завершена
5. Шаблон выбран
6. AI draft generated
7. Передано оператору
8. Оператор редактирует
9. На модерации
10. Approved / rejected / needs revision
11. Published / not published / failed

## Visual behavior

- vertical timeline;
- current stage highlighted;
- completed stages marked;
- failed stages marked;
- timestamps;
- short event metadata;
- expandable details only where needed.

---

# Часть 10 — Internal notes / operator actions

Определить target block для:

- private operator notes;
- escalation comments;
- internal team comments;
- moderation reason;
- rejection reason;
- needs revision explanation.

## Important invariant

Private/internal comments must never look customer-visible.

---

# Часть 11 — Admin console mapping

Кратко определить, какие AF patterns применимы к admin sections.

## Analytics

Use:
- dashboard cards;
- compact distribution blocks;
- trends;
- issue summaries.

Avoid:
- giant plain tables only.

## Logs

Use AF Logs almost directly:
- event stream;
- filters toolbar;
- selected event/session detail;
- structured payload;
- timeline.

## Prompts

Use:
- version list;
- selected prompt detail;
- activation status;
- controlled creation workflow.

## Evaluation

Use:
- case list;
- selected case detail;
- expected vs actual;
- scoring panel;
- notes and result history.

## Knowledge Base

Use:
- unified list/detail/editor pattern;
- avoid separate primitive CRUD screens for each entity;
- normalize phrases/templates/scenarios/sentiments into shared workspace logic.

---

# Часть 12 — Forbidden patterns

Зафиксировать, что запрещено в future implementation.

## Запрещено

- giant empty whitespace;
- centered standalone forms;
- isolated CRUD page layouts;
- page-by-page redesign without shell;
- oversized typography;
- generic SaaS dashboard template look;
- marketing landing page aesthetic inside company workspace;
- AF dark color copy;
- raw JSON as primary UI;
- mixing customer-visible and internal data;
- hiding lifecycle status;
- ambiguous “system answer” block;
- losing distinction between AI draft and final operator response;
- action buttons without lifecycle semantics;
- inconsistent paddings/spacing across pages.

---

# Часть 13 — UI invariants

Зафиксировать invariants.

## Required invariants

- shell-first architecture;
- list/detail split for operator workflow;
- lifecycle-first semantics;
- human-in-the-loop visibility;
- AI draft vs operator final separation;
- operational density without clutter;
- compact metadata hierarchy;
- sticky filters/actions where useful;
- status and priority always visible;
- timeline as first-class object;
- customer/internal data separation;
- role-aware navigation;
- reusable operational primitives;
- NL-style visual language.

---

# Часть 14 — Deliverables

Cursor должен создать:

## 1. Reference alignment document

```text
docs/architecture/operator_workspace_operational_ui_alignment.md
```

Документ должен содержать:
- AF reference analysis;
- mapping to Review Flow;
- target operator console blocks;
- target admin console mappings;
- NL-style adaptation;
- forbidden patterns;
- UI invariants;
- recommended implementation sequence.

## 2. Session log

Создать:

```text
docs/cursor_sessions/2026-05-28_sprint_020A_af_operational_ui_reference_alignment.md
```

Session log должен содержать:
- полный prompt;
- список изученных reference files;
- analysis summary;
- decisions;
- risks;
- next implementation recommendation.

## 3. Optional updates

Если Cursor считает необходимым, можно внести compact references в:
- PROJECT_SOT;
- IMPLEMENTATION_PLAN;

но НЕ переписывать их широко.

---

# Acceptance criteria

Task завершён только если:

1. AF references `docs/text-adm.png` и `docs/logs-adm.png` рассмотрены как structural references.
2. Цветовая палитра explicitly закреплена как NL-style, не AF dark style.
3. Operator console blocks описаны exhaustively.
4. Response processing pipeline разделён на AI Draft / Operator Revision / Published Response.
5. Pipeline timeline described as first-class workflow object.
6. Forbidden patterns clearly listed.
7. UI invariants clearly listed.
8. Created `docs/architecture/operator_workspace_operational_ui_alignment.md`.
9. Created session log.
10. No UI implementation/refactor performed.

---

# Важное operational замечание

Это task подготовки.

Следующий implementation task должен быть:

```text
Sprint 020 Phase 1 — Operational Shell Foundation
```

Нельзя переходить к implementation до фиксации reference alignment.

---

## Reference files studied

- `docs/text-adm.png` (AF admin “Текст” console)
- `docs/logs-adm.png` (AF admin “Логи” console)

## Additional docs studied

- PROJECT_SOT: `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`
- `IMPLEMENTATION_PLAN.md`
- `docs/architecture/operational_discipline_assistant_flow_ru.md`
- Sprint 020 Phase 0 session log: `docs/cursor_sessions/2026-05-28_sprint_020_phase0_operational_workspace_bootstrap.md`

---

## Analysis summary (AF → Review Flow mapping)

AF operational console provides a stable structural template:

- **Unified shell** with persistent sidebar and consistent content frame.
- **Split workspace**: left list (sessions/executions) + right detail.
- **Toolbar-first** list interaction (filters/search/refresh).
- **Status-first hierarchy** with compact metadata cards.
- **Clear separation** of user input vs system output.
- **Timeline/trace** as first-class object with stage markers and timestamps.
- **Expandable technical payload** rather than raw JSON-first UI.

Review Flow must port these as **structure and semantics**, while preserving **NL-style** light palette and calm surfaces.

---

## Decisions

- AF dark palette is **explicitly rejected**; only structure is used.
- Operator console response area is defined as a **3-layer pipeline**:
  - AI Draft
  - Operator Revision
  - Published/Public Response
- Timeline is a **first-class workflow object** (not a buried debug list).
- Customer-visible request data must be visually separated from internal metadata.
- Company shell is shared by operator/admin; role gating is a capability tree inside one workspace.

---

## Risks

- **Accidental implementation drift**: “just tweak CSS” will violate task scope; alignment must stay documentation-only.
- **Page-by-page redesign trap**: must not bypass shell-first foundation.
- **Cross-contour style coupling**: current global CSS patterns can regress client contour; Phase 1 must introduce safer scoping strategy.
- **Semantic blending risk**: merging AI draft + operator edit + published response into a single textarea destroys lifecycle clarity.

---

## Next implementation recommendation (post-alignment)

Next task should be explicitly framed as:

```text
Sprint 020 Phase 1 — Operational Shell Foundation
```

With bounded deliverables:
- operational primitives (page chrome, split view, cards, badges, timeline)
- company contour CSS boundary strategy
- navigation hierarchy model (role-aware capability tree)

And explicit non-goals:
- no page-by-page redesign
- no customer-facing UI changes

