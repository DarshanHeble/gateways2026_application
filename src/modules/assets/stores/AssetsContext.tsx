import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  EMPTY_PROGRESS,
  downloadManifest,
  fetchRemoteManifest,
  loadLocalManifest,
  missingFiles,
  primeLocal,
  primeRemote,
  scanInstalled,
  writeCachedManifest,
  type AssetManifest,
  type AssetProgress,
  type AssetStatus,
} from "@/services/assets";

/**
 * Owns the lifecycle of the downloadable asset bundle.
 *
 * The contract this exists to guarantee: **assets download once.** Every launch
 * after the first resolves artwork from disk with no network on the startup
 * path at all. That falls out of three things —
 *
 *  - the last-known manifest is read from AsyncStorage, not the CDN, so we know
 *    what we should have without asking anyone;
 *  - filenames carry a content hash, so `exists` is a complete integrity check
 *    and a warm launch never re-hashes megabytes;
 *  - the CDN re-check is fired *after* the UI is interactive and can never gate
 *    startup, so a slow or unreachable CDN costs nothing.
 */

interface AssetsContextType {
  status: AssetStatus;
  progress: AssetProgress;
  /** True once the loading page has nothing left to do and should hand off. */
  isSettled: boolean;
  /** Number of files that failed this run; drives the retry affordance. */
  failedCount: number;
  skip: () => void;
  retry: () => void;
}

const AssetsContext = createContext<AssetsContextType>({
  status: "checking",
  progress: EMPTY_PROGRESS,
  isSettled: false,
  failedCount: 0,
  skip: () => {},
  retry: () => {},
});

export function AssetsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AssetStatus>("checking");
  const [progress, setProgress] = useState<AssetProgress>(EMPTY_PROGRESS);
  const [failedCount, setFailedCount] = useState(0);

  const mounted = useRef(true);
  // One download at a time. Mount, retry and the background refresh can all fire
  // within the same moment and would otherwise fetch the bundle twice.
  const running = useRef(false);
  const manifestRef = useRef<AssetManifest | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  /** Publish whatever is on disk right now into the synchronous registry. */
  const republish = useCallback((manifest: AssetManifest) => {
    primeRemote(manifest);
    primeLocal(scanInstalled(manifest));
  }, []);

  const install = useCallback(
    async (manifest: AssetManifest, { background }: { background: boolean }) => {
      if (running.current) return;

      const outstanding = missingFiles(manifest);
      if (outstanding.length === 0) {
        republish(manifest);
        if (mounted.current && !background) setStatus("ready");
        return;
      }

      running.current = true;
      const controller = new AbortController();
      abortRef.current = controller;

      if (mounted.current && !background) setStatus("downloading");

      try {
        const outcome = await downloadManifest(manifest, {
          signal: controller.signal,
          onProgress: (next) => {
            // A background top-up must not animate the loading page's bar.
            if (mounted.current && !background) setProgress(next);
          },
        });

        primeRemote(manifest);
        primeLocal(outcome.localUris);

        if (!mounted.current) return;
        setFailedCount(outcome.failed.length);

        if (outcome.failed.length > 0) {
          console.warn(
            `[assets] ${outcome.failed.length} of ${outstanding.length} file(s) failed`,
            outcome.failed,
          );
          if (!background) setStatus("failed");
        } else if (!background) {
          setStatus("ready");
        }
      } catch (error) {
        console.warn("[assets] Download aborted:", error);
        if (mounted.current && !background) setStatus("failed");
      } finally {
        running.current = false;
        abortRef.current = null;
      }
    },
    [republish],
  );

  // ── Boot: resolve from local state only, then install anything missing ──────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Cached manifest, else the snapshot bundled with the binary. Either way
      // this costs one AsyncStorage read and never touches the network, which is
      // what keeps a warm launch instant and fully offline-capable.
      const manifest = await loadLocalManifest();
      if (cancelled) return;

      manifestRef.current = manifest;
      republish(manifest);
      await install(manifest, { background: false });
    })();

    return () => {
      cancelled = true;
    };
  }, [install, republish]);

  // ── After the UI is interactive: see whether the CDN has newer artwork ──────
  //
  // Deliberately decoupled from the boot effect above. It must never be able to
  // delay startup, so it neither gates `status` nor blocks the handoff to the
  // splash video; anything new is fetched quietly and swapped in.
  useEffect(() => {
    if (status === "checking") return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const remote = await fetchRemoteManifest();
        if (cancelled) return;

        const current = manifestRef.current;
        const changed =
          !current ||
          remote.assets.length !== current.assets.length ||
          remote.assets.some(
            (entry, index) => entry.sha256 !== current.assets[index]?.sha256,
          );

        await writeCachedManifest(remote);
        manifestRef.current = remote;

        if (changed && !cancelled) {
          console.info("[assets] Newer bundle published — topping up in background.");
          await install(remote, { background: true });
        } else {
          republish(remote);
        }
      } catch {
        // Offline or CDN down. The cached manifest we booted from is still
        // valid, so there is nothing to report and nothing to recover from.
      }
    }, 2_000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Runs once, as soon as boot has produced a non-"checking" status.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status === "checking"]);

  const skip = useCallback(() => {
    abortRef.current?.abort();
    setStatus("skipped");
  }, []);

  const retry = useCallback(() => {
    const manifest = manifestRef.current;
    if (!manifest) return;
    setFailedCount(0);
    setProgress(EMPTY_PROGRESS);
    install(manifest, { background: false });
  }, [install]);

  const value = useMemo<AssetsContextType>(
    () => ({
      status,
      progress,
      isSettled: status === "ready" || status === "skipped" || status === "failed",
      failedCount,
      skip,
      retry,
    }),
    [status, progress, failedCount, skip, retry],
  );

  return <AssetsContext.Provider value={value}>{children}</AssetsContext.Provider>;
}

export const useAssets = () => useContext(AssetsContext);
