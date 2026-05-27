# Cursor Task 017 — Homepage rebuild from fullscreen reference

## Контекст

Предыдущие visual iterations НЕ приняты.

Причина:

вместо воспроизведения reference implementation происходило:

* упрощение layout;
* reinterpretation дизайна;
* замена композиции собственными решениями;
* cosmetic polish вместо точного воспроизведения.

Это привело к:

* потере visual density;
* пустым зонам экрана;
* demo-feeling вместо customer-facing продукта;
* отклонению от reference image.

---

# Главная задача

Нужно НЕ «улучшить homepage».

Нужно:

## максимально точно воспроизвести fullscreen reference image

Reference:

docs/ui_reference_client_homepage_widescreen_v2.png

---

# ВАЖНО

Reference image теперь содержит:

* ТОЛЬКО homepage;
* ТОЛЬКО widescreen layout;
* ТОЛЬКО customer-facing contour;
* без operator/admin sections.

Поэтому:

* больше нет ambiguity;
* больше нет необходимости интерпретировать composite board;
* больше нет необходимости «додумывать».

---

# Требование

## Воспроизводить именно reference image

а НЕ:

* «похожий дизайн»;
* «собственную улучшенную версию»;
* «минималистичную адаптацию».

---

# Что требуется воспроизвести

## 1. Общую widescreen-композицию

Сейчас проблема проекта:

* UI выглядит узким;
* пустым;
* centered demo-layout.

Нужно:

* wide layout;
* правильное использование horizontal space;
* visual balance;
* full-width product feeling.

---

## 2. Hero section

Нужно воспроизвести:

* двухколоночную структуру;
* левую текстовую область;
* правую visual composition;
* spacing;
* proportions;
* gradients;
* shadows;
* visual hierarchy.

---

## 3. Product illustration

Это КРИТИЧЕСКИЙ элемент.

Нужно воспроизвести visual composition:

* коробка;
* растение;
* пакет;
* lighting/shadow feeling;
* layered composition.

Разрешается:

* SVG;
* PNG;
* CSS composition;
* open assets;
* generated illustration.

Запрещено:

* заменять это абстрактной SVG-заглушкой;
* делать “условный placeholder”.

---

## 4. CTA buttons

Нужно:

* сохранить две CTA внутри hero;
* сохранить hierarchy;
* primary/secondary distinction;
* spacing как в reference.

---

## 5. Feature cards

Под hero должны быть:

* широкие cards;
* нормальный spacing;
* visual depth;
* icon containers;
* border/shadow hierarchy.

Не lightweight placeholders.

---

## 6. Нижняя часть homepage

Нужно воспроизвести:

* информационный блок;
* statistics/metrics area;
* footer structure;
* visual density страницы.

---

# КРИТИЧЕСКОЕ ТРЕБОВАНИЕ

## Не упрощать reference

Если какой-то элемент сложно реализовать:

* НЕ удалять его;
* НЕ заменять minimal placeholder;
* НЕ упрощать layout молча.

Вместо этого:

* явно написать blocker в session log.

---

# Что НЕ принимается

НЕ принимается:

* “gradient rectangle hero”;
* пустота справа;
* centered narrow layout;
* SVG-заглушка вместо visual composition;
* simplification without explanation;
* reinterpretation;
* “я сделал похоже”.

---

# Техническая свобода

Разрешается:

* менять CSS;
* менять layout;
* менять структуру homepage;
* добавлять assets;
* добавлять illustration files;
* использовать absolute positioning;
* использовать layered decorative elements;
* использовать CSS grid/flex;
* использовать background images.

---

# Scope ограничения

## ВАЖНО

В рамках Task 017:

НЕЛЬЗЯ:

* трогать operator UI;
* трогать analytics UI;
* трогать moderation UI;
* переделывать review form;
* переделывать status page.

Только:

* homepage.

---

# Проверка результата

Homepage должна:

1. Визуально быть максимально близкой к reference image.
2. Использовать экран полноценно.
3. Не иметь ощущения “учебного демо”.
4. Иметь product-level visual density.
5. Иметь полноценную visual composition справа.
6. Быть widescreen-oriented.
7. Иметь современный customer-facing appearance.
8. Не иметь пустых зон.
9. Не выглядеть как “form in container”.

---

# Обязательная самопроверка Cursor

Перед завершением задачи Cursor должен ответить в session log:

## Какие конкретно элементы reference были воспроизведены?

И перечислить:

* hero;
* composition;
* cards;
* footer;
* spacing;
* illustration;
* metrics;
* etc.

---

# Сессионный лог

Создать:

docs/cursor_sessions/2026-05-27_cursor_task_017_homepage_pixel_reference_rebuild.md

В начало вставить полный текст этого prompt.

---

# Формат ответа

Session log:
docs/cursor_sessions/2026-05-27_cursor_task_017_homepage_pixel_reference_rebuild.md

Status: completed

или:

Status: blocked
Reason: ...

---

## Выполнение

### Какие конкретно элементы reference были воспроизведены (самопроверка)

- **Widescreen композиция**: hero сделан full‑bleed (на всю ширину), контент внутри ограничен `--client-max`, без ощущения “узкой формы в центре”.
- **Hero (двухколоночный)**: слева pill + крупный заголовок + текст, ниже 2 CTA; справа — композиция.
- **CTA внутри hero**: две кнопки внутри hero, с приоритетом (primary green) и secondary (outline).
- **Product illustration**: обновлён `ClientProductIllustration` до более “фото‑подобной” композиции: коробка с лентой/тенями + горшок с растением + пакет с ручками и светотенью.
- **Ряд маленьких feature‑чипов** под hero: 5 элементов с иконкой в контейнере + заголовок/подзаголовок.
- **Ряд больших карточек**: 4 “wide cards” с иконкой в контейнере, тенью, spacing и chevron.
- **Нижняя часть homepage**: блок “О Northline Market” с “фото” слева и метриками справа (3 KPI карточки), далее секции shipping/support.
- **Footer**: структура остаётся из client layout (вне отдельного rebuild), но визуально совместима с reference (dark footer, колонки).

### Изменённые файлы (scope: homepage)

- `frontend/src/pages/HomePage.jsx` — перестроена структура под reference
- `frontend/src/index.css` — новые классы/переменные для pixel‑подобной композиции homepage
- `frontend/src/components/client/ClientProductIllustration.jsx` — улучшена композиция (box+plant+bag)

### Проверка

- `GET /` → 200
- `GET /review` → 200 (не менялся)
- `docker compose up --build -d` проходит без ошибок

