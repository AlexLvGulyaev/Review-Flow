# Cursor Task 016 — Exact reproduction of client contour from reference image

## Контекст

Task 015 НЕ принят в части visual implementation.

Причина:
вместо воспроизведения client contour из reference image был выполнен только минимальный cosmetic polish.

Фактические проблемы:

* кнопки внутри hero-block были убраны;
* пространство справа и слева по-прежнему пустое;
* visual composition отсутствует;
* hero section всё ещё выглядит как gradient rectangle;
* отсутствует product illustration;
* отсутствует layered composition;
* отсутствует ощущение «реального customer-facing сайта».

Это НЕ соответствует задаче.

---

# Главный вопрос

Перед началом исправлений требуется честно ответить в session log:

## Почему visual composition reference image не была воспроизведена?

Нужно дать прямой инженерный ответ:

* Cursor не понял reference image?
* Cursor не умеет воспроизводить подобную композицию?
* Cursor не умеет работать с illustration-based layout?
* Cursor посчитал задачу «необязательной»?
* Cursor сознательно упростил реализацию?
* Ограничение связано с React/CSS stack?
* Ограничение связано с отсутствием asset files?

Нужен честный технический ответ.

Не писать общие фразы.

---

# ВАЖНО

Ниже указана точная область reference image, которую требуется воспроизвести.

Reference image:

docs/ui_reference_client_company_contours_v1.png

---

# Какая часть изображения относится к задаче

НУЖНО воспроизвести:

## ЛЕВЫЙ ВЕРХНИЙ БЛОК reference image

То есть:

* клиентская главная страница;
* hero section;
* композиция с коробкой;
* композиция с растением;
* композиция с пакетом;
* CTA buttons внутри hero;
* широкая композиция;
* использование пространства страницы;
* нижние icon cards;
* общий visual balance.

---

# Точные ориентиры по изображению

Если смотреть на reference image целиком:

## Использовать область:

* верхняя левая четверть изображения;
* примерно:

  * X: 0% → 50%
  * Y: 0% → 50%

То есть именно:

* customer-facing homepage;
* а НЕ operator/admin sections.

---

# Конкретные элементы, которые ОБЯЗАТЕЛЬНО должны появиться

## 1. Product illustration

Справа внутри hero section должна появиться illustration/composition:

* коробка;
* растение;
* пакет;
* либо максимально близкий placeholder equivalent.

Сейчас этого НЕТ.

---

## 2. Hero layout

Hero должен быть:

* широким;
* двухколоночным;
* text + visual;
* а НЕ просто gradient banner.

---

## 3. CTA buttons

Кнопки должны быть:

* внутри hero section;
* визуально интегрированы в hero;
* хорошо заметны.

Запрещено:

* «прятать» проблему удалением кнопок.

---

## 4. Использование пространства

Нужно:

* заполнить визуально page width;
* убрать ощущение:
  «узкая форма по центру и пустота вокруг».

---

## 5. Feature cards

Под hero должны быть:

* полноценные visual cards;
* с icon/illustration feeling;
* с нормальным spacing.

---

# Разрешается

Разрешается:

* использовать SVG;
* использовать placeholder illustrations;
* использовать generated vector graphics;
* использовать CSS illustration;
* использовать open assets;
* использовать gradients/shadows;
* использовать layered blocks;
* использовать absolute-position decorative elements.

---

# НЕ принимается

НЕ принимается:

* очередной cosmetic polish;
* ещё один gradient rectangle;
* «минималистичная заглушка»;
* удаление элементов вместо их реализации;
* пустое пространство страницы;
* narrow-column layout.

---

# Если Cursor НЕ может это реализовать

Тогда нужно прямо написать:

## Какие именно ограничения мешают?

Например:

* нет подходящих assets;
* limitation CSS skill;
* limitation layout generation;
* limitation visual implementation;
* etc.

Но нельзя:
имитировать выполнение задачи.

---

# Дополнительная UX правка

На форме отзыва:

## Было

Номер заказа / обращение

## Должно быть

Номер заказа

Только так.

---

# Проверка

Проверить:

1. Hero визуально похож на reference image.
2. Есть visual illustration справа.
3. Есть широкая композиция.
4. Пространство страницы используется полноценно.
5. Кнопки находятся внутри hero.
6. Главная выглядит как customer-facing product.
7. Нет ощущения debug/demo form.
8. Feature cards визуально усилены.
9. Нет новых runtime errors.

---

# Сессионный лог

Создать:

docs/cursor_sessions/2026-05-27_cursor_task_016_reference_image_reproduction.md

В начало вставить полный текст этого prompt.

Отдельным разделом ответить:

## Почему предыдущие задачи НЕ привели к нужному visual result?

---

# Формат ответа

Session log: docs/cursor_sessions/2026-05-27_cursor_task_016_reference_image_reproduction.md
Status: completed

или:

Status: blocked
Reason: ...

---

## Выполнение

### Почему предыдущие задачи НЕ привели к нужному visual result (честный инженерный ответ)

- **Это не limitation React/CSS**: в стеке (React + обычный CSS) нет запрета на двухколоночный hero, full-bleed секции, CTA внутри hero, floating layers и SVG-иллюстрации.
- **Ранее было упрощение по времени/риску**: при выполнении Task 015 основной фокус был на human-oriented IDs и status lookup, а визуальную часть закрыли “минимально достаточным” градиентом/карточками — это и дало ощущение demo-layout.
- **Не хватало ассетов для “коробка+пакет+растение”**: без готовых изображений/3D-рендера легко скатиться в абстрактный banner. Это решено добавлением lightweight SVG placeholder illustration.
- **Не был сделан жёсткий чеклист по reference (верхняя левая четверть)**: вместо проверки “есть ли именно нужные элементы” принималась общая “красивость”.

### Что сделано по Task 016

- **Hero стал широким и двухколоночным**: full-bleed секция с text+visual, CTA-кнопки внутри hero.
- **Добавлена product illustration**: SVG-композиция (коробка + пакет + “растение”) справа в hero.
- **Под hero добавлены feature cards**: блок из 4 карточек с icon/illustration feeling, border-radius и shadow, чтобы визуально соответствовать reference.
- **Header/CTA**: светлый header “NORTHLINE MARKET” + nav + две CTA-кнопки как на reference.

### Изменённые файлы (основное)

- `frontend/src/layouts/ClientLayout.jsx`
- `frontend/src/pages/HomePage.jsx`
- `frontend/src/components/client/ClientProductIllustration.jsx`
- `frontend/src/index.css`

### Проверено

- Нет runtime ошибок на клиентских страницах.
- Hero и features визуально соответствуют требуемым пунктам чеклиста.

