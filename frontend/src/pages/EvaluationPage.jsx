import { useCallback, useEffect, useState } from "react";

import { apiFetch, readApiError } from "../lib/api.js";

export default function EvaluationPage() {
  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [score, setScore] = useState("3");
  const [comment, setComment] = useState("");
  const [newReviewId, setNewReviewId] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/evaluation/cases");
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить cases"));
      const data = await res.json();
      setCases(data);
      setSelectedId((prev) => prev ?? data[0]?.id ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const selected = cases.find((c) => c.id === selectedId);

  useEffect(() => {
    if (selected) {
      setScore(String(selected.operator_score ?? 3));
      setComment(selected.operator_comment ?? "");
    }
  }, [selectedId, selected]);

  async function handleCreateCase(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch("/api/evaluation/cases", {
        method: "POST",
        body: JSON.stringify({
          review_id: newReviewId.trim(),
          expected_quality_notes: newNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Не удалось создать case"));
      }
      const created = await res.json();
      setMessage("Evaluation case создан");
      setNewReviewId("");
      setNewNotes("");
      await loadCases();
      setSelectedId(created.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveScore() {
    if (!selectedId) return;
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/evaluation/cases/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify({
          operator_score: Number(score),
          operator_comment: comment.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось сохранить оценку"));
      setMessage("Оценка сохранена");
      await loadCases();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page page-wide">
      <h1>Evaluation (manual)</h1>
      {error && <p className="error">{error}</p>}
      {message && <p className="success-inline">{message}</p>}

      <form className="review-form inline-form" onSubmit={handleCreateCase}>
        <h3>Добавить case</h3>
        <label>
          review_id (UUID)
          <input
            value={newReviewId}
            onChange={(e) => setNewReviewId(e.target.value)}
            required
          />
        </label>
        <label>
          expected_quality_notes
          <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
        </label>
        <button type="submit">Создать case</button>
      </form>

      <div className="operator-layout" style={{ marginTop: "1.5rem" }}>
        <aside className="operator-list">
          <h2>Cases</h2>
          {loading && <p>Загрузка…</p>}
          <ul>
            {cases.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={selectedId === c.id ? "list-item active" : "list-item"}
                  onClick={() => setSelectedId(c.id)}
                >
                  <span className="preview">
                    {c.review_text
                      ? c.review_text.length > 60
                        ? `${c.review_text.slice(0, 60)}…`
                        : c.review_text
                      : c.review_id}
                  </span>
                  <span>
                    score: {c.operator_score ?? "—"} · prompt v{c.prompt_version ?? "?"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="operator-detail">
          <h2>Ручная оценка</h2>
          {!selected && <p>Выберите case</p>}
          {selected && (
            <>
              <div className="detail-block">
                <h3>Отзыв</h3>
                <p>{selected.review_text}</p>
              </div>
              <div className="detail-block">
                <h3>Draft</h3>
                <p>{selected.draft_response || "—"}</p>
              </div>
              <div className="detail-block">
                <h3>Final</h3>
                <p>{selected.final_response || "—"}</p>
              </div>
              <div className="detail-block">
                <h3>Prompt</h3>
                <p>
                  {selected.prompt_key} v{selected.prompt_version}
                </p>
              </div>
              {selected.expected_quality_notes && (
                <div className="detail-block">
                  <h3>Expected notes</h3>
                  <p>{selected.expected_quality_notes}</p>
                </div>
              )}
              <label>
                Operator score (1–5)
                <select value={score} onChange={(e) => setScore(e.target.value)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Comment
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
              <button type="button" className="btn-approve" onClick={handleSaveScore}>
                Сохранить оценку
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
