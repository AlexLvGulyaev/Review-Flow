import { useEffect, useState } from "react";

import { fetchReviewStatus } from "../../lib/reviewStatus.js";
import ClientModal from "./ClientModal.jsx";
import StatusModalPanel from "./StatusModalPanel.jsx";

export default function StatusLookupModal({
  open,
  onClose,
  initialRequestNumber = "",
  initialEmail = "",
}) {
  const [requestNumber, setRequestNumber] = useState(initialRequestNumber);
  const [email, setEmail] = useState(initialEmail);
  const [formError, setFormError] = useState(null);
  const [panelPhase, setPanelPhase] = useState("idle");
  const [statusData, setStatusData] = useState(null);
  const [panelError, setPanelError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRequestNumber(initialRequestNumber);
    setEmail(initialEmail);
    setFormError(null);
    setSubmitting(false);
    if (initialRequestNumber.trim() && initialEmail.trim()) {
      void runLookup(initialRequestNumber, initialEmail);
    } else {
      resetPanel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when modal opens/prefill changes
  }, [open, initialRequestNumber, initialEmail]);

  function resetPanel() {
    setPanelPhase("idle");
    setStatusData(null);
    setPanelError(null);
  }

  function handleClose() {
    resetPanel();
    setFormError(null);
    onClose();
  }

  async function runLookup(num, mail) {
    setSubmitting(true);
    setFormError(null);
    setPanelPhase("loading");
    setStatusData(null);
    setPanelError(null);

    try {
      const data = await fetchReviewStatus(num, mail);
      setStatusData(data);
      setPanelPhase("success");
    } catch (err) {
      console.error("[StatusLookupModal] lookup failed", err);
      setPanelError(err);
      setPanelPhase("error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!requestNumber.trim()) return setFormError("Укажите номер обращения");
    if (!email.trim()) return setFormError("Укажите email");
    await runLookup(requestNumber, email);
  }

  const titleId = "status-modal-title";

  return (
    <ClientModal
      open={open}
      onClose={handleClose}
      labelledBy={titleId}
      dialogClassName="client-modal-dialog-wide"
    >
      <div className="client-modal-card client-status-modal">
        <button type="button" className="client-modal-close" onClick={handleClose} aria-label="Закрыть">
          ×
        </button>
        <div className="client-status-modal-grid">
          <div className="client-status-modal-form-col">
            <header className="client-modal-header">
              <h2 id={titleId}>Проверить статус обращения</h2>
              <p className="muted client-modal-subtitle">
                Введите номер обращения и email, указанный при отправке. Мы покажем текущий
                статус и опубликованный ответ.
              </p>
            </header>
            <form className="client-modal-form client-status-modal-form" onSubmit={handleSubmit}>
              <label className="client-modal-field">
                <span className="client-modal-label">
                  Номер обращения <span className="req">*</span>
                </span>
                <input
                  value={requestNumber}
                  onChange={(e) => {
                    setRequestNumber(e.target.value);
                    if (panelPhase !== "idle") resetPanel();
                  }}
                  placeholder="NL-00500001-001"
                  autoComplete="off"
                  required
                  disabled={submitting}
                />
              </label>
              <label className="client-modal-field">
                <span className="client-modal-label">
                  Email <span className="req">*</span>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (panelPhase !== "idle") resetPanel();
                  }}
                  placeholder="example@email.com"
                  required
                  disabled={submitting}
                />
              </label>
              {formError && <p className="error client-modal-error">{formError}</p>}
              <div className="client-status-modal-submit">
                <button
                  type="submit"
                  className="client-btn primary client-status-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? "Проверка…" : "Проверить статус"}
                </button>
              </div>
              <p className="client-status-privacy-note" role="note">
                <span aria-hidden="true">🔒</span> Ваши данные защищены и не передаются третьим
                лицам
              </p>
            </form>
          </div>
          <div className="client-status-modal-right">
            <StatusModalPanel phase={panelPhase} data={statusData} error={panelError} />
          </div>
        </div>
      </div>
    </ClientModal>
  );
}
