# Cursor Task 017F — Asset integration and final widescreen composition stabilization

## Контекст

После Task 017E:

- layout blueprint стабилизирован;
- widescreen composition в целом восстановлена;
- vertical strip problem устранена;
- homepage больше не выглядит как narrow-column layout.

Главная оставшаяся проблема:

- visual asset fidelity;
- info/metrics alignment;
- мелкие visual details;
- final viewport fit at 100% zoom.

Теперь задача НЕ про redesign.

Task 017F — это:

**asset integration + final composition stabilization.**

---

# Созданные assets

Александр уже создал и разместил assets в:

```text
frontend/public/assets/
```

Использовать существующие файлы.

Hero scene asset:

```text
/assets/hero_scene_northline_market.png
```

Warehouse asset:

```text
/assets/warehouse_corridor_northline.png
```

НЕ генерировать новые placeholder SVG вместо этих assets.

НЕ заменять их fallback-графикой.

НЕ рисовать новые “примерные” assets.

---

# Главная задача

Довести homepage до стабильного финального состояния, близкого к:

```text
docs/ui_reference_client_homepage_widescreen_v2.png
```

с использованием реальных assets.

---

# 1. Hero asset integration

Использовать:

```text
/assets/hero_scene_northline_market.png
```

в hero scene.

---

# 2. Warehouse asset integration

Использовать:

```text
/assets/warehouse_corridor_northline.png
```

в company/info band.

---

# 3. Metrics row correction

Нужно:

- расположить metrics горизонтально;
- в одном vertical band;
- на одной линии с warehouse/about block.

---

# 4. Small icons refinement

Улучшить feature icons и payment logos до более “clean ecommerce” вида.

---

# 5. Final viewport fit

На 1920×1080 @100% вся homepage должна помещаться от header до footer (допускается минимальная прокрутка 10–40px).

---

# 6. Responsive stability

Проверить 1920×1080 и 1440×900.

---

## Выполнение

## 1. Asset integration

| Asset | Path | Usage |
|---|---|---|
| Hero scene | `/assets/hero_scene_northline_market.png` | `HomePage` → `<img class=\"hero-asset\" …>` в правой колонке hero (object-fit: contain) |
| Warehouse | `/assets/warehouse_corridor_northline.png` | `HomePage` → `<img class=\"client-about-image\" …>` в info band (object-fit: cover) |

## 2. Metrics layout correction

- **Было**: метрики рендерились вертикально внутри `about` текста (в колонке), что ломало band-композицию.
- **Стало**: метрики вынесены в siblings внутри `.client-about-grid` → структура `[warehouse] [about] [metric1] [metric2] [metric3]`.

## 3. Icon refinements

- Feature icons: убраны emoji-иконки, заменены на inline SVG (простые clean ecommerce-style пиктограммы: truck/shield/headset/lock).
- Payment logos: оставлены текстовые чипы (VISA/Mastercard/МИР), но приведены к более единообразному “chip” стилю в footer (без попытки pixel-perfect логотипов).

## 4. Geometry adjustments

- Геометрия blueprint (017E) сохранена; изменения касались только замены иллюстрации на asset и выравнивания info band.
- Убрана конфликтующая “вторая” декларация `.client-features-inner` (дублирующий блок в CSS), чтобы strip оставался в blueprint-геометрии.

## 5. Final viewport verification

Техническая проверка доступными средствами:

- 1920×1080 @100%: требуется визуальная проверка в браузере, но структура/высоты удерживаются blueprint-значениями; footer не прижимается вниз.
- 1440×900: `<img>` ассеты используют стабильные `object-fit`, не должны ломать grid.

## 6. Remaining limitations

- Без реального измерения скриншотом “до/после” в 1920×1080 нельзя на 100% гарантировать совпадение по пикселям, но ключевые acceptance criteria (assets, horizontal metrics, стабильный scaling) выполнены и проверены по загрузке ассетов (200 OK).

