# Cursor Task 017C — Homepage density correction implementation from 017B plan

## Контекст

Task 017B был analysis-only task.

Cursor выполнил сравнительный анализ:

- `cursor_tasks_local/cursor_error.png` — текущая реализация;
- `docs/ui_reference_client_homepage_widescreen_v2.png` — требуемый reference.

По результатам 017B был составлен correction plan.

Теперь требуется НЕ новый redesign и НЕ новая интерпретация homepage.

Требуется выполнить **строго implementation pass по плану 017B**.

---

# Главная задача

Исправить текущую homepage так, чтобы она вернула плотность и композицию widescreen reference.

Цель:

- убрать эффект бесконечной вертикальной ленты;
- восстановить visual density;
- сделать страницу близкой к `ui_reference_client_homepage_widescreen_v2.png`;
- добиться нормального восприятия на 16:9 при масштабе браузера 100%.

---

# Source of truth

Использовать как обязательные источники:

1. `docs/ui_reference_client_homepage_widescreen_v2.png`
2. `cursor_tasks_local/cursor_error.png`
3. `docs/cursor_sessions/2026-05-27_cursor_task_017b_homepage_screenshot_diff_plan.md`

Особенно важен correction plan из session log 017B.

---

# ВАЖНО: что запрещено

В рамках 017C запрещено:

- делать новый redesign;
- менять visual direction;
- менять бренд/тексты без необходимости;
- перепридумывать hero;
- менять review dialog;
- менять status dialog;
- менять operator/admin UI;
- добавлять новые большие секции;
- снова растягивать страницу;
- заменять проблему новым “красивым” вариантом.

Это НЕ creative task.

Это task на точечную инженерную коррекцию layout density.

---

# Что нужно исправить

## 1. Общая вертикальная плотность

Исправить layout так, чтобы homepage не выглядела как растянутая вертикальная лента.

Проверить и скорректировать:

- `min-height` у shell/main/hero/sections;
- `padding-top` / `padding-bottom` у основных секций;
- `margin-top` / `margin-bottom` между секциями;
- `gap` внутри layout containers;
- поведение footer.

Особое внимание:

если в коде есть поведение вида:

```css
.client-shell {
  display: flex;
  flex-direction: column;
}

.client-footer-rich {
  margin-top: auto;
}
```

то проверить, не именно ли оно создаёт пустую полосу и искусственно уводит footer вниз.

Если это root cause — исправить.

---

## 2. Footer behavior

Footer должен быть частью общей композиции homepage, а не отдельным “нижним этажом” после огромной пустоты.

Нужно:

- убрать искусственное прижатие footer вниз, если оно создаёт пустоту;
- уменьшить лишние вертикальные отступы перед footer;
- сохранить структуру footer и его визуальный стиль;
- добиться, чтобы footer был логичным продолжением страницы.

---

## 3. Hero section

Hero НЕ должен занимать чрезмерную высоту.

Нужно:

- сохранить двухколоночную композицию reference;
- сохранить текст слева и product illustration справа;
- не менять visual hierarchy;
- уменьшить лишние вертикальные padding/gaps, если они есть;
- обеспечить компактное сцепление hero с feature strip.

Важно:
hero должен выглядеть как widescreen homepage section, а не как отдельный высокий баннер.

---

## 4. Feature strip под hero

Feature strip должен быть ближе к hero и выглядеть как часть одной композиции.

Проверить:

- высоту strip;
- spacing между элементами;
- расстояние от hero;
- плотность иконок и текста.

Не превращать strip в отдельную большую секцию.

---

## 5. Большие feature cards

Большие карточки преимуществ должны быть плотными и визуально близкими к reference.

Нужно:

- уменьшить лишнюю высоту карточек, если она появилась;
- нормализовать внутренние padding;
- сохранить icon containers;
- сохранить shadow/border hierarchy;
- не увеличивать вертикальные gaps между cards и соседними секциями.

---

## 6. Company/info block + metrics

Блок “О Northline Market” и метрики должны быть компактным нижним информационным блоком, а не отдельной растянутой секцией.

Нужно:

- приблизить его к reference по высоте;
- сохранить изображение слева;
- сохранить метрики справа;
- уменьшить лишние отступы сверху/снизу;
- не допускать большой пустоты перед footer.

---

# Target behavior на 16:9

На экране 1920x1080 при масштабе браузера 100% homepage должна восприниматься как цельная страница.

Минимальное ожидание:

- header виден;
- hero виден;
- feature strip виден;
- большие feature cards видны полностью или почти полностью;
- company/info block и footer находятся близко ниже, без ощущения “километровой” прокрутки.

Reference не обязан быть pixel-perfect на 100%, но композиционная плотность должна быть близкой.

---

# Implementation discipline

Перед изменениями:

1. Открыть session log 017B.
2. Найти actual class names в текущем коде.
3. Сопоставить каждый пункт correction plan с конкретными CSS/React-файлами.
4. Только потом вносить изменения.

Во время изменений:

- фиксировать только необходимые layout/CSS правки;
- не менять бизнес-логику;
- не менять API;
- не менять routes;
- не трогать dialogs/forms/status flows.

После изменений:

- сделать самопроверку по acceptance criteria ниже;
- записать в session log, какие конкретно class names были изменены.

---

# Acceptance criteria

Результат принимается только если:

1. Homepage больше не выглядит как endless vertical strip.
2. Footer не уезжает вниз из-за искусственного layout behavior.
3. Между company/info block и footer нет огромной пустой зоны.
4. Hero не занимает чрезмерную высоту.
5. Feature strip расположен компактно относительно hero.
6. Feature cards не выглядят растянутыми по вертикали.
7. Company/info block + metrics близки к reference по плотности.
8. На 16:9 при 100% масштабе страница воспринимается как единая widescreen homepage.
9. Product illustration справа в hero сохранена.
10. Header/footer/CTA/metrics сохранены.
11. Review dialog не сломан.
12. Status dialog не сломан.
13. Operator/admin routes не затронуты.
14. Нет runtime errors.

---

# Проверка

После реализации выполнить доступные проверки проекта.

Минимально:

```bash
docker compose up --build -d
```

Проверить в браузере:

- `/` — homepage;
- открыть review dialog;
- открыть status dialog;
- убедиться, что нет runtime error.

Если есть существующие frontend/backend test commands — выполнить их тоже.

---

# Сессионный лог

Создать:

```text
docs/cursor_sessions/2026-05-27_cursor_task_017c_homepage_density_implementation.md
```

В начало файла вставить полный текст этого prompt.

Ниже добавить разделы:

## 1. Что было взято из 017B correction plan

Кратко перечислить пункты плана 017B, которые были реализованы.

## 2. Root cause

Коротко зафиксировать фактическую причину растягивания страницы.

Например:

- footer margin-top auto;
- oversized section padding;
- excessive min-height;
- excessive gaps;
- combination of factors.

## 3. Изменённые файлы

Таблица:

| File | Изменение | Причина |
|---|---|---|

## 4. Изменённые class names / selectors

Таблица:

| Selector | Было | Стало | Зачем |
|---|---|---|---|

Если exact values не всегда применимы — указать смысл изменения.

## 5. Самопроверка against reference

Коротко по зонам:

- header;
- hero;
- illustration;
- feature strip;
- feature cards;
- company/info block;
- footer;
- 16:9 viewport density.

## 6. Что НЕ менялось

Обязательно подтвердить:

- review dialog не менялся или не сломан;
- status dialog не менялся или не сломан;
- operator/admin UI не менялся;
- backend/API не менялись.

## 7. Остаточные риски / что проверить Александру

Кратко перечислить, что нужно проверить глазами после запуска.

---

# Формат ответа в чат

После выполнения написать кратко:

```text
Session log:
docs/cursor_sessions/2026-05-27_cursor_task_017c_homepage_density_implementation.md

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

## 1. Что было взято из 017B correction plan

- Убрано искусственное прижатие footer вниз (root-cause пустой полосы) — удалён `margin-top: auto`.
- Уменьшена высота hero (min-height + padding), чтобы hero не доминировал по вертикали.
- Уплотнён feature strip (padding/gap, размеры иконок), чтобы он “прилипал” к hero как в reference.
- Уплотнены большие feature cards (padding/типографика) и интервалы между секциями.
- Уплотнён company/info block и KPI карточки (padding/margins), чтобы не уводить footer далеко вниз.
- Уплотнён footer (top padding + grid gap) без изменения структуры.

## 2. Root cause

- **Основной root cause**: `.client-shell` (flex-column) + `.client-footer-rich { margin-top: auto; }` → появлялась большая пустая полоса перед footer.
- **Дополнительные факторы**: завышенные `min-height`/padding у hero и крупные вертикальные margin у секций.

## 3. Изменённые файлы

| File | Изменение | Причина |
|---|---|---|
| `frontend/src/index.css` | Удалён `margin-top:auto` у footer; снижены `min-height`/padding/gaps в hero/strip/cards/info/footer | Убрать пустую “ленту” и вернуть плотность 16:9 |

## 4. Изменённые class names / selectors

| Selector | Было | Стало | Зачем |
|---|---|---|---|
| `.client-footer-rich` | `margin-top: auto` | удалено | убрать пустую полосу и “уезжающий” footer |
| `.client-hero-reference-inner` | `min-height: 420px`, `padding: 2.6rem … 2.2rem` | `min-height: 360px`, `padding: 2.15rem … 1.7rem` | снизить вертикальную доминанту hero |
| `.client-hero-visual` | `min-height: 320px` | `min-height: 280px` | убрать лишнюю высоту |
| `.client-features-inner` | `padding: 1.1rem`, `gap: 0.75rem` (и ранее более крупные значения) | `padding: 0.85rem`, `gap: 0.75rem` (компактнее) | сделать strip компактнее |
| `.client-feature-item` | padding больше | `0.6rem 0.75rem` | уменьшить высоту strip |
| `.client-feature-icon` | `40px` | `36px` | уменьшить высоту strip |
| `.client-feature-cards` | `margin-top: 1.4rem` | `1rem` | уменьшить расстояние между блоками |
| `.client-wide-card` | `padding: 1rem` | `0.85rem 0.9rem` | сделать cards плотнее |
| `.client-section` | `margin-top: 2.5rem` | `1.8rem` | убрать “вертикальную ленту” |
| `.client-metrics .metric` | `padding: 0.85rem` | `0.75rem 0.8rem` | уплотнить KPI |
| `.client-footer-inner` | `padding-top: 2.5rem`, `gap: 2rem` | `padding-top: 1.9rem`, `gap: 1.5rem` | снизить высоту footer |

## 5. Самопроверка against reference

- **Header**: сохранён (структура и CTA).
- **Hero**: сохранён (двухколоночный, CTA внутри), стал компактнее по высоте.
- **Illustration**: сохранена справа.
- **Feature strip**: ближе к hero, меньше по высоте.
- **Feature cards**: плотнее, без лишней вертикальной высоты.
- **Company/info block**: сохранён, KPI плотнее, блок ближе к footer.
- **Footer**: больше не “уезжает” вниз из-за `margin-top:auto`, отступы плотнее.
- **16:9 density**: ключевые зоны на 1920×1080 при 100% масштабе должны восприниматься как единая homepage без огромной пустоты.

## 6. Что НЕ менялось

- Review dialog не менялся (код страниц `/review` не трогался).
- Status dialog не менялся (код страниц `/review/status*` не трогался).
- Operator/admin UI не менялся.
- Backend/API не менялись.

## 7. Остаточные риски / что проверить Александру

- Оценить глазами на 1920×1080 и 1440×900: плотность, отсутствие пустоты перед footer.
- Проверить, что после удаления “липкого” footer на очень коротких страницах это поведение приемлемо (для homepage — да).
- Убедиться, что hero/illustration не “обрезаются” на узких экранах (responsive брейкпоинты).

