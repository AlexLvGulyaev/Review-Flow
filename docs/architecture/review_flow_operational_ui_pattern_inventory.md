# Review Flow — Operational UI Pattern Inventory (AF vs RF)

**Дата:** 2026-05-30  
**Тип:** UX-Foundation-01 — исследовательская инвентаризация  
**Статус:** Завершено (без изменений кода)

---

## 1. Описание подхода

### Цель

Зафиксировать визуальные и структурные паттерны **Object Workspace / Operational Workspace** в **Assistant Flow (AF)** и **Review Flow (RF)** как основу для будущей унификации операционных консолей.

### Метод

1. **Визуальный эталон** — `docs/AF-text.png` (AF), `docs/RF-operator.png` (RF).
2. **Программный код** — компоненты и CSS операционных консолей.
3. **Сравнение** — только operational workspace; Dashboard, Retrieval Settings, RAG Analysis и аналитика **не включались**.

### Эталонные экраны

| Проект | Экран | Страница | Источник |
|--------|-------|----------|----------|
| AF | Текст | Admin UI `/text` | `TextPage.tsx` |
| RF | Операторская консоль | `/operator/reviews` | `OperatorReviewsPage.jsx`, `OperatorModerationWorkspace.jsx` |

### Ограничения

Код, CSS и frontend **не изменялись**. RF Admin «Типовые ситуации» упомянут как вторичный workspace (см. §7), но не входит в основную пару сравнения.

---

## 2. Инвентаризация AF (Assistant Flow — «Текст»)

Источники: `TextPage.tsx`, `Topbar.tsx`, `globals.css` (`.logs-*`), `StatusBadge`, `SessionJsonSnapshot`, `OperationalModalityBadge`, `OperationalRefreshButton`.

### 2.1. Верхний уровень

| Паттерн | Назначение | Расположение | Состав | Визуальные признаки |
|---------|------------|--------------|--------|---------------------|
| Global app header | Идентификация приложения | Shell `Topbar.tsx` | «Admin console», «FastAPI · консоль наблюдаемости · auth {mode}», Zerocoder | Тёмная тема, muted subtitle |
| Workspace title | Название консоли | Над split | `<h1 class="page__title">Текст</h1>` | Крупный заголовок страницы |
| Workspace subtitle | Описание + API | Под title | Текст + `code` endpoint + «МСК» | `page__lead muted` |
| Разделительная линия | Отделение зон | Shell / card borders | border-bottom filters, card edges | `var(--border)` |

### 2.2. Левая макропанель (`logs-left card`)

| Паттерн | Назначение | Состав | Визуальные признаки |
|---------|------------|--------|---------------------|
| Левая макропанель | Список + фильтры | Sticky filters + scroll list | Grid `420px \| 1fr`, ~82vh |
| Фильтр №1 | Окно времени | 24h / 48h / 7d | `logs-select`, grid row |
| Фильтр №2 | Модель | все модели + options | compact select |
| Фильтр №3 | Статус | success / error / other | — |
| Фильтр №4 | — | **Отсутствует** (3 фильтра) | — |
| Строка поиска | Full-text | execution_id, запрос, модель… | `logs-search` full width |
| Пагинация | Nav | meta + ← / → / Сброс | `logs-filter-meta`, `logs-page-btn` |
| Кнопка обновления | Reload | `OperationalRefreshButton` | loading state |
| Карточка айтема | Выбор сессии | `logs-item` button | selected blue tint |
| Верхняя строка | Meta + status | ts + `[text]` badge + STATUS | `logs-item__row--tight` |
| Средняя строка | Preview | user query snippet | 2-line clamp |
| Нижняя строка | Telemetry | id, этапов, duration, provider | `logs-item__meta muted` |
| Статус айтема | Scan | УСПЕШНО / ОШИБКА | row 1, `logs-item__route-status` |
| Служебные метаданные | Pipeline | duration, stages, model line | mono, 0.68rem |

### 2.3. Правая макропанель

| Паттерн | Назначение | Состав | Визуальные признаки |
|---------|------------|--------|---------------------|
| Заголовок карточки | Identity | «СВОДКА TEXT-СЕССИИ» | uppercase `modality-card__title` |
| Статус объекта | Outcome | `StatusBadge` УСПЕХ/ОШИБКА | tone ok/warn/err |
| Паспорт объекта | Metadata | «Параметры сессии» \| «Текстовый пайплайн» | 2-col kv dl |
| Read-only панель | Контент | «ЧТО СПРОСИЛ» + «ЧТО ОТВЕТИЛА» | `logs-pre--compact mono` |
| Editable панель | — | **Отсутствует** | observability-only |
| Action bar | — | **Отсутствует** | — |
| Таймлайн | Pipeline | stages + icons + delta ms | `details`, collapsed |
| Коллапсируемая секция | Diagnostics | Timeline + SessionJsonSnapshot | `<details>` |

### 2.4. Дополнительные паттерны AF

- **Chunk card header** — meta + «показать полный текст»
- **Full-text modal** — portal `rag-chunk-modal`
- **Modality badge** — `[text]` pill
- **Telemetry gap** — «н/д», «н/л», «н/с»
- **Pipeline stage icon** — в timeline

---

## 3. Инвентаризация RF (Review Flow — «Операторская консоль»)

Источники: `OperatorReviewsPage.jsx`, `OperatorConsoleHeader.jsx`, `OperatorLeftPanel.jsx`, `OperatorQueueItem.jsx`, `OperatorModerationWorkspace.jsx`, `ResponseCasePanel.jsx`, `operator-console.css`.

### 3.1. Верхний уровень

| Паттерн | Назначение | Состав | Визуальные признаки |
|---------|------------|--------|---------------------|
| Global app header | Идентификация | «Операторская консоль», subtitle, Zerocoder, divider | светлая тема, sticky |
| Workspace title | Консоль | «Очередь обращений» | h2, 1rem |
| Workspace subtitle | Описание | «Журнал модерации обращений» | 0.78rem secondary |
| Разделительная линия | Отделение | `rf-oc-global-header__divider` | 1px full width |

### 3.2. Левая макропанель

| Паттерн | Состав | Визуальные признаки |
|---------|--------|---------------------|
| Левая макропанель | filters + list | `rf-oc-left`, ~400px |
| Фильтр №1 | статус модерации | OpSelect |
| Фильтр №2 | приоритет | OpSelect |
| Фильтр №3 | сценарий | OpSelect |
| Фильтр №4 | тональность | OpSelect |
| Строка поиска | клиент, заказ, текст | `rf-oc-search` |
| Пагинация | Стр. X/Y · всего · на проверке | domain counter |
| Кнопка обновления | OpButton «Обновить» | compact |
| Карточка айтема | `rf-oc-item` | inset blue selected bar |
| Верхняя строка | ts \| request ID \| status | CSS grid 3-col |
| Средняя строка | review preview | 2-line clamp |
| Нижняя строка | AI telemetry | `buildQueueTelemetry` |
| Статус айтема | «На проверке» и т.д. | col 3, weight 600 |

### 3.3. Правая макропанель (CH)

| Паттерн | Состав | Визуальные признаки |
|---------|--------|---------------------|
| Заголовок карточки | «Обращение NL-…» | `rf-oc-detail-identity__title` |
| Статус объекта | НА ПРОВЕРКЕ | uppercase справа |
| Паспорт | Обращение 40% \| Выбранная ТС 60% | `rf-oc-ch-top-grid` |
| Read-only triad | клиент \| основа* \| LLM | 3-col, CollapsibleTextPanel |
| Editable panel | Ответ оператора | OpTextarea |
| Action bar | Подтвердить?, Одобрить, Отклонить, Создать ТС | inline head |
| Таймлайн | lifecycle events | `<details>` collapsed |
| Collapsible tech | operational_logs JSON | `<details>` |

### 3.4. Дополнительные паттерны RF

- **Confidence band** — Высокая/Средняя/Низкая pill
- **Alternative case cards** — score + «Выбрать»
- **Candidate / rejection modals** — `rf-oc-modal`
- **CollapsibleTextPanel** — ~5 lines + expand
- **Minor action button** — dashed «Создать новую ТС»

---

## 4. Сводная таблица паттернов

| Паттерн | Местоположение | AF | RF |
|---------|----------------|----|----|
| Главный заголовок приложения | Global header | Admin console | Операторская консоль |
| Подпись под главным заголовком | Global header | FastAPI · консоль наблюдаемости · auth | Рабочее пространство обработки обращений |
| Бренд | Global header | Zerocoder | Zerocoder |
| Разделительная линия | Под global header | shell border | `rf-oc-global-header__divider` |
| Название консоли | Workspace header | Текст | Очередь обращений |
| Подпись под названием консоли | Workspace header | `/api/logs/recent` · МСК | Журнал модерации обращений |
| Левая макропанель | Split | logs-left ~420px | rf-oc-left ~400px |
| Фильтр №1 | Left row 1 | Окно времени | Статус модерации |
| Фильтр №2 | Left row 1 | Модель | Приоритет |
| Фильтр №3 | Left row 1 | Статус success/error | Сценарий |
| Фильтр №4 | Left row 1 | — | Тональность |
| Строка поиска | Left | execution_id, запрос… | клиент, заказ, текст |
| Пагинация | Left | Страница X/Y · сессий | Стр. X/Y · на проверке |
| Кнопка обновления | Left meta | OperationalRefreshButton | OpButton Обновить |
| Карточка айтема | List | logs-item | rf-oc-item |
| Верхняя строка | Item | ts + [text] + STATUS | ts + ID + status |
| Средняя строка | Item | preview запроса | preview обращения |
| Нижняя строка | Item | pipeline telemetry | AI telemetry |
| Статус айтема | Item row 1 | УСПЕШНО (pipeline) | На проверке (moderation) |
| Служебные метаданные | Item row 3 | duration, provider | AI classification |
| Заголовок карточки | Right | СВОДКА TEXT-СЕССИИ | Обращение NL-id |
| Статус объекта | Right | StatusBadge | НА ПРОВЕРКЕ |
| Паспорт объекта | Right upper | Session + Pipeline | Request + Selected case |
| Read-only панель | Right middle | 2 col input/output | 3 col client/basis/LLM |
| Editable панель | Right | — | Ответ оператора |
| Action bar | Right | — | Одобрить / Отклонить / CH |
| Таймлайн | Right bottom | Pipeline stages | Lifecycle (collapsed) |
| Коллапсируемая секция | Right bottom | Timeline + JSON | Timeline + Tech |
| Chunk card | Detail | fulltext CTA header | alt case cards |
| Candidate card | — | — | modal (не list card) |
| Информационный бейдж | List | Modality [text] | — |
| Статусный бейдж | Detail | StatusBadge | Confidence band |
| Кнопка действия primary | — | — | Одобрить и отправить |
| Вторичная кнопка | Detail | показать полный текст | Отклонить, Создать ТС |

---

## 5. Расхождения

### 5.1. Только в AF

- Modality badge `[text]`
- Telemetry gap (н/д, н/л, н/с)
- Dual passport: токены, latency, provider
- SessionJsonSnapshot
- Full-text portal modal
- Pipeline stage icons
- OperationalRefreshButton
- Observability-only (нет editable / actions)

### 5.2. Только в RF

- Controlled Hybrid «Выбранная ТС» + confidence band
- 3-column read-only triad
- Editable operator response
- Workflow action bar
- Alternative case cards
- Rejection / candidate modals
- CollapsibleTextPanel inline expand
- Counter «на проверке: N»
- 4 classification filters

### 5.3. Различающаяся реализация

| Паттерн | AF | RF |
|---------|----|----|
| Тема | Dark | Light |
| Global header | Shell Topbar | Per-page rf-oc-global-header |
| Workspace title | h1 in page | h2 after h1 |
| List top row center | modality badge | business request ID |
| List status semantics | pipeline outcome | moderation state |
| Passport | session metrics | request + CH case |
| Read-only blocks | 2 col mono pre | 3 col collapsible |
| Full text | modal | inline expand |
| Timeline | pipeline stages | business lifecycle |
| Tech data | SessionJsonSnapshot | OpPayloadBlock |
| Refresh | dedicated component | generic button |

---

## 6. Предварительные рекомендации по унификации

1. **Operational Shell Contract** — Global header → Workspace header → Split; порядок left panel: filters → search → pagination → list.
2. **Shared CSS tokens** — border, padding, list density, selected state для `logs-*` и `rf-oc-*`.
3. **List item 3-line grid** — `[ts | center | status] + preview + telemetry`; center slot domain-specific.
4. **Unified text panel** — preview lines, expand/modal policy, title typography.
5. **Collapsed bottom zone** — timeline + tech always `<details>` default closed.
6. **Action bar contract** — optional для observability; primary/minor для workflow.
7. **Domain panels** — CH / pipeline остаются extensions, не ломают общий shell.
8. **Theme** — shared components + CSS variables (light/dark), не big-bang rewrite.

### Приоритеты

| P | Задача |
|---|--------|
| P0 | Pattern catalog / design matrix |
| P1 | List item + filter bar tokens |
| P1 | Collapsible text panel unification |
| P2 | Global/workspace headers |
| P2 | Refresh + pagination meta |
| P3 | Theme alignment |

### Риски

- Workflow vs observability — layout должен поддерживать optional editable + actions.
- CH complexity — triad не должна ломать AF 2-col IO.
- Namespace sprawl — `logs-*`, `rf-oc-*`, `rf-rc-*`.

---

## 7. Связанный RF workspace (вне пары)

**Типовые ситуации** (`ResponseCasesAdminWorkspace`) — admin operational workspace по образцу AF «Документы». Рекомендуется UX-Foundation-02: Documents ↔ Response Cases.

---

## 8. Источники

**AF:** `TextPage.tsx`, `Topbar.tsx`, `globals.css`, `StatusBadge.tsx`, `SessionJsonSnapshot.tsx`, `docs/AF-text.png`

**RF:** `OperatorReviewsPage.jsx`, `OperatorConsoleHeader.jsx`, `OperatorLeftPanel.jsx`, `OperatorQueueItem.jsx`, `OperatorModerationWorkspace.jsx`, `ResponseCasePanel.jsx`, `CollapsibleTextPanel.jsx`, `operator-console.css`, `docs/RF-operator.png`
