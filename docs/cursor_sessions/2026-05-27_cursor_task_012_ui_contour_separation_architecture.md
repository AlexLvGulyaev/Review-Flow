# Session log: Cursor Task 012 — UI contour separation architecture

## Исходный промпт (полный текст)

# Cursor Task 012 — Обновление архитектуры разделения интерфейсов

## Контекст

Проект: `review-flow`.

Текущий пользовательский интерфейс реализован как единый operational-контур с переключением ролей через маршруты.

Это было допустимо для ранних milestone, но теперь требуется архитектурно разделить:

- клиентский контур;
- рабочее пространство компании;
- административный контур.

Важно:

На этом шаге НЕ нужно делать redesign интерфейса и НЕ нужно переписывать frontend.

Задача:
зафиксировать новую архитектуру интерфейсов проекта в документации и подготовить основу для следующего UI milestone.

---

# Главная архитектурная идея

Система должна разделиться на два основных визуальных контура.

## 1. Клиентский контур

Внешний сайт вымышленной компании.

Не «админка», не «тренажёр», не operational UI.

Цель:
создать ощущение обычного customer-facing web-сайта.

Примерный стиль:

- маркетплейс;
- доставка;
- e-commerce сервис;
- customer support portal.

Рабочая функция MVP:

Оставить отзыв

и:

Проверить статус обращения

---

## 2. Контур компании

Внутреннее рабочее пространство компании.

Содержит:

- рабочее место оператора;
- управление промптами;
- evaluation;
- analytics;
- logs;
- настройки AI-провайдеров;
- управление типовыми формулировками;
- управление шаблонами ответов.

Это internal operational UI.

---

# Важное UX-решение

На клиентской форме отзыва нужно добавить понятное человеку поле направления обращения.

Не использовать внутренние термины:

- product_area;
- scenario;
- topic.

Клиент должен видеть понятные категории.

Пример:

К чему относится отзыв?

- Доставка
- Качество товара
- Оплата
- Возврат
- Поддержка
- Сайт / приложение
- Другое

Backend позже сможет сопоставлять это с:
- topic;
- product_area;
- classification hints.

---

# Что нужно сделать

## 1. Обновить SOT

Файл:

Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md

Добавить разделы:

- разделение интерфейсных контуров;
- клиентский контур;
- внутренний контур компании;
- клиентская точка входа для отзывов;
- человеко-понятные категории обращений.

Важно:
не ломать существующую архитектуру.

---

## 2. Обновить README

Добавить описание:

- клиентского контура;
- контура оператора;
- административного контура.

---

## 3. Обновить User Guide

Файл:

docs/user_guide.md

Обновить разделы:
- Client flow;
- Operator flow;
- Administrator flow.

---

## 4. Обновить Demo Scenarios

Файл:

docs/demo_scenarios.md

Добавить:
- customer-facing точку входа;
- разделение контуров;
- навигацию между контурами.

---

## 5. Создать документ планирования UI

Создать:

docs/architecture/ui_contour_separation_plan.md

Документ должен содержать:

### Клиентский контур

- главная страница;
- header;
- footer;
- branding компании;
- точка входа для отзывов;
- страница проверки статуса;
- визуальный стиль;
- ожидаемая навигация.

### Контур компании

- рабочее место оператора;
- рабочее место администратора;
- левая навигационная панель;
- operational layout;
- размещение analytics/logs.

### Общие принципы

- responsive layout;
- визуальное разделение;
- отсутствие auth в MVP;
- возможность дальнейшего расширения.

---

# Ограничения

На этом шаге НЕ делать:

- redesign frontend;
- рефакторинг React;
- migration компонентов;
- migration UI framework;
- auth;
- RBAC;
- backend changes;
- new API;
- глобальный CSS overhaul.

Это задача:
documentation + architecture alignment.

---

# Сессионный лог

Создать:

docs/cursor_sessions/2026-05-27_cursor_task_012_ui_contour_separation_architecture.md

В начало вставить полный текст этого промпта.

Ниже зафиксировать:

- какие документы обновлены;
- какие решения приняты;
- как теперь разделяются контуры;
- какие UI-задачи ожидаются далее.

---

# Формат ответа в чат

После выполнения написать кратко:

Session log: docs/cursor_sessions/2026-05-27_cursor_task_012_ui_contour_separation_architecture.md
Status: architecture update completed

или:

Status: blocked
Reason: ...

---

## Выполнение

### Обновлённые документы

| Документ | Изменения |
|----------|-----------|
| `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md` | §4.6 — разделение UI-контуров, client/company, точка входа, категории обращений |
| `README.md` | Таблица контуров, маршруты по контурам, ссылка на UI plan |
| `docs/user_guide.md` | Client / Operator / Administrator flows, навигация MVP vs план |
| `docs/demo_scenarios.md` | Customer entry, contour overview, demo script по контурам |
| `docs/architecture/ui_contour_separation_plan.md` | **Создан** — полный план UI milestone |

### Принятые решения

1. **Два визуальных контура:** customer-facing site vs internal company workspace.
2. **Operator и Administrator** — роли внутри company contour (sidebar, operational layout), не отдельные «сайты».
3. **Клиентский контур** — marketing-style site; функции MVP: отзыв + статус; без operational nav.
4. **Категория обращения** — человеко-понятный select («Доставка», «Оплата», …) с таблицей маппинга на `product_area`/topic для следующего milestone.
5. **Текущий MVP** явно помечен как transitional (один React app + role selector); backend/API не меняются на этом шаге.

### Разделение контуров (кратко)

```text
CLIENT:  /  →  /review  →  /review/status/:id
COMPANY: sidebar + /operator/* | /prompts | /analytics | /logs | /settings/* | /admin/*
```

RBAC (client / operator / administrator) сохранён; меняется целевая **визуальная** оболочка.

### Следующие UI-задачи (ожидаются)

1. `ClientLayout` + marketing home + header/footer.
2. `CompanyLayout` + left sidebar navigation.
3. Select «К чему относится отзыв?» + mapping на API.
4. Убрать operational links из client shell; role selector только в company.
5. Отдельные стили (client vs company tokens).
6. Smoke: URL guard + access-denied copy per contour.

### Ограничения соблюдены

- Нет изменений frontend/backend кода, API, CSS overhaul, auth.

### Статус

architecture update completed
