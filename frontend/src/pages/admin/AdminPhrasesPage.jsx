import AdminKbPage from "../../components/AdminKbPage.jsx";

const FIELDS = [
  { key: "phrase_text", label: "Фраза", type: "textarea", create: true, edit: true, listPrimary: true },
  { key: "scenario", label: "Сценарий", type: "text", create: true, edit: true },
  { key: "sentiment", label: "Тональность", type: "text", create: true, edit: true },
  { key: "priority", label: "Приоритет", type: "text", create: true, edit: true },
  { key: "is_active", label: "Активна", type: "checkbox", create: true, edit: true },
];

export default function AdminPhrasesPage() {
  return (
    <AdminKbPage
      title="База знаний: фразы"
      apiBase="/api/admin/phrases"
      fields={FIELDS}
      createDefaults={{
        phrase_text: "",
        scenario: "",
        sentiment: "",
        priority: "",
        is_active: true,
      }}
    />
  );
}
