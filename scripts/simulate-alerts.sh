#!/usr/bin/env bash
#
# Simulate rapid-fire low-severity alerts to demonstrate
# the suppression/batching feature.
#
# Sends 6 LOW alerts for the same patient in quick succession.
# The first 3 should be ACTIVE, alerts 4-6 should be SUPPRESSED
# (threshold = 3 per 5-minute window).
#
# Also sends 1 HIGH alert to show it's never suppressed.
#
# Usage:
#   bash scripts/simulate-alerts.sh
#
# Prerequisites:
#   - Server running on http://localhost:3001
#   - openssl installed
#   - Redis running

set -e

API_URL="http://localhost:3001"
WEBHOOK_SECRET="webhook-shared-secret-with-provider"
PATIENT_ID="PT-001"

send_alert() {
  local SEVERITY="$1"
  local INDEX="$2"
  local EVENT_ID="sim-${SEVERITY}-${INDEX}-$(date +%s%N)"

  local BODY=$(cat <<EOF
{
  "eventId": "${EVENT_ID}",
  "deviceId": "DEV-SIM-01",
  "patientId": "${PATIENT_ID}",
  "severity": "${SEVERITY}",
  "message": "Simulated ${SEVERITY} alert #${INDEX}",
  "triggeredAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)

  local SIGNATURE="sha256=$(echo -n "${BODY}" | openssl dgst -sha256 -hmac "${WEBHOOK_SECRET}" | awk '{print $NF}')"

  local RESPONSE=$(curl -s -w "|%{http_code}" \
    -X POST \
    "${API_URL}/api/webhooks/alerts" \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Signature: ${SIGNATURE}" \
    -d "${BODY}")

  local HTTP_CODE=$(echo "${RESPONSE}" | rev | cut -d'|' -f1 | rev)
  local BODY_RESPONSE=$(echo "${RESPONSE}" | rev | cut -d'|' -f2- | rev)

  local MSG=$(echo "${BODY_RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null || echo "")

  echo "  ${SEVERITY} #${INDEX} → [${HTTP_CODE}] ${MSG}"
}

echo "🚨 Simulating alert burst for patient ${PATIENT_ID}"
echo ""
echo "── LOW severity alerts (should suppress after 3) ──"

for i in 1 2 3 4 5 6; do
  send_alert "low" "$i"
  sleep 0.5
done

echo ""
echo "── HIGH severity alert (never suppressed) ──"
send_alert "high" "1"

echo ""
echo "⏳ Waiting 3 seconds for worker to process..."
sleep 3

echo ""
echo "📊 Checking alert statuses..."
TOKEN=$(curl -s "${API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"clinician@carealert.io","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('data', {}).get('token',''))" 2>/dev/null)

if [ -n "${TOKEN}" ]; then
  ALERTS=$(curl -s "${API_URL}/api/alerts?patientId=${PATIENT_ID}&limit=20" \
    -H "Authorization: Bearer ${TOKEN}")

  echo ""
  echo "  Active alerts:     $(echo "${ALERTS}" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print(len([a for a in d.get('alerts',[]) if a.get('status')=='ACTIVE']))" 2>/dev/null || echo '?')"
  echo "  Suppressed alerts: $(echo "${ALERTS}" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print(len([a for a in d.get('alerts',[]) if a.get('status')=='SUPPRESSED']))" 2>/dev/null || echo '?')"
  echo ""
  echo "✅ Simulation complete! Check the dashboard at http://localhost:3000"
else
  echo "⚠️  Could not get auth token. Make sure the server is running and seeded."
fi
