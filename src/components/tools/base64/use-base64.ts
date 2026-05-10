"use client";

import { useBase64State } from "./hooks/use-base64-state";
import { useBase64Actions } from "./hooks/use-base64-actions";

export function useBase64() {
  const state = useBase64State();
  const actions = useBase64Actions(state);

  const { result, validation, history, isProcessing } = state;

  return {
    input: state.input,
    output: result.output,
    direction: state.direction,
    variant: state.variant,
    charset: state.charset,
    activeTab: state.activeTab,
    validation,
    fileInfo: state.fileInfo,
    roundTripOk: result.roundTripOk,
    isProcessing,
    outputBytes: result.outputBytes,
    imageMime: result.imageMime,
    history,
    inputCharCount: result.inputChars,
    inputByteCount: result.inputBytes,
    outputCharCount: result.outputChars,
    sizeDelta: result.sizeDelta,
    setInput: state.setInput,
    setDirection: state.setDirection,
    setVariant: state.setVariant,
    setCharset: state.setCharset,
    setActiveTab: state.setActiveTab,
    ...actions,
  };
}

export type UseBase64Return = ReturnType<typeof useBase64>;
