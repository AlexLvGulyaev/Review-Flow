# Review Flow — каталог медиаматериалов

**Проект:** review-flow  
**Дата:** 2026-09-01  
**Статус:** Актуален (скриншоты UI — в ожидании пересъёмки, см. конец раздела 2)

---

## 1. Правила нейминга

Формат: `RF_{CATEGORY}_{DESCRIPTION}.{ext}`

| Категория | Назначение | Пример |
|-----------|------------|--------|
| `cli` | Клиентский портал | `RF_cli_new_review.png` |
| `oper` | Консоль оператора | `RF_oper_review_low_confidence.png` |
| `adm` | Консоль администратора / отчёты / настройки | `RF_adm_response_cases_list.png` |
| `arch` | Архитектурные схемы | `RF_architecture_mermaid.png` |
| `demo` | Демонстрационные GIF/видео | `RF_demo_walkthrough.gif` |
| `unused` | Файлы, не используемые в текущей документации | `RF_unused_adm_operapprove.png` |

---

## 2. Каталог изображений

| ID | Файл | Категория | Назначение | Используется в |
|----|------|-----------|------------|----------------|
| IMG-001 | `cli-main.png` | cli | Главная страница клиентского портала: точки входа «Оставить отзыв» и «Проверить статус обращения» | README, SYSTEM_DEMO, SCREENSHOTS |
| IMG-002 | `cli-new-rev.png` | cli | Форма создания обращения клиентом | README, SYSTEM_DEMO, USER_GUIDE, E2E_SCENARIOS, SCREENSHOTS |
| IMG-003 | `cli-new-rev-send.png` | cli | Подтверждение отправки и выдача номера обращения `NL-…` | README, SYSTEM_DEMO, USER_GUIDE, E2E_SCENARIOS, SCREENSHOTS |
| IMG-004 | `cli-new-rev-status.png` | cli | Проверка статуса обращения по номеру и email | README, SYSTEM_DEMO, USER_GUIDE, E2E_SCENARIOS, SCREENSHOTS |
| IMG-005 | `cli-new-rev-completed.png` | cli | Завершённое обращение с опубликованным ответом компании | README, SYSTEM_DEMO, USER_GUIDE, E2E_SCENARIOS, SCREENSHOTS |
| IMG-010 | `oper-logun.png` | oper | Вход в контур компании по Bearer-токену; кнопка demo-входа (только просмотр) | SYSTEM_DEMO, OPERATOR_GUIDE, SCREENSHOTS |
| IMG-011 | `oper-rev-after-accept.png` | oper | Карточка обращения после подтверждения типовой ситуации: редактирование финального ответа | README, SYSTEM_DEMO, OPERATOR_GUIDE, E2E_SCENARIOS, SCREENSHOTS |
| IMG-012 | `oper-rev-low.png` | oper | Низкая уверенность retrieval и список альтернативных типовых ситуаций | README, SYSTEM_DEMO, OPERATOR_GUIDE, E2E_SCENARIOS, CONTROLLED_HYBRID, SCREENSHOTS |
| IMG-013 | `oper-rev-for-newTS.png` | oper | Оператор инициирует эскалацию «Ни одна типовая ситуация не подходит» | README, SYSTEM_DEMO, OPERATOR_GUIDE, E2E_SCENARIOS, CONTROLLED_HYBRID, SCREENSHOTS |
| IMG-014 | `oper-comment-for-newTS.png` | oper | Комментарий оператора при создании кандидата новой типовой ситуации | README, SYSTEM_DEMO, OPERATOR_GUIDE, E2E_SCENARIOS, CONTROLLED_HYBRID, SCREENSHOTS |
| IMG-015 | `oper-rev-after-create-newTS.png` | oper | Похожее обращение после расширения базы знаний обрабатывается с высокой уверенностью | README, SYSTEM_DEMO, SCREENSHOTS |
| IMG-020 | `adm-ts-list.png` | adm | Список типовых ситуаций (Response Cases) — управляемая база знаний | README, SYSTEM_DEMO, ADMIN_GUIDE, CONTROLLED_HYBRID, SCREENSHOTS |
| IMG-021 | `adm-ts-upd.png` | adm | Редактирование типовой ситуации: код, название, policy, approved response, НСИ | SYSTEM_DEMO, ADMIN_GUIDE, SCREENSHOTS |
| IMG-022 | `adm-ts-cand-sample.png` | adm | Пример обращения в составе типовой ситуации | ADMIN_GUIDE, SCREENSHOTS |
| IMG-023 | `adm-ts-sample-upd.png` | adm | Обновление retrieval-примера в типовой ситуации | SCREENSHOTS |
| IMG-024 | `adm-ts-cand-new.png` | adm | Новый кандидат от оператора в очереди администратора | README, SYSTEM_DEMO, ADMIN_GUIDE, E2E_SCENARIOS, CONTROLLED_HYBRID, SCREENSHOTS |
| IMG-025 | `adm-ts-new-create.png` | adm | Создание новой типовой ситуации из кандидата | README, SYSTEM_DEMO, ADMIN_GUIDE, E2E_SCENARIOS, CONTROLLED_HYBRID, SCREENSHOTS |
| IMG-026 | `adm-ts-new-created.png` | adm | Созданная типовая ситуация в списке базы знаний | README, SYSTEM_DEMO, ADMIN_GUIDE, E2E_SCENARIOS, CONTROLLED_HYBRID, SCREENSHOTS |
| IMG-027 | `adm-ts-after-add-cand-sample.png` | adm | Кандидат добавлен как retrieval-пример к существующей типовой ситуации | README, SYSTEM_DEMO, ADMIN_GUIDE, E2E_SCENARIOS, CONTROLLED_HYBRID, SCREENSHOTS |
| IMG-030 | `adm-repcli.png` | adm | Отчёт «Обращения клиентов»: объём, обработка, средний рейтинг, динамика | README, SYSTEM_DEMO, ADMIN_GUIDE, E2E_SCENARIOS, SCREENSHOTS |
| IMG-031 | `adm-repbus.png` | adm | Бизнес-сводка: топ жалоб, предложений, благодарностей, новые темы | README, SYSTEM_DEMO, ADMIN_GUIDE, E2E_SCENARIOS, SCREENSHOTS |
| IMG-032 | `adm-repCH.png` | adm | Отчёт «Качество Controlled Hybrid»: coverage, override rate, low confidence | README, SYSTEM_DEMO, ADMIN_GUIDE, E2E_SCENARIOS, SCREENSHOTS |
| IMG-033 | `adm-sys.png` | adm | Системные настройки: AI-провайдеры, retrieval-параметры, промпты | SYSTEM_DEMO, ADMIN_GUIDE, SCREENSHOTS |
| IMG-040 | `RF_unused_adm-operapprove.png` | unused | **Не используется** в текущей документации — администратор/оператор одобряет обращение | — |
| IMG-041 | `RF_unused_cli-rev-for-newTS.png` | unused | **Не используется** в текущей документации — клиентское обращение для сценария новой ТС | — |
| IMG-042 | `RF_unused_oper-answer-for-newTS.png` | unused | **Не используется** в текущей документации — операторский ответ для сценария новой ТС | — |
| IMG-044 | `RF_portfolio_light.png` | adm | Портфельная обложка: интерфейс системы (светлая тема) | README, SCREENSHOTS (раздел 8) |
| IMG-045 | `RF_portfolio_dark.png` | adm | Портфельная обложка: интерфейс системы (тёмная тема) | ARCHITECTURE, SCREENSHOTS (раздел 8) |

**Планируемые к пересъёмке (решение владельца, 2026-09-01):** скриншоты экранов «Логи» (новый канон список↔детализация + таймлайн pipeline), «Журнал аудита», «Обозначения» (`/legend`), а также обновление снимков, снятых до тёмной/светлой темы консоли (все adm-*/oper-* датируются 31.05–01.06, cli-* — 12.08). До пересъёмки считаются условно устаревшими по оформлению UI.

---

## 3. Единый демо-контекст для скриншотов

| Параметр | Значение |
|---|---|
| Проект | Review Flow |
| Демо-компания | `Northline` |
| Вход оператора | `OPS_OPERATOR_TOKEN` (Bearer) |
| Вход администратора | `OPS_ADMIN_TOKEN` (Bearer) |
| Demo-вход (только просмотр) | кнопка «Войти в демо-режим» (`VITE_OPS_DEMO_TOKEN`) |
| Номер заказа в примерах | `NL-00999999` |
| Формат номера обращения | `NL-00001234` |
| Активный AI-провайдер в demo | `openai` (gpt-4o-mini), fallback `gigachat`; `mock` — опциональная заглушка |
| LLM-провайдер для адаптации | OpenAI-compatible / GigaChat / ProxyAPI |
| Диапазон аналитики в отчётах | `2026-08-01 – 2026-08-09` |

---

## 4. Правила добавления новых скриншотов

1. Использовать схему нейминга `RF_{CATEGORY}_{DESCRIPTION}.png`.
2. Добавить строку в таблицу каталога.
3. Указать, в каких документах используется.
4. Не добавлять изображения без явного назначения.
5. Архитектурные схемы предпочтительно оформлять в Mermaid внутри Markdown; скриншоты UI/API — в этом каталоге.
6. Если файл не используется в документации, добавить префикс `RF_unused_` и пометить в каталоге.
