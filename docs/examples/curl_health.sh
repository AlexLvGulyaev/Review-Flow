#!/usr/bin/env bash
# Проверка доступности Review Flow API

BASE_URL="https://review-flow-api.alex-n8n.site"
# BASE_URL="http://localhost:8700"

curl -s "${BASE_URL}/health" | python3 -m json.tool
