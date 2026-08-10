#!/usr/bin/env bash
# Публикация ответа оператором в Review Flow

BASE_URL="https://review-flow-api.alex-n8n.site"
# BASE_URL="http://localhost:8700"
REVIEW_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"

curl -X POST "${BASE_URL}/api/operator/reviews/${REVIEW_ID}/approve" \
  -H "Content-Type: application/json" \
  -H "X-Role: operator" \
  -d '{
    "final_response": "Иван, спасибо за отзыв. Приносим извинения за повреждение упаковки — мы компенсируем неудобства и передадим замечание службе доставки, чтобы избежать повторения."
  }' | python3 -m json.tool
