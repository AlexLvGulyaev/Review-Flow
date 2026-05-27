import AdminKbPage from "../../components/AdminKbPage.jsx";

const FIELDS = [
  { key: "title", label: "Название", type: "text", create: true, edit: true, listPrimary: true },
  { key: "scenario", label: "Сценарий", type: "text", create: true, edit: true },
  { key: "sentiment", label: "Тональность", type: "text", create: true, edit: true },
  { key: "priority", label: "Приоритет", type: "text", create: true, edit: true },
  {
    key: "template_text",
    label: "Текст шаблона",
    type: "textarea",
    create: true,
    edit: true,
  },
  { key: "is_fallback", label: "Fallback", type: "checkbox", create: true, edit: true },
  { key: "is_active", label: "Активен", type: "checkbox", create: true, edit: true },
];

export default function AdminTemplatesPage() {
  return (
    <AdminKbPage
      title="База знаний: шаблоны"
      apiBase="/api/admin/templates"
      fields={FIELDS}
      createDefaults={{
        title: "",
        scenario: "",
        sentiment: "",
        priority: "",
        template_text: "",
        is_fallback: false,
        is_active: true,
      }}
    />
  );
}
