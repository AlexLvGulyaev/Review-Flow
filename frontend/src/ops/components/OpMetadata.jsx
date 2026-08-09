export function OpMetadataGrid({ children }) {
  return <div className="op-meta">{children}</div>;
}

export function OpMetadataList({ items }) {
  if (!items?.length) return null;
  return (
    <dl>
      {items.map((it) => (
        <div key={it.key} style={{ display: "contents" }}>
          <dt>{it.label}</dt>
          <dd>{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

