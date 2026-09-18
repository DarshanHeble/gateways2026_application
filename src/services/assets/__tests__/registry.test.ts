import {
  getAssetsVersion,
  isLocal,
  markLocal,
  primeLocal,
  primeRemote,
  resetRegistry,
  resolveAsset,
  resolveAssetUri,
  subscribeToAssets,
} from "../registry";
import type { AssetManifest } from "../types";

const manifest: AssetManifest = {
  version: 1,
  generatedAt: "2026-09-18T00:00:00+00:00",
  // Deliberately trailing-slashed: the real manifest carries one, and the join
  // must not produce a double slash.
  baseUrl: "https://cdn.example.test/gh/owner/repo@main/",
  assets: [
    { key: "event/promptx", path: "images/events/promptx.aaaa1111.webp", bytes: 10, sha256: "a" },
    { key: "video/splash", path: "videos/splash.bbbb2222.mp4", bytes: 20, sha256: "b" },
  ],
};

beforeEach(() => resetRegistry());

describe("resolution order", () => {
  it("returns null when nothing is known", () => {
    expect(resolveAsset("event/promptx")).toBeNull();
    expect(resolveAssetUri("event/promptx")).toBeNull();
  });

  it("falls back to the CDN URL once a manifest is primed", () => {
    primeRemote(manifest);
    expect(resolveAsset("event/promptx")).toEqual({
      uri: "https://cdn.example.test/gh/owner/repo@main/images/events/promptx.aaaa1111.webp",
    });
    expect(isLocal("event/promptx")).toBe(false);
  });

  it("prefers a local file over the CDN", () => {
    primeRemote(manifest);
    primeLocal({ "event/promptx": "file:///assets/promptx.aaaa1111.webp" });

    expect(resolveAssetUri("event/promptx")).toBe("file:///assets/promptx.aaaa1111.webp");
    expect(isLocal("event/promptx")).toBe(true);
    // A key without a local copy still resolves remotely.
    expect(resolveAssetUri("video/splash")).toContain("https://");
  });

  it("still resolves unknown keys to null after priming", () => {
    primeRemote(manifest);
    expect(resolveAsset("event/does-not-exist")).toBeNull();
  });

  it("ignores a null manifest rather than wiping what it knows", () => {
    primeRemote(manifest);
    primeRemote(null);
    expect(resolveAssetUri("event/promptx")).toContain("promptx.aaaa1111.webp");
  });

  it("markLocal upgrades a single key without dropping the others", () => {
    primeRemote(manifest);
    primeLocal({ "event/promptx": "file:///a.webp" });
    markLocal("video/splash", "file:///b.mp4");

    expect(resolveAssetUri("event/promptx")).toBe("file:///a.webp");
    expect(resolveAssetUri("video/splash")).toBe("file:///b.mp4");
  });
});

describe("subscription", () => {
  // This is what stops a component that rendered before priming from staying
  // blank forever — the bug that made the transition characters invisible.
  it("notifies subscribers and advances the version on every mutation", () => {
    const seen: number[] = [];
    const unsubscribe = subscribeToAssets(() => seen.push(getAssetsVersion()));

    primeRemote(manifest);
    primeLocal({ "event/promptx": "file:///a.webp" });
    markLocal("video/splash", "file:///b.mp4");

    expect(seen).toHaveLength(3);
    // Strictly increasing, so useSyncExternalStore always sees a new snapshot.
    expect(seen[1]).toBeGreaterThan(seen[0]);
    expect(seen[2]).toBeGreaterThan(seen[1]);

    unsubscribe();
    primeLocal({});
    expect(seen).toHaveLength(3);
  });

  it("returns a stable version when nothing changes", () => {
    primeRemote(manifest);
    const before = getAssetsVersion();
    expect(getAssetsVersion()).toBe(before);
  });
});
