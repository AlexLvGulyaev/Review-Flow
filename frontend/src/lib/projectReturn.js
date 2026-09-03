/* «Вернуться к проекту» — общий хелпер контуров RF (клиентский UI и логин
   персонала). Кнопка, а не <a href>: у ссылки браузер показывает URL в
   статус-бабле (левый нижний угол), владелец попросил этого не делать.
   Если контур открыт из витрины AIP (есть window.opener), фокусируем
   исходную вкладку с живой страницей и закрываем вкладку контура — это и
   есть «вернуться туда, откуда пришёл». При прямом заходе (opener нет) —
   обычный переход на страницу проекта в витрине. */
const PROJECT_HREF = "https://ai.alex-n8n.site/cases/review-flow.html";

export function goProject() {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }
  } catch {
    /* opener недоступен — обычный переход */
  }
  window.location.href = PROJECT_HREF;
}