# Demo Scenarios — Review Flow

Сценарии для демонстрации и сдачи проекта.  
Архитектура контуров: [ui_contour_separation_plan.md](architecture/ui_contour_separation_plan.md).

---

## Contour overview (demo narrative)

При презентации разделяйте два мира:

1. **Клиентский контур** — «сайт компании», куда заходит покупатель.
2. **Контур компании** — «внутренний кабинет», куда заходят оператор и администратор.

В MVP оба контура на одном origin (`localhost:5180`), но визуально разделены:

- клиентский сайт: `/`, `/review`, `/review/status/:id`
- клиентский сайт: `/`, `/review`, `/review/status`, `/review/status/:requestNumber`
- рабочее пространство компании: `/company` (entry) + internal routes

### Customer-facing точка входа

- Показать: пользователь открывает **только** `/review` (в будущем — главную с CTA).
- Не показывать клиенту `/operator/reviews` или `/prompts`.
- После submit — ссылка на `/review/status/{id}`.
- После submit — ссылка на `/review/status/{requestNumber}`.

### Навигация между контурами

| Роль в шапке | Видимые разделы | Скрыто |
|--------------|-----------------|--------|
| Клиент | Отзыв | Operator, Admin, Analytics, … |
| Оператор | Отзыв + Оператор | Prompts, Admin KB, AI settings |
| Администратор | Отзыв + Admin tools | Очередь оператора (если не operator) |

Попытка открыть `/prompts` с ролью «Клиент» → `/access-denied`.

---

## 1. Client review submission (клиентский контур)

1. Открыть http://localhost:5180/ (клиентский сайт)
2. Нажать CTA «Оставить отзыв» или открыть http://localhost:5180/review
3. Заполнить форму (например: жалоба на доставку, rating 2)  
   - тема обращения: «Доставка»
4. Отправить → номер обращения (`45821_0001`) и ссылка на статус

**Ожидание:** `pending_review`, draft в БД, клиент не видит draft.

---

## 2. AI classification

1. Текст «опять задержали доставку»
2. `/logs` (роль **Администратор**): `phrase_matching_completed`, `classification_completed`
3. `classification_source=phrase_match` при совпадении с seed

---

## 3. Operator moderation (контур компании)

1. Перейти в рабочее пространство: http://localhost:5180/company
2. В левом меню открыть «Очередь отзывов» (или напрямую `/operator/reviews`)
3. Выбрать отзыв → **Approve / Mock publish**

---

## 4. Mock publication (клиентский контур)

1. Роль **Клиент**
2. `/review/status/{requestNumber}`
3. `published`, виден final response, draft скрыт

---

## 5. Prompt version activation (админ)

1. Роль **Администратор** → `/prompts`
2. Новая версия → Activate
3. Новый отзыв → `generation_metadata` с новой версией

---

## 6. Evaluation case scoring (админ)

1. `/evaluation` → case → score 1–5

---

## 7. Analytics overview (админ)

1. `/analytics` — карточки и распределения

---

## 8. Operational logs review (админ)

1. `/logs` — фильтры, latency_ms, metadata

---

## 9. AI provider settings (админ)

1. `/settings/ai-providers`
2. Test / activate provider (секреты в `.env` только)

---

## 10. Knowledge base (админ)

1. `/admin/phrases` — создать/изменить фразу
2. Отзыв с совпадающим текстом → phrase match в логах

---

## Demo script (5 минут, по контурам)

1. **Клиент:** submit review → status page (processing)
2. **Компания / оператор:** approve в очереди
3. **Клиент:** refresh status → published answer
4. **Компания / админ:** analytics + logs + один пункт AI settings

---

## Quick API smoke test

```bash
curl http://localhost:8700/health
curl -H "X-Role: administrator" http://localhost:8700/api/analytics/overview
curl -H "X-Role: administrator" "http://localhost:8700/api/logs?limit=10"
```
