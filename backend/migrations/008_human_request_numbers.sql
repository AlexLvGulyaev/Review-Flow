ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS order_number VARCHAR(64),
ADD COLUMN IF NOT EXISTS request_sequence INTEGER,
ADD COLUMN IF NOT EXISTS request_number VARCHAR(80);

CREATE UNIQUE INDEX IF NOT EXISTS ux_reviews_request_number
ON reviews (request_number)
WHERE request_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_reviews_order_sequence
ON reviews (order_number, request_sequence)
WHERE order_number IS NOT NULL AND request_sequence IS NOT NULL;

