"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

/** Chromium's install prompt event (not in the TS DOM lib). */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isInstallPrompt(e: Event): e is InstallPromptEvent {
  return "prompt" in e && typeof e.prompt === "function";
}

const STANDALONE = "(display-mode: standalone)";
function subscribeStandalone(cb: () => void) {
  const mq = window.matchMedia(STANDALONE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * "Install utilyx": fires the browser's real install prompt when one is
 * available (Chromium), otherwise explains how to install manually —
 * Safari and Firefox don't expose a programmatic prompt.
 */
export function InstallButton() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [justInstalled, setInstalled] = useState(false);
  const runningInstalled = useSyncExternalStore(
    subscribeStandalone,
    () => window.matchMedia(STANDALONE).matches,
    () => false,
  );
  const installed = justInstalled || runningInstalled;

  useEffect(() => {
    const onPrompt = (e: Event) => {
      if (!isInstallPrompt(e)) return;
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      if (outcome === "accepted") setInstalled(true);
      return;
    }
    toast.info("Use your browser's install option", {
      description:
        "Chrome / Edge: the install icon in the address bar. Safari: File → Add to Dock. On iPhone: Share → Add to Home Screen.",
    });
  };

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={installed}
      className="btn-action mt-auto inline-flex min-h-[42px] items-center self-start rounded-[10px] px-4 text-sm font-semibold disabled:opacity-60"
    >
      {installed ? "Installed" : "Install utilyx"}
    </button>
  );
}
