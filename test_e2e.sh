#!/usr/bin/env bash
# E2E test script for lpsec site. Run after server is up (http://localhost:3000)
set -euo pipefail
BASE=${BASE:-http://localhost:3000}

echo "Creating request..."
REQ=$(curl -s -X POST -H "Content-Type: application/json" -d '{"name":"tester","code":""}' "$BASE/api/request-access")
echo "$REQ" | jq || echo "$REQ"
ID=$(echo "$REQ" | jq -r '.id')
if [ -z "$ID" ] || [ "$ID" = "null" ]; then
  echo "Failed to obtain id from request response" >&2
  exit 2
fi

echo "Request id: $ID"

echo "Checking initial status..."
curl -s "$BASE/api/entry-status?id=$ID" | jq || true

echo "Logging in as admin (sage)..."
ADMIN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"user":"sage","pass":"audia81989"}' "$BASE/api/admin/login")
echo "$ADMIN" | jq || echo "$ADMIN"
TOKEN=$(echo "$ADMIN" | jq -r '.token')
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Admin login failed" >&2
  exit 3
fi

echo "Token: $TOKEN"

echo "Listing requests..."
curl -s -H "x-admin-token: $TOKEN" "$BASE/api/admin/requests" | jq || true

echo "Approving request..."
curl -s -X POST -H "Content-Type: application/json" -H "x-admin-token: $TOKEN" -d "{\"id\":\"$ID\"}" "$BASE/api/admin/approve" | jq || true

echo "Final status:"
curl -s "$BASE/api/entry-status?id=$ID" | jq || true

echo "E2E script finished."
