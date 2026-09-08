# Gateways 2026 Application

A production-ready Expo React Native application.

## Local Development Workflow (Mobile + Backend)

Because the mobile app runs on a physical device, and your local Wi-Fi blocks `10.x.x.x` network connections, it cannot access the backend directly via `localhost:5000`. You must use a tunnel (like Pinggy) to bridge the physical phone to your local backend.

Follow these steps to run the full stack locally:

### 1. Start the Backend
In your **backend** directory (`Gateways_backend`), run the following command to start the Fastify API (runs on port `5000`):
```bash
# In the Gateways_backend folder
npm run dev
```

### 2. Expose the Backend API via Tunnel
To securely route traffic from your phone to your local backend, open a **new terminal window** and run a Pinggy tunnel:
```bash
ssh -p 443 -o StrictHostKeyChecking=no -R0:localhost:5000 a.pinggy.io
```
This will generate a public URL (e.g., `https://xxxx-xxx.run.pinggy-free.link`). Keep this terminal open!

### 3. Link the App to the Tunnel
In this frontend directory, open `src/services/api.ts` and update the `API_BASE_URL` to match the Pinggy URL you just generated:
```typescript
export const API_BASE_URL = 'https://xxxx-xxx.run.pinggy-free.link/api/v1';
```

### 4. Start the Expo App
Finally, compile and start the Android app on your physical device:
```bash
# In the gateways2026_application folder
npx expo run:android
```
Once the app opens on your phone, it will seamlessly connect through the Pinggy tunnel directly to your local backend!

## Standard Commands

- `npm install` - Install dependencies
- `npx expo start -c` - Start Expo server and clear bundler cache
- `npx expo run:android` - Build and install the native Android app
- `npx expo run:ios` - Build and install the native iOS app
