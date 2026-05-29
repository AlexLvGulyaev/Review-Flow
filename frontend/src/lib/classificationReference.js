import { apiFetch, readApiError } from "./api.js";

const EMPTY = { scenarios: [], sentiments: [], priorities: [] };

export async function fetchClassificationReference() {
  const res = await apiFetch("/api/reference/classification");
  if (!res.ok) {
    throw new Error(await readApiError(res, "Не удалось загрузить справочники классификации"));
  }
  const data = await res.json();
  return {
    scenarios: data.scenarios ?? [],
    sentiments: data.sentiments ?? [],
    priorities: data.priorities ?? [],
  };
}

export function refOptions(bundle, refKey) {
  return bundle?.[refKey] ?? [];
}
