import { useEffect } from "react";

export default function ClientModal({
  open,
  onClose,
  labelledBy,
  children,
  dialogClassName = "client-modal-dialog",
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="client-modal-root" role="presentation">
      <button
        type="button"
        className="client-modal-backdrop"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        className={dialogClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  );
}
