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
import { AppState, type AppStateStatus } from "react-native";
import * as Network from "expo-network";

import { API_ROOT_URL } from "@/services/api";

/**
 * The app's single source of connectivity truth.
 *
 * This replaces the old `ConnectionStatus` behaviour of polling /health every
 * five seconds forever — that kept the radio awake, and its result lived in one
 * component's state where nothing else could use it.
 *
 * Two separate signals, because they answer different questions:
 * - `isOnline`  — does the device have a working internet connection? Driven by
 *   OS-level events, so it costs nothing and reacts immediately. We trust
 *   `isInternetReachable` over `isConnected` so that joining a captive-portal
 *   Wi-Fi AP doesn't read as "online".
 * - `isBackendReachable` — can we actually reach *our* API? Separate because the
 *   dev tunnel expires constantly, which looks nothing like being offline.
 */
interface NetworkContextValue {
  /** Device has a usable internet connection. */
  isOnline: boolean;
  /** Our API answered its health check recently. `null` until first probed. */
  isBackendReachable: boolean | null;
  /** When the backend probe last completed. */
  lastCheckedAt: number | null;
  /** Force a backend probe (e.g. from pull-to-refresh). */
  checkNow: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextValue>({
  // Optimistic default: assume online until told otherwise, so a provider-less
  // render (tests, tree mounting) never wrongly forces the whole app offline.
  isOnline: true,
  isBackendReachable: null,
  lastCheckedAt: null,
  checkNow: async () => false,
});

const HEALTH_TIMEOUT_MS = 4000;
/** Slow foreground heartbeat, in place of the old 5s poll. */
const HEALTH_INTERVAL_MS = 60_000;

export function NetworkProvider({ children }: { children: ReactNode }) {
  const networkState = Network.useNetworkState();
  const [probedReachable, setProbedReachable] = useState<boolean | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  // `isInternetReachable` is undefined on platforms/moments where it can't be
  // determined; fall back to `isConnected` rather than declaring a hard offline.
  const isOnline = networkState.isInternetReachable ?? networkState.isConnected ?? true;

  const inFlight = useRef<Promise<boolean> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const checkNow = useCallback(async (): Promise<boolean> => {
    // Collapse concurrent probes — reconnect, foreground and the heartbeat can
    // all fire within the same tick.
    if (inFlight.current) return inFlight.current;

    const probe = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
      try {
        const res = await fetch(`${API_ROOT_URL}/health`, { signal: controller.signal });
        return res.ok;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    })();

    inFlight.current = probe;
    const ok = await probe;
    inFlight.current = null;

    if (mounted.current) {
      setProbedReachable(ok);
      setLastCheckedAt(Date.now());
    }
    return ok;
  }, []);

  // Being offline already implies the backend is unreachable, so derive that
  // rather than writing it to state — it keeps this effect free of a
  // synchronous setState and the two values can never disagree.
  const isBackendReachable = isOnline ? probedReachable : false;

  // Probe when the OS tells us connectivity changed, rather than on a timer.
  useEffect(() => {
    if (!isOnline) return;
    checkNow();
  }, [isOnline, checkNow]);

  // Re-probe when the user comes back to the app — connectivity often changed
  // while it was backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (status: AppStateStatus) => {
      if (status === "active") checkNow();
    });
    return () => sub.remove();
  }, [checkNow]);

  // Slow heartbeat, only while we believe we're online, to catch the tunnel
  // dying underneath us without any OS-level network change.
  useEffect(() => {
    if (!isOnline) return;
    const id = setInterval(checkNow, HEALTH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isOnline, checkNow]);

  const value = useMemo(
    () => ({ isOnline, isBackendReachable, lastCheckedAt, checkNow }),
    [isOnline, isBackendReachable, lastCheckedAt, checkNow],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export const useNetwork = () => useContext(NetworkContext);
