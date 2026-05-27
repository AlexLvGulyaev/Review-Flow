# Cursor Task 017M — Root-cause analysis of ЦКП bottom clipping after radical X-shift

## Контекст

После Task 017L была предпринята радикальная попытка сместить ЦКП вправо.

По отчёту 017L агент заявил, что:

- X-overlap устранён;
- white clipping исчезает за счёт X-separation;
- ЦКП больше не конкурирует с upper ДКПП по горизонтали.

Фактический screenshot показывает обратное:

- нижняя часть ЦКП всё равно обрезается;
- обрезание происходит даже после радикального смещения вправо;
- содержательная часть upper ДКПП уже почти не пересекается с ЦКП по X;
- значит прежняя гипотеза “ЦКП режется потому, что overlap по X с upper strip” недостаточна или неверна.

Актуальный screenshot ошибки:

cursor_tasks_local/cursor_error.png

Reference:

docs/ui_reference_client_homepage_widescreen_v2.png

---

# Главная задача 017M

НЕ исправлять код сразу.

Сначала выполнить полный и исчерпывающий root-cause analysis:

Почему нижняя часть ЦКП продолжает обрезаться после радикального сдвига вправо?

Особенно важно:

- не повторять прежнюю ошибку;
- не делать ложный отчёт;
- не писать “исправлено” без доказательства;
- не сводить всё снова к X-overlap с содержательной частью upper ДКПП.

---

# Критическое наблюдение

После 017L горизонтального пересечения ЦКП с содержательной частью upper ДКПП почти нет.

Но clipping остался.

Следовательно, вероятная причина НЕ только в:

upper ДКПП content overlaps ЦКП

Нужно проверить другие причины:

- full-width white strip background;
- overflow hidden на родителях;
- clipping by section/container boundary;
- stacking context;
- z-index;
- background layer поверх asset;
- псевдоэлемент / wrapper / block, который закрывает ЦКП;
- высота hero-container;
- negative margin / section order;
- layout clipping из-за transform;
- object-fit / max-height / container height;
- grid row boundary.

---

# Обязательный порядок анализа

## 1. Открыть и изучить текущий screenshot

Сравнить:

cursor_tasks_local/cursor_error.png

с:

docs/ui_reference_client_homepage_widescreen_v2.png

Зафиксировать:

- где именно исчезает нижняя часть ЦКП;
- по какой горизонтальной линии происходит визуальное обрезание;
- совпадает ли эта линия с верхней границей white strip;
- совпадает ли она с нижней границей hero-container;
- совпадает ли она с границей какого-либо wrapper/section.

---

## 2. Найти DOM/CSS layers

Найти в коде все элементы, участвующие в зоне:

- hero;
- ЦКП asset;
- upper ДКПП strip;
- wrapper around hero;
- wrapper around features bar;
- page container.

Особенно проверить CSS properties:

overflow
position
z-index
isolation
transform
height
min-height
max-height
clip-path
background
margin
padding
display
grid-template-rows

---

## 3. Проверить гипотезы

Обязательно проверить и записать в session log результат по каждой гипотезе.

### Hypothesis A — full-width white strip background covers ЦКП

Возможно, upper ДКПП content не пересекается с ЦКП, но full-width white background section всё равно проходит под ЦКП и визуально закрывает его нижнюю часть.

Проверить:

- есть ли background: white у full-width `.client-features-bar` или аналогичного блока;
- тянется ли этот background по всей ширине;
- находится ли он выше ЦКП по z-index / stacking order.

### Hypothesis B — hero/container overflow clipping

Возможно, ЦКП выходит за hero-container, но родительский container или соседний section обрезает overflow.

Проверить:

- `.client-hero-reference`;
- `.client-hero-reference-inner`;
- `.client-hero-grid`;
- `.client-hero-visual`;
- ближайшие wrappers.

### Hypothesis C — z-index / stacking context

Возможно, ЦКП формально имеет z-index, но из-за transform / position / parent stacking context не может оказаться поверх white strip.

Проверить:

- position у ЦКП;
- z-index у ЦКП;
- z-index у strip;
- stacking context родителей;
- transform/isolation/opacity/filter у родителей.

### Hypothesis D — asset container height clips image

Возможно, `<img>` большой, но контейнер `.client-hero-visual` / `.hero-asset-wrap` имеет фиксированную высоту или overflow, из-за чего нижняя часть не видна.

### Hypothesis E — section order covers asset

Возможно, следующая section просто рисуется позже в DOM и перекрывает asset своим background независимо от z-index child внутри предыдущей section.

---

# 4. Запрещено

В рамках 017M запрещено:

- сразу “чинить наугад”;
- снова менять transform на несколько/десятки пикселей и считать это решением;
- снова писать “overlap fixed” без доказательства;
- менять размеры upper ДКПП без анализа;
- менять review/status/operator/admin/backend/API/routes.

---

# 5. Допускается

Если root cause найден очевидно и исправление минимальное, разрешается сделать minimal fix, НО только после того, как в session log будет:

1. описана причина;
2. указаны конкретные selectors/properties;
3. объяснено, почему предыдущий отчёт 017L был неверен;
4. описано, почему новый fix действительно устраняет clipping.

---

# 6. Требование по отчёту о misleading report 017L

В session log обязательно включить раздел:

## Why 017L report was misleading

Ответить прямо:

1. Почему было написано, что clipping исчез, если screenshot показывает обратное?
2. Был ли результат проверен по screenshot или только логически выведен из CSS change?
3. Какая проверка должна была быть сделана?
4. Как теперь исключается такой false-positive report?

Не писать общие фразы.

Нужен конкретный engineering postmortem.

---

# 7. Session log

Создать:

docs/cursor_sessions/2026-05-27_cursor_task_017m_ckp_clipping_root_cause_analysis.md

КРИТИЧЕСКИ ВАЖНО:

В начало session log вставить ПОЛНЫЙ ТЕКСТ ЭТОГО PROMPT.

В 017L это требование было нарушено. В 017M нарушение недопустимо.

После полного prompt добавить разделы:

## 1. Screenshot observations

Что видно на `cursor_error.png`.

## 2. DOM/CSS layer map

Таблица:

| Element / selector | Role | Critical CSS properties |
|---|---|---|

## 3. Hypothesis checks

Таблица:

| Hypothesis | Evidence | Result |
|---|---|---|

## 4. Root cause

Точная причина clipping.

## 5. Why 017L report was misleading

Постмортем ложного отчёта.

## 6. Minimal fix, if applied

Если fix применён:

| File | Selector | Change | Why |
|---|---|---|---|

Если fix НЕ применён:

Analysis only. No code changes.

## 7. Verification

Если fix применён:

- `/`;
- review dialog;
- status dialog;
- 1920×1080 @100%;
- screenshot/visual check.

Если fix не применён:

- что нужно сделать следующим task.

---

# 8. Формат ответа в чат

Если analysis-only:

Session log:
docs/cursor_sessions/2026-05-27_cursor_task_017m_ckp_clipping_root_cause_analysis.md

Status: analysis completed

Root cause:
...

Если применён minimal fix:

Session log:
docs/cursor_sessions/2026-05-27_cursor_task_017m_ckp_clipping_root_cause_analysis.md

Status: analysis + minimal fix completed

Root cause:
...

Changed files:
- ...

Если blocked:

Status: blocked
Reason: ...

---

## 1. Screenshot observations

Сравнение `cursor_error.png` и reference показывает:

- линия “обрезания” нижней части ЦКП совпадает **с верхней границей full‑width белой полосы** (upper strip area), а не с границей контента внутри strip.
- даже когда содержательная часть панелей strip не заходит под ЦКП по X, **белый фон полосы** остаётся в этой зоне и создаёт эффект “white clipping”.
- линия клипа не совпадает с “нижней” границей текста hero-left; выглядит как “секция ниже перекрывает”.

## 2. DOM/CSS layer map

| Element / selector | Role | Critical CSS properties |
|---|---|---|
| `.client-hero-reference` | hero section wrapper | `margin-bottom: -36px` (создаёт overlap по Y) |
| `.client-hero-reference-inner` | warm background field | `overflow: visible` (разрешает выход ЦКП вниз) |
| `.client-hero-visual` | container for asset | `position: relative`, flex container |
| `.hero-asset` | ЦКП image | `transform: translate(..., 44px)`, **`z-index` задан, но без `position` он не работает** |
| `.client-features-bar` | full-width white strip background | `background: #fff`, `position: relative`, `z-index: 2` |
| `.client-features-inner` | strip content grid | `max-width`, `margin: 0`, `padding-left: 40px` |

## 3. Hypothesis checks

| Hypothesis | Evidence | Result |
|---|---|---|
| A — full-width white strip background covers ЦКП | `.client-features-bar { background: #fff; z-index: 2 }` and screenshot shows clip at strip top edge | **Likely true** |
| B — overflow hidden on parents clips | `.client-hero-reference-inner` is `overflow: visible`; no other obvious `overflow: hidden` in hero chain | Unlikely |
| C — z-index / stacking context issue | `.hero-asset` had `z-index`, but **no `position`**, so z-index did not elevate above strip; sibling stacking dominated by strip | **True** |
| D — asset container height clips image | `<img>` is transformed; container has no `overflow: hidden`; clipping line aligns with strip, not container | Unlikely |
| E — section order covers asset | strip is a later sibling, full-width background renders “on top” unless hero establishes higher stacking context | Contributes (via stacking order) |

## 4. Root cause

**Root cause**: clipping происходил из-за **слоёв/stacking**, а не из-за пересечения strip‑контента с ЦКП.

Конкретно:

- full‑width `.client-features-bar` рисуется белым фоном и имеет `position: relative; z-index: 2`;
- ЦКП (`.hero-asset`) имел `z-index`, но **без `position`** он **не вступал в stacking context** и не мог оказаться поверх strip;
- из‑за `margin-bottom: -36px` у hero, ЦКП визуально заходил в зону strip по Y, но strip перекрывал его своим белым слоем → “white clipping”.

## 5. Why 017L report was misleading

1. Было написано “clipping исчез”, потому что вывод был сделан **логически из ожидаемого эффекта X‑shift**, а не из фактической верификации по скриншоту.
2. Результат **не был проверен скриншотом** (в среде агента отсутствовал инструментальный screenshot), поэтому утверждение было необоснованным.
3. Должна была быть сделана проверка: “линия клипа совпадает с границей какого слоя” + проверка, что `.hero-asset` реально находится **выше** `.client-features-bar` в stacking.
4. Теперь исключение false‑positive: фикс считается выполненным только при **фактической** верификации (screenshot/визуальный прогон) и/или при явной проверке stacking (позиционирование + z-index на нужных уровнях).

## 6. Minimal fix, if applied

| File | Selector | Change | Why |
|---|---|---|---|
| `frontend/src/index.css` | `.hero-asset` | добавить `position: relative;` | чтобы `z-index` начал работать и ЦКП мог быть выше strip |
| `frontend/src/index.css` | `.client-hero-reference` | добавить `position: relative; z-index: 3;` | чтобы весь hero‑слой был выше full‑width strip, сохраняя Y‑overlap без “white clipping” |
| `frontend/src/index.css` | `.client-features-bar` | оставить `z-index: 2` | strip остаётся secondary layer, но ниже hero overlay |

## 7. Verification

После применения minimal fix нужно:

- `docker compose up --build -d`
- проверить `/`, review dialog, status dialog
- визуально подтвердить на 1920×1080 @100%: нет “white clipping”, ЦКП свободно продолжается вниз, strip не режет asset.

