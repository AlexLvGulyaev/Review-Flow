import { useCallback, useEffect, useState } from "react";

import { apiFetch, readApiError } from "../lib/api.js";
import { OpPage, OpPageHeader } from "../ops/components/OpPage.jsx";
import { OpToolbar, OpButton, OpInput } from "../ops/components/OpToolbar.jsx";
import { OpSplitView } from "../ops/components/OpSplitView.jsx";
import { OpCardButton } from "../ops/components/OpCard.jsx";
import { OpPill, OpPillRow } from "../ops/components/OpPill.jsx";
import { OpMetadataGrid, OpMetadataList } from "../ops/components/OpMetadata.jsx";
import { OpPayloadBlock } from "../ops/observability/OpPayloadBlock.jsx";
import { labelOperationalEventType } from "../lib/displayLabels.js";
import { OpTimeline } from "../ops/components/OpTimeline.jsx";

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventType, setEventType] = useState("");
  const [reviewId, setReviewId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (eventType) params.set("event_type", eventType);
      if (reviewId.trim()) params.set("review_id", reviewId.trim());
      params.set("limit", "100");
      const res = await apiFetch(`/api/logs?${params}`);
      if (!res.ok) throw new Error(await readApiError(res, "Не удалось загрузить логи"));
      setLogs(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [eventType, reviewId]);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const filtered = logs.filter((l, idx) => {
    const needle = String(search || "").toLowerCase().trim();
    if (!needle) return true;
    const hay = [
      l.event_type,
      l.review_id,
      l.message,
      l.timestamp,
      l.latency_ms,
      JSON.stringify(l.metadata || {}),
      idx,
    ]
      .map((x) => String(x || "").toLowerCase())
      .join(" ");
    return hay.includes(needle);
  });

  const items = filtered.map((l, idx) => {
    const key = `${l.timestamp}-${l.event_type}-${idx}`;
    const ts = l.timestamp ? new Date(l.timestamp).toLocaleString() : "—";
    const pills = [];
    if (l.latency_ms != null) {
      pills.push({
        key: "lat",
        color: l.latency_ms > 2000 ? "orange" : "gray",
        label: `${l.latency_ms}ms`,
        title: "latency",
      });
    }
    const msg = l.message || "";
    const isError = msg.toLowerCase().includes("error") || msg.toLowerCase().includes("failed");
    if (isError) {
      pills.push({ key: "sev", color: "red", label: "issue", title: "derived severity" });
    } else {
      pills.push({ key: "sev", color: "gray", label: "event", title: "derived severity" });
    }

    return {
      key,
      active: selectedKey === key,
      primaryLeft: labelOperationalEventType(l.event_type),
      primaryRight: ts,
      secondary: l.review_id ? `review: ${l.review_id}` : "review: —",
      preview: msg.slice(0, 140),
      pills,
      raw: l,
      onClick: () => setSelectedKey(key),
    };
  });

  const selected = items.find((i) => i.key === selectedKey) || items[0] || null;

  // Event chain by review_id (bounded, contract-preserving): show neighboring events in the currently loaded window.
  const chain = selected?.raw?.review_id
    ? items.filter((i) => i.raw.review_id === selected.raw.review_id)
    : [];

  const chainTimeline = chain.slice(-12).map((i, idx) => ({
    key: `${i.key}-chain-${idx}`,
    title: labelOperationalEventType(i.raw.event_type),
    subtitle: i.raw.message,
    meta: i.raw.timestamp ? new Date(i.raw.timestamp).toLocaleString() : null,
    status: "done",
  }));

  return (
    <OpPage wide>
      <OpPageHeader
        title="Observability — Logs"
        subtitle="Structured operational event stream (left) + event detail workspace (right)."
        actions={
          <OpButton type="button" onClick={loadLogs} disabled={loading} variant="primary">
            {loading ? "Loading…" : "Refresh"}
          </OpButton>
        }
      />

      <OpToolbar>
        <label style={{ flex: 1, minWidth: 220 }}>
          search
          <OpInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="event / review id / message…" />
        </label>
        <label>
          event_type (API)
          <OpInput value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="draft_generated" />
        </label>
        <label>
          review_id (API)
          <OpInput value={reviewId} onChange={(e) => setReviewId(e.target.value)} placeholder="UUID" />
        </label>
        <OpButton type="button" onClick={loadLogs} disabled={loading} variant="primary">
          Apply
        </OpButton>
        {error ? <span className="error">{error}</span> : null}
        {!loading && !error ? (
          <span className="muted">
            shown: <strong>{items.length}</strong> / {logs.length}
          </span>
        ) : null}
      </OpToolbar>

      <OpSplitView
        left={
          <>
            <h2 className="op-panel-title">Event stream</h2>
            {loading ? <p>Загрузка…</p> : null}
            {!loading && !error && items.length === 0 ? <p>Нет событий</p> : null}
            <ul className="op-list">
              {items.map((it) => (
                <li key={it.key} style={{ marginBottom: 10 }}>
                  <OpCardButton
                    active={it.active}
                    onClick={it.onClick}
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
            <h2 className="op-panel-title">Event detail</h2>
            {!selected ? <p>Выберите событие</p> : null}
            {selected ? (
              <>
                <OpPillRow>
                  <OpPill color="blue">{labelOperationalEventType(selected.raw.event_type)}</OpPill>
                  {selected.raw.review_id ? <OpPill color="gray">review: {selected.raw.review_id}</OpPill> : null}
                  {selected.raw.latency_ms != null ? (
                    <OpPill color={selected.raw.latency_ms > 2000 ? "orange" : "gray"}>
                      latency: {selected.raw.latency_ms}ms
                    </OpPill>
                  ) : null}
                </OpPillRow>

                <div style={{ marginTop: 12 }}>
                  <OpMetadataGrid>
                    <OpMetadataList
                      items={[
                        { key: "ts", label: "Timestamp", value: selected.raw.timestamp ? new Date(selected.raw.timestamp).toLocaleString() : "—" },
                        { key: "etype", label: "Event", value: labelOperationalEventType(selected.raw.event_type) },
                      ]}
                    />
                    <OpMetadataList
                      items={[
                        { key: "review", label: "Review", value: selected.raw.review_id || "—" },
                        { key: "lat", label: "Latency", value: selected.raw.latency_ms != null ? `${selected.raw.latency_ms} ms` : "—" },
                      ]}
                    />
                  </OpMetadataGrid>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="op-insight">
                    <div className="op-insight-title">Operational summary</div>
                    <div className="op-insight-desc">{selected.raw.message || "—"}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <OpPayloadBlock title="Structured metadata" payload={selected.raw.metadata || {}} />
                </div>

                <div style={{ marginTop: 12 }}>
                  <h3 className="op-panel-title" style={{ marginBottom: 10 }}>
                    Event chain (bounded window)
                  </h3>
                  {chainTimeline.length ? (
                    <OpTimeline events={chainTimeline} />
                  ) : (
                    <p className="muted">No chain (missing review_id or only single event)</p>
                  )}
                </div>
              </>
            ) : null}
          </>
        }
      />
    </OpPage>
  );
}
