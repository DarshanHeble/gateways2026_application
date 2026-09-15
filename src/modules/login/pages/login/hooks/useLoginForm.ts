import { useCallback, useRef, useState } from "react";
import type { TextInput } from "react-native";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 6;

export type LoginFieldError = "email" | "password" | null;

/**
 * Stubbed sign-in. This is the single seam a real backend drops into: swap the
 * body for the network call, keep the `{ ok }` shape, and nothing else in the
 * screen has to change.
 */
async function signIn(
  email: string,
  _password: string,
): Promise<{ ok: true; role: "participant" | "team" } | { ok: false; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const isTeam = email.toLowerCase().includes("team") || email.toLowerCase().includes("admin");
  return { ok: true, role: isTeam ? "team" : "participant" };
}

export function useLoginForm(onAuthenticated: (role: "participant" | "team") => void) {
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<LoginFieldError>(null);
  const [errorNonce, setErrorNonce] = useState(0);

  const passwordRef = useRef<TextInput>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const fail = useCallback(
    (field: Exclude<LoginFieldError, null>, message: string) => {
      setErrorField(field);
      setErrorNonce((n) => n + 1);
      say(message);
    },
    [say],
  );

  const submit = useCallback(async () => {
    if (busy) return;

    const trimmed = email.trim();

    setErrorField(null);
    setBusy(true);
    const result = await signIn(trimmed, password);
    setBusy(false);

    if (!result.ok) {
      fail("password", result.message.toUpperCase());
      return;
    }
    onAuthenticated(result.role);
  }, [busy, email, password, fail, onAuthenticated]);


  return {
    email,
    setEmail,
    password,
    setPassword,
    busy,
    toast,
    say,
    errorField,
    errorNonce,
    passwordRef,
    submit,
  };
}
