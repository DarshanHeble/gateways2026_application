import { STALL_TIMEOUT_MS, downloadManifest } from "../downloader";
import type { AssetManifest } from "../types";

// (jest.mock is hoisted above the imports.)
// expo-file-system is native; a small in-memory stand-in is enough to drive
// `downloadManifest` and pin down how it treats a download that never moves.
const mockBehaviour: Record<string, "ok" | "hang" | "trickle-then-hang"> = {};

jest.mock("expo-file-system", () => {
  const written = new Set<string>();
  class Directory {
    uri: string;
    constructor(...parts: any[]) {
      this.uri = parts.map((p) => (typeof p === "string" ? p : p.uri)).join("/");
    }
    get exists() {
      return true;
    }
    create() {}
  }
  class File {
    uri: string;
    constructor(dir: any, name: string) {
      this.uri = `${dir.uri}/${name}`;
    }
    get exists() {
      return written.has(this.uri);
    }
    static createDownloadTask(url: string, dest: any, opts: any) {
      const name = url.split("/").pop() as string;
      return {
        downloadAsync: () =>
          new Promise((resolve, reject) => {
            const abort = () => reject(new Error("aborted"));
            if (opts.signal?.aborted) return abort();
            opts.signal?.addEventListener("abort", abort);
            const mode = mockBehaviour[name] ?? "ok";
            if (mode === "ok") {
              opts.onProgress?.({ bytesWritten: 10, totalBytes: 10 });
              written.add(dest.uri);
              resolve(dest);
            } else if (mode === "trickle-then-hang") {
              // Bytes keep arriving for a while, then stop.
              let n = 0;
              const id = setInterval(() => {
                n += 1;
                opts.onProgress?.({ bytesWritten: n, totalBytes: 100 });
                if (n === 5) clearInterval(id);
              }, 10_000);
            }
            // "hang": nothing ever arrives.
          }),
      };
    }
  }
  return { Directory, File, Paths: { document: new Directory("file:///docs") } };
});

const manifest = (paths: string[]): AssetManifest => ({
  version: 1,
  generatedAt: "2026-09-27T00:00:00+00:00",
  baseUrl: "https://cdn.example.test/",
  assets: paths.map((path, i) => ({ key: `k/${i}`, path, bytes: 10, sha256: String(i) })),
});

beforeEach(() => {
  jest.useFakeTimers();
  for (const k of Object.keys(mockBehaviour)) delete mockBehaviour[k];
});
afterEach(() => jest.useRealTimers());

describe("downloadManifest stall watchdog", () => {
  it("gives up on a file that receives no data, instead of waiting forever", async () => {
    mockBehaviour["video.aaaa.mp4"] = "hang";
    const run = downloadManifest(manifest(["videos/video.aaaa.mp4", "images/a.bbbb.webp"]));

    await jest.advanceTimersByTimeAsync(STALL_TIMEOUT_MS + 1);
    const outcome = await run;

    expect(outcome.downloaded).toBe(1);
    expect(outcome.failed.map((f) => f.path)).toEqual(["videos/video.aaaa.mp4"]);
  });

  it("abandons a whole dead network after one stall window, not one per file", async () => {
    // 12 files, 3 at a time, nothing ever arrives — the CDN is unreachable.
    const paths = Array.from({ length: 12 }, (_, i) => `images/f${i}.${i}${i}${i}${i}.webp`);
    for (const path of paths) mockBehaviour[path.split("/")[1]] = "hang";
    const run = downloadManifest(manifest(paths));

    let settled = false;
    run.then(() => (settled = true));
    await jest.advanceTimersByTimeAsync(STALL_TIMEOUT_MS + 1);
    await jest.advanceTimersByTimeAsync(1);

    // Per-file timeouts alone would need four windows (12 / 3); this is one.
    expect(settled).toBe(true);
    const outcome = await run;
    expect(outcome.downloaded).toBe(0);
    expect(outcome.failed).toHaveLength(12);
  });

  it("does not time out a slow download that is still making progress", async () => {
    mockBehaviour["slow.cccc.mp4"] = "trickle-then-hang";
    const run = downloadManifest(manifest(["videos/slow.cccc.mp4"]));

    // Five progress ticks 10s apart: 50s in total, far longer than the stall
    // window, but never a full window without a byte — so it must still run.
    await jest.advanceTimersByTimeAsync(50_000);
    let settled = false;
    run.then(() => (settled = true));
    await jest.advanceTimersByTimeAsync(1);
    expect(settled).toBe(false);

    // Then it stops moving, and the watchdog takes it.
    await jest.advanceTimersByTimeAsync(STALL_TIMEOUT_MS + 1);
    const outcome = await run;
    expect(outcome.failed.map((f) => f.path)).toEqual(["videos/slow.cccc.mp4"]);
  });

  it("leaves healthy downloads alone", async () => {
    const outcome = await downloadManifest(manifest(["images/x.dddd.webp", "images/y.eeee.webp"]));
    expect(outcome.failed).toEqual([]);
    expect(outcome.downloaded).toBe(2);
  });
});
