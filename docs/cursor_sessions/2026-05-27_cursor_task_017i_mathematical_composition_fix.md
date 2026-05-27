# Cursor Task 017I — Mathematical composition correction and final reference alignment

## Контекст

После Task 017H homepage стала ближе к reference по spacing и density.

Но два ключевых композиционных требования всё ещё НЕ выполнены.

Cursor incorrectly reported:

```text
ЦКП visually dominant
```

Фактически сейчас:

- ЦКП стал визуально меньше;
- hero-left доминирует;
- композиция hero/right balance нарушена;
- верхний ДКПП strip всё ещё неправильного размера;
- proportions всё ещё отличаются от эталона.

Task 017I — это НЕ redesign.

Это:

## mathematical composition correction.

---

# Source of truth

Главный visual reference:

```text
docs/ui_reference_client_homepage_widescreen_v2.png
```

---

# КРИТИЧЕСКИЕ КОМПОЗИЦИОННЫЕ ПРАВИЛА

Эти правила обязательны.

---

# RULE 1 — Vertical composition

В эталоне:

```text
Hero height (vertical)
+
Upper ДКПП strip height
=
ЦКП visual height
```

То есть:

```text
hero-left
+
upper strip
≈
ЦКП asset
```

Сейчас это НЕ выполнено.

Сейчас ЦКП визуально меньше.

Это нужно исправить.

---

# RULE 2 — Horizontal composition

В эталоне:

```text
Upper ДКПП width
+
ЦКП width
=
Lower ДКПП row width
```

То есть:

- верхний strip заканчивается раньше;
- ЦКП продолжает композицию вправо;
- вместе они визуально равны ширине нижнего ряда cards.

Сейчас это НЕ выполнено.

Сейчас:

- upper strip имеет ту же ширину, что lower row;
- композиция разваливается;
- reference proportions потеряны.

Это нужно исправить.

---

# 1. ЦКП asset — увеличить и сделать композиционно доминирующим

Использовать:

```text
/assets/hero_scene_northline_market.png
```

Нужно:

- увеличить visual scale asset;
- увеличить visual height;
- увеличить visual width;
- сделать asset visually dominant;
- приблизить asset к hero-left;
- уменьшить пустоту между колонками.

Важно:

- НЕ растягивать asset;
- НЕ crop;
- НЕ ломать proportions;
- НЕ делать blurry scaling.

---

# 2. Выполнить RULE 1

Сейчас:

```text
ЦКП < hero-left + upper strip
```

Нужно:

```text
ЦКП ≈ hero-left + upper strip
```

То есть:

- ЦКП должен стать выше;
- upper strip должен стать ниже;
- hero vertical whitespace должен стать меньше.

---

# 3. Выполнить RULE 2

Сейчас upper strip слишком длинный.

Нужно:

- сделать upper strip уже;
- strip НЕ должен быть full-width;
- strip должен начинаться по горизонтали:
  - вровень с hero-left;
- strip должен заканчиваться:
  - примерно перед серединой ЦКП composition.

То есть:

```text
upper strip width + ЦКП width
≈ lower cards row width
```

Это ключевое требование.

---

# 4. Верхний ДКПП strip — typography correction

Сейчас:

обычный текст upper strip
крупнее обычного текста lower cards.

Это неправильно.

В эталоне:

- upper strip smaller;
- lower cards larger.

Нужно:

- уменьшить обычный текст upper strip;
- уменьшить line-height;
- уменьшить visual weight;
- сохранить readability.

Важно:

bold text upper strip уже выглядит нормально — его НЕ увеличивать.

---

# 5. Hero badge typography

Сейчас:

```text
Сервис, которому доверяют
```

Нужно как в эталоне:

```text
СЕРВИС, КОТОРОМУ ДОВЕРЯЮТ
```

То есть:

- uppercase;
- tighter typography;
- ближе к reference.

---

# 6. Header pseudo-navigation correction

Сейчас header НЕ соответствует эталону.

Сейчас после:

- Главная
- О компании

идут:

- Оставить отзыв
- Проверить статус

Это неправильно.

Нужно сделать как в эталоне:

- Главная
- О компании
- Доставка и оплата
- Поддержка

Важно:

это pseudo-navigation.

НЕ подключать реальные routes.

НЕ менять backend.

НЕ добавлять routing logic.

---

# 7. Footer payment systems correction

Сейчас:

- payment badges выглядят как generic pills.

Нужно:

- сделать Visa;
- Mastercard;
- Мир;

визуально ближе к эталону.

Использовать:

- text labels;
- brand-like visual appearance;
- compact layout.

Если в icon collection есть более подходящие варианты —
использовать их.

---

# 8. Upper strip alignment correction

Сейчас upper strip:

- выровнен по lower row;
- начинается слишком правее;
- композиционно не связан с hero-left.

Нужно:

- upper strip должен начинаться вровень с hero-left;
- alignment должен быть ближе к эталону;
- strip должен визуально быть частью hero composition.

---

# 9. Lower cards row оставить primary

Нижний ряд cards должен оставаться:

- больше;
- тяжелее;
- primary layer.

Upper strip должен быть:

- secondary;
- меньше;
- легче.

НЕ выравнивать их размеры.

---

# 10. Final viewport target

Главная цель:

```text
1920×1080
browser zoom 100%
```

Homepage:

```text
header → footer
```

должна помещаться целиком на экране.

Максимум:

```text
0–20px residual scroll
```

---

# 11. Что НЕ менять

Запрещено:

- redesign;
- новые sections;
- route changes;
- backend changes;
- API changes;
- operator/admin UI changes;
- dialogs changes;
- assets replacement;
- placeholder graphics.

---

# 12. Acceptance criteria

Task 017I принимается только если:

1. ЦКП стал visually dominant.
2. RULE 1 выполнен.
3. RULE 2 выполнен.
4. Upper strip visibly narrower than lower row.
5. Upper strip aligned with hero-left.
6. Upper strip typography smaller than lower row.
7. Hero badge uppercase.
8. Header pseudo-navigation соответствует эталону.
9. Footer payment systems ближе к reference.
10. Hero composition closer to reference.
11. Homepage помещается на 1920×1080 @100%.
12. Assets scale correctly.
13. No runtime errors.
14. Review/status dialogs still work.

---

# 13. Verification

После изменений выполнить:

```bash
docker compose up --build -d
```

Проверить:

- /
- review dialog
- status dialog
- 1920×1080 @100%
- 1440×900

Особенно проверить:

- RULE 1;
- RULE 2;
- upper strip width;
- ЦКП scale;
- footer fit.

---

# 14. Session log

Создать:

```text
docs/cursor_sessions/2026-05-27_cursor_task_017i_mathematical_composition_fix.md
```

В начало вставить полный prompt.

Ниже обязательно разделы:

## 1. RULE 1 implementation

Что изменено для:

```text
hero-left + upper strip ≈ ЦКП
```

---

## 2. RULE 2 implementation

Что изменено для:

```text
upper strip width + ЦКП width ≈ lower row width
```

---

## 3. Typography corrections

- upper strip typography;
- hero badge uppercase;
- header pseudo-navigation.

---

## 4. Footer corrections

Что изменено у payment systems.

---

## 5. Viewport verification

Таблица:

| Viewport | Zoom | Result |
|---|---|---|

Обязательно:

- 1920×1080 @100%
- 1440×900

Указать residual scroll px.

---

## 6. Remaining limitations

Если что-то ещё не идеально —
описать честно.

---

# Формат ответа в чат

После выполнения:

```text
Session log:
docs/cursor_sessions/2026-05-27_cursor_task_017i_mathematical_composition_fix.md

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

## 1. RULE 1 implementation

Чтобы приблизить \(hero-left + upper strip \approx ЦКП\):

- **ЦКП (asset) увеличен по высоте**: `.hero-asset` height 360→420px (max-height 440px), `object-fit: contain` — без crop/искажений.
- **Hero vertical whitespace уменьшен**: `.client-hero-reference-inner` min-height 360→320px; `.client-hero-grid` padding 1.05/0.95rem → 0.85/0.75rem.
- **Upper strip стал ниже**: `.client-features-inner` min-height 72→60px и padding уменьшены.

Итог: ЦКП визуально выше при одновременном снижении hero/strip по вертикали.

## 2. RULE 2 implementation

Чтобы выполнить \(upper strip width + ЦКП width \approx lower row width\):

- **Upper strip сделан уже (не full-width)**: `.client-features-inner` max-width `880px` вместо `var(--client-max)`.
- **Upper strip выровнен по hero-left**: `margin: 0` (вместо центрирования) + сохранён `padding-left: 40px`, что даёт старт контента вровень с hero-left в секциях с `margin: 0 -40px`.
- **ЦКП продолжает композицию вправо**: asset оставлен в правой колонке hero grid и сдвинут влево (`translateX(-18px)` был ранее) — strip заканчивается раньше, далее “идёт” ЦКП.

## 3. Typography corrections

- **Upper strip**: обычный текст уменьшен (`.client-feature-item p` 0.8→0.72rem, line-height 1.25, weight 450), bold-заголовки не увеличивались.
- **Hero badge**: текст заменён на uppercase в `HomePage.jsx`, добавлен класс `.client-hero-pill-text` (uppercase + tighter tracking).
- **Header pseudo-navigation**: в `ClientLayout.jsx` nav заменён на `Главная / О компании / Доставка и оплата / Поддержка` как pseudo-links (`href="/#..."`), без добавления routes.

## 4. Footer corrections

- **Payment systems**: `VISA / MASTERCARD / МИР` получили brand-like стили (цветные подложки/бордеры) через классы `.payment-chip.visa/.mastercard/.mir`.

## 5. Viewport verification

| Viewport | Zoom | Result |
|---|---|---|
| 1920×1080 | 100% | Требует визуальной проверки в браузере; правки направлены на 0–20px residual scroll |
| 1440×900 | 100% | Ожидаема прокрутка из-за меньшей высоты |

Smoke checks (docker, `http://localhost:5180`): `/`, `/review`, `/review/status` → 200.

## 6. Remaining limitations

- Точный residual scroll в px на 1920×1080 нельзя измерить без полноценного браузера/скриншота в среде агента; требуются 1–2 минуты ручной проверки.
- Если upper strip оказался “слишком коротким/длинным” относительно ЦКП на реальном экране, следующий минимальный шаг — подстроить `max-width: 880px` на ±40–80px.

