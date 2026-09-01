# 2026-08-31 — Research: Логирование, Аудит, Выгрузка (RF флагман №3)

**Задание владельца:** «RF у нас флагман номер 3. Довести до высокого стандарта APL: 1. Логирование 2. Аудит 3. Выгрузка того и другого. Страшное нечто "Логи" — забыть как страшный сон, сделать по-нормальному. Референс — AIC, можно весь UI оттуда перетащить.»

**Статус:** исследование завершено. Имплементация — после утверждения владельцем.

---

## 1. Что есть в RF сейчас

### 1.1 Хранение — одна таблица на всё

`operational_logs` (`backend/app/models/entities.py`, OperationalLog):

| Поле | Тип | |
|---|---|---|
| event_type | String(64) | код события |
| entity_type / entity_id | String/String | сейчас только `review` |
| prompt_version_id | FK | |
| model_name, latency_ms | | AI-телеметрия |
| status, error_message | | |
| metadata | JSONB | |
| created_at | | |

**Критический пробел для аудита: нет полей актора.** Ни `user_id`, ни `user_name`, ни `role`, ни `ip_address`. Запись «moderation_approved» не отвечает на вопрос «кто одобрил».

### 1.2 Покрытие событий — широкое (плюс)

~60 типов событий через `log_event()` (`services/operational_log.py`), 90+ точек вызова в 20 модулях:
- решения оператора: `moderation_approved / rejected / revision_requested`, `operator_case_confirmed / override / escalated`, `case_candidate_*`;
- действия админа: `admin_phrase/template/scenario/sentiment_created/updated`, `response_case_created/updated`, `prompt_version_created/activated`, `ch_runtime_settings_updated`, `ai_provider_*`;
- безопасность: `role_access_denied`;
- служебное: просмотр логов и экспорт отчётов сами себя логируют.

Вывод: **события пишутся почти со всех мутаций — не хватает «кто» и «для кого это читается/выгружается»**.

### 1.3 API — одно окно, узкое

`GET /api/logs` (`api/logs.py`, admin-only): фильтры `event_type`, `review_id`, `limit` 1–500. Нет offset/пагинации, нет диапазона дат, нет поиска, нет detail-endpoint, нет экспорта.

### 1.4 UI — «страшное нечто»

`frontend/src/pages/LogsPage.jsx`: страница «Observability — Logs» на английском, не в каноне RF/AIC-консоли; 100 событий одним куском, клиентский поиск, нет пагинации, нет экспорта; детали справа, таймлайн цепочки. Владелец прав: страница под снос.

### 1.5 Выгрузка

Инфраструктура есть и переиспользуется: `services/report_export.py` — экспорт отчётов в **csv / xlsx / pdf** (EXPORT_HANDLERS, Content-Disposition, `report_exported` в лог). На логи/аудит не распространён.

---

## 2. Референс AIC (что перетаскиваем)

AIC разделяет **два хранилища** — это главный архитектурный урок:

| | `audit_logs` (аудит) | `operational_logs` (телеметрия) |
|---|---|---|
| Что | действия людей | технический ход работы |
| Поля | **user_id, user_name, user_role, ip_address**, action, resource_type, resource_id, details JSON | session, role, intent, status, trace, error |
| Индексы | action, resource_type, user_id | event/session |
| Запись | `logger.log_audit(...)` из каждой мутации admin-API (у AIC запрос несёт пользователя) | пайплайн |

API AIC (`/api/v1/admin/{audit|operational-logs}`): список (limit/offset, date_from/to, фильтры, total) + `GET /{id}` + `export` (CSV blob, учитывает фильтры).

UI AIC — `components/AuditLog.jsx` (528 строк) и `OperationalLogs.jsx` (856), полностью в каноне:
- слева `ai-card w-[420px]`: окно времени 24h/7d/30d/все, фильтры (action, resource_type, поиск по пользователю), пагинация «← Назад · Страница N из M · Вперёд →» над чертой, «Всего N» + «Сброс», список айтемов (PAGE_SIZE 7, selected — --ai-primary border + light bg);
- справа «ДЕТАЛИЗАЦИЯ СОБЫТИЯ»: Параметры акции / Параметры пользователя (id, имя, ip, дата) / Детали-JSON / Технический снимок JSON;
- кнопки «Экспорт CSV» + «Обновить» в шапке;
- клавиатурная навигация ↑/↓ с перелистыванием страниц.

---

## 3. Разрыв RF → AIC-стандарт

| # | Разрыв | Следствие |
|---|---|---|
| 1 | Нет `audit_logs` с актором | «Кто одобрил/удалил» не ответить |
| 2 | Аудит и телеметрия в одной куче | фильтрация/выгрузка аудита невозможна семантически |
| 3 | Нет offset/дат/total в API | нельзя постранично, нельзя «за 30 дней» |
| 4 | Нет detail-endpoint (GET /api/logs/{id}) | UI тянет всё целиком |
| 5 | Нет экспорта логов/аудита | «выгрузка того и другого» не выполнена |
| 6 | UI-страница вне канона, на английском | под снос, заменить на канонные экраны |
| 7 | Аутентификация — только role-токены (admin/operator/demo), нет именных пользователей | в аудите актор = роль. Именные учётки — отдельное решение владельца |

---

## 4. Предлагаемый план (4 фазы, ~2 рабочих дня)

**Фаза A — Аудит (backend, ~4 ч).** Alembic-миграция: таблица `audit_logs` по AIC-схеме (user_id nullable, user_role, action, resource_type, resource_id, ip_address, details JSON, created_at; индексы). Расширить `log_event()`/создать `log_audit()`, писать из мутационных роутов: operator (approve/reject/revision/escalate/override/confirm/candidate), admin CRUD (phrases/templates/scenarios/sentiments/response-cases), prompt-versions, ch-runtime, ai-providers, demo-bypass, role_access_denied. `user_role` из `ops_identity`; `ip_address` из Request. (Отдельно от логов `operational_logs` не трогаем.)

**Фаза B — API + выгрузка (~3 ч).**
- `GET /api/audit` (action, resource_type, role, user_id, date_from/to, limit/offset, total) + `GET /api/audit/{id}` + `POST /api/audit/export` (csv/xlsx/pdf через report_export.py).
- Расширить `GET /api/logs`: offset, date_from/to, total, поиск по message; `GET /api/logs/{id}`; `POST /api/logs/export`.

**Фаза C — UI (~5 ч).** Страницу «Логи» — под снос. Два канонных экрана (перенос `AuditLog.jsx` / `OperationalLogs.jsx` на RF-токены и русские лейблы, чип-контракты для action-категорий):
1. **«Журнал аудита»** — как AIC: 420px слева, 24h/7d/30d/все, фильтры action/resource_type/роль, пагинация, «Всего N», Экспорт CSV, детализация справа с параметрами акции/пользователя и JSON-метаданными.
2. **«Операционные логи»** — телеметрия пайплайна: окно времени, event_type/status/model, latency-пиллы, detail с metadata; экспорт.
- Навигация: пункт «Логи» заменить на «Аудит» и «Логи» (или «Наблюдаемость» — выбор владельца).

**Фаза D — Документы + деплой (~1.5 ч).** API_CONTRACT (новые эндпоинты), ADMIN_GUIDE (назначение аудита vs логов, экспорт), PROJECT_STATE; сборка, деплой, puppeteer-проба на живом инстансе (CT). Миграция → DEPLOYMENT_GUIDE актуализировать (шаг apply-migrations). Deployment Validation — при следующих изменениях процесса; коммит — только по явной команде.

---

## 5. Вопросы владельцу (архитектурные неоднозначности — не решаю сам)

1. **Актор аудита.** Сейчас роль (administrator/operator) — единственная идентичность. Варианты: (а) аудируем роль — быстро, честно относительно текущей аутентификации; (б) вводим именных пользователей (login + токен на человека) — правильнее, но это отдельная задача (таблица users, выдача токенов, UI профиля). Предлагаю (а) сейчас, схему оставить готовой к (б) — поля user_id/user_name уже в ней.
2. **Навигация/названия.** «Логи» → «Аудит» + «Логи»? или «Аудит» + «Наблюдаемость»?
3. **Форматы выгрузки.** AIC экспортирует только CSV; у RF инфраструктура даёт csv/xlsx/pdf. Предлагаю csv+xlsx для обоих журналов (pdf можно позже, для аудита csv достаточно — вопрос, нужен ли pdf).

## 6. Итог

Фундамент у RF лучше, чем выглядела страница «Логи»: события уже пишутся почти везде, экспортная инфраструктура готова. Не хватает трёх вещей: **отдельного журнала аудита с актором, полноценного API (пагинация/даты/detail/export) и канонного UI**. Всё три закрываются переносом проверенного AIC-решения за ~2 рабочих дня.