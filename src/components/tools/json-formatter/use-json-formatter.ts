"use client";

import { useJsonState } from "./hooks/use-json-state";
import { useJsonActions } from "./hooks/use-json-actions";

export function useJsonFormatter() {
  const state = useJsonState();
  const actions = useJsonActions(state);

  return { ...state, ...actions };
}

export type JsonFormatterState = ReturnType<typeof useJsonFormatter>;
