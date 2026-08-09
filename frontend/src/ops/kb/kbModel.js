import { labelClassificationLine, labelEntityActive, refCode } from "../../lib/displayLabels.js";

export const KB_ENTITIES = {
  phrases: {
    key: "phrases",
    title: "Формулировки",
    apiBase: "/api/admin/phrases",
    idKey: "id",
    listPrimary: (i) => i.phrase_text,
    listSemantic: (i) => labelClassificationLine(i.scenario, i.sentiment, i.priority),
    listPreview: (i) => (i.phrase_text || "").slice(0, 140),
    isActive: (i) => i.is_active,
    fields: [
      { key: "phrase_text", label: "Фраза", type: "textarea", required: true },
      { key: "scenario_id", label: "Сценарий", type: "ref_select", refKey: "scenarios", refField: "scenario" },
      { key: "sentiment_id", label: "Тональность", type: "ref_select", refKey: "sentiments", refField: "sentiment" },
      { key: "priority_id", label: "Приоритет", type: "ref_select", refKey: "priorities", refField: "priority" },
      { key: "is_active", label: "Активна", type: "checkbox" },
    ],
    defaults: {
      phrase_text: "",
      scenario_id: "",
      sentiment_id: "",
      priority_id: "",
      is_active: true,
    },
  },
  templates: {
    key: "templates",
    title: "Шаблоны",
    apiBase: "/api/admin/templates",
    idKey: "id",
    listPrimary: (i) => i.title,
    listSemantic: (i) => labelClassificationLine(i.scenario, i.sentiment, i.priority),
    listPreview: (i) => (i.template_text || "").slice(0, 140),
    isActive: (i) => i.is_active,
    fields: [
      { key: "title", label: "Название", type: "text", required: true },
      { key: "scenario_id", label: "Сценарий", type: "ref_select", refKey: "scenarios", refField: "scenario" },
      { key: "sentiment_id", label: "Тональность", type: "ref_select", refKey: "sentiments", refField: "sentiment" },
      { key: "priority_id", label: "Приоритет", type: "ref_select", refKey: "priorities", refField: "priority" },
      { key: "template_text", label: "Текст шаблона", type: "textarea", required: true },
      { key: "is_fallback", label: "Fallback", type: "checkbox" },
      { key: "is_active", label: "Активен", type: "checkbox" },
    ],
    defaults: {
      title: "",
      scenario_id: "",
      sentiment_id: "",
      priority_id: "",
      template_text: "",
      is_fallback: false,
      is_active: true,
    },
  },
  scenarios: {
    key: "scenarios",
    title: "Сценарии",
    apiBase: "/api/admin/scenarios",
    idKey: "id",
    listPrimary: (i) => `${i.code} — ${i.title || ""}`.trim(),
    listSemantic: (i) => labelEntityActive(i.is_active),
    listPreview: (i) => (i.description || "").slice(0, 140),
    isActive: (i) => i.is_active,
    fields: [
      { key: "code", label: "Код", type: "text", required: true, readonlyOnEdit: true },
      { key: "title", label: "Название", type: "text", required: true },
      { key: "description", label: "Описание", type: "textarea" },
      { key: "is_active", label: "Активен", type: "checkbox" },
    ],
    defaults: { code: "", title: "", description: "", is_active: true },
  },
  sentiments: {
    key: "sentiments",
    title: "Тональности",
    apiBase: "/api/admin/sentiments",
    idKey: "id",
    listPrimary: (i) => `${i.code} — ${i.title || ""}`.trim(),
    listSemantic: (i) => labelEntityActive(i.is_active),
    listPreview: (i) => (i.description || "").slice(0, 140),
    isActive: (i) => i.is_active,
    fields: [
      { key: "code", label: "Код", type: "text", required: true, readonlyOnEdit: true },
      { key: "title", label: "Название", type: "text", required: true },
      { key: "description", label: "Описание", type: "textarea" },
      { key: "is_active", label: "Активен", type: "checkbox" },
    ],
    defaults: { code: "", title: "", description: "", is_active: true },
  },
};

export function kbItemToFormModel(item, fields) {
  const m = {};
  fields.forEach((f) => {
    if (f.type === "checkbox") {
      m[f.key] = item?.[f.key] ?? false;
    } else if (f.type === "ref_select") {
      const ref = item?.[f.refField || f.key.replace(/_id$/, "")];
      m[f.key] = ref?.id ?? "";
    } else {
      m[f.key] = item?.[f.key] ?? "";
    }
  });
  return m;
}

export function kbSearchHaystack(it, entity) {
  const parts = [
    entity.listPrimary(it),
    entity.listSemantic(it),
    entity.listPreview(it),
    it.id,
    it.code,
    refCode(it.scenario),
    refCode(it.sentiment),
    refCode(it.priority),
    it.scenario?.name,
    it.sentiment?.name,
    it.priority?.name,
  ];
  return parts;
}
