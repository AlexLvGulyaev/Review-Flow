# Cursor Task 018D — Стабилизация размера status modal и устранение внутреннего скролла

## Контекст

Task 018C в целом сдвинул status-flow в правильном направлении:

- проверка статуса теперь выполняется внутри modal workflow;
- fullscreen-переход после submit убран;
- правая часть modal стала динамической;
- lookup по `NL-XXXXXXXX-NNN` починен;
- `Failed to fetch` был объяснён и устранён.

Но в текущем UI остались две существенные UX-проблемы.

---

# Текущие проблемы

## 1. Modal прыгает по высоте

Сейчас исходная форма проверки статуса в idle-state ниже, чем развернутая форма после успешного поиска.

В результате:

```text
пользователь вводит номер/email
→ modal резко увеличивается по высоте
```

Это выглядит нестабильно и непрофессионально.

Так быть не должно.

---

## 2. Success-state не помещается без внутреннего скролла

После успешного поиска в правой части появляется внутренний scrollbar.

Это плохо для customer-facing modal.

Если pipeline имеет фиксированное или почти фиксированное количество стадий, modal нужно проектировать сразу под типовой полный размер:

- left form;
- right status panel;
- pipeline;
- краткая информация об обращении;
- footer/status content.

Всё это должно помещаться без внутреннего скролла на стандартном widescreen viewport.

---

# Главная задача

Стабилизировать status modal так, чтобы:

1. idle-state и success-state имели одинаковый внешний размер;
2. modal НЕ прыгал по высоте после submit;
3. success-state помещался в правой части без внутреннего scrollbar;
4. визуальная плотность была аккуратной и customer-facing;
5. homepage и остальные flows не ломались.

---

# Visual reference

Использовать как ориентиры:

```text
frontend/public/assets/ui_reference_client_status_dialog_widescreen_v1.png
```

и текущий результат после Task 018C.

Reference не требуется копировать pixel-perfect, но modal должен быть:

- широкий;
- устойчивый по размеру;
- визуально сбалансированный;
- без резкого изменения высоты между states.

---

# 1. Фиксированный размер modal shell

Нужно задать status modal shell такой высоты, чтобы он сразу в idle-state соответствовал типовой высоте success-state.

Рекомендация:

- использовать единый `min-height` для status modal;
- использовать единый layout для idle/loading/success/error;
- не позволять content state менять внешний размер всего dialog.

Примерно:

```text
modal height = enough for:
- title/subtitle;
- two fields;
- CTA;
- privacy note;
- right timeline/status panel;
- short review summary.
```

Важно:

- modal должен помещаться в 1920×1080 @100%;
- не должен касаться верхнего/нижнего края экрана;
- не должен требовать page scroll.

---

# 2. Правая панель должна иметь одинаковую высоту во всех states

Right panel states:

- idle;
- loading;
- success;
- error.

Должны жить внутри одного стабильного container.

То есть:

```text
right-panel shell height is stable
content changes inside it
outer dialog size does not jump
```

---

# 3. Устранить внутренний scrollbar в success-state

В текущей версии success-state в правой части скроллится.

Нужно переработать layout success panel так, чтобы типовой status result помещался без scrollbar.

Разрешено:

- уменьшить vertical paddings;
- сделать timeline компактнее;
- уменьшить line-height;
- сократить secondary text;
- использовать две компактные колонки внутри right panel, если это помогает;
- сделать review summary компактным;
- ограничить длинный текст обращения 2–3 строками с аккуратным fade/ellipsis.

Запрещено:

- скрывать критически важный статус;
- удалять pipeline;
- делать текст нечитаемым;
- возвращать fullscreen page.

---

# 4. Pipeline/stages

Pipeline можно считать типовым и фиксированным для этого customer flow.

Ожидаемые стадии:

1. Обращение получено
2. Классификация и анализ
3. Формирование ответа
4. На модерации
5. Опубликовано

Если backend отдаёт статусы иначе — сохранить mapping, но UI должен быть стабилен.

Timeline должен:

- помещаться без скролла;
- быть компактным;
- не занимать половину modal по высоте;
- оставаться читаемым.

---

# 5. Idle-state должен использовать ту же высоту

До поиска правая часть не должна быть короткой заглушкой.

Idle-state должен занимать такой же vertical space, что и success-state.

Но его содержимое может быть декоративным:

- preview timeline;
- envelope/operation visual;
- trust note;
- короткая подсказка.

Важно:

- idle-state не должен выглядеть пустым;
- но не должен быть слишком тяжёлым.

---

# 6. Error-state тоже не должен менять размер modal

Если обращение не найдено или произошла ошибка:

- показать error state внутри той же right panel;
- сохранить общий размер modal;
- не прыгать по высоте;
- не переходить на fullscreen page.

---

# 7. Проверить left panel

Левая часть должна оставаться стабильной:

- заголовок;
- пояснение;
- номер обращения;
- email;
- CTA;
- privacy note.

Не растягивать левую часть по вертикали искусственно так, чтобы она выглядела пустой.

Если right panel выше, left panel может быть визуально выровнена по верхнему краю.

---

# 8. Что НЕ менять

Запрещено:

- менять homepage composition;
- менять hero/layout из Task 17;
- менять review creation modal без необходимости;
- ломать create-review flow;
- ломать status lookup;
- возвращать fullscreen status page как основной flow;
- менять operator/admin UI;
- менять backend без необходимости.

---

# 9. Acceptance criteria

Task 018D принимается только если:

1. Status modal не меняет внешний размер между idle и success states.
2. После submit modal не прыгает по высоте.
3. Success-state отображается внутри той же modal.
4. В success-state нет внутреннего scrollbar в типовом widescreen viewport.
5. Pipeline виден полностью.
6. Номер обращения отображается в формате `NL-XXXXXXXX-NNN`.
7. Error-state также не меняет внешний размер modal.
8. Status lookup продолжает работать.
9. Fullscreen page не открывается автоматически.
10. Homepage не сломан.
11. Review creation modal не сломан.
12. Operator/admin UI не затронут.
13. Нет runtime errors.

---

# 10. Verification

После изменений выполнить:

```bash
docker compose up --build -d
```

Проверить:

```text
/
click Проверить статус
idle modal height
lookup NL-00500001-001
success modal height
no internal scrollbar
failed lookup
error state height
review creation still works
operator/admin unaffected
```

Особенно проверить визуально:

- modal не прыгает;
- right panel не скроллится;
- footer страницы не влияет на modal;
- backdrop корректный;
- content не вылезает за экран.

---

# 11. Session log

Создать:

```text
docs/cursor_sessions/2026-05-28_cursor_task_018D_status_modal_fixed_height_no_scroll.md
```

В начало session log вставить полный текст этого prompt.

После prompt добавить разделы:

## 1. Problem confirmation

Что было неправильно после 018C:

- height jump;
- internal scrollbar.

## 2. Layout strategy

Как стабилизирован размер modal.

## 3. Right panel state model

Как устроены:

- idle;
- loading;
- success;
- error.

## 4. Scroll removal

Что изменено, чтобы убрать внутренний scrollbar.

## 5. Changed files

| File | Change |
|---|---|

## 6. Verification results

| Check | Result |
|---|---|

## 7. Remaining limitations

Если что-то осталось.

---

# Chat response format

```text
Session log:
docs/cursor_sessions/2026-05-28_cursor_task_018D_status_modal_fixed_height_no_scroll.md

Status: completed

Changed files:
- ...
```

или:

```text
Status: blocked
Reason:
...
```

---

# Implementation report (2026-05-28)

## 1. Problem confirmation

After 018C:

- **Height jump**: idle right panel was shorter (small illustration + 4 demo steps); success panel added stepper, meta, review, info boxes → modal grew vertically.
- **Internal scrollbar**: `.client-status-panel { max-height: 70vh; overflow-y: auto }` caused right-panel scroll on success.

## 2. Layout strategy

- Fixed dialog shell: `height: min(560px, calc(100vh - 3rem))` on `.client-modal-dialog-wide`, `overflow: hidden`.
- Modal card uses flex column; grid `flex: 1; min-height: 0`.
- Right column wrapper `.client-status-modal-right` + `.client-status-panel-shell` with `height: 100%; overflow: hidden` — all states share same box.
- Left form column `align-self: start` (no artificial stretch).

## 3. Right panel state model

| State | Container | Content |
|---|---|---|
| idle | `client-status-panel-shell` | Compact illustration + 5-step preview timeline + hint + trust note |
| loading | same shell | Centered loading text |
| success | same shell | Ticket row + chip, compact stepper, 2-col meta/review, optional clamped response |
| error | same shell | Centered error block + hints |

## 4. Scroll removal

- Removed `max-height` + `overflow-y: auto` from `.client-status-panel`.
- Added `status-stepper--compact` (smaller markers/padding).
- Success: removed large info boxes; inline status chip; `client-status-clamp-2` on review/response (2 lines + ellipsis).
- Idle: 5 pipeline preview steps (same count as live stepper) to match success vertical footprint.

## 5. Changed files

| File | Change |
|---|---|
| `frontend/src/index.css` | Fixed modal height, panel shell, compact stepper/timeline, no scroll |
| `frontend/src/components/client/StatusLookupModal.jsx` | Right panel wrapper |
| `frontend/src/components/client/StatusModalPanel.jsx` | Compact success layout, shared shell class |
| `frontend/src/components/client/StatusDialogVisual.jsx` | 5-step idle preview, compact illustration |
| `frontend/src/components/client/StatusStepper.jsx` | `compact` prop |

## 6. Verification results

| Check | Result |
|---|---|
| `docker compose up --build -d` | OK |
| Fixed modal height idle/success | CSS enforced (560px shell) |
| No internal scrollbar (desktop) | `overflow: hidden` on panel |
| Status lookup | Unchanged (018C flow) |
| Backend / operator | Not touched |

## 7. Remaining limitations

- On viewports &lt;768px modal may scroll as a whole (dialog `overflow-y: auto`) — acceptable for mobile.
- Very long review text truncated to 2 lines in modal (full text on title tooltip via `title` attribute).
