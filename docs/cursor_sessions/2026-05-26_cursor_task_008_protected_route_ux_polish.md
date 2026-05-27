# Session log: Cursor Task 008 — ProtectedRoute UX polish

## Исходный промпт (полный текст)

# Cursor Task 008 — ProtectedRoute UX polish after UI smoke test

## Контекст

Проект: `review-flow`.

После UI smoke test найден небольшой UX-хвост:

```text
ProtectedRoute redirect на "/" при доступе к чужому контуру работает,
но пользователь не получает понятного пояснения.
```

Это НЕ новый milestone и НЕ новая функциональность платформы.
Это короткий bugfix/polish pass по результатам smoke test.

---

# Цель

Сделать поведение role guard понятным:

- при прямом переходе на запрещённую страницу пользователь должен видеть причину;
- навигация не должна молча возвращать на `/`;
- role separation должна оставаться лёгкой, без production auth.

---

# Ограничения

НЕ делать:

- полноценную auth system;
- login/password;
- JWT;
- RBAC matrix;
- users table;
- redesign;
- новые admin features;
- новые analytics/evaluation функции;
- Playwright suite в этом шаге.

Разрешено:

- добавить понятное сообщение при access denied;
- добавить небольшую AccessDenied page/state;
- сохранить attempted path, если это просто;
- поправить навигацию/ProtectedRoute;
- добавить небольшой manual verification.

---

# 1. Проверить текущую реализацию

Найти:

- `ProtectedRoute`
- role selector / role storage
- route definitions
- redirects для forbidden routes

Понять, как сейчас происходит redirect.

---

# 2. Реализовать понятное поведение

Допустимые варианты:

## Вариант А — AccessDenied page

Создать страницу:

```text
/access-denied
```

Показывать:

- текущую роль;
- требуемую роль/контур;
- краткое пояснение;
- ссылку на home;
- ссылку/контрол для смены роли, если он уже существует.

## Вариант Б — Home notice

При redirect на `/` передавать state:

```text
accessDenied: true
requiredRole: ...
attemptedPath: ...
```

И показывать notice на HomePage.

---

# Рекомендуемый вариант

Предпочтительно Вариант А:

```text
/access-denied
```

Он проще для тестирования и понятнее для пользователя.

---

# 3. Role guard requirements

Проверить:

## Client role

При переходе на:

```text
/operator/reviews
/prompts
/evaluation
/analytics
/logs
/admin/phrases
/admin/templates
/admin/scenarios
/admin/sentiments
```

должен быть понятный отказ.

## Operator role

При переходе на admin pages должен быть понятный отказ.

## Administrator role

Должен иметь доступ к admin pages.

---

# 4. Operational log

Если уже есть `role_access_denied`, убедиться, что событие пишется при отказе.

Если лог уже пишется backend-only, не усложнять frontend.

Не добавлять тяжёлую audit-систему.

---

# 5. UX copy

Текст должен быть простой, например:

```text
Доступ ограничен

Текущая роль: operator
Для этой страницы требуется роль: administrator

Выберите подходящую роль или вернитесь на главную страницу.
```

---

# 6. Verification

Проверить вручную:

1. `docker compose up --build -d`
2. открыть `/review` как client;
3. открыть `/operator/reviews` как client → access denied;
4. открыть `/prompts` как operator → access denied;
5. открыть `/admin/phrases` как administrator → доступ есть;
6. убедиться, что HomePage role-aware links не сломаны;
7. убедиться, что browser console без новых runtime errors.

---

# Что НЕ делать

Не начинать Milestone 7.

Не реализовывать:

- provider settings;
- real auth;
- users table;
- password login;
- Playwright;
- screenshots automation.

---

# Сессионный лог

Создать файл:

```text
docs/cursor_sessions/2026-05-26_cursor_task_008_protected_route_ux_polish.md
```

В начало файла вставить полный текст этого промпта.

Ниже зафиксировать:

- что было не так;
- какое решение выбрано;
- changed files;
- verification;
- remaining known issues.

---

# Формат ответа в чат

После выполнения написать:

```text
Session log: docs/cursor_sessions/2026-05-26_cursor_task_008_protected_route_ux_polish.md
Status: ProtectedRoute UX polish completed
```

или:

```text
Status: ProtectedRoute UX polish blocked
Reason: ...
```

---

## Выполнение

### Что было не так

`ProtectedRoute` делал `<Navigate to="/" replace />` без state — пользователь молча оказывался на главной без объяснения, почему страница недоступна.

### Решение (вариант А)

Страница `/access-denied` с:

- текущей ролью (человекочитаемый label + код);
- требуемыми ролями из `allowedRoles`;
- запрошенным путём (`attemptedPath`);
- селектором роли (при выборе подходящей роли — автоматический переход на `attemptedPath`);
- ссылками на главную и `/review`.

`ProtectedRoute` перенаправляет на `/access-denied` с `state: { attemptedPath, allowedRoles }`.

Backend `role_access_denied` без изменений — пишется при API 403.

### Changed files

- `frontend/src/components/ProtectedRoute.jsx`
- `frontend/src/pages/AccessDeniedPage.jsx` (new)
- `frontend/src/App.jsx` — route `/access-denied`
- `frontend/src/lib/role.js` — `ROLE_LABELS`, `formatRolesList`
- `frontend/src/components/RoleSelector.jsx` — shared labels
- `frontend/src/index.css` — стили access-denied

### Verification

```bash
docker compose up --build -d
curl http://localhost:5180/access-denied  # 200
curl http://localhost:8700/health  # ok
curl http://localhost:8700/api/prompts  # 403 (client)
```

Ручная проверка в UI:

1. Роль **client** → открыть `/operator/reviews` или `/prompts` → `/access-denied` с пояснением.
2. Роль **operator** → `/admin/phrases` → отказ, требуется «Администратор».
3. Роль **administrator** → `/admin/phrases` → доступ.
4. На `/access-denied` сменить роль на подходящую → редирект на исходный путь.
5. HomePage / nav links по роли — без регрессий.

### Remaining known issues

- Прямой заход на `/access-denied` без `location.state` показывает «—» для пути/ролей (ожидаемо).
- Playwright не добавлялся (вне scope).
