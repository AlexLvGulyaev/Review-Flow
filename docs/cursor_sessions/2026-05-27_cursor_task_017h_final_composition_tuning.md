# Cursor Task 017H — Final compositional tuning and viewport convergence

## Контекст

После Task 017G homepage стала существенно ближе к эталону:

- реальные assets подключены;
- hero scene стабилизирована;
- warehouse image отображается корректно;
- icon colors приведены ближе к reference;
- metrics block горизонтальный;
- layout больше не narrow.

Но homepage всё ещё:

- слишком разреженная;
- слишком высокая;
- не помещается на 1920×1080 @100%;
- hero composition всё ещё отличается от reference по proportions и visual balance.

Task 017H — это НЕ redesign.

Это финальная compositional tuning iteration.

---

# Source of truth

Главный visual reference:

docs/ui_reference_client_homepage_widescreen_v2.png

---

# Ключевое композиционное правило

В эталонной homepage:

ЦКП asset
(цветок + коробка + пакет)

визуально по высоте примерно равен:

hero text block
+
верхний ДКПП strip

где:

ДКПП:
- доставка
- качество
- поддержка
- платежи

То есть:

ЦКП ≈ hero-left + upper feature strip

Именно это создаёт правильный widescreen composition balance.

---

# Что сейчас не так

Сейчас:

- ЦКП слишком маленький;
- ЦКП слишком прижат вправо;
- hero-left визуально тяжелее;
- между hero-left и asset слишком много пустоты;
- верхний ДКПП strip слишком высокий;
- общий hero section слишком высокий;
- страница всё ещё слишком “воздушная”.

---

# 1. Увеличение ЦКП asset

Использовать существующий asset:

/assets/hero_scene_northline_market.png

Нужно:

- увеличить visual size asset;
- сделать ЦКП visually dominant;
- приблизить proportions к эталону;
- увеличить высоту visual group;
- сделать так, чтобы asset visually перекрывал:
  - hero-left
  - upper feature strip

Важно:

- НЕ растягивать asset;
- НЕ ломать proportions;
- НЕ обрезать asset;
- НЕ использовать hard crop.

---

# 2. Смещение ЦКП левее

Сейчас ЦКП:

- слишком прижат к правому краю;
- между text block и asset слишком большая пустота.

Нужно:

- придвинуть ЦКП ближе к hero-left;
- уменьшить empty middle space;
- сделать композицию более плотной;
- приблизить visual balance к эталону.

---

# 3. Уменьшение hero vertical whitespace

Hero section всё ещё слишком высокий.

Нужно уменьшить:

- верхний внутренний отступ hero;
- нижний внутренний отступ hero;
- vertical gap внутри hero-left;
- hero min-height;
- лишние пустые области.

Но:

- НЕ уменьшать asset;
- НЕ ломать hero composition;
- НЕ превращать layout в cramped.

---

# 4. Hero typography tuning

## Hero title

Сейчас title визуально меньше эталона.

Нужно:

- немного увеличить title;
- сделать его visually heavier;
- уменьшить line-height;
- приблизить typography к reference.

---

## Hero description

Сейчас description слишком лёгкий.

Нужно:

- немного увеличить font-size;
- немного увеличить weight;
- сделать description читаемее.

---

# 5. Верхний ДКПП strip должен быть меньше нижнего

Сейчас верхний strip всё ещё слишком похож по размеру на нижние cards.

В эталоне:

Верхний strip:
- secondary layer;
- thinner;
- visually lighter;
- ниже по высоте.

Нижний ряд cards:
- main content layer;
- крупнее;
- тяжелее.

Нужно:

- уменьшить высоту верхнего strip;
- уменьшить его vertical paddings;
- уменьшить icon wrappers;
- уменьшить text spacing;
- сохранить читаемость.

---

# 6. Нижний ряд cards ещё немного уменьшить

Нижний ряд:

- всё ещё слегка высокий;
- занимает лишнюю вертикаль.

Нужно:

- ещё немного уменьшить vertical padding;
- уменьшить gap между title и description;
- уменьшить card min-height;
- сохранить readability.

---

# 7. Уменьшение расстояний между секциями

Нужно уменьшить:

- расстояние между hero и upper strip;
- расстояние между upper strip и lower cards;
- расстояние между lower cards и info band;
- расстояние между info band и footer.

Важно:

- НЕ делать sections слепленными;
- НЕ разрушать visual rhythm.

---

# 8. Info band tuning

Блок:

- warehouse image
- О Northline Market
- metrics

должен быть:

- плотнее;
- компактнее;
- ближе к эталону.

Сейчас metrics cards слишком большие.

Нужно:

- уменьшить их внутренние paddings;
- уменьшить их высоту;
- слегка уменьшить ширину;
- сохранить horizontal layout.

---

# 9. Footer compression

Footer всё ещё слишком высокий.

Нужно уменьшить:

- top padding;
- bottom padding;
- line-height;
- gaps между строками;
- secondary text spacing.

Но:

- НЕ ломать footer structure;
- НЕ удалять footer columns.

---

# 10. Container width correction

Сейчас page всё ещё выглядит слишком “узкой”.

Нужно:

- немного увеличить effective content width;
- уменьшить ощущение больших серых полей;
- сделать layout более cinematic;
- приблизить proportions к reference.

---

# 11. Final viewport target

Главная цель:

1920×1080
browser zoom 100%

Homepage:

header → footer

должна помещаться целиком на экране.

Допускается максимум:
0–20px остаточной прокрутки.

---

# 12. Что НЕ менять

Запрещено:

- redesign;
- новые homepage sections;
- route changes;
- backend changes;
- API changes;
- operator/admin UI changes;
- review dialog changes;
- status dialog changes;
- замена assets;
- новые placeholder graphics.

---

# 13. Acceptance criteria

Task 017H принимается только если:

1. ЦКП asset стал визуально крупнее.
2. ЦКП придвинут ближе к hero-left.
3. ЦКП визуально примерно равен:
   hero-left + upper strip.
4. Hero section стал ниже.
5. Hero title стал крупнее и плотнее.
6. Hero description стал читаемее.
7. Верхний strip visibly smaller than lower cards.
8. Нижний ряд cards стал компактнее.
9. Metrics cards стали компактнее.
10. Footer стал ниже.
11. Межсекционные gaps уменьшены.
12. Page feels less airy.
13. Homepage помещается на 1920×1080 @100%.
14. Hero composition ближе к эталону.
15. Assets масштабируются корректно.
16. Нет runtime errors.
17. Review/status dialogs работают.

---

# 14. Verification

После изменений выполнить:

docker compose up --build -d

Проверить:

- /
- review dialog
- status dialog
- 1920×1080 @100%
- 1440×900

---

# 15. Session log

Создать:

docs/cursor_sessions/2026-05-27_cursor_task_017h_final_composition_tuning.md

В начало вставить полный текст prompt.

Ниже обязательно разделы:

1. Hero composition changes
2. Strip/cards sizing
3. Typography tuning
4. Viewport verification
5. Remaining limitations

---

## 1. Hero composition changes

- **Asset size**: `.hero-asset` теперь фиксируется по высоте (360px, max-height 380px) при `object-fit: contain` (без растяжения/кропа) — ЦКП стал визуально доминирующим.
- **Asset shift left**: `transform: translateX(-18px)` и `justify-content: flex-start` у `.client-hero-visual` — уменьшили пустоту между hero-left и asset.
- **Hero height**: `min-height` `.client-hero-reference-inner` 390→360px, padding у `.client-hero-grid` уменьшен, gap 1.25→1rem — геро стал ниже без уменьшения ЦКП.
- **Width feel**: `--client-max` 1520→1600px — уменьшили ощущение “узкой” страницы на widescreen.

## 2. Strip/cards sizing

- **Upper strip (secondary)**: `min-height` 84→72px, уменьшены paddings, icon wrapper 40→36px, типографика компактнее — strip стал заметно тоньше нижних cards.
- **Lower cards (primary)**: `min-height` 112→104px, меньше padding, меньше gap между title/description — row компактнее, но остаётся “главным”.
- **Inter-section gaps**: `margin-top` у `.client-feature-cards` и `.client-section` уменьшены — общий ритм плотнее.
- **Info band**: metrics ужаты (высота 100→92px, padding меньше), ширина колонок metrics 170→160px, gap 1→0.85rem — ближе к reference и ниже по высоте.

## 3. Typography tuning

- **Hero title**: `clamp(2.2rem, 4.8vw, 3.35rem)`, `font-weight: 800`, `line-height: 1.02` — ближе к эталону (крупнее и плотнее).
- **Hero description**: `font-size` 0.95→1rem, `font-weight: 500`, tighter line-height — более читаемо при меньшей “воздушности”.
- **Upper strip text**: `strong` и `p` чуть уменьшены — чтобы strip оставался secondary.

## 4. Viewport verification

Команда:

```bash
docker compose up --build -d
```

Smoke checks (через `http://localhost:5180`):

- `/` → 200
- `/review` → 200
- `/review/status` → 200
- `/assets/hero_scene_northline_market.png` → 200
- `/assets/warehouse_corridor_northline.png` → 200

Viewport (визуально в браузере) требует ручной проверки:

- **1920×1080 @100%**: ожидаем 0–20px остаточной прокрутки (зависит от рендеринга шрифтов/OS scaling), высота и gaps ужаты при одновременном увеличении ЦКП.
- **1440×900 @100%**: ожидаема прокрутка из‑за меньшей высоты.

## 5. Remaining limitations

- В среде агента нет headless-браузера для точного “pixel” замера итоговой высоты на 1920×1080; сделана “viewport convergence” правками min-heights/paddings и проверкой живого контейнера.
- Если на реальном десктопе остаётся >20px скролла на 1080p, следующая минимальная подстройка — ещё ~4–8px снять с `.client-hero-grid` padding-bottom и `.client-footer-inner` padding-top.

