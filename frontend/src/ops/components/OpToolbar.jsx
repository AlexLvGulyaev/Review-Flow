export function OpToolbar({ children }) {
  return <div className="op-toolbar">{children}</div>;
}

export function OpInput(props) {
  return <input {...props} className={`op-input ${props.className || ""}`.trim()} />;
}

export function OpSelect(props) {
  return <select {...props} className={`op-select ${props.className || ""}`.trim()} />;
}

export function OpTextarea(props) {
  return <textarea {...props} className={`op-textarea ${props.className || ""}`.trim()} />;
}

export function OpButton({ variant, className, ...props }) {
  const v = variant === "primary" ? "op-btn op-btn--primary" : "op-btn";
  return <button {...props} className={`${v} ${className || ""}`.trim()} />;
}

