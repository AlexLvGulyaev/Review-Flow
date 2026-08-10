#!/usr/bin/env bash
# Создание клиентского обращения в Review Flow

BASE_URL="https://review-flow-api.alex-n8n.site"
# BASE_URL="http://localhost:8700"

curl -X POST "${BASE_URL}/api/reviews" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Иван Петров",
    "email": "ivan.petrov@example.com",
    "order_number": "NL-00999999",
    "product_area": "Доставка",
    "rating": 4,
    "review_text": "Заказ пришёл быстро, но упаковка была повреждена. Хотелось бы получить компенсацию и убедиться, что такое не повторится."
  }' | python3 -m json.tool
