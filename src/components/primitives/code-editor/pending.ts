/**
 * Pending (debounced, not yet reported) edits across every mounted code
 * editor. No CodeMirror imports — safe for first-load code such as toolbar
 * actions and keyboard shortcuts.
 *
 * Large documents reach React debounced (see `code-editor.tsx`). Any action
 * that reads or replaces an editor's text (Copy, Swap, Format, Clear,
 * share…) must call `flushPendingEdits()` first: it synchronously delivers
 * every pending edit through the editor's `onChange` (outside a transition,
 * so state set afterwards in the same handler is applied after it). The
 * handler's own closure still holds the old value — read the text from a
 * ref that `onChange` updates, or from an `editorRef` handle's `flush()`.
 *
 * Mouse clicks are covered anyway (an editor flushes when it loses focus);
 * this matters for keyboard shortcuts and programmatic actions.
 */

const pending = new Set<() => void>();

export function flushPendingEdits(): void {
  for (const flush of [...pending]) flush();
}

/** @internal Used by the editor to register / clear its pending flush. */
export function setPendingEdit(flush: () => void, on: boolean): void {
  if (on) pending.add(flush);
  else pending.delete(flush);
}
