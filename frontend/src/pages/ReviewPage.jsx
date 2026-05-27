import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useClientModals } from "../context/ClientModalContext.jsx";

/** Fallback route: opens the same review modal as homepage, then returns to /. */
export default function ReviewPage() {
  const navigate = useNavigate();
  const { openReviewModal } = useClientModals();

  useEffect(() => {
    openReviewModal();
    navigate("/", { replace: true });
  }, [openReviewModal, navigate]);

  return null;
}
