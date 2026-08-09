import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useClientModals } from "../context/ClientModalContext.jsx";

/** Deep-link fallback: opens status modal with prefilled data, returns to homepage. */
export default function ReviewStatusPage() {
  const { requestNumber } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { openStatusModal } = useClientModals();

  useEffect(() => {
    const email = searchParams.get("email") || "";
    const decoded = requestNumber ? decodeURIComponent(requestNumber) : "";
    openStatusModal({ requestNumber: decoded, email });
    navigate("/", { replace: true });
  }, [requestNumber, searchParams, openStatusModal, navigate]);

  return null;
}
