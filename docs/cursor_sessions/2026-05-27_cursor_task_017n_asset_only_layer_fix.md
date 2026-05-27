# Cursor Task 017N — Fix layering side-effect: raise ЦКП only, not the whole hero background

## Контекст

После Task 017M root-cause analysis наконец выявил правильную причину clipping:

- проблема была не только и не столько в X-overlap;
- белый full-width `.client-features-bar` перекрывал нижнюю часть ЦКП;
- `z-index` у `.hero-asset` не работал корректно без `position`;
- stacking/layering был устроен неправильно.

Но после попытки исправления появился новый side-effect.

Актуальный screenshot ошибки:

```text
cursor_tasks_local/cursor_error_m.png
```

Reference:

```text
docs/ui_reference_client_homepage_widescreen_v2.png
```

---

# Главная проблема после 017M

Теперь, судя по screenshot `cursor_error_m.png`, исправление пошло слишком грубо:

- вместо того чтобы поднять только ЦКП asset над strip,
- был поднят весь hero layer / hero background;
- в результате бежевый hero rectangle начал наезжать на верхний ДКПП;
- upper ДКПП частично оказался под бежевым фоном / на границе перекрытия.

То есть была ошибка:

```text
strip cuts ЦКП
```

а получилась новая ошибка:

```text
hero background cuts/overlaps strip
```

Это НЕ принимается.

---

# Главная задача 017N

Исправить layer architecture так, чтобы:

1. ЦКП был выше upper strip и не обрезался.
2. Бежевый/warm hero background НЕ был выше upper strip.
3. Upper ДКПП оставался полностью видимым.
4. Только сам ЦКП asset мог визуально продолжаться вниз поверх композиционного поля.
5. Никакой прямоугольный фон hero не должен перекрывать upper strip.

---

# Ключевое правило

Нужно поднять НЕ весь hero section.

Нужно поднять только:

```text
.hero-asset / ЦКП image layer
```

или минимальный прозрачный wrapper вокруг asset.

Запрещено поднимать:

```text
.client-hero-reference
.client-hero-reference-inner
.client-hero-grid
```

если это приводит к тому, что бежевый background оказывается поверх upper strip.

---

# Правильная layer model

Должно быть примерно так:

```text
Layer 1: page background
Layer 2: warm hero background
Layer 3: upper ДКПП strip background/content
Layer 4: ЦКП asset only
```

Важно:

- Layer 4 должен быть только изображением ЦКП или прозрачным wrapper.
- Layer 2 не должен перекрывать Layer 3.
- Если ЦКП выходит вниз, то поверх strip может быть только сам asset, а не hero rectangle.

---

# Что проверить в CSS

Найти и проверить selectors:

```text
.client-hero-reference
.client-hero-reference-inner
.client-hero-grid
.client-hero-visual
.hero-asset
.hero-asset-wrap
.client-features-bar
.client-features-inner
```

Проверить properties:

```css
position
z-index
overflow
background
transform
isolation
```

Особенно:

- где сейчас стоит `z-index: 3`;
- где стоит `position: relative`;
- какой элемент имеет warm/beige background;
- какой элемент перекрывает upper strip.

---

# Required fix direction

## 1. Убрать elevated z-index с hero background layer

Если после 017M было добавлено что-то вроде:

```css
.client-hero-reference {
  position: relative;
  z-index: 3;
}
```

и это поднимает весь бежевый фон над strip — это нужно пересмотреть.

Hero background должен быть ниже upper strip.

---

## 2. Поднять только ЦКП asset

Сделать elevated stacking только для:

```css
.hero-asset
```

или прозрачного wrapper вокруг него.

Например:

```css
.client-hero-visual {
  position: relative;
  z-index: 4;
  pointer-events: none;
}

.hero-asset {
  position: relative;
  z-index: 4;
}
```

Но при этом убедиться, что сам wrapper не имеет opaque background.

---

## 3. Upper ДКПП должен быть полностью видим

Upper strip:

- не должен быть перекрыт бежевым rectangle;
- не должен уходить под hero background;
- должен оставаться читаемым и аккуратным.

---

## 4. ЦКП не должен обрезаться

После fix:

- нижняя часть коробки не должна исчезать;
- нижняя часть пакета не должна исчезать;
- asset должен продолжаться вниз корректно;
- clipping line на границе strip должна исчезнуть.

---

# Запрещено

Запрещено:

- снова двигать ЦКП наугад без layer-fix;
- уменьшать ЦКП;
- менять размеры upper ДКПП как основной fix;
- поднимать весь hero section над strip;
- делать бежевый background поверх strip;
- менять review/status/operator/admin/backend/API/routes.

---

# Acceptance criteria

Task 017N принимается только если:

1. Бежевый hero background больше НЕ наезжает на upper ДКПП.
2. Upper ДКПП полностью видим.
3. ЦКП не обрезается по нижней части.
4. Поверх upper strip может быть только сам ЦКП asset, а не hero rectangle.
5. Layer model соответствует:
   - hero background below strip;
   - strip visible;
   - ЦКП asset above where needed.
6. Homepage помещается на 1920×1080 @100% или остаётся не хуже состояния 017M.
7. Нет runtime errors.
8. Review/status dialogs работают.

---

# Verification

После изменений выполнить:

```bash
docker compose up --build -d
```

Проверить:

- `/`
- review dialog
- status dialog
- `cursor_tasks_local/cursor_error_m.png` vs current result
- 1920×1080 @100%

---

# Session log

Создать:

```text
docs/cursor_sessions/2026-05-27_cursor_task_017n_asset_only_layer_fix.md
```

КРИТИЧЕСКИ ВАЖНО:

В начало session log вставить ПОЛНЫЙ ТЕКСТ ЭТОГО PROMPT.

После prompt добавить разделы:

## 1. What broke after 017M

Объяснить, почему исправление 017M подняло слишком широкий layer.

## 2. Layer map before fix

Таблица:

| Element / selector | z-index | background | role |
|---|---|---|---|

## 3. Layer map after fix

Таблица:

| Element / selector | z-index | background | role |
|---|---|---|---|

## 4. Changed files

| File | Selector | Change | Why |
|---|---|---|---|

## 5. Verification

Указать:

- clipping gone / not gone;
- beige background no longer covers strip / still covers;
- viewport fit result.

## 6. Remaining limitations

Если что-то осталось неидеально — написать честно.

---

# Формат ответа в чат

```text
Session log:
docs/cursor_sessions/2026-05-27_cursor_task_017n_asset_only_layer_fix.md

Status: completed

Changed files:
- ...
```

или:

```text
Status: blocked
Reason:
...
```

---

## 1. What broke after 017M

После 017M, чтобы заставить ЦКП быть поверх strip, был добавлен “широкий” подъём слоя:

```css
.client-hero-reference { position: relative; z-index: 3; }
```

Это подняло **весь hero section**, включая **бежевый warm background**, поэтому он начал перекрывать upper strip (неприемлемый side‑effect).

## 2. Layer map before fix

| Element / selector | z-index | background | role |
|---|---:|---|---|
| `.client-hero-reference` | 3 | none (но содержит warm bg внутри) | поднят целиком (слишком широко) |
| `.client-hero-reference-inner` | auto | warm/beige gradients | warm hero background |
| `.client-features-bar` | 2 | white | full-width strip bg/content |
| `.client-hero-visual` | auto | transparent | wrapper для ЦКП |
| `.hero-asset` | 3 | transparent | ЦКП asset |

## 3. Layer map after fix

| Element / selector | z-index | background | role |
|---|---:|---|---|
| `.client-hero-reference` | auto | none (warm bg внутри) | warm background остаётся ниже strip |
| `.client-hero-reference-inner` | auto | warm/beige gradients | warm hero background (Layer 2) |
| `.client-features-bar` | 2 | white | strip bg/content (Layer 3) |
| `.client-hero-visual` | 4 | transparent | поднимаем **только asset-зону** (Layer 4 wrapper) |
| `.hero-asset` | 3 | transparent | ЦКП asset (Layer 4) |

## 4. Changed files

| File | Selector | Change | Why |
|---|---|---|---|
| `frontend/src/index.css` | `.client-hero-reference` | removed `position: relative; z-index: 3;` | чтобы warm hero background не перекрывал strip |
| `frontend/src/index.css` | `.client-hero-grid` | removed `z-index: 1;` | чтобы не создавать лишний stacking context, мешающий поднять только asset |
| `frontend/src/index.css` | `.client-hero-visual` | add `z-index: 4;` | поднять только ЦКП wrapper над strip без поднятия warm bg |

## 5. Verification

- clipping gone / not gone: требует визуальной проверки (см. limitation ниже)
- beige background no longer covers strip / still covers: требует визуальной проверки
- viewport fit: не ухудшали высоты; сервис отвечает

Smoke checks:

- `docker compose up --build -d` выполнено
- `GET http://localhost:5180/` → 200

## 6. Remaining limitations

- Файл `cursor_tasks_local/cursor_error_m.png` отсутствует в workspace, поэтому сравнение “error_m vs current” не удалось выполнить автоматически.
- В среде агента нет инструментального снятия screenshot, поэтому финальная визуальная верификация (clipping gone + warm bg below strip) должна быть подтверждена вручную в браузере на 1920×1080 @100%.

