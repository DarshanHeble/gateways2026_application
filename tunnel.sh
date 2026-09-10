#!/bin/bash
echo "🚀 Starting Pinggy tunnel for port 5000..."

# Kill any existing Pinggy SSH sessions so we don't end up with zombies
pkill -f "a.pinggy.io"

# Start Pinggy in the background and redirect output to a log file
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:5000 a.pinggy.io > pinggy.log 2>&1 &
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

# If an Android device is connected via USB, forward ports directly for zero-latency, 100% reliable connection
if command -v adb >/dev/null 2>&1; then
    if adb get-state >/dev/null 2>&1; then
        echo "🔌 USB device detected. Setting up ADB reverse forwarding..."
        adb reverse tcp:5000 tcp:5000 2>/dev/null || true
        adb reverse tcp:8081 tcp:8081 2>/dev/null || true
        echo "✅ ADB reverse active: phone can access backend at http://localhost:5000"
    fi
fi

# Update .env
ENV_FILE=".env"
echo "💉 Injecting new URL into $ENV_FILE..."

# Remove any existing EXPO_PUBLIC_API_URL line so we don't get duplicates
# (portable across BSD/macOS and GNU sed, unlike `sed -i` which needs a backup-suffix arg on BSD)
grep -v '^EXPO_PUBLIC_API_URL=' "$ENV_FILE" > "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"

# Add the new URL to .env
echo "EXPO_PUBLIC_API_URL=${URL}/api/v1" >> "$ENV_FILE"

echo "✨ Successfully updated EXPO_PUBLIC_API_URL in $ENV_FILE"
echo "⚠️  NOTE: Tunnel is running in the background (PID: $PINGGY_PID) and will expire in 60 minutes."
