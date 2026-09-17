# Assets Module

Downloads the CDN asset bundle on first launch and hands off to the video splash.

- `stores/AssetsContext` — owns the download lifecycle and primes the synchronous
  lookup in `@/services/assets`.
- `pages/asset-loading` — the first screen of the app.

The download happens **once**; every later launch resolves artwork from disk with
no network on the startup path. See the header comment in `stores/AssetsContext.tsx`
for why that holds, and `scripts/build-assets.py` for how the bundle is produced.
