"""Customer-facing review / order number formatting and lookup."""

from __future__ import annotations

import re

ORDER_PATTERN = re.compile(r"^NL-(\d{8})$", re.IGNORECASE)
CUSTOMER_REQUEST_PATTERN = re.compile(r"^NL-(\d{8})-(\d{3})$", re.IGNORECASE)
LEGACY_REQUEST_PATTERN = re.compile(r"^(.+?)_(\d+)$")


def normalize_order_number(raw: str) -> str:
    """Normalize user input to NL-XXXXXXXX."""
    if not raw or not str(raw).strip():
        return "NL-00000000"
    value = str(raw).strip().upper().lstrip("#").replace(" ", "")
    m = ORDER_PATTERN.match(value)
    if m:
        return f"NL-{m.group(1)}"
    m = re.match(r"^NL-?(\d{8})$", value, re.IGNORECASE)
    if m:
        return f"NL-{m.group(1)}"
    digits = re.sub(r"\D", "", value)
    if digits:
        return f"NL-{digits[-8:].zfill(8)}"
    return value


def format_request_number(order_number: str, sequence: int) -> str:
    """Build customer-facing request id NL-XXXXXXXX-NNN."""
    order = normalize_order_number(order_number)
    seq = max(1, min(int(sequence), 999))
    return f"{order}-{seq:03d}"


def _legacy_sequence_to_int(seq_part: str) -> int:
    seq = int(seq_part)
    if seq >= 1000:
        return seq % 1000 or min(seq // 1000, 999) or 1
    return max(1, seq)


def parse_customer_request_ref(raw: str) -> tuple[str, int] | None:
    """Parse NL-XXXXXXXX-NNN or legacy order_seq into (order, sequence)."""
    if not raw or not str(raw).strip():
        return None
    value = str(raw).strip().upper().lstrip("#").replace(" ", "")
    m = CUSTOMER_REQUEST_PATTERN.match(value)
    if m:
        return normalize_order_number(f"NL-{m.group(1)}"), int(m.group(2))
    m = LEGACY_REQUEST_PATTERN.match(value)
    if m:
        order = normalize_order_number(m.group(1))
        return order, _legacy_sequence_to_int(m.group(2))
    return None


def customer_display_request_number(
    stored_request_number: str | None,
    order_number: str | None = None,
    request_sequence: int | None = None,
) -> str:
    """Return NL-XXXXXXXX-NNN for API responses and client UI."""
    if order_number and request_sequence is not None:
        return format_request_number(order_number, request_sequence)
    if stored_request_number:
        parsed = parse_customer_request_ref(stored_request_number)
        if parsed:
            return format_request_number(parsed[0], parsed[1])
        cleaned = str(stored_request_number).strip().upper().lstrip("#").replace(" ", "")
        if CUSTOMER_REQUEST_PATTERN.match(cleaned):
            return cleaned
    return (stored_request_number or "").strip()


def resolve_review_by_request_ref(db, ref: str):
    """Find review by customer-facing id or legacy stored request_number."""
    from sqlalchemy import or_

    from app.models.entities import Review

    cleaned = (ref or "").strip().lstrip("#")
    if not cleaned:
        return None

    review = db.query(Review).filter(Review.request_number == cleaned).first()
    if review:
        return review

    review = db.query(Review).filter(Review.request_number == cleaned.upper()).first()
    if review:
        return review

    parsed = parse_customer_request_ref(cleaned)
    if parsed:
        order, seq = parsed
        review = (
            db.query(Review)
            .filter(Review.order_number == order, Review.request_sequence == seq)
            .first()
        )
        if review:
            return review
        digits = order.replace("NL-", "")
        legacy_order = digits.lstrip("0") or "0"
        review = (
            db.query(Review)
            .filter(
                Review.request_sequence == seq,
                or_(
                    Review.order_number == order,
                    Review.order_number == digits,
                    Review.order_number == legacy_order,
                ),
            )
            .first()
        )
        if review:
            return review

    legacy_key = cleaned.upper().replace(" ", "")
    if "_" in legacy_key:
        return db.query(Review).filter(Review.request_number == legacy_key).first()

    return None
