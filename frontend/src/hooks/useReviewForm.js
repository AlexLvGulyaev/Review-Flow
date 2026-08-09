import { useState } from "react";

import { getApiUrl, readApiError } from "../lib/api.js";
import { normalizeOrderNumber } from "../lib/reviewIds.js";

export const REVIEW_INITIAL_FORM = {
  customer_name: "",
  email: "",
  order_number: "",
  topic: "",
  rating: null,
  review_text: "",
};

export const REVIEW_TOPIC_OPTIONS = [
  "Доставка",
  "Качество товара",
  "Оплата",
  "Возврат",
  "Поддержка",
  "Сайт / приложение",
  "Другое",
];

const TOPIC_TO_PRODUCT_AREA = {
  Доставка: "logistics",
  "Качество товара": "product_quality",
  Оплата: "payment",
  Возврат: "returns",
  Поддержка: "support",
  "Сайт / приложение": "digital",
  Другое: "general",
};

export function useReviewForm() {
  const [form, setForm] = useState({ ...REVIEW_INITIAL_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function setRating(value) {
    setForm((prev) => ({ ...prev, rating: value }));
  }

  function reset() {
    setForm({ ...REVIEW_INITIAL_FORM });
    setLoading(false);
    setError(null);
    setResult(null);
  }

  function validate() {
    if (!form.order_number.trim()) return "Укажите номер заказа";
    if (!form.topic) return "Выберите тему обращения";
    if (!form.review_text.trim() || form.review_text.trim().length < 10) {
      return "Описание должно быть не короче 10 символов";
    }
    if (form.review_text.length > 2000) return "Описание не должно превышать 2000 символов";
    if (!form.email.trim()) return "Укажите email для ответа";
    return null;
  }

  async function submit(e) {
    if (e?.preventDefault) e.preventDefault();
    setError(null);
    setResult(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return null;
    }

    const email = form.email.trim();
    const customerName = form.customer_name.trim() || email.split("@")[0] || "Клиент";
    const normalizedOrder = normalizeOrderNumber(form.order_number);

    setLoading(true);
    try {
      const product_area = TOPIC_TO_PRODUCT_AREA[form.topic] || "general";
      const res = await fetch(`${getApiUrl()}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          email: email || null,
          order_number: normalizedOrder,
          service_case_title: `Заказ ${normalizedOrder}`,
          product_area,
          rating: form.rating,
          review_text: form.review_text.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Не удалось отправить обращение"));
      }

      const data = await res.json();
      setResult(data);
      return data;
    } catch (err) {
      setError(err.message || "Не удалось отправить обращение");
      return null;
    } finally {
      setLoading(false);
    }
  }

  const displayRequestId = result?.request_number || null;

  return {
    form,
    loading,
    error,
    result,
    handleChange,
    setRating,
    reset,
    submit,
    requestNumber: displayRequestId,
    displayRequestId,
    submittedEmail: form.email.trim(),
    normalizedOrderNumber: normalizeOrderNumber(form.order_number),
  };
}
