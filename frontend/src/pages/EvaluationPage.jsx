import { useCallback, useEffect, useState } from "react";

import { apiFetch, readApiError } from "../lib/api.js";
import { OpPage, OpPageHeader } from "../ops/components/OpPage.jsx";
import { OpToolbar, OpButton, OpInput, OpSelect, OpTextarea } from "../ops/components/OpToolbar.jsx";
import { OpSplitView } from "../ops/components/OpSplitView.jsx";
import { OpCardButton } from "../ops/components/OpCard.jsx";
import { OpPill, OpPillRow } from "../ops/components/OpPill.jsx";
import { OpEditorSection } from "../ops/kb/components/OpEditorSection.jsx";
import { OpComparisonBlock } from "../ops/governance/OpComparisonBlock.jsx";

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
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("");

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

  const selected = cases.find((c) => c.id === selectedId);

  const filtered = cases
    .filter((c) => {
      if (!minScore) return true;
      const s = c.operator_score == null ? null : Number(c.operator_score);
      return s != null && s >= Number(minScore);
    })
    .filter((c) => {
      const needle = String(search || "").toLowerCase().trim();
      if (!needle) return true;
      const hay = [
        c.id,
        c.review_id,
        c.prompt_key,
        c.prompt_version,
        c.review_text,
        c.expected_quality_notes,
        c.operator_comment,
      ]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");
      return hay.includes(needle);
    })
    .map((c) => {
      const ts = c.updated_at || c.created_at;
      const when = ts ? new Date(ts).toLocaleDateString() : "";
      const hasScore = c.operator_score != null;
      const pills = [
        {
          key: "score",
          color: hasScore ? (c.operator_score <= 2 ? "red" : c.operator_score === 3 ? "orange" : "green") : "gray",
          label: hasScore ? `score: ${c.operator_score}` : "unscored",
          title: "operator score",
        },
        {
          key: "prompt",
          color: "gray",
          label: c.prompt_key ? `${c.prompt_key} v${c.prompt_version ?? "?"}` : "prompt: —",
          title: "prompt linkage",
        },
      ];
      const preview = c.review_text ? (c.review_text.length > 120 ? `${c.review_text.slice(0, 120)}…` : c.review_text) : c.review_id;
      return {
        key: c.id,
        active: c.id === selectedId,
        primaryLeft: c.id,
        primaryRight: when,
        secondary: c.review_id ? `review: ${c.review_id}` : "review: —",
        preview,
        pills,
        raw: c,
      };
    });

  return (
    <OpPage wide>
      <OpPageHeader
        title="AI Governance — Evaluation"
        subtitle="Manual quality review. Expected vs actual comparison + scoring notes."
        actions={
          <OpButton type="button" onClick={loadCases} disabled={loading} variant="primary">
            Refresh
          </OpButton>
        }
      />

      <OpEditorSection title="Create evaluation case">
        <form onSubmit={handleCreateCase}>
          <label>
            review_id (UUID)
            <OpInput value={newReviewId} onChange={(e) => setNewReviewId(e.target.value)} required />
          </label>
          <label>
            expected_quality_notes
            <OpInput value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="What should be improved?" />
          </label>
          <OpButton type="submit" variant="primary">
            Create case
          </OpButton>
        </form>
      </OpEditorSection>

      <OpToolbar>
        <label style={{ flex: 1, minWidth: 240 }}>
          search
          <OpInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="review id / prompt / text…" />
        </label>
        <label>
          min score
          <OpSelect value={minScore} onChange={(e) => setMinScore(e.target.value)}>
            <option value="">any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5</option>
          </OpSelect>
        </label>
        <OpButton type="button" onClick={loadCases} disabled={loading} variant="primary">
          {loading ? "Loading…" : "Refresh"}
        </OpButton>
        {error ? <span className="error">{error}</span> : null}
        {message ? <span className="success-inline">{message}</span> : null}
      </OpToolbar>

      <OpSplitView
        left={
          <>
            <h2 className="op-panel-title">Cases</h2>
            {loading ? <p>Загрузка…</p> : null}
            {!loading && filtered.length === 0 ? <p>Нет кейсов</p> : null}
            <ul className="op-list">
              {filtered.map((it) => (
                <li key={it.key} style={{ marginBottom: 10 }}>
                  <OpCardButton
                    active={it.active}
                    onClick={() => setSelectedId(it.key)}
                    primaryLeft={it.primaryLeft}
                    primaryRight={it.primaryRight}
                    secondary={it.secondary}
                    preview={it.preview}
                    pills={it.pills}
                  />
                </li>
              ))}
            </ul>
          </>
        }
        right={
          <>
            <h2 className="op-panel-title">Workspace</h2>
            {!selected ? <p>Выберите кейс</p> : null}
            {selected ? (
              <>
                <OpPillRow>
                  <OpPill color={selected.operator_score == null ? "gray" : selected.operator_score <= 2 ? "red" : selected.operator_score === 3 ? "orange" : "green"}>
                    {selected.operator_score == null ? "unscored" : `score: ${selected.operator_score}`}
                  </OpPill>
                  {selected.prompt_key ? (
                    <OpPill color="gray">
                      {selected.prompt_key} v{selected.prompt_version ?? "?"}
                    </OpPill>
                  ) : null}
                </OpPillRow>

                <div style={{ marginTop: 12 }}>
                  <OpMetadataGrid>
                    <OpMetadataList items={[{ key: "case", label: "Case", value: selected.id }, { key: "review", label: "Review", value: selected.review_id }]} />
                    <OpMetadataList
                      items={[
                        { key: "created", label: "Created", value: selected.created_at ? new Date(selected.created_at).toLocaleString() : "—" },
                        { key: "updated", label: "Updated", value: selected.updated_at ? new Date(selected.updated_at).toLocaleString() : "—" },
                      ]}
                    />
                  </OpMetadataGrid>
                </div>

                <OpEditorSection title="Customer request">
                  <div className="op-compare-body">{selected.review_text || "—"}</div>
                </OpEditorSection>

                <OpComparisonBlock
                  title="Expected vs Actual"
                  leftTitle="Expected notes (human)"
                  left={selected.expected_quality_notes || "—"}
                  rightTitle="Actual output (AI draft / final)"
                  right={
                    `Draft:\n${selected.draft_response || "—"}\n\nFinal:\n${selected.final_response || "—"}`
                  }
                  tone={selected.operator_score != null && selected.operator_score <= 2 ? "bad" : selected.operator_score === 3 ? "warn" : "neutral"}
                />

                <OpEditorSection title="Review notes / scoring">
                  <label>
                    Operator score (1–5)
                    <OpSelect value={score} onChange={(e) => setScore(e.target.value)}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </OpSelect>
                  </label>
                  <label>
                    Comment
                    <OpTextarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
                  </label>
                  <OpButton type="button" variant="primary" onClick={handleSaveScore}>
                    Save score
                  </OpButton>
                </OpEditorSection>

                <OpEditorSection title="Linkage (conceptual)">
                  <div className="muted" style={{ fontSize: "0.92rem" }}>
                    This case is linked to:
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      <li>Prompt version (via review response)</li>
                      <li>Review id (can be investigated in `/logs` by review_id)</li>
                      <li>KB entities (scenario/sentiment/template are visible in operator workspace)</li>
                    </ul>
                  </div>
                </OpEditorSection>
              </>
            ) : null}
          </>
        }
      />
    </OpPage>
  );
}
