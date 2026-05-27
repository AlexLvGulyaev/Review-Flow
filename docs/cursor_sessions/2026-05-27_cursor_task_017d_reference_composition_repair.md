# Cursor Task 017D — Reference composition recovery and narrow-layout rollback

## Контекст

Task 017C НЕ принят.

Причина:
вместо восстановления reference composition произошла механическая «утяжка» страницы.

Проблема vertical density частично уменьшилась,
НО:

- homepage потеряла widescreen feeling;
- layout стал узким и зажатым;
- hero визуально деградировал;
- product composition упростилась;
- page снова выглядит как demo layout;
- часть reference-композиции фактически исчезла.

Task 017D — это НЕ новый redesign.

Это:

## rollback narrow-layout degradation + recovery of reference composition.

---

# Главная задача

Вернуть homepage максимально близко к:

`docs/ui_reference_client_homepage_widescreen_v2.png`

при этом:

- сохранить исправление vertical strip problem;
- сохранить нормальную viewport density;
- НЕ возвращать огромную пустую полосу;
- НЕ сжимать homepage в центральную колонку.

---

# Критическая проблема 017C

В 017C Cursor исправлял density через:

- уменьшение padding;
- уменьшение высоты блоков;
- сжатие spacing.

Но одновременно:

- была разрушена widescreen composition;
- исчезло ощущение product landing;
- hero стал маленьким тёмным баннером;
- illustration деградировала до placeholder feeling;
- info block частично сломан;
- появились лишние секции;
- homepage перестала быть похожей на reference.

Это unacceptable.

---

# Source of truth

Обязательные источники:

1. `docs/ui_reference_client_homepage_widescreen_v2.png`
2. текущий broken result после 017C
3. `docs/cursor_sessions/2026-05-27_cursor_task_017c_homepage_density_implementation.md`

Reference image остаётся главным visual source of truth.

---

# Что требуется исправить

## 1. Вернуть widescreen composition

Homepage НЕ должна выглядеть как:

- узкая колонка по центру;
- compressed demo layout;
- admin dashboard card.

Нужно:

- полноценное использование horizontal space;
- wide hero composition;
- правильные proportions;
- ощущение полноценного customer-facing landing.

Проверить:

- max-width containers;
- wrapper width;
- hero width;
- section width;
- grid proportions.

Если в 017C были уменьшены width/max-width/container constraints — пересмотреть их.

---

## 2. Hero recovery

Текущий hero после 017C визуально деградировал.

Нужно вернуть:

- светлую widescreen composition;
- product-scene feeling;
- balance между текстом и illustration;
- visual richness;
- правильную высоту hero.

Важно:

НЕ делать:

- маленький тёмный gradient banner;
- narrow hero card;
- placeholder hero.

Hero должен снова выглядеть как:

- homepage scene;
- product landing section;
- часть полноценного customer website.

---

## 3. Product illustration recovery

Текущая illustration выглядит как:

- placeholder SVG;
- упрощённая схема;
- временная заглушка.

Нужно приблизить её к reference:

- коробка;
- пакет;
- растение;
- layered composition;
- shadows/light feeling.

Допускается:

- SVG;
- PNG;
- layered CSS blocks;
- open assets;
- generated assets.

Запрещено:

- primitive placeholder;
- flat icon replacement.

---

## 4. Исправить company/info block

После 017C слева появился пустой белый прямоугольник вместо image/content.

Это broken state.

Нужно:

- восстановить visual block/image;
- восстановить composition;
- сохранить compact density;
- сохранить metrics справа.

---

## 5. Удалить лишние секции

После 017C появились:

- “Доставка и оплата”;
- “Поддержка”.

Эти секции:

- отсутствуют в reference homepage;
- ломают композицию;
- растягивают страницу;
- ухудшают density.

Нужно:

- удалить эти секции;
- вернуть структуру ближе к reference.

---

## 6. Footer composition

Footer должен быть:

- частью общей композиции;
- плотным;
- визуально интегрированным.

Но:

- НЕ прижатым вниз через artificial layout behavior;
- НЕ отдельным этажом;
- НЕ огромным.

Сохранить:

- dark footer style;
- columns;
- payment section;
- compact layout.

---

# Что НЕ менять

Запрещено:

- менять review dialog;
- менять status dialog;
- менять operator/admin UI;
- менять routes;
- менять backend;
- менять API;
- делать новый redesign;
- менять brand texts без необходимости.

---

# Важное требование

Cursor НЕ должен снова:

- “интерпретировать” reference;
- делать “свою улучшенную версию”;
- упрощать composition;
- заменять сложные элементы placeholder’ами.

Если какой-то элемент сложно реализовать:

- прямо написать blocker;
- НЕ имитировать выполнение.

---

# Acceptance criteria

Task принимается только если:

1. Homepage снова выглядит как widescreen landing.
2. Нет narrow-column feeling.
3. Hero близок к reference composition.
4. Product illustration визуально богаче и ближе к reference.
5. Нет пустого белого блока в info section.
6. Лишние секции удалены.
7. Footer композиционно интегрирован.
8. Vertical strip problem не вернулась.
9. Homepage воспринимается как customer-facing product.
10. На 16:9 при 100% масштабе страница выглядит как единая homepage.
11. Нет runtime errors.
12. Dialog flows не сломаны.

---

# Проверка

После реализации:

```bash
docker compose up --build -d
```

Проверить:

- `/`
- review dialog
- status dialog
- отсутствие runtime errors
- композицию на 1920x1080

---

# Сессионный лог

Создать:

```text
docs/cursor_sessions/2026-05-27_cursor_task_017d_reference_composition_repair.md
```

В начало вставить полный текст этого prompt.

Ниже обязательно добавить:

## 1. Что именно было сломано в 017C

Честный анализ:

- какие решения привели к narrow layout;
- почему hero деградировал;
- почему illustration стала placeholder-like;
- почему появились лишние секции.

---

## 2. Какие элементы reference были восстановлены

Перечислить:

- hero;
- composition;
- illustration;
- feature strip;
- feature cards;
- info block;
- footer;
- density.

---

## 3. Изменённые файлы

Таблица:

| File | Что изменено | Причина |
|---|---|---|

---

## 4. Самопроверка against reference

Кратко по зонам.

---

## 5. Остаточные ограничения / blockers

Если что-то всё ещё невозможно воспроизвести — написать честно.

---

# Формат ответа в чат

```text
Session log:
docs/cursor_sessions/2026-05-27_cursor_task_017d_reference_composition_repair.md

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

## Выполнение

## 1. Что именно было сломано в 017C

- **Hero стал тёмным баннером** из-за конфликта классов: на homepage контейнер имел одновременно `client-hero-inner` и `client-hero-reference-inner`, а в CSS правило `.client-hero-inner` (тёмный градиент) объявлено позже и переопределяло светлый “photo-scene” фон reference.
- **Narrow/compressed feeling** усилилось после “утяжки” высот/паддингов без проверки композиции на 16:9: уменьшение размеров сделало hero визуально “карточкой”, а не сценой.
- **Placeholder feeling illustration** усилилось из-за уменьшения размеров hero/visual-колонки и чрезмерного ужатия, хотя сама иллюстрация оставалась.
- **Лишние секции** (`shipping`, `support`) были добавлены ранее как “полезные” статические блоки, но они отсутствуют в reference и ухудшают композицию/плотность.
- **Info block (белый прямоугольник)** возникал как визуальный эффект отсутствия явной высоты/ratio у блока с background-image (на некоторых комбинациях размеров он выглядел как пустая карточка). Исправлено заданием `min-height` и `aspect-ratio`.

## 2. Какие элементы reference были восстановлены

- **Hero/composition**: убран конфликт классов → hero снова светлый “scene”.
- **Widescreen feeling**: расширен контейнер `--client-max` до 1360px, увеличены размеры визуальной части hero.
- **Illustration**: сохранена и увеличена (max-width), чтобы выглядеть ближе к reference.
- **Feature strip/cards**: сохранены (плотность из 017C не откатывалась в “пустоты”).
- **Info block**: восстановлен как визуальный блок (min-height + aspect-ratio + background-position).
- **Лишние секции**: удалены `shipping` и `support` с homepage.
- **Footer**: остаётся компактным, без искусственного прижатия вниз (strip-problem не возвращён).

## 3. Изменённые файлы

| File | Что изменено | Причина |
|---|---|---|
| `frontend/src/pages/HomePage.jsx` | Убран класс `client-hero-inner`; удалены секции `shipping`/`support` | Вернуть reference-hero и убрать растягивающие не-reference блоки |
| `frontend/src/index.css` | `--client-max: 1360px`; hero/illustration размеры; `.client-about-image` min-height + aspect-ratio | Восстановить widescreen composition и починить info block |
| `frontend/src/layouts/ClientLayout.jsx` | Убраны ссылки на якоря `shipping`/`support`, заменены на review/status | Навигация соответствует структуре homepage без лишних секций |

## 4. Самопроверка against reference

- **Header**: структуру сохранили; nav теперь соответствует доступным секциям страницы.
- **Hero**: светлый wide hero без тёмного баннера; CTA внутри; text+visual баланс ближе к reference.
- **Illustration**: увеличена и остаётся сцено‑подобной (box+plant+bag).
- **Feature strip**: плотный и рядом с hero.
- **Feature cards**: остаются 4, плотные.
- **Info block**: слева есть визуальный блок, справа текст+метрики.
- **Footer**: интегрирован, компактный, без пустой полосы перед ним.
- **Density**: “vertical strip” не вернулся.

## 5. Остаточные ограничения / blockers

- Иллюстрация всё ещё SVG (не фоторендер), поэтому 1:1 “фото” уровень reference ограничен отсутствием оригинального фото/3D ассета. Компенсируется масштабом, светотенью и layered-композицией.

