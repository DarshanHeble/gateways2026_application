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

# Update .env
ENV_FILE=".env"
echo "💉 Injecting new URL into $ENV_FILE..."

# Remove any existing EXPO_PUBLIC_API_URL line so we don't get duplicates
sed -i '/^EXPO_PUBLIC_API_URL=/d' "$ENV_FILE"

# Add the new URL to .env
echo "EXPO_PUBLIC_API_URL=${URL}/api/v1" >> "$ENV_FILE"

echo "✨ Successfully updated EXPO_PUBLIC_API_URL in $ENV_FILE"
echo "⚠️  NOTE: Tunnel is running in the background (PID: $PINGGY_PID) and will expire in 60 minutes."
