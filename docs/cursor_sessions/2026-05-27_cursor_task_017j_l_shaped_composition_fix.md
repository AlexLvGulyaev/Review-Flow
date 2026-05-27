# Cursor Task 017J — L-shaped composition reconstruction and asymmetric hero alignment

## Контекст

После Task 017I homepage приблизилась к эталону по:
- spacing;
- typography;
- colors;
- footer styling;
- pseudo-navigation.

Но Cursor всё ещё НЕ понял главный композиционный принцип эталона.

Сейчас Cursor продолжает мыслить:
hero rectangle

внутри которого выравниваются:
- hero-left;
- ЦКП;
- upper ДКПП strip.

Это НЕ соответствует reference.

---

# Source of truth

Главный visual reference:

docs/ui_reference_client_homepage_widescreen_v2.png

Новый ЦКП asset:

/assets/hero_scene_northline_market.png

Warehouse asset:

/assets/warehouse_northline_market.png

---

# ГЛАВНОЕ КОМПОЗИЦИОННОЕ УТОЧНЕНИЕ

Эталон НЕ является:
symmetrical centered rectangle

Эталон является:
L-shaped asymmetric composition

---

# Как устроена композиция reference

Слева:
- hero-left
- upper ДКПП strip

образуют:
L-shaped visual mass

Справа:
ЦКП asset:
- НЕ выровнен по hero rectangle;
- НЕ ограничен высотой hero;
- композиционно продолжается вниз;
- перекрывает upper strip по visual height.

---

# КРИТИЧЕСКИЙ ЗАПРЕТ

НЕ делать:
hero-left == ЦКП == upper strip

по одной общей прямоугольной рамке.

Это главная ошибка текущей реализации.

---

# RULE 1 — Vertical composition

В reference:

hero-left height
+
upper strip height
≈
ЦКП height

Но:
ЦКП должен достигать этого НЕ через:
- hero container height;
- vertical centering;
- align-items center;

а через:
visual continuation downward

---

# RULE 2 — Horizontal composition

В reference:

upper strip width
+
ЦКП width
≈
lower row width

Но:
upper strip НЕ должен быть:
- full-width;
- centered относительно lower row.

Он должен:
- начинаться вровень с hero-left;
- заканчиваться раньше;
- композиционно передавать пространство ЦКП справа.

---

# 1. Перестать выравнивать ЦКП по hero rectangle

Сейчас Cursor:
- держит ЦКП внутри hero block;
- центрирует его вертикально;
- из-за этого RULE 1 никогда не выполняется.

Нужно:
- позволить ЦКП композиционно выходить вниз;
- visual bottom ЦКП должен быть ниже hero text;
- ЦКП должен visually перекрывать upper strip.

---

# 2. Новый ЦКП asset использовать почти полностью

Новый asset:
/assets/hero_scene_northline_market.png

Он специально создан:
- почти без внутренних пустот;
- с максимальной visual mass;
- “всклянь”;
- чтобы ЦКП реально доминировал.

Запрещено:
- уменьшать asset обратно;
- помещать его в маленький контейнер;
- оставлять большие пустые поля вокруг asset.

---

# 3. Увеличить ЦКП ещё сильнее

Нужно:
- увеличить visual height;
- увеличить visual width;
- уменьшить пустоту справа;
- приблизить asset к hero-left.

Важно:
- НЕ crop;
- НЕ distort;
- НЕ blurry scale.

---

# 4. Верхний ДКПП strip исправить

Сейчас upper strip:
- слишком толстый;
- слишком высокий;
- слишком narrow;
- typography uneven.

---

# Как должно быть

Upper strip должен быть:
- ниже;
- тоньше;
- чуть шире текущего;
- secondary layer.

---

# Требования к upper strip

## Высота

Уменьшить:
- vertical paddings;
- icon wrapper size;
- min-height;
- line-height.

Upper strip должен быть visibly smaller than lower row.

---

## Ширина

Сейчас strip слишком короткий.

Нужно:
- немного увеличить width;
- но НЕ делать full-width;
- strip должен заканчиваться перед основной массой ЦКП.

---

## Typography alignment

Нужно добиться:
- жирный текст во всех panels — в одну строку;
- обычный текст — на одном вертикальном уровне;
- panel “Качество товаров”:
  - ровно 2 строки обычного текста;
  - как в эталоне.

---

# 5. Нижний ДКПП row

Cursor слишком сократил тексты.

Нужно:
- вернуть тексты ближе к эталону;
- НЕ обрезать aggressively content;
- сохранять lower row как primary layer.

Высоту экономить через:
- tighter paddings;
- tighter line-height;
- tighter gaps.

---

# 6. Hero badge

Использовать uppercase:
СЕРВИС, КОТОРОМУ ДОВЕРЯЮТ

---

# 7. Footer payment systems

Сейчас:
- только colored pills;
- logo-like appearance отсутствует.

Нужно:
- максимально приблизить:
  - VISA;
  - Mastercard;
  - МИР
к эталону.

Если есть:
- SVG;
- icon assets;
- suitable icon library;

использовать их.

---

# 8. Финальная высота страницы

Homepage должна помещаться:
1920×1080
browser zoom 100%

Допускается:
0–10px residual scroll максимум.

---

# 9. Acceptance criteria

Task 017J принимается только если:
1. ЦКП visually dominant.
2. ЦКП НЕ выровнен по hero rectangle.
3. ЦКП visually продолжается вниз.
4. RULE 1 выполнен.
5. RULE 2 выполнен.
6. Upper strip thinner than lower row.
7. Upper strip slightly wider than current version.
8. Upper strip typography aligned correctly.
9. “Качество товаров” = 2 строки обычного текста.
10. Lower row text restored closer to reference.
11. Footer payment systems closer to real logos.
12. Homepage fits 1920×1080 @100%.
13. No runtime errors.

---

# 10. Session log

Создать:

docs/cursor_sessions/2026-05-27_cursor_task_017j_l_shaped_composition_fix.md

---

## Implementation notes (what changed)

### L-shaped hero composition

- **ЦКП выходит вниз и перекрывает upper strip**:
  - `.client-hero-reference-inner` теперь `overflow: visible` (раньше было `hidden`).
  - `.hero-asset` получил смещение вниз `transform: translate(-26px, 44px)` и повышенный `z-index`.
  - `.client-hero-reference` получил `margin-bottom: -36px`, а `.client-features-bar` поднят `z-index: 2`.
  - Итог: ЦКП больше не “в рамке hero rectangle” и визуально продолжается вниз, перекрывая верхний strip (как L‑shape).

### Upper strip tuning (secondary layer)

- **Чуть шире, но не full-width**: `max-width` 880→980px.
- **Тоньше по высоте**: сохранены компактные `min-height`/paddings; иконки 18px.
- **Typography alignment**:
  - `strong` сделан в одну строку (`white-space: nowrap`) на широких экранах; на `<1200px` возвращается перенос.
  - `p` в strip ограничен до 2 строк (`line-clamp: 2`) для единого вертикального ритма.
  - Для “Качество товаров” текст удлинён так, чтобы стабильно попадать в **2 строки** (при clamp=2).

### Lower cards row (primary layer)

- **Тексты возвращены ближе к эталону**: расширены описания (без агрессивного обрезания).
- **Высота экономится через типографику**: line-height остаётся плотным; min-height поднят до 112px чтобы сохранить “primary” визуальную массу при более длинном тексте.

### Warehouse asset path

- Требование задачи: `/assets/warehouse_northline_market.png`.
- В `frontend/public/assets/` этого файла не было, поэтому создан **symlink**:
  - `warehouse_northline_market.png -> warehouse_corridor_northline.png`
- В `HomePage.jsx` обновлён `src` на новый путь.

### Footer payment systems (logo-like)

- `VISA` — italic + брендовый синий фон.
- `MASTERCARD` — два перекрывающихся кружка через `::before/::after`.
- `МИР` — лёгкий градиент (green→blue) ближе к “карточным” шильдикам.

### Verification

Команда:

```bash
docker compose up --build -d
```

Smoke checks (через `http://localhost:5180`):

- `/` → 200
- `/review` → 200
- `/review/status` → 200
- `/assets/warehouse_northline_market.png` → 200

Remaining limitation:

- Точный residual scroll (0–10px) и “пиксельность” L‑shape нужно подтвердить визуально в реальном браузере на 1920×1080 @100% (в среде агента нет точного viewport‑скриншота).

