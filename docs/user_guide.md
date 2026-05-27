# User Guide — Review Flow

Обзор потоков по **интерфейсным контурам**. Целевая визуальная модель — [ui_contour_separation_plan.md](architecture/ui_contour_separation_plan.md). Текущий MVP использует одно приложение с переключателем роли в шапке.

---

## Client flow (клиентский контур)

**Аудитория:** клиент компании (покупатель, пользователь сервиса).  
**Цель:** оставить отзыв и узнать статус без доступа к внутренним инструментам.

### Точки входа (текущий MVP)

- http://localhost:5180/ — главная страница сайта компании
- http://localhost:5180/review — форма отзыва
- http://localhost:5180/review/status — форма поиска статуса
- http://localhost:5180/review/status/{request_number} — статус обращения

### Шаги

1. Открыть **Оставить отзыв** (`/review`)
2. Заполнить имя, **номер заказа**, оценку (опционально), текст отзыва и выбрать **тему обращения** (Доставка, Оплата, …)
3. Отправить форму → сохранить **номер обращения** (формат `45821_0001`)
4. Открыть **Проверить статус** — этапы обработки и финальный ответ после публикации оператором

### Ограничения для клиента

- Не видит AI draft до approve
- Нет доступа к `/operator/*`, `/prompts`, `/analytics`, `/admin/*`, `/settings/*`

### Целевой UX (следующий milestone)

- Отдельная главная страница компании с branding, header/footer
- Никаких ссылок на operational UI

---

## Operator flow (контур компании — оператор)

**Аудитория:** оператор поддержки.  
**Рабочее место:** internal company workspace (очередь отзывов).

### Подготовка

1. В шапке выбрать роль **Оператор** (MVP)
2. Открыть **Оператор** → `/operator/reviews`

### Шаги

1. Выбрать отзыв в списке (фильтр по `moderation_status` опционально)
2. Изучить классификацию, типовую формулировку, шаблон, AI draft
3. Отредактировать финальный ответ
4. **Approve** — mock publication → клиент видит ответ на странице статуса
5. **Reject** / **Needs revision** — указать причину

### Ограничения

- Нет доступа к prompt management, analytics, admin knowledge base (роль operator)

---

## Administrator flow (контур компании — администратор)

**Аудитория:** администратор / методолог.  
**Рабочее место:** тот же company workspace, расширенная навигация.

### Подготовка

1. В шапке выбрать роль **Администратор**
2. Использовать пункты меню: Prompts, Evaluation, Analytics, Logs, AI settings, Knowledge base

### Prompt management

1. `/prompts` — версии по `prompt_key`
2. Создать версию → **Activate**
3. Новые отзывы используют активный prompt из БД

### Evaluation

1. `/evaluation` — case по UUID отзыва
2. Score 1–5 и комментарий

### Analytics & logs

1. `/analytics` — сводные метрики
2. `/logs` — timeline, фильтры `event_type`, `review_id`

### AI provider settings

1. `/settings/ai-providers` — active provider, fallback, test (секреты только в `.env`)

### Knowledge base

- `/admin/phrases`, `/admin/templates`, `/admin/scenarios`, `/admin/sentiments`

---

## Навигация между контурами (MVP vs план)

| Действие | MVP | План |
|----------|-----|------|
| Клиент оставляет отзыв | `/review` | Customer site `/review` |
| Сотрудник модерирует | Role → Operator → `/operator/reviews` | Company workspace URL |
| Админ настраивает промпты | Role → Administrator → `/prompts` | Company sidebar |

Прямой URL на чужой контур без роли → `/access-denied` с пояснением.

---

## Troubleshooting basics

| Проблема | Решение |
|----------|---------|
| Backend не стартует | `docker compose logs backend`, проверить `DATABASE_URL` |
| Нет active prompt | `/prompts` → activate версию |
| AI ошибки | Проверить `/settings/ai-providers`, fallback mock |
| 403 на admin API | Роль **Администратор** в шапке |
| Пустая аналитика | Несколько тестовых отзывов через `/review` |

```bash
docker compose up --build -d
curl http://localhost:8700/health
```
