# Cursor Task 017A — CSS repair after homepage rebuild

## Контекст

После выполнения Task 017 frontend перестал запускаться.

Ошибка:

```text
[plugin:vite:css] [postcss]
/app/src/index.css
Unclosed string
```

Причина:
сломанный CSS string внутри:

```css
url("data:image/svg+xml,...
```

---

# Главная задача

Нужно:

1. Исправить CSS parsing error.
2. Поднять frontend.
3. Сохранить текущий visual rebuild homepage.
4. НЕ откатывать redesign.
5. НЕ упрощать layout.
6. НЕ переделывать homepage заново.

---

# КРИТИЧЕСКОЕ ОГРАНИЧЕНИЕ

Это repair-task.

НЕ redesign-task.

Запрещено:

* переписывать homepage;
* возвращать старый minimal UI;
* упрощать hero;
* удалять visual composition;
* удалять illustration;
* удалять gradients/shadows/cards;
* делать rollback.

---

# Что нужно сделать

## 1. Найти источник syntax error

Проверить:

```text
frontend/src/index.css
```

Особенно:

* inline SVG;
* data:image/svg+xml;
* url("...");
* quote escaping;
* multiline string.

---

## 2. Исправить parsing

Нужно:

* корректно закрыть string;
  или:
* вынести SVG в отдельный asset;
  или:
* заменить inline SVG на file asset.

Главное:
frontend должен успешно стартовать.

---

## 3. Проверить frontend

Обязательно проверить:

```bash
docker compose up --build -d
```

И убедиться:

* frontend healthy;
* homepage открывается;
* Vite overlay больше не появляется.

---

# Scope

Разрешено:

* только repair CSS;
* только repair asset loading;
* только repair parsing issue.

Запрещено:

* redesign;
* refactor homepage;
* visual simplification.

---

# Проверка

После fix:

* homepage должна открываться;
* visual rebuild должен сохраниться;
* CSS parsing errors должны отсутствовать.

---

# Сессионный лог

Создать:

docs/cursor_sessions/2026-05-27_cursor_task_017a_css_repair_after_homepage_rebuild.md

В начало вставить полный текст этого prompt.

---

# Формат ответа

Session log:
docs/cursor_sessions/2026-05-27_cursor_task_017a_css_repair_after_homepage_rebuild.md

Status: completed

или:

Status: blocked
Reason: ...

---

## Выполнение

### Root cause

В `frontend/src/index.css` использовался inline `data:image/svg+xml` с неправильным экранированием кавычек (`url(\"...\")`). PostCSS/Vite трактовали это как незакрытую строку (Unclosed string).

### Fix

- Вынес inline SVG в отдельный ассет: `frontend/src/assets/client_about_placeholder.svg`
- Заменил фон в `.client-about-image` на `url(\"./assets/client_about_placeholder.svg\")`

### Проверка

- `docker compose up --build -d` — OK
- `GET http://localhost:5180/` — 200
- CSS parsing error больше не воспроизводится

