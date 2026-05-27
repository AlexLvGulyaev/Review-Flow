-- Normalize legacy order/request numbers to customer-facing NL-XXXXXXXX / NL-XXXXXXXX-NNN

UPDATE reviews
SET order_number = 'NL-' || LPAD(
  RIGHT(REGEXP_REPLACE(COALESCE(order_number, ''), '[^0-9]', '', 'g'), 8),
  8,
  '0'
)
WHERE order_number IS NOT NULL
  AND order_number !~ '^NL-[0-9]{8}$';

UPDATE reviews
SET request_number = order_number || '-' || LPAD(request_sequence::text, 3, '0')
WHERE order_number IS NOT NULL
  AND request_sequence IS NOT NULL
  AND (
    request_number IS NULL
    OR request_number !~ '^NL-[0-9]{8}-[0-9]{3}$'
  );
