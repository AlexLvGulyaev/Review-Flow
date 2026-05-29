export function OpPage({ wide = false, className = "", children }) {
  const base = wide ? "op-page op-page--wide" : "op-page";
  return <main className={`${base} ${className}`.trim()}>{children}</main>;
}

export function OpPageHeader({ title, subtitle, actions }) {
  return (
    <header className="op-page-header">
      <div>
        <h1 className="op-page-title">{title}</h1>
        {subtitle ? <p className="op-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="op-page-actions">{actions}</div> : null}
    </header>
  );
}

