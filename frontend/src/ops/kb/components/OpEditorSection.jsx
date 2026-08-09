export function OpEditorSection({ title, children, right }) {
  return (
    <section className="op-editor">
      <div className="op-editor-head">
        <div className="op-editor-title">{title}</div>
        {right ? <div className="op-editor-right">{right}</div> : null}
      </div>
      <div className="op-editor-body">{children}</div>
    </section>
  );
}

