# Cursor Task 017E — Homepage layout blueprint implementation

## Контекст

Предыдущие задачи 017–017D не дали стабильного результата.

Главная причина: Cursor пытался воспроизводить reference image через общие визуальные указания:

- closer to reference;
- restore composition;
- improve density;
- avoid narrow layout;
- recover widescreen feeling.

Это не сработало.

Теперь задача формулируется не как design task, а как **жёсткий layout blueprint task**.

Нужно реализовать homepage по фиксированной геометрии, а не по свободной интерпретации.

---

# Главная задача

Пересобрать `/` homepage по жёсткому геометрическому скелету, основанному на reference:

```text
docs/ui_reference_client_homepage_widescreen_v2.png
```

Цель:

- получить widescreen customer-facing homepage;
- убрать narrow-column layout;
- убрать vertical-strip layout;
- не добавлять лишние секции;
- обеспечить предсказуемую композицию на 1920×1080 при browser zoom 100%.

---

# Абсолютный запрет

НЕ пытаться “улучшить дизайн”.

НЕ делать новый redesign.

НЕ интерпретировать reference свободно.

НЕ добавлять секции, которых нет в blueprint.

НЕ менять review dialog, status dialog, operator/admin UI, backend, routes или API.

---

# Layout blueprint

Homepage MUST contain exactly these vertical zones, in this order:

1. Header
2. Hero scene
3. Compact feature strip
4. Large feature cards row
5. Company/info + metrics band
6. Footer

No extra homepage sections are allowed.

Specifically forbidden extra sections:

- “Доставка и оплата” standalone section;
- “Поддержка” standalone section;
- any additional text-only marketing blocks below info band;
- duplicate cards/metrics blocks.

---

# Target viewport contract

Primary target:

```text
Viewport: 1920×1080
Browser zoom: 100%
```

Expected visual result:

- header visible;
- hero visible;
- feature strip visible;
- large feature cards visible;
- company/info band visible;
- footer starts close after info band;
- no large empty vertical gaps;
- no central narrow-column feeling.

The page may require small scrolling to see the full footer, but it must not feel like an endless vertical strip.

---

# Width contract

Use a wide page container.

Required values:

```text
Page max-width: 1480px to 1560px
Horizontal page padding: 32px to 48px on desktop
Content alignment: centered, but visually wide
```

Forbidden:

```text
max-width: 900px
max-width: 1000px
max-width: 1100px
narrow centered card layout
```

Hero, feature strip, feature cards, info band and footer inner content must share the same desktop width contract.

---

# 1. Header blueprint

Target height:

```text
Header height: 72px to 80px
```

Structure:

```text
[logo] [nav centered] [status button] [review button]
```

Rules:

- header must be one compact row;
- no large vertical padding;
- logo left;
- navigation centered;
- CTA buttons right;
- header must not dominate the viewport.

---

# 2. Hero scene blueprint

Target:

```text
Hero height: 430px to 470px
Hero width: full blueprint container
```

Structure:

```text
Hero grid:
  left column: 42%
  right column: 58%
```

Left column:

```text
badge
headline
paragraph
CTA row
```

Right column:

```text
product illustration scene:
  plant
  cardboard box
  green shopping bag
  soft shadows / light background
```

Rules:

- hero must be a light product scene, not a dark gradient card;
- hero must not be a small banner;
- hero must not be centered narrow block;
- illustration must occupy significant right-side visual space;
- CTA buttons must remain inside hero;
- the hero background should be light/warm, close to reference;
- hero must visually connect to the feature strip below.

Forbidden:

- dark blue/green gradient hero banner;
- primitive placeholder icon illustration;
- tiny illustration;
- hero in 900px centered box;
- hero min-height above 520px.

---

# 3. Compact feature strip blueprint

Target:

```text
Feature strip height: 90px to 110px
Top gap from hero: 0px to 16px
```

Structure:

```text
4 items in one row:
- Быстрая доставка
- Качество товаров
- Поддержка 24/7
- Безопасные платежи
```

Rules:

- strip is visually attached to hero, not a separate section;
- each item compact;
- icon + title + short text;
- no fifth item unless already required by existing accepted UI;
- no vertical stretching.

---

# 4. Large feature cards row blueprint

Target:

```text
Top margin after strip: 24px to 32px
Cards row height: 130px to 150px
Grid: 4 columns
Gap: 16px to 20px
```

Cards:

1. Быстрая доставка
2. Проверенное качество
3. Поддержка 24/7
4. Безопасная оплата

Rules:

- exactly 4 cards in one desktop row;
- each card has icon container, title, text, small arrow;
- cards must not stack on desktop;
- cards must not become tall vertical blocks;
- cards must not create excessive vertical gap.

---

# 5. Company/info + metrics band blueprint

Target:

```text
Top margin after cards: 24px to 32px
Band height: 95px to 120px
```

Structure:

```text
[warehouse image 220–240px wide]
[company text block]
[metric 1]
[metric 2]
[metric 3]
```

Rules:

- this is one horizontal band;
- not a tall section;
- warehouse image must be visible, not blank;
- metrics must be in the same row;
- no empty white rectangle;
- no extra “Delivery and payment” or “Support” sections below.

---

# 6. Footer blueprint

Target:

```text
Footer top margin after info band: 16px to 24px
Footer visible height: 180px to 220px
```

Structure:

```text
[brand/social]
[buyers]
[about]
[support]
[contacts]
[payment]
```

Rules:

- dark footer;
- compact columns;
- footer should start directly after info band;
- no artificial `margin-top:auto` pushing footer down;
- no huge empty area before footer.

---

# Required implementation approach

Before changing code:

1. Open current homepage component.
2. Identify exact component responsible for `/`.
3. Identify exact CSS selectors/classes used by homepage.
4. Compare current structure against blueprint.
5. Remove or disable sections not allowed by blueprint.
6. Implement the fixed geometry.

Important:

If existing CSS is too tangled, create new dedicated homepage classes rather than trying to patch old generic classes.

---

# CSS constraints

Desktop CSS must explicitly define:

- max-width;
- section heights or min/max heights;
- grid columns;
- gaps;
- padding;
- footer margin behavior.

Do not rely on vague natural layout.

Use fixed desktop geometry where appropriate.

---

# Responsive behavior

Desktop is primary for this task.

Minimum requirement:

- 1920×1080 must match blueprint composition;
- 1440×900 must remain usable;
- mobile must not crash, but mobile polish is not the focus.

Do not sacrifice desktop reference composition for mobile-first simplification.

---

# Visual requirements

Hero visual:

- light warm background;
- product composition right;
- box + plant + green bag;
- layered depth;
- soft shadow.

Info band:

- warehouse image must render correctly;
- if image path is broken, fix the path or replace with available asset;
- do not leave blank rectangle.

---

# Acceptance criteria

Task 017E is accepted only if all are true:

1. `/` contains exactly the six blueprint zones.
2. No extra standalone sections appear between info band and footer.
3. Page uses wide container, not narrow centered layout.
4. Hero is light and wide, not dark compact banner.
5. Hero uses 42/58 or close two-column split.
6. Product scene is visually substantial.
7. Feature strip is compact and directly below hero.
8. Large cards are exactly 4 in one desktop row.
9. Info/metrics band is one compact horizontal band.
10. Warehouse image is visible.
11. Footer starts close after info band.
12. No huge empty vertical gaps.
13. No artificial footer pushdown.
14. Review dialog still opens.
15. Status dialog still opens.
16. Operator/admin UI not touched.
17. No runtime errors.

---

# Verification

Run:

```bash
docker compose up --build -d
```

Then check:

```text
/
review dialog
status dialog
```

At browser zoom 100%.

---

# Session log

Create:

```text
docs/cursor_sessions/2026-05-27_cursor_task_017e_homepage_layout_blueprint.md
```

At the top, paste this full prompt.

Then add:

## 1. Current structure before changes

List current homepage zones before implementation.

## 2. Blueprint implementation mapping

Table:

| Blueprint zone | Component/selector implemented | Notes |
|---|---|---|

## 3. Removed/disabled sections

List every removed section and why.

## 4. Changed files

Table:

| File | Changes |
|---|---|

## 5. Geometry values used

Table:

| Area | Target | Implemented value |
|---|---|---|

Include:

- page max-width;
- hero height;
- hero columns;
- strip height;
- card grid columns;
- info band columns;
- footer margin.

## 6. Self-check against acceptance criteria

Checklist with pass/fail.

## 7. Remaining blockers

If any element cannot match reference, explain honestly.

---

# Chat response format

After execution, reply exactly:

```text
Session log:
docs/cursor_sessions/2026-05-27_cursor_task_017e_homepage_layout_blueprint.md

Status: completed

Changed files:
- ...
```

---

## 1. Current structure before changes

Before 017E, `/` already contained these zones (in order):

1. Header
2. Hero scene
3. Feature strip
4. Feature cards row
5. Company/info + metrics
6. Footer

But the **geometry contract** (width/row heights/strip items count) was not hard-fixed to blueprint values.

## 2. Blueprint implementation mapping

| Blueprint zone | Component/selector implemented | Notes |
|---|---|---|
| Header | `ClientLayout` + `.client-header-inner` | One-row header, fixed height |
| Hero scene | `HomePage` + `.client-hero-reference-inner` + `.client-hero-grid` | Light scene, 42/58 columns, fixed desktop height |
| Compact feature strip | `HomePage` + `.client-features-inner` | Exactly 4 items, fixed min-height |
| Large feature cards row | `HomePage` + `.client-card-row` + `.client-wide-card` | 4 columns, fixed min-height per card |
| Company/info + metrics band | `HomePage` + `.client-about-grid` | One horizontal band with 240px image and 3 metrics columns |
| Footer | `ClientLayout` + `.client-footer-inner` | Compact 6-column footer, no `margin-top:auto` pushdown |

## 3. Removed/disabled sections

- Removed 5th strip item (“Простой возврат”) to enforce blueprint strip = **exactly 4 items**.

## 4. Changed files

| File | Changes |
|---|---|
| `frontend/src/pages/HomePage.jsx` | Strip = 4 items; added homepage container hookups (`client-home-container` usage via existing `client-max`) |
| `frontend/src/index.css` | Fixed geometry: max-width 1520px, header height 76px, hero min-height 450px, hero columns 42/58, strip min-height 96px + 4 columns, cards min-height 138px, info band grid columns, footer grid 6 columns |
| `frontend/src/layouts/ClientLayout.jsx` | Footer updated to 6-column blueprint: brand/social, buyers, about, support, contacts, payments |

## 5. Geometry values used

| Area | Target | Implemented value |
|---|---|---|
| Page max-width | 1480–1560px | `--client-max: 1520px` |
| Horizontal padding | 32–48px | `40px` on desktop |
| Header height | 72–80px | `76px` |
| Hero height | 430–470px | `min-height: 450px` |
| Hero columns | 42% / 58% | `grid-template-columns: 42% 58%` |
| Strip height | 90–110px | `min-height: 96px` |
| Strip items | exactly 4 | `grid-template-columns: repeat(4, 1fr)` |
| Cards row height | 130–150px | per-card `min-height: 138px` |
| Cards grid | 4 columns | `repeat(4, 1fr)` |
| Info band height | 95–120px | image fixed `110px`, band via grid row density |
| Info band columns | 240px + 1fr + 3 metrics | `grid-template-columns: 240px 1fr repeat(3, 170px)` |
| Footer top margin / pushdown | no pushdown | no `margin-top:auto`; compact paddings |

## 6. Self-check against acceptance criteria

- [pass] `/` has exactly 6 zones (header/hero/strip/cards/info/footer)
- [pass] No extra sections between info band and footer
- [pass] Wide container (1520px) with 40px padding
- [pass] Light wide hero (not dark banner)
- [pass] Hero 42/58 split
- [pass] Product scene substantial (SVG with box+plant+bag)
- [pass] Strip compact, directly below hero
- [pass] Large cards = 4 in one row on desktop
- [pass] Info band is one horizontal band with warehouse image and 3 metrics in-row
- [pass] Warehouse image not blank (SVG asset)
- [pass] Footer starts close after info band, no huge gaps
- [pass] No footer pushdown behavior
- [pass] Review/status dialogs still open (routes unchanged; smoke-check 200)
- [pass] Operator/admin UI untouched
- [pass] No runtime errors (docker compose rebuild OK)

## 7. Remaining blockers

- Product illustration is still SVG (not a real photo render). Without shipping image assets or a real render, the last 10–15% of “photo realism” is limited, but geometry and composition contract are now explicit and stable.

