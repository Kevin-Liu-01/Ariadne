"use client";

import { useCallback, useEffect, useState } from "react";

export const OPERATOR_TOKEN_KEY = "ariadne_operator_token";

/** Persisted operator token, with optional `?token=` bootstrap for event staff. */
export function useOperatorToken() {
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token")?.trim();
    if (urlToken) {
      window.localStorage.setItem(OPERATOR_TOKEN_KEY, urlToken);
      setToken(urlToken);
      params.delete("token");
      const qs = params.toString();
      window.history.replaceState({}, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
      return;
    }
    const saved = window.localStorage.getItem(OPERATOR_TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const unlock = useCallback(() => {
    const t = input.trim();
    if (!t) return;
    window.localStorage.setItem(OPERATOR_TOKEN_KEY, t);
    setToken(t);
  }, [input]);

  const lock = useCallback(() => {
    window.localStorage.removeItem(OPERATOR_TOKEN_KEY);
    setToken("");
    setInput("");
  }, []);

  return { token, input, setInput, unlock, lock };
}
