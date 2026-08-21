#!/bin/bash
echo "🚀 Starting Pinggy tunnel for port 4000..."

# Kill any existing Pinggy SSH sessions so we don't end up with zombies
pkill -f "a.pinggy.io"

# Start Pinggy in the background and redirect output to a log file
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:4000 a.pinggy.io > pinggy.log 2>&1 &
PINGGY_PID=$!

echo "⏳ Waiting for tunnel to assign URL (takes a few seconds)..."
sleep 5

# Extract the https URL from the log
URL=$(grep -oE 'https://[a-zA-Z0-9.-]+(\.pinggy\.net|\.pinggy-free\.link)' pinggy.log | head -n 1)

if [ -z "$URL" ]; then
    echo "❌ Failed to start tunnel. Check pinggy.log for errors."
    exit 1
fi

echo "✅ Tunnel established at: $URL"

# Update api.ts
API_FILE="src/services/api.ts"
echo "💉 Injecting new URL into $API_FILE..."

# Use sed to seamlessly replace the API_BASE_URL line
sed -i -E "s|export const API_BASE_URL = 'https://[^']*/api/v1';|export const API_BASE_URL = '${URL}/api/v1';|" "$API_FILE"

echo "✨ Successfully updated API_BASE_URL to ${URL}/api/v1"
echo "⚠️  NOTE: Tunnel is running in the background (PID: $PINGGY_PID) and will expire in 60 minutes."
