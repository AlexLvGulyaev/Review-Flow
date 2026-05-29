export function OpSplitView({ left, right }) {
  return (
    <div className="op-split">
      <section className="op-panel">{left}</section>
      <section className="op-panel">{right}</section>
    </div>
  );
}

