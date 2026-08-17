# Gateways 2026 Application

A production-ready Expo React Native application.

## Local Development Workflow (Mobile + Backend)

Because the mobile app runs on a physical device (often on a different network/WiFi), it cannot access the backend directly via `localhost:4000`. Follow these steps to run the full stack locally:

### 1. Start the Backend & Database
In your **backend** directory (`gateways2026_backend`), run the following command. It automatically spins up the MySQL Docker container (on port `3307`) and starts the Fastify API.
```bash
# In the gateways2026_backend folder
npm run dev:all
```

### 2. Expose the Backend API via Tunnel
To securely route traffic from your phone to your local backend, open a **new terminal window** and run a Pinggy tunnel:
```bash
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:4000 a.pinggy.io
```
This will generate a public URL (e.g., `https://xxxx-xxx.free.pinggy.net`). Keep this terminal open!

### 3. Link the App to the Tunnel
In this frontend directory, open `src/services/api.ts` and update the `API_BASE_URL` to match the Pinggy URL you just generated:
```typescript
const getApiBaseUrl = () => {
  return 'https://xxxx-xxx.free.pinggy.net/api';
};
```

### 4. Start the Expo App
Finally, start the Expo bundler in tunnel mode to easily connect your physical device:
```bash
npx expo start --tunnel
```
Scan the QR code with your phone. The app will open and successfully fetch data from your local backend!

## Standard Commands

- `npm install` - Install dependencies
- `npx expo start -c --tunnel` - Start app and clear bundler cache (recommended if API URL changes aren't reflecting)
- `npm run android` - Start on Android emulator
- `npm run ios` - Start on iOS Simulator
