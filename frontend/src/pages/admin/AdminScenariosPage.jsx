import AdminKbPage from "../../components/AdminKbPage.jsx";

const FIELDS = [
  { key: "code", label: "Код", type: "text", create: true, listPrimary: true },
  { key: "title", label: "Название", type: "text", create: true, edit: true },
  { key: "description", label: "Описание", type: "textarea", create: true, edit: true },
  { key: "is_active", label: "Активен", type: "checkbox", create: true, edit: true },
];

export default function AdminScenariosPage() {
  return (
    <AdminKbPage
      title="База знаний: сценарии"
      apiBase="/api/admin/scenarios"
      fields={FIELDS}
      createDefaults={{ code: "", title: "", description: "", is_active: true }}
    />
  );
}
