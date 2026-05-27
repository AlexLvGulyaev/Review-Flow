const ORDER_PATTERN = /^NL-(\d{8})$/i;
const CUSTOMER_REQUEST_PATTERN = /^NL-(\d{8})-(\d{3})$/i;
const LEGACY_REQUEST_PATTERN = /^(.+?)_(\d+)$/;

export function normalizeOrderNumber(raw) {
  if (!raw || !String(raw).trim()) return "NL-00000000";
  const value = String(raw).trim().toUpperCase().replace(/^#/, "").replace(/\s+/g, "");
  const direct = value.match(/^NL-?(\d{8})$/i);
  if (direct) return `NL-${direct[1]}`;
  const digits = value.replace(/\D/g, "");
  if (digits) return `NL-${digits.slice(-8).padStart(8, "0")}`;
  return value;
}

export function formatRequestNumber(orderNumber, sequence) {
  const order = normalizeOrderNumber(orderNumber);
  const seq = Math.max(1, Math.min(Number(sequence) || 1, 999));
  return `${order}-${String(seq).padStart(3, "0")}`;
}

function legacySequenceToInt(seqPart) {
  let seq = Number.parseInt(seqPart, 10);
  if (!Number.isFinite(seq) || seq <= 0) return 1;
  if (seq >= 1000) {
    seq = seq % 1000 || Math.min(Math.floor(seq / 1000), 999) || 1;
  }
  return Math.min(seq, 999);
}

export function parseCustomerRequestRef(raw) {
  if (!raw || !String(raw).trim()) return null;
  const value = String(raw).trim().toUpperCase().replace(/^#/, "").replace(/\s+/g, "");
  const customer = value.match(CUSTOMER_REQUEST_PATTERN);
  if (customer) {
    return {
      order: normalizeOrderNumber(`NL-${customer[1]}`),
      sequence: Number.parseInt(customer[2], 10),
    };
  }
  const legacy = value.match(LEGACY_REQUEST_PATTERN);
  if (legacy) {
    return {
      order: normalizeOrderNumber(legacy[1]),
      sequence: legacySequenceToInt(legacy[2]),
    };
  }
  return null;
}

export function normalizeRequestNumberInput(raw) {
  const parsed = parseCustomerRequestRef(raw);
  if (parsed) return formatRequestNumber(parsed.order, parsed.sequence);
  return String(raw || "").trim().toUpperCase().replace(/^#/, "").replace(/\s+/g, "");
}

export function displayRequestNumber(stored, orderNumber, requestSequence) {
  if (orderNumber != null && requestSequence != null) {
    return formatRequestNumber(orderNumber, requestSequence);
  }
  if (stored) {
    const parsed = parseCustomerRequestRef(stored);
    if (parsed) return formatRequestNumber(parsed.order, parsed.sequence);
    const cleaned = String(stored).trim().toUpperCase().replace(/^#/, "").replace(/\s+/g, "");
    if (CUSTOMER_REQUEST_PATTERN.test(cleaned)) return cleaned;
  }
  return stored ? String(stored).trim() : "";
}
