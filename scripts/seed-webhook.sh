#!/usr/bin/env bash
#
# Send a single webhook alert with a valid HMAC signature.
# This verifies the full ingestion pipeline:
#   HMAC verification → idempotency → BullMQ queue → worker processing
#
# Usage:
#   bash scripts/seed-webhook.sh
#
# Prerequisites:
#   - Server running on http://localhost:3001
#   - openssl installed (for HMAC computation)

set -e

API_URL="http://localhost:3001"
WEBHOOK_SECRET="webhook-shared-secret-with-provider"

# Generate a unique eventId
EVENT_ID="manual-test-$(date +%s)"

# Build the JSON payload
BODY=$(cat <<EOF
{
  "eventId": "${EVENT_ID}",
  "deviceId": "DEV-MANUAL-01",
  "patientId": "PT-001",
  "severity": "high",
  "message": "Manual test alert from seed-webhook.sh",
  "triggeredAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)

# Compute HMAC-SHA256 signature
SIGNATURE="sha256=$(echo -n "${BODY}" | openssl dgst -sha256 -hmac "${WEBHOOK_SECRET}" | awk '{print $NF}')"

echo "📤 Sending webhook alert..."
echo "   Event ID: ${EVENT_ID}"
echo "   Payload:  ${BODY}"
echo "   Signature: ${SIGNATURE}"
echo ""

# Send the request
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${API_URL}/api/webhooks/alerts" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: ${SIGNATURE}" \
  -d "${BODY}")

HTTP_CODE=$(echo "${RESPONSE}" | tail -1)
BODY_RESPONSE=$(echo "${RESPONSE}" | sed '$d')

echo "📥 Response [${HTTP_CODE}]:"
echo "${BODY_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${BODY_RESPONSE}"

echo ""

# Send the same event again to test idempotency
echo "🔄 Sending duplicate event (testing idempotency)..."
RESPONSE2=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${API_URL}/api/webhooks/alerts" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: ${SIGNATURE}" \
  -d "${BODY}")

HTTP_CODE2=$(echo "${RESPONSE2}" | tail -1)
BODY_RESPONSE2=$(echo "${RESPONSE2}" | sed '$d')

echo "📥 Response [${HTTP_CODE2}]:"
echo "${BODY_RESPONSE2}" | python3 -m json.tool 2>/dev/null || echo "${BODY_RESPONSE2}"

echo ""

if [ "${HTTP_CODE}" = "202" ] && [ "${HTTP_CODE2}" = "200" ]; then
  echo "✅ Webhook pipeline working! First request: 202 (accepted), Duplicate: 200 (idempotent)"
else
  echo "⚠️  Unexpected response codes. First: ${HTTP_CODE}, Duplicate: ${HTTP_CODE2}"
  echo "   Make sure the server is running: npm run dev:server"
fi
