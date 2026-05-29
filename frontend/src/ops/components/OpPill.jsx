const COLOR_MAP = {
  blue: "op-pill op-pill--blue",
  green: "op-pill op-pill--green",
  orange: "op-pill op-pill--orange",
  red: "op-pill op-pill--red",
  gray: "op-pill",
};

export function OpPillRow({ children }) {
  return <div className="op-pill-row">{children}</div>;
}

export function OpPill({ color = "gray", children, title }) {
  const cls = COLOR_MAP[color] || COLOR_MAP.gray;
  return (
    <span className={cls} title={title}>
      {children}
    </span>
  );
}

export function moderationPillColor(status) {
  if (status === "approved") return "green";
  if (status === "pending_review") return "blue";
  if (status === "needs_revision") return "orange";
  if (status === "rejected") return "red";
  return "gray";
}

export function publicationPillColor(status) {
  if (status === "published") return "green";
  if (status === "failed") return "red";
  if (status === "not_published") return "gray";
  return "gray";
}

export function priorityPillColor(priority) {
  if (priority === "critical") return "red";
  if (priority === "high") return "orange";
  if (priority === "medium") return "blue";
  if (priority === "low") return "gray";
  return "gray";
}

