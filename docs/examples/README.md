# Review Flow — примеры API

**Проект:** review-flow  
**Дата:** 2026-08-09

Этот каталог содержит примеры запросов и ответов для ключевых endpoints Review Flow. Полный API-контракт описан в [`../API_CONTRACT.md`](../API_CONTRACT.md).

---

## Содержание

| Файл | Назначение |
|------|-----------|
| `review_create_request.json` | Тело запроса `POST /api/reviews` |
| `review_create_response.json` | Пример ответа `POST /api/reviews` |
| `review_status_response.json` | Пример ответа `GET /api/reviews/requests/{request_number}/status` |
| `operator_review_detail_response.json` | Пример операторской карточки обращения |
| `operator_approve_request.json` | Тело запроса `POST /api/operator/reviews/{review_id}/approve` |
| `operator_escalation_request.json` | Тело запроса `POST /api/operator/reviews/{review_id}/escalate` |
| `admin_response_case_create.json` | Тело запроса `POST /api/admin/response-cases` |
| `admin_candidate_approve.json` | Тело запроса `POST /api/admin/response-case-candidates/{candidate_id}/approve` |
| `curl_health.sh` | curl: проверка health |
| `curl_create_review.sh` | curl: создание обращения клиентом |
| `curl_operator_approve.sh` | curl: публикация ответа оператором |

---

## Единый демо-контекст

| Параметр | Значение |
|---|---|
| Базовый URL (локально) | `http://localhost:8700` |
| Базовый URL (demo) | `https://review-flow-api.alex-n8n.site` |
| Демо-компания | `Northline` |
| Номер заказа | `NL-00999999` |
| Клиент | `Иван Петров`, `ivan.petrov@example.com` |
| Оператор | `operator@northline.local` / `demo` (localStorage UI) |
| Администратор | `admin@northline.local` / `demo` (localStorage UI) |
| Роль в заголовке `X-Role` | `operator`, `administrator` |

---

## Примечания

- Все примеры используют синтетические данные.
- UUID в примерах — placeholder; замените на реальные ID из ответов API.
- Для ролевого доступа через UI используются demo-входы; для API-запросов указывайте заголовок `X-Role`.
- Для production-развёртывания используйте HTTPS-URL из [`../DEPLOYMENT_GUIDE.md`](../DEPLOYMENT_GUIDE.md).
