#!/usr/bin/env bash
# Smoke-test a Gateways backend before building the app against it.
#
#   scripts/check-backend.sh https://your-backend.example.com
#
# Checks every endpoint the app reads without signing in, and that sign-in
# answers (401 without a session is the healthy response).
set -u
base="${1:?usage: check-backend.sh <backend url>}"
base="${base%/}"
base="${base%/api/v1}"
api="$base/api/v1"
fail=0

check() { # name url expected-codes [json-array]
  local name="$1" url="$2" want="$3" array="${4:-}"
  local out code body
  out=$(curl -sS -m 20 -w '\n%{http_code}' "$url" 2>&1) || { printf '  ✗ %-22s %s\n' "$name" "unreachable"; fail=1; return; }
  code="${out##*$'\n'}"; body="${out%$'\n'*}"
  if [[ " $want " != *" $code "* ]]; then printf '  ✗ %-22s HTTP %s (wanted %s)\n' "$name" "$code" "$want"; fail=1; return; fi
  if [[ -n "$array" ]]; then
    local n
    n=$(printf '%s' "$body" | python3 -c 'import json,sys
d=json.load(sys.stdin)
d=(d.get("days") or d.get("data") or d) if isinstance(d,dict) else d
print(len(d) if isinstance(d,list) else -1)' 2>/dev/null || echo -1)
    if [[ "$n" -lt 0 ]]; then printf '  ✗ %-22s HTTP %s but not a JSON list\n' "$name" "$code"; fail=1; return; fi
    printf '  ✓ %-22s HTTP %s, %s items\n' "$name" "$code" "$n"
  else
    printf '  ✓ %-22s HTTP %s\n' "$name" "$code"
  fi
}

echo "Backend: $base"
[[ "$base" == https://* ]] || { echo "  ✗ not https — iOS and Android release builds block plain http"; fail=1; }
check "health"               "$base/health"                 "200"
check "events"               "$api/events"                  "200" list
check "schedule"             "$api/events/schedule"         "200" list
check "announcements"        "$api/events/announcements"    "200" list
check "auth/me (signed out)" "$api/auth/me"                 "401 403"

if [[ $fail -eq 0 ]]; then echo "All good — safe to build against this URL."; else echo "Fix the ✗ items before building."; fi
exit $fail
