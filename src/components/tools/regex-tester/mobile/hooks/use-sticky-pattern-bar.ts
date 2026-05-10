"use client";

import { useRef, useState, useCallback } from "react";
import type { Flag } from "../../regex.lib";
import type { MobileState } from "../types";

export interface StickyPatternBarHandlers {
  inputRef: React.RefObject<HTMLInputElement | null>;
  editMode: boolean;
  showEmptyState: boolean;
  activateEdit: () => void;
  toggleFlag: (f: Flag) => void;
  handleBlur: () => void;
}

export function useStickyPatternBar(state: MobileState): StickyPatternBarHandlers {
  const { pattern, flags, setFlags, setSelectedMatch } = state;

  const inputRef = useRef<HTMLInputElement>(null);
  const [editMode, setEditMode] = useState(false);

  const showEmptyState = !pattern && !editMode;

  const activateEdit = useCallback(() => {
    setEditMode(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const toggleFlag = useCallback(
    (f: Flag) => {
      setFlags(flags.includes(f) ? flags.filter((x) => x !== f) : [...flags, f]);
      setSelectedMatch(null);
    },
    [flags, setFlags, setSelectedMatch],
  );

  const handleBlur = useCallback(() => {
    if (!pattern) setEditMode(false);
  }, [pattern]);

  return { inputRef, editMode, showEmptyState, activateEdit, toggleFlag, handleBlur };
}
