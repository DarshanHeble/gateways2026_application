// `manifest.ts` reaches into the request layer and AsyncStorage at import time;
// neither is relevant to the structural guard under test.
jest.mock("../../api", () => ({ getOnlineHint: () => true }));
jest.mock("../../offline/cache", () => ({
  CACHE_KEYS: { ASSET_MANIFEST: "@test_manifest" },
  readCache: jest.fn(),
  writeCache: jest.fn(),
}));

import { isValidManifest } from "../manifest";

const valid = {
  version: 1,
  generatedAt: "2026-09-18T00:00:00+00:00",
  baseUrl: "https://cdn.example.test/gh/owner/repo@main/",
  assets: [
    { key: "event/promptx", path: "images/events/promptx.aaaa1111.webp", bytes: 10, sha256: "a" },
  ],
};

/**
 * The guard exists because a CDN can answer 200 with an error page, a truncated
 * body, or a half-written file. Feeding any of those to the downloader would
 * either crash a render or overwrite a perfectly good install record.
 */
describe("isValidManifest", () => {
  it("accepts a well-formed manifest", () => {
    expect(isValidManifest(valid)).toBe(true);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string (e.g. an HTML error page)", "<!doctype html><html>404</html>"],
    ["a number", 42],
    ["an array", []],
  ])("rejects %s", (_label, input) => {
    expect(isValidManifest(input)).toBe(false);
  });

  it("rejects a manifest with no assets — an empty bundle is never correct", () => {
    expect(isValidManifest({ ...valid, assets: [] })).toBe(false);
  });

  it("rejects a missing or empty baseUrl", () => {
    expect(isValidManifest({ ...valid, baseUrl: "" })).toBe(false);
    const { baseUrl, ...withoutBaseUrl } = valid;
    expect(isValidManifest(withoutBaseUrl)).toBe(false);
  });

  it.each([
    ["key", { key: "", path: "p", bytes: 1, sha256: "s" }],
    ["path", { key: "k", path: "", bytes: 1, sha256: "s" }],
    ["sha256 type", { key: "k", path: "p", bytes: 1, sha256: 5 }],
    ["bytes type", { key: "k", path: "p", bytes: "10", sha256: "s" }],
    ["negative bytes", { key: "k", path: "p", bytes: -1, sha256: "s" }],
    ["null entry", null],
  ])("rejects an entry with a bad %s", (_label, entry) => {
    expect(isValidManifest({ ...valid, assets: [entry] })).toBe(false);
  });

  it("rejects when only some entries are malformed", () => {
    expect(isValidManifest({ ...valid, assets: [valid.assets[0], { key: "x" }] })).toBe(false);
  });
});
