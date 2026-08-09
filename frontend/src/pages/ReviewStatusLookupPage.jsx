import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useClientModals } from "../context/ClientModalContext.jsx";

/** Fallback route: opens status lookup modal, then returns to /. */
export default function ReviewStatusLookupPage() {
  const navigate = useNavigate();
  const { openStatusModal } = useClientModals();

  useEffect(() => {
    openStatusModal();
    navigate("/", { replace: true });
  }, [openStatusModal, navigate]);

  return null;
}
