# Deployment Validation Report: Review Flow — публичное размещение

**Кейс:** `review-flow`  
**Дата Validation:** 2026-08-09  
**Окружение:** Production-like размещение на VPS через центральный Traefik.  
**Источник инструкций:** [`docs/DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md), раздел «Развёртывание на VPS через центральный Traefik».  
**Статус Validation:** ✅ PASS

---

## Краткая сводка

Review Flow развёрнут на публичных HTTPS-адресах через центральный Traefik. Все три субдомена получили валидные Let’s Encrypt сертификаты. Проведены smoke-тесты через интернет.

---

## Публичные адреса

| Сервис | URL |
|--------|-----|
| Web UI (клиент + оператор) | https://review-flow.alex-n8n.site |
| Admin Console | https://review-flow-admin.alex-n8n.site |
| Backend API | https://review-flow-api.alex-n8n.site |
| Health | https://review-flow-api.alex-n8n.site/health |

---

## Результаты проверок

| № | Проверка | Команда / Действие | Ожидаемый результат | Фактический результат | Статус |
|---|----------|---------------------|---------------------|-----------------------|--------|
| 1 | DNS A-записи | `host review-flow.alex-n8n.site` и т.д. | Все три субдомена резолвятся на IP VPS | `147.45.162.107` для всех трёх доменов | PASS |
| 2 | Let’s Encrypt сертификаты | `openssl s_client -connect ...` | `subject=CN = <domain>`, `issuer = Let's Encrypt` | Валидные сертификаты Let's Encrypt для всех трёх доменов | PASS |
| 3 | Backend health | `curl https://review-flow-api.alex-n8n.site/health` | `{"status":"ok","database":"connected"}` | `{"status":"ok","database":"connected"}` | PASS |
| 4 | Web UI доступен | `curl -s -o /dev/null -w "%{http_code}" https://review-flow.alex-n8n.site/` | HTTP 200 | `200` | PASS |
| 5 | Admin Console доступен | `curl -s -o /dev/null -w "%{http_code}" https://review-flow-admin.alex-n8n.site/` | HTTP 200 | `200` | PASS |
| 6 | Frontend HTML title | `curl -s https://review-flow.alex-n8n.site/ | grep '<title>'` | `<title>Review Flow</title>` | `<title>Review Flow</title>` | PASS |
| 7 | Создание обращения через интернет | `POST https://review-flow-api.alex-n8n.site/api/reviews` | `review_id`, `request_number` | `NL-00799999-001` создан | PASS |
| 8 | Проверка статуса через интернет | `GET https://review-flow-api.alex-n8n.site/api/reviews/{id}/status?email=...` | Статус `pending_review` и данные обращения | Корректный статус и данные | PASS |
| 9 | Операторская очередь | `GET https://review-flow-api.alex-n8n.site/api/operator/reviews` с `X-Role: operator` | Очередь содержит созданное обращение | Обращение в очереди | PASS |
| 10 | Административный справочник | `GET https://review-flow-api.alex-n8n.site/api/admin/scenarios` с `X-Role: administrator` | JSON со списком сценариев | Сценарии возвращены | PASS |

---

## Архитектура размещения

```text
Интернет
   │
   ▼
Traefik (центральный reverse proxy)
   │ 443 / Let's Encrypt
   ├─→ review-flow.alex-n8n.site → review-flow-apl-web-ui:80
   ├─→ review-flow-admin.alex-n8n.site → review-flow-apl-admin-console:80
   └─→ review-flow-api.alex-n8n.site → review-flow-apl-backend:8700

Review Flow Compose (docker-compose.prod.yml)
   ├─ review-flow-apl-postgres:5432
   ├─ review-flow-apl-backend:8700
   ├─ review-flow-apl-web-ui:80
   └─ review-flow-apl-admin-console:80
```

Все сервисы Review Flow подключены к внутренней сети `review-flow-apl` и к внешней сети `n8n_default` (центральный Traefik).

---

## Проблемы, выявленные и устранённые

| Проблема | Причина | Исправление | Статус |
|----------|---------|-------------|--------|
| Self-signed сертификат Traefik вместо Let’s Encrypt | Перезапуск Traefik произошёл раньше пропагации DNS; ACME-валидация фейлилась с NXDOMAIN | Дождались пропагации всех A-записей, перезапустили Traefik ещё раз — Let's Encrypt выдал валидные сертификаты | ✅ Устранено |

---

## Вывод

Публичное размещение Review Flow воспроизводимо по документации. Все три HTTPS-эндпоинта работают с валидными Let’s Encrypt сертификатами. Сквозной сценарий (клиент → API → оператор → админ) протестирован через интернет.

---

**Дата:** 2026-08-09
