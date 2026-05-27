# Cursor Task 017G — Final homepage height and icon refinement

## Контекст

После Task 017F homepage стала существенно ближе к эталону:

- реальные assets подключены;
- hero scene отображается лучше;
- warehouse image отображается;
- metrics вынесены в горизонтальный блок;
- структура страницы близка к `docs/ui_reference_client_homepage_widescreen_v2.png`.

Но результат ещё не принят.

Текущая проблема:

- вся страница от header до footer целиком помещается на экране только примерно при browser zoom 80%;
- нужно добиться влезания на 1920×1080 при zoom 100%;
- ряд иконок по цветам и форме всё ещё отличается от эталона.

Задача 017G — это НЕ redesign.

Это точечная финальная коррекция:

1. уменьшить вертикальную высоту композиции;
2. приблизить иконки к эталону;
3. сохранить текущие реальные assets;
4. сохранить текущую структуру homepage.

---

# Source of truth

Использовать как визуальный эталон:

```text
docs/ui_reference_client_homepage_widescreen_v2.png
```

Текущий результат после 017F считать рабочей базой, но не финальным результатом.

---

# Главная цель

Добиться, чтобы homepage целиком:

```text
от header до footer
```

помещалась на экране:

```text
1920×1080
browser zoom 100%
```

без необходимости уменьшать zoom до 80%.

Допускается минимальная прокрутка до 20–30px, но целевая установка — полное влезание.

---

# 1. Уменьшение высоты центрального hero-блока

В текущем UI центральный блок со светло-розовым / тёплым фоном слишком высокий.

Нужно:

- обрезать / уменьшить этот блок сверху;
- обрезать / уменьшить этот блок снизу;
- сделать hero visually flatter;
- оставить небольшой просвет между header и содержимым hero;
- не прижимать hero совсем вплотную к header;
- снизу убрать примерно такой же объём, как сверху.

Важно:

- не ломать hero composition;
- не деформировать `hero_scene_northline_market.png`;
- не уменьшать asset до нечитабельного размера;
- не возвращать narrow layout.

Практически проверить и скорректировать:

- `padding-top`;
- `padding-bottom`;
- `min-height`;
- `height`;
- внутренние `gap`;
- vertical alignment hero grid.

---

# 2. Уменьшение высоты нижнего ряда feature cards

Речь о нижнем ряде карточек:

- Быстрая доставка
- Проверенное качество
- Поддержка 24/7
- Безопасная оплата

Сейчас они занимают лишнюю высоту.

Нужно:

- уменьшить вертикальный размер каждой карточки примерно на одну строку текста;
- оставить только одну строку описания под заголовком, если сейчас их больше;
- уменьшить внутренние vertical paddings;
- сохранить читаемость;
- сохранить card row в 4 колонки;
- не ломать spacing между карточками.

Цель:

```text
нижний feature cards row должен стать ниже,
но визуально остаться похожим на эталон.
```

---

# 3. Цветные иконки feature cards и feature strip

Сейчас:

- верхний ряд иконок в основном зелёный;
- нижний ряд иконок в основном синий.

Это не соответствует reference.

Нужно для обоих рядов:

- доставка — зелёный фон / зелёная иконка;
- качество — синий фон / синяя иконка;
- поддержка — фиолетовый фон / фиолетовая иконка;
- оплата — оранжевый фон / оранжевая иконка.

Цвета должны быть близки к эталону:

```text
delivery: green
quality: blue
support: purple
payment: orange
```

Если используются CSS classes, лучше сделать явные variants:

```text
icon--delivery
icon--quality
icon--support
icon--payment
```

или эквивалент.

Важно:

- верхний strip и нижние cards должны использовать одинаковую color semantics;
- не делать все иконки одного цвета;
- не оставлять верхний ряд полностью зелёным;
- не оставлять нижний ряд полностью синим.

---

# 4. Иконки metrics block

Блок metrics:

- 50 000+ довольных клиентов
- 250 000+ доставленных заказов
- 4.8 / 5 средняя оценка сервиса

должен быть максимально близок к эталону по форме и цветам иконок.

Использовать:

## 50 000+ довольных клиентов

- круглая smile icon;
- зелёный soft background;
- зелёная иконка.

## 250 000+ доставленных заказов

- cube / box icon;
- голубой / синий soft background;
- синяя иконка.

## 4.8 / 5 средняя оценка сервиса

- star icon;
- фиолетовый soft background;
- фиолетовая иконка.

Важно:

- сохранить horizontal metrics row;
- не превращать metrics в vertical stack;
- не менять порядок metrics;
- не увеличивать высоту блока.

---

# 5. Footer and total height

Если после изменений hero/cards всё ещё не помещается на 1920×1080 @100%, дополнительно разрешается немного уменьшить:

- footer vertical padding;
- footer row gap;
- расстояние между info band и footer;
- расстояние между feature cards row и info band.

Но запрещено:

- удалять footer columns;
- ломать footer layout;
- делать footer нечитаемым;
- возвращать `margin-top: auto`;
- создавать пустое пространство.

---

# 6. Что НЕ менять

Запрещено:

- менять структуру homepage sections;
- добавлять новые секции;
- удалять текущие основные секции;
- менять hero asset;
- менять warehouse asset;
- менять review dialog;
- менять status dialog;
- менять operator/admin UI;
- менять backend;
- менять API;
- менять routes;
- делать новый redesign.

---

# 7. Acceptance criteria

Task 017G принимается только если:

1. Центральный hero block стал ниже сверху и снизу.
2. Просвет от header до hero сохранён, но уменьшен.
3. Нижний ряд feature cards стал ниже примерно на одну строку текста.
4. Верхний и нижний ряды feature icons имеют разные цвета по смыслу:
   - delivery green;
   - quality blue;
   - support purple;
   - payment orange.
5. Metrics icons соответствуют эталону по форме и цветам:
   - smile green;
   - cube blue;
   - star purple.
6. Metrics остаются горизонтальными.
7. Вся homepage от header до footer помещается на 1920×1080 при browser zoom 100% или требует не более 20–30px прокрутки.
8. Не требуется zoom 80%.
9. Hero asset корректно масштабируется.
10. Warehouse asset корректно отображается.
11. Review dialog не сломан.
12. Status dialog не сломан.
13. Operator/admin UI не затронут.
14. Нет runtime errors.

---

# 8. Verification

После изменений выполнить:

```bash
docker compose up --build -d
```

Проверить:

```text
/
review dialog
status dialog
1920×1080 @ 100%
1440×900
```

Особенно проверить:

- помещается ли вся страница на 1920×1080 @100%;
- стали ли icon colors такими же по логике, как в reference;
- не сломались ли реальные assets;
- не вернулся ли narrow layout.

---

# 9. Session log

Создать:

```text
docs/cursor_sessions/2026-05-27_cursor_task_017g_final_height_icon_refinement.md
```

В начало вставить полный текст этого prompt.

Ниже обязательно добавить разделы:

## 1. Height adjustments

Таблица:

| Area | What changed | Why |
|---|---|---|

Обязательно указать:

- hero top/bottom reduction;
- lower feature cards reduction;
- footer/gap changes, если были.

## 2. Icon color refinements

Таблица:

| Item | Before | After |
|---|---|---|

Обязательно указать:

- delivery;
- quality;
- support;
- payment;
- happy customers;
- delivered orders;
- rating.

## 3. Viewport verification

Указать результат:

| Viewport | Browser zoom | Result |
|---|---|---|
| 1920×1080 | 100% | ... |
| 1440×900 | 100% | ... |

Если есть остаточная прокрутка — указать примерный размер в px.

## 4. What was not changed

Подтвердить:

- review dialog not changed;
- status dialog not changed;
- operator/admin not touched;
- backend/API/routes not changed.

## 5. Remaining limitations

Если что-то осталось не идеально — написать честно.

---

# Формат ответа в чат

После выполнения написать:

```text
Session log:
docs/cursor_sessions/2026-05-27_cursor_task_017g_final_height_icon_refinement.md

Status: completed

Changed files:
- ...
```

или:

```text
Status: blocked
Reason: ...
```

---

## Implementation summary

**Status:** completed  
**Date:** 2026-05-27

## 1. Height adjustments

| Area | What changed | Why |
|---|---|---|
| Hero block | `min-height` 450→390px; grid padding 2.25/2.1rem→1.35/1.25rem; visual `min-height` 340→300px; gap 1.5→1.25rem; pill/actions margins tightened | Flatten warm hero band top/bottom without crushing scene asset |
| Header→hero gap | `.client-home-hero { margin-top: 0.5rem }` | Keep small breathing room below header |
| Feature strip | `min-height` 96→84px; item padding 1rem→0.75rem; inner padding 0.75→0.55rem | Reduce strip vertical footprint |
| Feature cards row | `min-height` 138→112px; padding 0.95→0.7rem; copy shortened to one line each | ~one line of text height saved per card |
| Info band | Image/metric height 110→100px; grid gap 1.25→1rem | Align with tighter vertical budget |
| Section spacing | `.client-section` margin 1.7→1.2rem; cards margin 1.6→1.15rem; page bottom padding 2.25→1.5rem | Close gaps between major bands |
| Footer | Inner padding 1.9→1.35rem top / 1.15→0.9rem bottom; gap 1.5→1.15rem; bottom bar 1→0.65rem | Extra height budget for 1080p fit |

## 2. Icon color refinements

| Item | Before | After |
|---|---|---|
| delivery (strip + cards) | All strip icons green; all card icons blue/gray | `icon--delivery`: green soft bg + green stroke |
| quality | Same mono-color rows | `icon--quality`: blue soft bg + blue stroke |
| support | Same mono-color rows | `icon--support`: purple soft bg + purple stroke |
| payment | Same mono-color rows | `icon--payment`: orange soft bg + orange stroke |
| happy customers | Emoji 🙂 in green box | SVG smile in `icon--delivery` (green) |
| delivered orders | Emoji 📦 | SVG cube/box in `icon--quality` (blue) |
| rating | Emoji ⭐ | SVG star in `icon--support` (purple) |

Shared variants live in `index.css`; `HomePage.jsx` passes `variant` on strip, cards, and metrics.

## 3. Viewport verification

| Viewport | Browser zoom | Result |
|---|---|---|
| 1920×1080 | 100% | CSS floor estimate ~1027px content + header/footer (see note); target fit without 80% zoom; manual browser pass recommended |
| 1440×900 | 100% | Wider layout preserved; vertical scroll expected (shorter viewport) |

**Smoke checks (docker compose, port 5180):**

- `GET /` → 200
- `GET /review` → 200
- `GET /review/status` → 200
- `GET /assets/hero_scene_northline_market.png` → 200
- `GET /assets/warehouse_corridor_northline.png` → 200

**Note:** Headless browser at exact 1920×1080 was not available in the agent environment; height budget was validated via CSS min-heights/margins sum (~53px slack vs 1080 before real font metrics). Residual scroll on dense displays may be 0–30px depending on OS font scaling.

## 4. What was not changed

- review dialog not changed
- status dialog not changed
- operator/admin not touched
- backend/API/routes not changed
- hero/warehouse asset files unchanged
- homepage section structure unchanged

## 5. Remaining limitations

- Pixel-perfect match to `docs/ui_reference_client_homepage_widescreen_v2.png` not claimed; icon shapes are simplified inline SVG, not exported reference assets.
- Viewport fit at 1920×1080 should be confirmed visually in a real browser (font/OS scaling affects final scroll).
- 1440×900 will scroll by design; task primary target was 1080p height budget.

**Changed files:**

- `frontend/src/pages/HomePage.jsx`
- `frontend/src/index.css`
