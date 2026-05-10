"use client";

import { useJsonFormatActions } from "./use-json-format-actions";
import { useJsonIoActions } from "./use-json-io-actions";
import type { JsonState } from "./use-json-state";

export function useJsonActions(state: JsonState) {
  const formatActions = useJsonFormatActions(state);
  const ioActions = useJsonIoActions(state);
  return { ...formatActions, ...ioActions };
}
