"use client";

import { useCallback } from "react";
import {
  decodeToBytes,
  encodeFile,
  extractJwtPayload,
  generateShareUrl,
  stripWhitespace,
  toDataUri,
  validateBase64,
} from "../base64.lib";
import type { PresetItem } from "../base64.types";
import type { Base64State } from "./use-base64-state";

export function useBase64Actions(state: Base64State) {
  const {
    input, setInput,
    direction, setDirection,
    variant, setVariant,
    setActiveTab,
    fileInfo, setFileInfo,
    setManualValidation,
    result,
  } = state;

  const swapPanes = useCallback(() => {
    const nextDir = direction === "encode" ? "decode" : "encode";

    if (nextDir === "decode" && fileInfo) {
      const b64 = encodeFile(fileInfo.bytes, fileInfo.mime, variant);
      setInput(b64);
      setDirection("decode");
      if (fileInfo.mime.startsWith("image/")) setActiveTab("image");
      return;
    }

    if (direction === "decode" && result.imageMime) {
      const b64 = encodeFile(result.outputBytes, result.imageMime, variant);
      setInput(b64);
      setDirection("encode");
      return;
    }

    setInput(result.output);
    setDirection(nextDir);
  }, [direction, fileInfo, result.imageMime, result.outputBytes, result.output, variant, setInput, setDirection, setActiveTab]);

  const clearInput = useCallback(() => {
    setInput("");
    setFileInfo(null);
    setManualValidation(null);
  }, [setInput, setFileInfo, setManualValidation]);

  const copyOutput = useCallback(async () => {
    if (!result.output) return;
    await navigator.clipboard.writeText(result.output);
  }, [result.output]);

  const validate = useCallback(() => {
    setManualValidation(validateBase64(input, variant));
  }, [input, variant, setManualValidation]);

  const applyStripWhitespace = useCallback(() => {
    setInput((curr) => stripWhitespace(curr));
  }, [setInput]);

  const applyAutoPad = useCallback(() => {
    setInput((curr) => {
      const cleaned = stripWhitespace(curr);
      const remainder = cleaned.length % 4;
      return remainder === 0 ? curr : curr + "=".repeat(4 - remainder);
    });
  }, [setInput]);

  const wrapAsDataUri = useCallback(() => {
    const mime = fileInfo?.mime ?? "text/plain";
    setInput(toDataUri(result.output, mime));
    setDirection("decode");
  }, [fileInfo, result.output, setInput, setDirection]);

  const loadPreset = useCallback((preset: PresetItem) => {
    setVariant(preset.variant);
    setDirection(preset.direction);
    if (preset.id === "jwt") {
      const payload = extractJwtPayload(preset.input);
      setInput(payload ?? preset.input);
    } else {
      setInput(preset.input);
    }
  }, [setInput, setDirection, setVariant]);

  const loadFile = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const mime = file.type || "application/octet-stream";
    setFileInfo({ name: file.name, mime, size: bytes.length, bytes });
    const b64 = encodeFile(bytes, mime, variant);
    setDirection("decode");
    setInput(b64);
    if (mime.startsWith("image/")) setActiveTab("image");
  }, [variant, setFileInfo, setDirection, setInput, setActiveTab]);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInput(text);
    } catch { /* clipboard API may be unavailable */ }
  }, [setInput]);

  const shareUrl = useCallback(() => {
    if (typeof window === "undefined") return "";
    const baseUrl = window.location.origin + window.location.pathname;
    return generateShareUrl(input, direction, variant, baseUrl);
  }, [input, direction, variant]);

  const download = useCallback(() => {
    if (typeof window === "undefined") return;
    const bytes = direction === "decode"
      ? decodeToBytes(input, variant)
      : new TextEncoder().encode(result.output);
    const ext = result.imageMime
      ? result.imageMime.split("/").pop() ?? "bin"
      : direction === "decode" ? "bin" : "txt";
    const mime = result.imageMime ?? "application/octet-stream";
    const blob = new Blob([bytes as BlobPart], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `output.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [direction, input, result.output, result.imageMime, variant]);

  const encodeNow = useCallback(() => setDirection("encode"), [setDirection]);
  const decodeNow = useCallback(() => setDirection("decode"), [setDirection]);

  return {
    swapPanes,
    clearInput,
    copyOutput,
    validate,
    applyStripWhitespace,
    applyAutoPad,
    wrapAsDataUri,
    loadPreset,
    loadFile,
    pasteFromClipboard,
    shareUrl,
    download,
    encodeNow,
    decodeNow,
  };
}
