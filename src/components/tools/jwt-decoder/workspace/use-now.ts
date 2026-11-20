"use client";

import { useSyncExternalStore } from "react";

/**
 * Current unix time in seconds, re-read on an interval so "Expires in …"
 * stays honest while the page is open. Ticks every second during the last
 * hour before `exp`; otherwise every 30s.
 *
 * Read through useSyncExternalStore so the server render and hydration share
 * one snapshot (no text mismatch); the live clock takes over right after.
 */
export function useNowSeconds(exp: number | null): number {
  const now = useSyncExternalStore(subscribe, readNow, readServerNow);
  const fast = exp !== null && exp > now && exp - now < 3600;
  return useSyncExternalStore(fast ? subscribeFast : subscribe, readNow, readServerNow);
}

const readNow = () => Math.floor(Date.now() / 1000);
/** Server + hydration snapshot: stable, so both sides render identical text. */
const SERVER_NOW = 0;
const readServerNow = () => SERVER_NOW;

function ticker(ms: number) {
  return (onChange: () => void) => {
    const id = setInterval(onChange, ms);
    return () => clearInterval(id);
  };
}
const subscribe = ticker(30_000);
const subscribeFast = ticker(1000);
