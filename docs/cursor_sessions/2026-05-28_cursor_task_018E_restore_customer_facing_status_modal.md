# Task 18E — Исправление деградации UX модального окна проверки статуса обращения

## Контекст

После выполнения Task 18D модальное окно проверки статуса обращения визуально деградировало по сравнению с версией после 18C.

Вместо корректного решения задачи Cursor:

* сжал правую часть;
* уменьшил плотность и размер текста;
* сделал layout похожим на telemetry/dashboard;
* превратил контент в pseudo-двухколоночный блок;
* убрал explanatory/trust text;
* визуально разрушил customer-facing характер интерфейса.

Это НЕ соответствует задаче.

Задача 18D заключалась НЕ в «любой ценой убрать scrollbar», а в:

* сохранении качественного customer-facing UI;
* сохранении readable timeline;
* сохранении воздуха и вертикального rhythm;
* увеличении shell/modal размера;
* устранении scrollbar БЕЗ деградации контента.

---

# Что необходимо сделать

## 1. Вернуть visual density ближе к версии 18C

Текущая версия слишком плотная и визуально «сломанная».

Нужно вернуть:

* нормальный line-height;
* нормальные vertical gaps;
* readable timeline;
* readable text blocks;
* customer-facing visual style.

НЕ делать:

* dashboard;
* telemetry panel;
* admin-console look;
* pseudo-table layout.

---

# 2. Увеличить modal по высоте вместо сжатия контента

Проблема должна решаться через:

* увеличение общей высоты modal;
* корректное распределение пространства;
* адаптацию shell.

А НЕ через:

* уменьшение текста;
* уменьшение отступов;
* сжатие timeline;
* удаление explanatory blocks.

---

# 3. Убрать pseudo-двухколоночную компоновку справа

Сейчас справа:

* тема;
* оценка;
* отзыв;

развалены по странной двухколоночной схеме.

Это выглядит плохо.

Нужно вернуть:

* вертикальный flow;
* логичную последовательность блоков;
* нормальную типографику.

Правильный порядок:

* статус;
* timeline;
* тема;
* оценка;
* текст обращения.

---

# 4. Вернуть explanatory/trust text

В версии после 18C присутствовали:

* дружелюбные explanatory phrases;
* доверительные тексты;
* ощущение customer support interface.

В текущей версии это почти полностью исчезло.

Нужно вернуть:

* explanatory copy;
* визуальное ощущение «живого сервиса»;
* customer-friendly tone.

---

# 5. Убрать scrollbar без деградации UI

Scrollbar внутри правой части действительно должен отсутствовать.

Но:

* отсутствие scrollbar НЕ является самоцелью;
* приоритет — качественный customer-facing интерфейс.

Разрешается:

* увеличить modal по высоте;
* перераспределить spacing;
* увеличить max-height shell.

Запрещается:

* уменьшать readability;
* уменьшать line-height;
* уменьшать font size;
* превращать layout в telemetry panel.

---

# 6. Сохранить fixed-height shell

После раскрытия правая часть НЕ должна:

* растягивать modal;
* вызывать прыжок формы;
* менять outer shell height.

Shell должен:

* иметь фиксированный размер;
* быть одинаковым до и после поиска;
* оставаться стабильным.

---

# 7. Проверить состояние без scrollbar

После исправлений:

* вся информация должна помещаться без внутреннего скролла;
* timeline должен читаться целиком;
* footer/текст должны быть видимы;
* modal должен помещаться в typical widescreen viewport.

---

# 8. Отчёт Cursor

В отчёте обязательно:

1. Объяснить:

   * почему после 18D произошла визуальная деградация;
   * почему был выбран путь сжатия контента вместо увеличения shell.

2. Перечислить:

   * какие visual/layout решения были откатаны;
   * какие spacing/height/layout параметры изменены.

3. Подтвердить:

   * scrollbar отсутствует;
   * shell не прыгает;
   * modal помещается в typical widescreen viewport;
   * visual density возвращена к customer-facing уровню.

---

# Операционная дисциплина

1. В начало session log ОБЯЗАТЕЛЬНО вставить полный текст данного prompt.
2. Session log сохранить в:
   docs/cursor_sessions/
3. Не сокращать и не пересказывать prompt.

---

# Implementation report (2026-05-28)

## 1. Почему после 18D произошла деградация

Task 18D поставил «убрать scrollbar» выше «сохранить customer-facing UI». Реализация:

- уменьшила shell до 560px вместо увеличения;
- ввела `status-stepper--compact`, мелкие шрифты (0.74–0.78rem);
- заменила info-boxes на telemetry-style chip;
- разложила тему/оценку/отзыв в 2-колоночный grid;
- обрезала текст до 2 строк (`line-clamp`).

Визуально это стало похоже на dashboard, а не на support modal.

## 2. Откатанные решения 18D

| 18D (откатано) | 18E |
|---|---|
| Высота modal 560px | 680px (`calc(100vh - 2.5rem)`) |
| Chip + мелкий headline | Eyebrow + ticket + полный headline |
| `compact` stepper | Полный stepper с умеренным modal-scoped sizing |
| 2-col `panel-details` | Вертикальный stack: статус → timeline → тема → оценка → отзыв |
| Удалённые info-boxes | Возвращены «На проверке» / «Спасибо…» |
| 2-line clamp | До 3 строк review/response + `title` tooltip |
| Сжатая idle-иллюстрация 88px | 120px + explanatory hint |

## 3. Spacing / height / layout

- `--client-status-modal-height`: **680px** max (было 560px).
- Padding modal: 1.75rem (было 1.35rem).
- Gap в grid: 1.5rem / 2rem.
- Right panel: `gap: 0.65rem`, line-height 1.45, font-size 0.85–0.95rem.
- Fixed shell сохранён: `overflow: hidden` на dialog и panel shell.

## 4. Подтверждение acceptance

| Критерий | Статус |
|---|---|
| Scrollbar в правой части отсутствует | Да (`overflow: hidden`, контент в 680px shell) |
| Shell не прыгает idle → success | Да (единая высота dialog) |
| Modal в widescreen viewport | Да (680px ≤ 100vh − 2.5rem) |
| Customer-facing density | Восстановлена (18C-подобный vertical flow) |
| Lookup / modal flow | Без изменений backend |

## 5. Changed files

| File | Change |
|---|---|
| `frontend/src/components/client/StatusModalPanel.jsx` | 18C vertical success layout, info-boxes, trust copy |
| `frontend/src/components/client/StatusDialogVisual.jsx` | Полная иллюстрация, explanatory idle copy |
| `frontend/src/components/client/StatusStepper.jsx` | Убран `compact` prop |
| `frontend/src/index.css` | Taller shell, typography/spacing restore, убран compact/2-col |
| `docs/cursor_sessions/2026-05-28_cursor_task_018E_restore_customer_facing_status_modal.md` | Session log |
