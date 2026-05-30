"use client";

import { useEffect, useState } from "react";
import { PRODUCT_NAME } from "@/constants/event";
import { AlertsPanel } from "@/app/operator/alerts-panel";
import { DrinkQueue } from "@/app/operator/drink-queue";
import { ProjectionControls } from "@/app/operator/projection-controls";
import { Roster } from "@/app/operator/roster";

const TOKEN_KEY = "ariadne_operator_token";

export default function OperatorPage() {
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  function unlock() {
    const t = input.trim();
    if (!t) return;
    window.localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }

  function lock() {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setInput("");
  }

  if (!token) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="reticle reticle-strong w-full max-w-sm border border-nyx-line bg-nyx-soft p-6 animate-rise">
          <h1 className="text-lg font-semibold">{PRODUCT_NAME} · operator</h1>
          <p className="mt-1 text-xs text-ash">enter the operator token to open the console.</p>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && unlock()}
            type="password"
            placeholder="operator token"
            className="mt-4 w-full border border-nyx-line bg-nyx px-4 py-3 text-cloud outline-none focus:border-helio/50"
          />
          <button
            type="button"
            onClick={unlock}
            className="mt-3 w-full bg-helio px-4 py-3 font-medium uppercase tracking-wide text-nyx"
          >
            unlock
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{PRODUCT_NAME} · operator</h1>
        <button type="button" onClick={lock} className="text-xs uppercase tracking-widest text-ash hover:text-cloud">
          lock
        </button>
      </header>
      <div className="mt-6">
        <AlertsPanel token={token} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <DrinkQueue token={token} />
        <ProjectionControls token={token} />
      </div>
      <div className="mt-4">
        <Roster token={token} />
      </div>
    </main>
  );
}
