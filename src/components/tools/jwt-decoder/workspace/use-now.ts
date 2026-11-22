"use client";

import { useSyncExternalStore } from "react";

/**
 * Current unix time in seconds, re-read on an interval so "Expires in …"
 * stays honest while the page is open: every second while any of `times`
 * is within two minutes of now (relative times show seconds there),
 * otherwise every 15 s.
 *
 * Read through useSyncExternalStore so the server render and hydration share
 * one snapshot (`serverNow`); the live clock takes over right after.
 */
export function useNowSeconds(times: readonly number[], serverNow: number): number {
  const readServer = () => serverNow;
  const coarse = useSyncExternalStore(subscribeSlow, readNow, readServer);
  const fast = times.some((t) => Math.abs(t - coarse) < 120);
  return useSyncExternalStore(fast ? subscribeFast : subscribeSlow, readNow, readServer);
}

const readNow = () => Math.floor(Date.now() / 1000);

function ticker(ms: number) {
  return (onChange: () => void) => {
    const id = setInterval(onChange, ms);
    return () => clearInterval(id);
  };
}
const subscribeSlow = ticker(15_000);
const subscribeFast = ticker(1000);
