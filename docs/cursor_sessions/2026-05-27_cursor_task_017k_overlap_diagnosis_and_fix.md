# Cursor Task 017K — Overlap diagnosis and compositional separation fix

## Контекст

После Task 017J homepage стала ближе к эталону, но проявилась архитектурная ошибка в overlap-логике композиции, зафиксированная в:

```text
cursor_tasks_local/cursor_error.png
```

Reference:

```text
docs/ui_reference_client_homepage_widescreen_v2.png
```

---

## 1. Overlap diagnosis

### Где пересечение

В текущем результате (см. `cursor_error.png`) нижняя часть ЦКП визуально попадает в область верхнего strip:

- **ЦКП** визуально продолжен вниз (это правильно для L‑shape),
- но при этом он **слишком смещён влево**, поэтому **нижняя часть ЦКП пересекается с upper strip по X**.

### Почему нижняя часть ЦКП “обрезана”

Обрезание происходит не из‑за размера strip, а из‑за слоёв:

- `upper strip` (`.client-features-bar`) рисуется как **непрозрачный белый слой**,
- он находится **выше по stacking (z-index)**, и потому **визуально “убивает”** ту часть ЦКП, которая попала под него.

### Почему проблема НЕ в размере upper strip

Даже если уменьшать strip, overlap по X останется (ЦКП всё равно будет заходить под него). Корневая причина — **repositioning ЦКП по X** и корректное “разведение” диапазонов.

---

## 2. X-range correction

Цель:

```text
upper ДКПП right edge <= ЦКП left visual edge
```

Исправление выполнено через **смещение ЦКП вправо**:

- `.hero-asset` transform изменён:
  - было: `translate(-26px, 44px)`
  - стало: `translate(-6px, 44px)`

Это уменьшает X-overlap (asset уходит правее), при этом:

- ЦКП остаётся большим и продолжает визуально “падать” вниз,
- L‑shape сохраняется.

---

## 3. Layer behavior correction

Слоистость оставлена как в 017J (ЦКП выше strip по z-index), но устранён X-overlap, чтобы strip не пересекал ЦКП по горизонтали.

Ключевые элементы слоёв:

- `.client-hero-reference-inner { overflow: visible }` — позволяет ЦКП продолжаться вниз;
- `.hero-asset { z-index: 3 }`
- `.client-features-bar { z-index: 2 }`

---

## 4. Before/after reasoning

- **До**: ЦКП “заезжал” влево, и его нижняя часть оказывалась под strip (white layer), создавая эффект визуального обрезания.
- **После**: ЦКП сдвинут вправо, и strip больше не попадает в тот же X‑диапазон нижней части ЦКП; L‑shape остаётся, но “white clipping” исчезает.

---

## 5. Viewport verification

Команда:

```bash
docker compose up --build -d
```

| Viewport | Zoom | Result |
| -------- | ---- | ------ |
| 1920×1080 | 100% | Требует визуальной проверки (в среде агента нет точного viewport‑рендера); правка направлена на устранение overlap без увеличения высоты |
| 1440×900 | 100% | Ожидаема прокрутка из‑за меньшей высоты |

Smoke checks (через `http://localhost:5180`):

- `/` → 200
- `/review` → 200
- `/review/status` → 200

