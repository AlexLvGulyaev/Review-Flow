# UI Contour Separation Plan — Review Flow

Документ планирования следующего UI milestone.  
**Статус:** architecture alignment (Task 012). Код frontend на этом шаге не меняется.

## Текущее состояние (MVP)

- Одно React-приложение (`frontend/`), общий header, role selector в шапке.
- Маршруты разделены `ProtectedRoute` + `X-Role`, но визуально все страницы выглядят как один operational shell.
- Клиент попадает на те же layout-классы, что и оператор/админ.

## Целевая модель

```text
┌─────────────────────────────┐     ┌──────────────────────────────────────┐
│   CLIENT CONTOUR            │     │   COMPANY CONTOUR (internal)         │
│   (customer-facing site)    │     │                                      │
│                             │     │  ┌────────────┐  ┌─────────────────┐ │
│  Home, branding, footer     │     │  │ Sidebar    │  │ Main workspace  │ │
│  /review                    │     │  │ nav        │  │                 │ │
│  /review/status/:id         │     │  │            │  │ Operator queue  │ │
│                             │     │  │            │  │ Prompts, eval   │ │
│  No admin links             │     │  │            │  │ Analytics, logs │ │
│  No role selector (public)  │     │  │            │  │ AI settings, KB │ │
└─────────────────────────────┘     │  └────────────┘  └─────────────────┘ │
                                    │  Role: operator | administrator      │
                                    └──────────────────────────────────────┘
```

---

## 1. Клиентский контур

### Назначение

Публичный сайт вымышленной компании (рабочее имя в demo: **Review Flow Store** или бренд из seed). Пользователь не должен понимать, что это «внутренняя система обработки отзывов».

### Страницы (целевые)

| Страница | Маршрут (план) | Описание |
|----------|----------------|----------|
| Главная | `/` | Hero, кратко о компании, CTA «Оставить отзыв», ссылка «Проверить статус» |
| Оставить отзыв | `/review` | Форма отзыва |
| Статус обращения | `/review/status/:reviewId` | Статус, текст отзыва, финальный ответ после публикации |

Опционально позже: `/help`, `/contacts` — статические страницы для правдоподобности.

### Header

- Логотип / название компании (ссылка на `/`).
- Навигация: «Главная», «Оставить отзыв», «Статус обращения» (или ввод ID).
- **Без** ссылок на operator, prompts, analytics, settings.
- **Без** role selector.

### Footer

- Контакты-заглушки, копирайт, политика (текст-заглушка).
- Визуально отделён от main content.

### Branding

- Светлая marketing-палитра (не серая operational).
- Крупная типографика на главной, карточки услуг/преимуществ (статический контент).
- Отдельный CSS namespace или layout wrapper: `ClientLayout`.

### Точка входа для отзывов

- Primary CTA на главной и в header: «Оставить отзыв».
- Secondary: «Уже оставляли? Проверить статус».

### Форма отзыва — поля (целевые)

| Поле | UX |
|------|-----|
| Имя | текст |
| Email | опционально |
| Номер заказа / обращение | текст (service case title) |
| **К чему относится отзыв?** | select: Доставка, Качество товара, Оплата, Возврат, Поддержка, Сайт / приложение, Другое |
| Оценка | 1–5 |
| Текст отзыва | textarea |

Маппинг на API (следующий milestone): категория → `product_area` + metadata/topic hint; имя полей API может остаться прежним.

### Страница статуса

- Показ review ID, human-readable статус, moderation/publication labels (упрощённые).
- Финальный ответ только после publish.
- Ссылка «Оставить новый отзыв».

### Визуальный стиль

- Маркетплейс / delivery service aesthetic.
- max-width контент, воздух, минимум таблиц.
- Mobile-first для формы отзыва.

### Навигация

- Только внутри client contour.
- Deep link на `/review/status/:id` после submit.

---

## 2. Контур компании

### Назначение

Internal operational UI для сотрудников. Визуально **не** как публичный сайт.

### Общий layout

- `CompanyLayout`: фиксированная **левая навигационная панель** + content area.
- Верхняя полоса: название workspace («Review Flow — Operations»), **role selector** (operator / administrator) или отдельные entry URLs.
- Без marketing footer.

### Operator workspace

| Раздел | Маршрут (существующий) |
|--------|-------------------------|
| Очередь отзывов | `/operator/reviews` |

Функции без изменений: list, detail, approve/reject/revision, final response textarea.

### Administrator workspace

| Раздел | Маршрут |
|--------|---------|
| Prompts | `/prompts` |
| Evaluation | `/evaluation` |
| Analytics | `/analytics` |
| Logs | `/logs` |
| AI providers | `/settings/ai-providers` |
| Фразы | `/admin/phrases` |
| Шаблоны | `/admin/templates` |
| Сценарии | `/admin/scenarios` |
| Тональности | `/admin/sentiments` |

Группировка в sidebar:

- **Moderation** (только operator role)
- **Quality & prompts** (admin)
- **Observability** (admin): Analytics, Logs
- **Knowledge base** (admin)
- **AI** (admin): Provider settings

### Размещение analytics / logs

- Полноширинные таблицы и карточки в content area.
- Sidebar item активен при переходе.
- Не смешивать с client home.

### Entry points (план)

- Отдельный URL prefix опционально: `/app/...` или subdomain в production.
- MVP demo: `http://localhost:5180/app` redirect на operator home; client на `/`.

---

## 3. Общие принципы

### Responsive layout

- Client: форма и главная — mobile-first.
- Company: sidebar collapses to drawer на узких экранах.

### Визуальное разделение

- Разные layout components, разные цветовые токены (client vs company).
- Запрет показывать operational nav на client pages и наоборот.

### Auth в MVP

- Без production auth: role selector / mock login только в company contour.
- Client contour — анонимный доступ к submit и status.

### Расширяемость

- Позже: SSO только для company contour.
- Client может остаться публичным.
- Возможность вынести client в отдельный Vite entry или subdomain без изменения API.

---

## 4. Миграция с текущего MVP (чеклист следующего milestone)

1. Ввести `ClientLayout` и `CompanyLayout`.
2. Перенести маршруты в два route trees.
3. Заменить `product_area` input на select «К чему относится отзыв?» + mapping layer.
4. Новая client home вместо operational `HomePage` links.
5. Убрать role selector из client header; оставить в company layout.
6. Обновить `AccessDeniedPage` — разные тексты для client vs company deep links.
7. Smoke: client не видит `/prompts` даже по URL (redirect / access denied).
8. Документировать brand assets в `docs/screenshots/`.

---

## 5. Вне scope Task 012

- Redesign / новый UI kit.
- Смена React структуры папок (можно минимально).
- Backend API changes.
- Auth, RBAC expansion.

---

## Связанные документы

- SOT §4.6 — `Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md`
- [User guide](../user_guide.md)
- [Demo scenarios](../demo_scenarios.md)
- [README](../../README.md)
