#!/usr/bin/env bash
# file: scripts/gemini_quota_diagnose.sh
# Usage: bash scripts/gemini_quota_diagnose.sh [REGION] [API_KEY]
# REGION only matters for Vertex AI (default: us-central1)
# API_KEY only for Generative Language API probe.

set -euo pipefail

# Add gcloud to PATH if not already there
if ! command -v gcloud &> /dev/null; then
    export PATH="/opt/homebrew/Caskroom/gcloud-cli/530.0.0/google-cloud-sdk/bin:$PATH"
fi

REGION="${1:-us-central1}"
PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
API_KEY="${2:-}"

if [[ -z "${PROJECT}" || "${PROJECT}" == "(unset)" ]]; then
  echo "ERR: gcloud project not set. Run: gcloud config set project YOUR_PROJECT_ID" >&2
  exit 1
fi

echo "== Project: ${PROJECT} | Region: ${REGION} =="

echo "1) Billing status:"
gcloud beta billing projects describe "${PROJECT}" --format="table(billingEnabled, billingAccountName, billingAccountOpen)"

echo
echo "2) Enabled services (expect aiplatform &/or generativelanguage):"
gcloud services list --enabled --format="value(config.name)" | sort

echo
echo "3) Which API are you using in code (quick scan of current dir)?"
grep -R "aiplatform.googleapis.com\|generativelanguage.googleapis.com" -n . || echo "   (No endpoints found in files here.)"

echo
echo "4) Quotas: Generative Language API (global per-project):"
gcloud alpha services quota list \
  --service=generativelanguage.googleapis.com \
  --consumer="projects/${PROJECT}" \
  --format="table(metric,limit,unit,dimensions,quota_value,used,exceeded)" 2>/dev/null || echo "   (Quota API not available or no quotas found)"

echo
echo "5) Quotas: Vertex AI (regional per-project):"
gcloud alpha services quota list \
  --service=aiplatform.googleapis.com \
  --consumer="projects/${PROJECT}" \
  --filter="dimensions.region:${REGION} metric:Requests" \
  --format="table(metric,limit,unit,dimensions,quota_value,used,exceeded)" 2>/dev/null || echo "   (Quota API not available or no quotas found)"

echo
echo "6) API keys in THIS project (should match the key you use for GenLang):"
gcloud services api-keys list --project "${PROJECT}" --format="table(displayName,uid,restrictions.apiTargets.list():label=APIs,createTime)" || echo "   (No API Keys API enabled.)"
echo "   NOTE: The API key you use must belong to the SAME project above."

echo
echo "7) Probe the endpoint to see live throttling (optional):"
if [[ -n "${API_KEY}" ]]; then
  echo "   -> Probing Generative Language generateContent with provided API key..."
  curl -s -o /dev/stderr -w "\nHTTP %{http_code}\n" \
    -H "x-goog-api-key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
    -d '{"contents":[{"role":"user","parts":[{"text":"ping"}]}]}' \
    | head -n 40
else
  echo "   (Skip: pass API_KEY as 2nd argument to test GenLang throttle.)"
fi

echo
echo "8) Quick interpretation:"
echo "   - If Generative Language quotas show ~10 requests/min: You are on FREE tier for that API/project."
echo "   - If Vertex per-region quotas are small or zero: request increases in Console (Vertex AI -> Quotas) for ${REGION}."
echo "   - If your API key is from a different project than ${PROJECT}: move the key or switch the project used by your app."
