"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import { useBelowSm } from "@/components/tools/diff-checker/parts/chrome";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { JsonDiffContent, seoData } from "./content";
import { itemForRow, splitList, unifiedList } from "./json-diff.view";
import { ChangeList } from "./panels/change-list";
import { SplitRows, UnifiedRows } from "./panels/diff-rows";
import { InputPanes, InputTabs, InputsCollapsed, type Side } from "./panels/inputs";
import { KIND_LOOK } from "./panels/look";
import { PatchPanel } from "./panels/patch-panel";
import { FailedState, NoDiffState, WaitingState } from "./panels/states";
import { StatusBar, SummaryBar, ViewBar } from "./panels/summary";
import { Toolbar } from "./panels/toolbar";
import type { ScrollRequest } from "./panels/virtual-list";
import type { DiffModel } from "./json-diff.engine";
import type { ArrayStrategy } from "./json-diff.lib";
import { useJsonDiff, type ResultView } from "./use-json-diff";

const DESKTOP_VIEWS: ReadonlyArray<readonly [ResultView, string]> = [
  ["split", "Side by side"],
  ["changes", "Changes"],
  ["patch", "JSON Patch"],
];
const MOBILE_VIEWS: ReadonlyArray<readonly [ResultView, string]> = [
  ["unified", "Diff"],
  ["changes", "Changes"],
  ["patch", "Patch"],
];

type ResultState = "some" | "none" | "bad" | "failed" | "loading";

function resultState(model: DiffModel | null): ResultState {
  if (!model) return "loading";
  if (model.error) return "failed";
  if (!model.ok) return "bad";
  return model.changes.length ? "some" : "none";
}

/** Split on desktop, unified on mobile; the row view follows the device. */
function deviceView(pref: ResultView | null, mobile: boolean): ResultView {
  const v = pref ?? (mobile ? "unified" : "split");
  if (mobile && v === "split") return "unified";
  if (!mobile && v === "unified") return "split";
  return v;
}

/**
 * JSON diff — v2 workspace: toolbar (arrays mode · ignore list · Swap · ⋯),
 * Original / Changed inputs, the summary with per-kind filters, view tabs
 * with change navigation, the result (row diff, change list or verified
 * JSON Patch) and the status line. State lives in `useJsonDiff`; the
 * compare runs in a worker for large documents.
 */
export function JsonDiff({ tool }: { tool: Tool }) {
  const mobile = useBelowSm();
  const [inputsOpen, setInputsOpen] = useState(true);
  const [tab, setTab] = useState<Side>("a");
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [scrollReq, setScrollReq] = useState<{ cid: number; nonce: number } | null>(null);
  // "Jump to the error" request for one side; the editor applies it (on mount
  // too, if the inputs were hidden) and clears it.
  const [jumpReq, setJumpReq] = useState<{ side: Side; line: number; col: number; nonce: number } | null>(null);
  const clearJump = useCallback(() => setJumpReq(null), []);
  const jumpSeq = useRef(0);

  const s = useJsonDiff();
  // Device default (split / unified); the row view swaps with the device.
  const effectiveView = deviceView(s.view, mobile);

  const model = s.model;
  const changes = useMemo(() => (model?.ok ? model.changes : []), [model]);
  const counts = model?.counts;
  const rows = model?.ok ? model.rows : null;

  const list = useMemo(() => {
    if (!rows) return null;
    if (effectiveView === "split") return splitList(rows, s.hideUnchanged);
    if (effectiveView === "unified") return unifiedList(rows, s.hideUnchanged);
    return null;
  }, [rows, effectiveView, s.hideUnchanged]);

  const filtered = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < changes.length; i++) if (s.filter === "all" || changes[i].kind === s.filter) out.push(i);
    return out;
  }, [changes, s.filter]);

  // ── Navigation ──
  const { setCur, cur } = s;
  const pick = useCallback(
    (i: number) => {
      setCur(i);
      setScrollReq((r) => ({ cid: i, nonce: (r?.nonce ?? 0) + 1 }));
    },
    [setCur],
  );
  const go = useCallback(
    (d: number) => {
      if (!changes.length) return;
      pick((cur + d + changes.length) % changes.length);
    },
    [changes.length, cur, pick],
  );
  const next = useCallback(() => go(1), [go]);
  const prev = useCallback(() => go(-1), [go]);
  useShortcut({ key: "n", label: "Next change" }, next, changes.length > 0);
  useShortcut({ key: "p", label: "Previous change" }, prev, changes.length > 0);

  const onResultsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      next();
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      prev();
    }
  };

  // Scroll request → the active view's item index.
  const scrollTo = useMemo<ScrollRequest | null>(() => {
    if (!scrollReq || scrollReq.cid < 0 || scrollReq.cid >= changes.length) return null;
    if (list) return { index: itemForRow(list, changes[scrollReq.cid].row), nonce: scrollReq.nonce };
    if (effectiveView === "changes") {
      const at = filtered.indexOf(scrollReq.cid);
      return at === -1 ? null : { index: at, nonce: scrollReq.nonce };
    }
    return null;
  }, [scrollReq, changes, list, effectiveView, filtered]);

  const { setHideUnchanged } = s;
  const expand = useCallback(
    (row: number) => {
      setHideUnchanged(false);
      // Keep the expanded run in view.
      const near = changes.findIndex((c) => c.row >= row);
      if (near >= 0) setScrollReq((r) => ({ cid: near, nonce: (r?.nonce ?? 0) + 1 }));
    },
    [setHideUnchanged, changes],
  );

  const setView = (v: ResultView) => {
    s.setView(v);
    if (cur >= 0) setScrollReq((r) => ({ cid: cur, nonce: (r?.nonce ?? 0) + 1 }));
  };

  // ── State of the result ──
  const leftSt = model?.left;
  const rightSt = model?.right;
  const state = resultState(model);
  let badMsg = "";
  let badSide: Side | null = null;
  if (model && !model.ok && !model.error) {
    if (leftSt?.state !== "ok") {
      badSide = leftSt?.state === "error" ? "a" : null;
      badMsg = leftSt?.state === "empty" ? "Paste the original JSON to compare." : `The original JSON has an error on line ${leftSt?.state === "error" ? leftSt.line : 1}.`;
    } else {
      badSide = rightSt?.state === "error" ? "b" : null;
      badMsg = rightSt?.state === "empty" ? "Paste the changed JSON to compare." : `The changed JSON has an error on line ${rightSt?.state === "error" ? rightSt.line : 1}.`;
    }
  }
  const jump = () => {
    const st = badSide === "a" ? leftSt : rightSt;
    if (!badSide || st?.state !== "error") return;
    const side = badSide;
    setInputsOpen(true);
    if (mobile) setTab(side);
    setJumpReq({ side, line: st.line, col: st.col, nonce: ++jumpSeq.current });
  };
  const jumpFor = (side: Side) => (jumpReq?.side === side ? jumpReq : undefined);

  const cc = cur >= 0 ? changes[cur] : null;
  let curPath = "";
  if (cc) curPath = s.pointerStyle === "json-pointer" ? cc.pointer || "/" : cc.path;
  const modeLabel: Record<ArrayStrategy, string> = {
    identity: `arrays by “${s.identityKey.trim() || "id"}”`,
    set: "array order ignored",
    ordered: "arrays by position",
  };

  const total = counts?.total ?? 0;
  const live: Record<ResultState, string> = {
    some: `${total} ${total === 1 ? "difference" : "differences"}${counts?.ignored ? `, ${counts.ignored} ignored` : ""}`,
    none: "No differences",
    bad: badMsg,
    failed: model?.error ?? "",
    loading: "",
  };

  const paneA = { side: "a" as const, value: s.left, onChange: s.setLeft, read: () => s.readSide("a"), status: leftSt, jumpTo: jumpFor("a"), onJumped: clearJump };
  const paneB = { side: "b" as const, value: s.right, onChange: s.setRight, read: () => s.readSide("b"), status: rightSt, jumpTo: jumpFor("b"), onJumped: clearJump };

  return (
    <ToolShell tool={tool} titleStyle="inline" relatedSlugs={seoData.relatedSlugs}>
      <div className="overflow-hidden rounded-[18px] bg-canvas shadow-window-tool">
        <Toolbar
          arrayStrategy={s.arrayStrategy}
          onArrayStrategy={s.setArrayStrategy}
          identityKey={s.identityKey}
          onIdentityKey={s.setIdentityKey}
          ignore={s.ignore}
          onAddIgnore={s.addIgnore}
          onRemoveIgnore={s.removeIgnore}
          onSwap={s.swap}
          sortKeys={s.sortKeys}
          onSortKeys={s.setSortKeys}
          pointerStyle={s.pointerStyle}
          onPointerStyle={s.setPointerStyle}
          canCopyPatch={state === "some"}
          onCopyPatch={s.copyPatch}
          onShare={s.copyShareLink}
          onLoadSample={s.loadSample}
          onClear={s.clear}
          canClear={Boolean(s.left || s.right)}
        />

        {inputsOpen && mobile && <InputTabs tab={tab} onTab={setTab} a={paneA} b={paneB} />}
        {inputsOpen && !mobile && <InputPanes a={paneA} b={paneB} />}
        {!inputsOpen && <InputsCollapsed a={leftSt} b={rightSt} />}

        <SummaryBar
          state={state}
          counts={counts ?? { added: 0, removed: 0, changed: 0, type: 0, moved: 0, ignored: 0, total: 0 }}
          badMsg={badMsg}
          pending={s.pending}
          filter={s.filter}
          onFilter={(f) => {
            s.setFilter(f);
            setView("changes");
          }}
          inputsOpen={inputsOpen}
          onToggleInputs={() => setInputsOpen((o) => !o)}
          hideUnchanged={s.hideUnchanged}
          onHideUnchanged={s.setHideUnchanged}
        />
        <p className="sr-only" role="status" aria-live="polite" aria-atomic>
          {live[state]}
        </p>

        <ViewBar
          views={mobile ? MOBILE_VIEWS : DESKTOP_VIEWS}
          view={effectiveView}
          onView={setView}
          navigable={state === "some"}
          curPath={curPath}
          curClass={cc ? KIND_LOOK[cc.kind].text : "text-text-faint"}
          navPos={changes.length ? `${cur + 1} / ${changes.length}` : "0 / 0"}
          onPrev={prev}
          onNext={next}
        />

        <div
          ref={setScrollEl}
          role="tabpanel"
          tabIndex={0}
          aria-label="Differences"
          onKeyDown={onResultsKey}
          className="h-[560px] overflow-x-hidden overflow-y-auto bg-[#0d0d0c] outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--color-brand)] sm:h-[540px]"
        >
          {state === "some" && rows && list && effectiveView === "split" && (
            <SplitRows rows={rows} list={list} cur={cur} onPick={pick} onExpand={expand} scrollEl={scrollEl} scrollTo={scrollTo} />
          )}
          {state === "some" && rows && list && effectiveView === "unified" && (
            <UnifiedRows rows={rows} list={list} cur={cur} onPick={pick} onExpand={expand} scrollEl={scrollEl} scrollTo={scrollTo} />
          )}
          {state === "some" && effectiveView === "changes" && (
            <ChangeList
              changes={changes}
              indices={filtered}
              cur={cur}
              onPick={pick}
              pointerStyle={s.pointerStyle}
              scrollEl={scrollEl}
              scrollTo={scrollTo}
            />
          )}
          {state === "some" && effectiveView === "patch" && (
            <PatchPanel patch={s.patch} ignoredExcluded={(counts?.ignored ?? 0) > 0} scrollEl={scrollEl} />
          )}
          {state === "none" && <NoDiffState />}
          {state === "bad" && <WaitingState message={badMsg} onJump={badSide ? jump : undefined} />}
          {state === "failed" && <FailedState message={model?.error ?? ""} />}
        </div>

        <StatusBar modeLabel={modeLabel[s.arrayStrategy]} />
      </div>

      <JsonDiffContent />
    </ToolShell>
  );
}
