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
  _email: string,
  _password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return { ok: true };
}

export function useLoginForm(onAuthenticated: () => void) {
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
    if (!trimmed) return fail("email", "NO NAME, NO ENTRY");
    if (!EMAIL_RE.test(trimmed)) return fail("email", "THAT SCROLL LOOKS WRONG");
    if (password.length < MIN_PASSWORD) {
      return fail("password", `PASSPHRASE NEEDS ${MIN_PASSWORD}+ RUNES`);
    }

    setErrorField(null);
    setBusy(true);
    const result = await signIn(trimmed, password);
    setBusy(false);

    if (!result.ok) {
      fail("password", result.message.toUpperCase());
      return;
    }
    onAuthenticated();
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
