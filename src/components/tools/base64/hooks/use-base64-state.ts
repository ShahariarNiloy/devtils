"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  decode,
  encode,
  fromDataUri,
  validateBase64,
} from "../base64.lib";
import type {
  Base64Variant,
  Charset,
  Direction,
  FileInfo,
  OutputTab,
  ValidationResult,
} from "../base64.types";
import { loadHistory, saveHistory, HISTORY_MAX_EXPORT as HISTORY_MAX, readUrlParams } from "./base64-state.utils";

export const DEBOUNCE_MS = 300;

export interface Base64ComputedResult {
  output: string;
  outputBytes: Uint8Array;
  imageMime: string | undefined;
  sizeDelta: number;
  outputChars: number;
  inputBytes: number;
  inputChars: number;
  roundTripOk: boolean;
  error: string | null;
}

export function useBase64State() {
  const [input, setInput]                       = useState(() => readUrlParams().input);
  const [direction, setDirection]               = useState<Direction>(() => readUrlParams().direction);
  const [variant, setVariant]                   = useState<Base64Variant>(() => readUrlParams().variant);
  const [charset, setCharset]                   = useState<Charset>("utf-8");
  const [activeTab, setActiveTab]               = useState<OutputTab>("text");
  const [fileInfo, setFileInfo]                 = useState<FileInfo | null>(null);
  const [history, setHistory]                   = useState<string[]>(() => loadHistory());
  const [manualValidation, setManualValidation] = useState<ValidationResult | null>(null);
  const [debouncedInput, setDebouncedInput]     = useState(() => readUrlParams().input);
  const [isProcessing, setIsProcessing]         = useState(false);

  const hydrated   = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Strip URL params on first mount
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (typeof window === "undefined") return;
    if (window.location.search.length > 0) {
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    }
  }, []);

  // Debounce input → debouncedInput
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedInput(input);
      setIsProcessing(false);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input]);

  // Mark processing the moment the user types
  useEffect(() => {
    if (input !== debouncedInput && !isProcessing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsProcessing(true);
    }
  }, [input, debouncedInput, isProcessing]);

  // Push input to history when debounced value settles
  useEffect(() => {
    if (!debouncedInput || debouncedInput.length < 2) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory((prev) => {
      const next = [debouncedInput, ...prev.filter((h) => h !== debouncedInput)].slice(0, HISTORY_MAX);
      saveHistory(next);
      return next;
    });
  }, [debouncedInput]);

  // Auto-switch to decode + image tab when a data URI is detected
  useEffect(() => {
    if (!debouncedInput) return;
    const dataUri = fromDataUri(debouncedInput.trim());
    if (!dataUri) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDirection("decode");
    if (dataUri.mime.startsWith("image/")) {
       
      setActiveTab("image");
    }
  }, [debouncedInput]);

  // Compute encode/decode result
  const result = useMemo<Base64ComputedResult>(() => {
    if (direction === "encode") {
      const r = encode(debouncedInput, { variant, charset });
      return {
        output: r.output,
        outputBytes: new TextEncoder().encode(debouncedInput),
        imageMime: undefined,
        sizeDelta: r.sizeDelta,
        outputChars: r.outputChars,
        inputBytes: r.inputBytes,
        inputChars: debouncedInput.length,
        roundTripOk: r.roundTripOk,
        error: null,
      };
    }
    try {
      const r = decode(debouncedInput, { variant, charset, stripWhitespace: true, autoPad: true });
      return {
        output: r.output,
        outputBytes: r.outputBytes,
        imageMime: r.imageMime,
        sizeDelta: r.sizeDelta,
        outputChars: r.output.length,
        inputBytes: r.outputBytes_,
        inputChars: r.inputChars,
        roundTripOk: r.roundTripOk,
        error: null,
      };
    } catch (err) {
      return {
        output: "",
        outputBytes: new Uint8Array(),
        imageMime: undefined,
        sizeDelta: 0,
        outputChars: 0,
        inputBytes: 0,
        inputChars: debouncedInput.length,
        roundTripOk: false,
        error: err instanceof Error ? err.message : "Decode failed",
      };
    }
  }, [debouncedInput, direction, variant, charset]);

  const validation = useMemo<ValidationResult | null>(() => {
    if (manualValidation) return manualValidation;
    if (direction !== "decode") return null;
    if (fromDataUri(debouncedInput.trim())) return null;
    return validateBase64(debouncedInput, variant);
  }, [debouncedInput, direction, variant, manualValidation]);

  // Reset to Text tab when image is no longer available
  useEffect(() => {
    if (!result.imageMime && activeTab === "image") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab("text");
    }
  }, [result.imageMime, activeTab]);

  return {
    input, setInput,
    direction, setDirection,
    variant, setVariant,
    charset, setCharset,
    activeTab, setActiveTab,
    fileInfo, setFileInfo,
    history,
    manualValidation, setManualValidation,
    debouncedInput,
    isProcessing,
    result,
    validation,
  };
}

export type Base64State = ReturnType<typeof useBase64State>;
