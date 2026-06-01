const MODEL_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export const GIGACHAT_MODELS = new Set([
  "GigaChat",
  "GigaChat-Max",
  "GigaChat-Pro",
  "GigaChat-Plus",
]);

const FIELD_LABELS = {
  temperature: "Temperature",
  model_name: "Model",
};

function localizePydanticMsg(msg) {
  if (!msg || typeof msg !== "string") return "Некорректное значение";
  if (msg.includes("less than or equal to 2")) return "Допустимо от 0 до 2";
  if (msg.includes("greater than or equal to 0")) return "Допустимо от 0 до 2";
  if (msg.includes("at least 1 character")) return "Укажите модель";
  return msg;
}

/** @returns {string|null} */
export function validateTemperature(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return "Укажите число";
  if (n < 0 || n > 2) return "Допустимо от 0 до 2";
  return null;
}

/** @returns {string|null} */
export function validateModelName(providerKey, value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "Укажите модель";
  if (trimmed.length > 128) return "Слишком длинное имя модели";
  if (!MODEL_RE.test(trimmed)) {
    return "Допустимы латиница, цифры, точка, дефис и подчёркивание";
  }
  if (providerKey === "gigachat" && !GIGACHAT_MODELS.has(trimmed)) {
    return `Неизвестная модель GigaChat. Допустимо: ${[...GIGACHAT_MODELS].join(", ")}`;
  }
  return null;
}

/**
 * @param {string} providerKey
 * @param {{ model_name: string, temperature: string|number, is_enabled: boolean }} edit
 * @returns {Record<string, string>}
 */
export function validateProviderEdit(providerKey, edit) {
  const errors = {};
  const modelErr = validateModelName(providerKey, edit.model_name);
  if (modelErr) errors.model_name = modelErr;
  const tempErr = validateTemperature(edit.temperature);
  if (tempErr) errors.temperature = tempErr;
  return errors;
}

/**
 * @param {unknown} detail
 * @returns {Record<string, string>}
 */
export function parseProviderPatchErrors(detail) {
  const errors = {};
  if (typeof detail === "string") {
    if (detail.toLowerCase().includes("temperature") || detail.includes("less than or equal to 2")) {
      errors.temperature = localizePydanticMsg(detail);
    } else if (detail.toLowerCase().includes("model")) {
      errors.model_name = detail;
    }
    return errors;
  }
  if (!Array.isArray(detail)) return errors;
  for (const entry of detail) {
    const loc = entry?.loc;
    const field = Array.isArray(loc) ? loc[loc.length - 1] : null;
    if (field && FIELD_LABELS[field]) {
      errors[field] = localizePydanticMsg(entry.msg);
    }
  }
  return errors;
}

/** Revert only fields that failed validation to last saved snapshot. */
export function mergeEditsWithRollback(edit, saved, fieldErrors) {
  const next = { ...edit };
  for (const field of Object.keys(fieldErrors)) {
    if (saved && field in saved) next[field] = saved[field];
  }
  return next;
}
