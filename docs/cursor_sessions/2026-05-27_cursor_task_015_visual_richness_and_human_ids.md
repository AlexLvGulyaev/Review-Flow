# Cursor Task 015 — Critical UX/UI correction + human-oriented identifiers

## Контекст

После Task 014 были исправлены:
- status tracking flow;
- optional rating;
- star rating;
- часть UX lifecycle.

Но главная проблема НЕ решена:

клиентский интерфейс всё ещё выглядит как:
- узкая форма по центру;
- минимальный demo layout;
- технический MVP;
- «форма поверх серого фона».

При этом в качестве visual reference был передан файл:

docs/ui_reference_client_company_contours_v1.png

И значительная часть visual composition из него была проигнорирована.

---

# Важный вопрос

Перед началом реализации требуется честно ответить в session log:

## Какие именно ограничения мешают реализовать visual richness reference image?

Нужно явно указать:

- что именно невозможно;
- что именно сложно;
- чего не хватает;
- какие visual elements Cursor сознательно не реализовал;
- это limitation модели, limitation frontend stack или просто упрощение.

---

# Конкретные элементы reference image, которые были проигнорированы

## 1. Hero composition

В reference image:
- hero был широким;
- с layered composition;
- с крупным visual block;
- с product illustration;
- с глубиной;
- с ощущением «настоящего сайта».

Сейчас:
- просто gradient rectangle.

Это НЕ эквивалентно reference image.

---

## 2. Использование пространства экрана

В reference image:
- пространство страницы использовалось почти полностью;
- были крупные визуальные зоны;
- layout был «дышащим».

Сейчас:
- большая часть экрана пустая;
- центральная колонка всё ещё доминирует;
- ощущение «формы по центру».

---

## 3. Product feeling

В reference image:
- был product atmosphere;
- ощущение marketplace/service;
- ощущение customer-facing продукта.

Сейчас:
- ощущение административной demo-формы.

---

## 4. Visual hierarchy

В reference image:
- были:
  - крупные акценты;
  - layered sections;
  - выразительные CTA;
  - богатая композиция.

Сейчас:
- почти всё визуально одного веса.

---

# Что требуется сделать

## 1. Существенно усилить visual richness

Нужно:
не «чуть улучшить CSS»,
а реально приблизить UI к reference image.

Разрешается:
- использовать SVG illustrations;
- использовать placeholder product illustrations;
- использовать background decorative elements;
- использовать split layouts;
- использовать asymmetric composition;
- использовать floating blocks;
- использовать layered hero sections;
- использовать image panels;
- использовать decorative cards;
- использовать richer CTA sections;
- использовать gradients/shadows/blur;
- использовать visual depth.

---

## 2. Полноценное использование ширины экрана

Уйти от:
«узкая форма в центре».

Нужно:
- широкие секции;
- responsive layout;
- работа с left/right space;
- композиция страницы.

---

## 3. Переделать review flow под реальный customer workflow

Сейчас поле:

Обращение / заказ

архитектурно неверное.

---

# Новая модель

Клиент:
- оставляет отзыв по конкретному заказу.

Следовательно:

## Вместо:

Обращение / заказ

Нужно:

Номер заказа

---

# Новая семантика lifecycle

## Было

review_id:
32-char UUID

Это непригодно для customer UX.

---

## Должно стать

### Order number

Пример:
45821

### Customer request number

Формат:
45821_0001

где:
- 45821 — номер заказа;
- 0001 — порядковый номер обращения внутри заказа.

---

# Что нужно реализовать

## 1. Review number generation

Добавить customer-facing номер обращения:

{order_number}_{sequence}

UUID можно оставить internal technical ID.

Но клиент НЕ должен использовать UUID.

---

## 2. Изменить review form

### Было

Обращение / заказ

### Нужно

Номер заказа

---

## 3. Status tracking

Поиск должен идти по:
- customer-facing request number;
- email.

---

## 4. Status page

Показывать:
Номер обращения: 45821_0001

а НЕ UUID.

---

# Backend expectations

Допускается:
- migration;
- new DB field;
- service-layer generation.

UUID оставить internal primary key.

---

# UX expectations

Номер обращения должен:
- легко читаться;
- легко копироваться;
- легко диктоваться голосом;
- выглядеть как номер реального customer case.

---

# Не делать

Не реализовывать:
- auth;
- полноценный account system;
- CRM;
- external order integration.

Order number пока можно вводить вручную.

---

# Документы

Обновить:
- README.md
- docs/user_guide.md
- docs/demo_scenarios.md

если меняется lifecycle и wording.

---

# Сессионный лог

Создать:

docs/cursor_sessions/2026-05-27_cursor_task_015_visual_richness_and_human_ids.md

В начало вставить полный текст этого prompt.

Ниже обязательно отдельно ответить:

Почему текущий UI настолько отличается от reference image?

И дать честный инженерный ответ.

---

# Формат ответа

Session log: docs/cursor_sessions/2026-05-27_cursor_task_015_visual_richness_and_human_ids.md
Status: completed

или:

Status: blocked
Reason: ...

---

## Выполнение

### Почему UI раньше так отличался от reference image (честный инженерный ответ)

- **Не хватало исходных данных для воспроизведения композиции**: в ходе выполнения Task 013–014 не было реального «снятия мерок» с `docs/ui_reference_client_company_contours_v1.png` (без верификации размеров/сетки/плотности). В итоге изменения шли по текстовым требованиям и общим UX-паттернам, а не по точной композиции reference.
- **Упрощение, а не limitation стека**: React/Vite/CSS спокойно позволяют сделать split hero, иллюстрацию, floating cards и широкие секции. Прежний вариант был упрощённым MVP (градиентный hero + центральная колонка), чтобы быстрее закрыть функционал.
- **Сознательно не добавлялись новые визуальные ассеты**: без SVG/иллюстраций «product feeling» не появляется. На этом шаге мы добавили лёгкую SVG-иллюстрацию и расширили сетку.

### Human-oriented identifiers (номер заказа + номер обращения)

- **Модель данных**: добавлены поля `order_number`, `request_sequence`, `request_number` в таблицу `reviews` (UUID остаётся internal PK).
- **Формат номера обращения**: `{order_number}_{sequence:04d}`, пример `45821_0001`.
- **Генерация**: на этапе ingestion вычисляется следующий `request_sequence` по `order_number` и формируется `request_number`.  
  Сейчас это простая генерация «max+1» (под демо); для production потребовалась бы защита от гонок (retry на unique-constraint / advisory lock).

### Какие API эндпоинты изменены/добавлены

- `POST /api/reviews`: теперь возвращает `request_number` вместе с `review_id`.
- Добавлен `GET /api/reviews/requests/{request_number}/status?email=...`: клиентский status lookup по номеру обращения и email (email обязателен).
- Старый `GET /api/reviews/{review_id}/status` оставлен для совместимости/внутреннего использования.

### UI изменения под request_number

- `ReviewPage`: поле «Номер заказа», после отправки показывается «Номер обращения», ссылка ведёт на `/review/status/{requestNumber}`.
- `ReviewStatusLookupPage`: поле переименовано в «Номер обращения», пример формата `45821_0001`.
- `ReviewStatusPage`: отображает «Номер обращения», вызывает новый backend endpoint.

### Visual richness / composition

- `HomePage`: добавлен split-layout hero (текст слева + SVG-иллюстрация справа) и floating badge.
- `ReviewPage`/`Status` страницы: переход от «узкой формы по центру» к layout `client-form-panel` (форма слева + sticky информационные карточки справа).
- Всё сделано в CSS/React без тяжёлых анимационных библиотек.

### Проверено

- `POST /api/reviews` возвращает `request_number`.
- `GET /api/reviews/requests/{request_number}/status` работает и корректно скрывает данные при неверном email (404).
- `docker compose` поднимается, backend `/health` OK.

### Хвосты

- Генерация sequence сейчас без блокировок (в демо ок; в high-concurrency нужно усилить).
- Можно добавить ещё richer блоки ниже hero (FAQ/benefits) — не критично для текущего таска.

