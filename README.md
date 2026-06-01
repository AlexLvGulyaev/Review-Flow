# Review Flow

**Review Flow** — демонстрационный MVP для обработки клиентских обращений, в котором AI используется **управляемо**: бизнес-решения фиксируются в базе типовых ситуаций, а не передаются модели «на усмотрение». Подробное соответствие исходному ТЗ зафиксировано в [отчёте о соответствии ТЗ](docs/TZ_COMPLIANCE_REPORT.md).

Проект показывает полный цикл: от обращения клиента до публикации ответа и последующего **обучения базы знаний** через реальные кейсы операторов.

## Быстрая навигация

### Для знакомства с проектом

- [Отчёт о соответствии ТЗ](docs/TZ_COMPLIANCE_REPORT.md)
- [Руководство пользователя](docs/USER_GUIDE.md)
- [Руководство по развёртыванию](docs/DEPLOYMENT.md)

### Для изучения архитектуры

- [Архитектура](docs/ARCHITECTURE.md)
- [Controlled Hybrid](docs/CONTROLLED_HYBRID.md)
- [Обоснование выбора Controlled Hybrid (PDF)](docs/architecture/controlled_hybrid_architecture_rationale.pdf)

### Для развития проекта

- [Дорожная карта](docs/ROADMAP.md)
- [История проекта](docs/PROJECT_HISTORY.md)
- [Implementation plan](IMPLEMENTATION_PLAN.md)
- [Архитектурные и продуктовые решения (SOT)](Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md)

---

## Проблема

Три типичных крайности не дают устойчивой операционной модели:

| Подход | Ограничение |
|--------|-------------|
| **Ручная обработка** | плохо масштабируется; растут издержки; качество зависит от отдельных сотрудников |
| **Полностью автоматический LLM** | решения плохо контролируются и воспроизводятся; сложно аудировать |
| **«Модель решает за бизнес»** | организация не может формально делегировать принятие решений black-box модели |

Review Flow ищет баланс: **автоматизация там, где она прозрачна**, и **человек там, где нужна ответственность**.

---

## Почему Controlled Hybrid

**Controlled Hybrid** — архитектура, в которой:

- **типовая ситуация (Response Case)** — Source of Truth бизнес-решения (политика ответа, утверждённая основа текста);
- **retrieval** подбирает наиболее подходящую типовую ситуацию по примерам обращений;
- **confidence** рассчитывается системой на основе результата retrieval;
- **LLM не выбирает типовую ситуацию и не принимает бизнес-решение** — только адаптирует текст ответа в рамках `response_policy` / `approved_response_text`;
- **оператор** остаётся Human-in-the-Loop: подтверждает, меняет или эскалирует;
- **администратор** развивает базу знаний: типовые ситуации, retrieval-примеры, кандидаты.

Чем отличается от типичного LLM-first: решение не «рождается в промпте», а **находит опору в управляемой KB** и правилах backend.

Подробное обоснование: [Обоснование выбора Controlled Hybrid](docs/architecture/controlled_hybrid_architecture_rationale.pdf) · [Controlled Hybrid](docs/CONTROLLED_HYBRID.md) · [Архитектура](docs/ARCHITECTURE.md)

---

## Controlled Hybrid Learning Loop

Главный сценарий проекта — **замыкание цикла обучения**: операционный сигнал превращается в новое знание, которое улучшает последующий retrieval.

```mermaid
flowchart LR
  A["Обращение клиента"] --> B["Retrieval:<br/>низкая уверенность<br/>или неверная ТС"]
  B --> C["Оператор:<br/>«ни одна ТС не подходит»"]
  C --> D["Candidate<br/>(кандидат)"]
  D --> E["Администратор:<br/>новая ТС или<br/>присоединение к ТС"]
  E --> F["Candidate →<br/>retrieval-пример"]
  F --> G["Похожее обращение:<br/>высокая уверенность,<br/>автоматический подбор"]
```

**Шаги в системе:**

1. Клиент создаёт обращение.
2. Retrieval предлагает неподходящую или недостаточно уверенную типовую ситуацию.
3. Оператор фиксирует: «ни одна типовая ситуация не подходит», создаёт **candidate**.
4. Администратор обрабатывает кандидата: создаёт новую типовую ситуацию или присоединяет к существующей.
5. Обращение-кандидат становится **retrieval-примером**.
6. Следующее похожее обращение распознаётся с **высокой уверенностью** — без смены бизнес-логики «вручную» на каждый раз.

Скриншоты этого сценария — в разделе [Демонстрация системы](#демонстрация-системы) (оператор → администратор).

---

## Демонстрация системы

Ниже — сквозная история по ролям. Все изображения из [`docs/screenshots/`](docs/screenshots/).

### Клиент

Публичный контур: клиент не видит внутренних инструментов, confidence и типовых ситуаций.

**Главная** — вход в сценарий «оставить обращение» / «проверить статус».

![Клиент: главная](docs/screenshots/cli-main.png)

**Создание обращения** — форма и отправка; система выдаёт номер обращения (`NL-…`).

![Клиент: форма обращения](docs/screenshots/cli-new-rev.png)
![Клиент: обращение отправлено](docs/screenshots/cli-new-rev-send.png)

**Отслеживание статуса** — этапы обработки и опубликованный ответ после действий оператора.

![Клиент: статус](docs/screenshots/cli-new-rev-status.png)
![Клиент: опубликованный ответ](docs/screenshots/cli-new-rev-completed.png)

---

### Оператор

Рабочее место: очередь обращений, предложенная типовая ситуация, confidence, правка и публикация ответа.

**Карточка обращения** — human-in-the-loop: редактирование ответа перед публикацией.

![Оператор: карточка обращения](docs/screenshots/oper-rev-after-accept.png)

**Confidence и альтернативы** — retrieval предлагает ТС; при низкой уверенности оператор видит Top-N и принимает решение осознанно.

![Оператор: низкая уверенность и альтернативы](docs/screenshots/oper-rev-low.png)

**Запуск learning loop** — «нет подходящей ТС» → candidate.

![Оператор: сценарий новой ТС](docs/screenshots/oper-rev-for-newTS.png)
![Оператор: описание candidate](docs/screenshots/oper-comment-for-newTS.png)

**Результат после расширения KB** — похожее обращение обрабатывается с высокой уверенностью.

![Оператор: после создания новой ТС](docs/screenshots/oper-rev-after-create-newTS.png)

Вход в контур компании (выбор роли): [`oper-logun.png`](docs/screenshots/oper-logun.png)

---

### Администратор

Управление базой знаний Controlled Hybrid.

**Типовые ситуации (Response Cases)** — SOT бизнес-решений: политика, утверждённый текст, пороги.

![Админ: список типовых ситуаций](docs/screenshots/adm-ts-list.png)

**Кандидаты** — очередь предложений от операторов.

![Админ: новый кандидат](docs/screenshots/adm-ts-cand-new.png)

**Создание новой типовой ситуации** — кандидат превращается в элемент KB.

![Админ: создание ТС](docs/screenshots/adm-ts-new-create.png)
![Админ: ТС создана](docs/screenshots/adm-ts-new-created.png)

**Retrieval-пример** — candidate добавлен к типовой ситуации; последующий подбор улучшается.

![Админ: candidate как пример](docs/screenshots/adm-ts-after-add-cand-sample.png)

---

### Руководитель

Отчётность по обращениям и качеству обработки (демо-витрина MVP).

![Отчёт: клиентские обращения](docs/screenshots/adm-repcli.png)
![Отчёт: Controlled Hybrid](docs/screenshots/adm-repCH.png)
![Бизнес-сводка](docs/screenshots/adm-repbus.png)

---

### Настройка системы

Системные параметры и AI-провайдеры (в демо возможен `mock`-провайдер).

![Системные настройки](docs/screenshots/adm-sys.png)

Полная галерея с пояснениями: [Галерея экранов](docs/SCREENSHOTS.md)

---

## Архитектура

```mermaid
flowchart TB
  subgraph client["Клиентский контур"]
    C[Клиент]
  end

  subgraph api["Backend"]
    API[FastAPI API]
    CH[Controlled Hybrid pipeline]
    RET[Retrieval по примерам]
    CONF[Confidence]
    RC[(Response Cases)]
    LLM[LLM: адаптация текста<br/>в рамках policy]
  end

  subgraph company["Контур компании"]
    OP[Оператор:<br/>подтверждение / override / publish]
    ADM[Администратор:<br/>ТС, примеры, кандидаты]
  end

  C -->|POST обращение| API
  API --> CH
  CH --> RET
  RET --> RC
  CH --> CONF
  CH --> LLM
  CH --> OP
  ADM --> RC
  OP -->|final_response| C
```

**Семантика потока (реализовано при `CH_PIPELINE_ENABLED=true`):**

1. Клиент создаёт обращение → API сохраняет в PostgreSQL.
2. Retrieval ранжирует типовые ситуации по примерам; система вычисляет confidence.
3. Draft формируется из policy и утверждённого текста выбранной ТС; LLM **адаптирует формулировку**, не выбирая ситуацию.
4. Оператор подтверждает или меняет ТС, редактирует ответ, публикует.
5. Администратор поддерживает KB и обрабатывает candidates.

Legacy path (template-guided, для регрессии): `CH_PIPELINE_ENABLED=false` — см. [SOT](Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md) §3.3.

---

## Основные возможности

- Клиентский портал: обращение, номер, статус, опубликованный ответ
- Controlled Hybrid pipeline: retrieval, confidence, decision, bounded LLM adaptation
- Операторская консоль: очередь, override, candidate, публикация
- Админ KB: CRUD типовых ситуаций и retrieval-примеров
- Candidate learning loop (демонстрационный end-to-end сценарий)
- Отчётность и operational logs
- Настройки AI-провайдеров и системные параметры
- Промпты, evaluation, legacy KB (параллельно CH, учебный контур)

---

## Технологический стек

| Слой | Технология |
|------|------------|
| Frontend | React, Vite, React Router |
| Backend | FastAPI, Python 3.12, SQLAlchemy |
| Database | PostgreSQL 16 |
| AI | OpenAI-compatible API (в демо — `mock`) |
| Deploy | Docker Compose |

---

## Быстрый запуск

```bash
cp .env.example .env
docker compose up --build
```

После запуска:

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost:5180 |
| Backend API | http://localhost:8700 |
| Health | http://localhost:8700/health |

Подробные инструкции: [Запуск и деплой](docs/DEPLOYMENT.md)

---

## Документация

- [Отчёт о соответствии исходному ТЗ](docs/TZ_COMPLIANCE_REPORT.md)
- [Архитектура](docs/ARCHITECTURE.md)
- [Controlled Hybrid](docs/CONTROLLED_HYBRID.md)
- [Руководство пользователя](docs/USER_GUIDE.md)
- [Галерея экранов](docs/SCREENSHOTS.md)
- [История проекта](docs/PROJECT_HISTORY.md)
- [Архитектурные и продуктовые решения (SOT)](Архитектурные_и_продуктовые_решения_проекта_SOT_v4.md)
- [Implementation plan](IMPLEMENTATION_PLAN.md)

---

## Ограничения демо

- **Демонстрационный MVP**: упрощённые сценарии; возможен `mock`-провайдер LLM (заглушка текста, не полноценная адаптация) — см. [CH pipeline forensics](docs/architecture/ch_pipeline_forensics_after_ch_integration.md).
- Роли переключаются в одном приложении ([план разделения UI-контуров](docs/architecture/ui_contour_separation_plan.md)).
- База типовых ситуаций — учебный seed для демонстрации retrieval и learning loop.
