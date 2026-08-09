import { getApiUrl, readApiError } from "./api.js";
import { normalizeRequestNumberInput } from "./reviewIds.js";

export const PRODUCT_AREA_LABELS = {
  logistics: "Доставка",
  product_quality: "Качество товара",
  payment: "Оплата",
  returns: "Возврат",
  support: "Поддержка",
  digital: "Сайт / приложение",
  general: "Другое",
};

export { REVIEW_STATUS_LABELS as STATUS_HEADLINE, labelReviewStatus } from "./displayLabels.js";

export async function fetchReviewStatus(requestNumber, email) {
  const lookupId = encodeURIComponent(normalizeRequestNumberInput(requestNumber.trim()));
  const qs = new URLSearchParams({ email: email.trim() }).toString();
  const url = `${getApiUrl()}/api/reviews/requests/${lookupId}/status?${qs}`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    console.error("[reviewStatus] network error", { url, err });
    const networkErr = new Error(
      "Не удалось связаться с сервером. Проверьте подключение к интернету и попробуйте снова.",
    );
    networkErr.kind = "network";
    throw networkErr;
  }

  if (!res.ok) {
    const msg = await readApiError(res, "Не удалось загрузить статус");
    const apiErr = new Error(msg);
    apiErr.status = res.status;
    apiErr.kind = res.status === 404 ? "not_found" : "api";
    throw apiErr;
  }

  return res.json();
}

export function topicLabel(productArea) {
  return (productArea && PRODUCT_AREA_LABELS[productArea]) || productArea || "—";
}
