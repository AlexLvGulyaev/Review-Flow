import { createContext, useCallback, useContext, useMemo, useState } from "react";

import ReviewCreationModal from "../components/client/ReviewCreationModal.jsx";
import StatusLookupModal from "../components/client/StatusLookupModal.jsx";

const ClientModalContext = createContext(null);

export function ClientModalProvider({ children }) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusPrefill, setStatusPrefill] = useState({ requestNumber: "", email: "" });

  const openReviewModal = useCallback(() => setReviewOpen(true), []);
  const closeReviewModal = useCallback(() => setReviewOpen(false), []);

  const openStatusModal = useCallback((prefill = {}) => {
    setStatusPrefill({
      requestNumber: prefill.requestNumber || "",
      email: prefill.email || "",
    });
    setStatusOpen(true);
  }, []);
  const closeStatusModal = useCallback(() => {
    setStatusOpen(false);
    setStatusPrefill({ requestNumber: "", email: "" });
  }, []);

  const value = useMemo(
    () => ({
      openReviewModal,
      closeReviewModal,
      openStatusModal,
      closeStatusModal,
    }),
    [openReviewModal, closeReviewModal, openStatusModal, closeStatusModal],
  );

  return (
    <ClientModalContext.Provider value={value}>
      {children}
      <ReviewCreationModal
        open={reviewOpen}
        onClose={closeReviewModal}
        onCheckStatus={(prefill) => openStatusModal(prefill)}
      />
      <StatusLookupModal
        open={statusOpen}
        onClose={closeStatusModal}
        initialRequestNumber={statusPrefill.requestNumber}
        initialEmail={statusPrefill.email}
      />
    </ClientModalContext.Provider>
  );
}

export function useClientModals() {
  const ctx = useContext(ClientModalContext);
  if (!ctx) {
    throw new Error("useClientModals must be used within ClientModalProvider");
  }
  return ctx;
}
