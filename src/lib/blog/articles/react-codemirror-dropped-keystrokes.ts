import type { BlogPost, Span } from "../types";

const strong = (v: string): Span => ({ t: "strong", v });
const em = (v: string): Span => ({ t: "em", v });
const code = (v: string): Span => ({ t: "code", v });
const a = (v: string, href: string): Span => ({ t: "link", v, href });

const START_TRANSITION = "https://react.dev/reference/react/startTransition";
const USE_TRANSITION = "https://react.dev/reference/react/useTransition";
const CM_GUIDE = "https://codemirror.net/docs/guide/";

export const post: BlogPost = {
  slug: "react-codemirror-dropped-keystrokes",
  seoTitle: "Why our code editor dropped keystrokes (a React bug)",
  title: "Why our code editor dropped keystrokes (a React startTransition bug)",
  description:
    "Fast typing in our CodeMirror editor lost and reordered letters. The cause: an echo check plus React's startTransition. A repro, the fix and the test.",
  date: "2026-11-22",
  author: "The utilyx team",
  tags: ["Engineering", "React", "Performance"],
  readingTime: "9 min",
  cover: "keys",
  tool: { name: "JSON formatter", glyph: "{}", tint: "clay", href: "/tools/json-formatter" },
  blocks: [
    {
      k: "p",
      s: [
        "We had Playwright type ",
        code('" abcdefghijklmnop"'),
        " into the JSON diff tool, 5 ms between keys. The editor ended up holding ",
        code('" adfhijkmp"'),
        ". Seven letters gone. At 20 ms per key, the diff checker kept more letters but put them in the wrong order: ",
        code('"abdfghijkmnopl"'),
        ". At 40 ms and slower everything was fine, which is why nobody had noticed by hand.",
      ],
    },
    {
      k: "p",
      s: [
        "The editor in question is the shared CodeMirror component behind 21 utilyx tools, including the ",
        a("JSON formatter", "/tools/json-formatter"),
        ". Nothing was wrong with CodeMirror, and nothing was wrong with React. The bug was eight lines of glue between them: a check that decides whether a new ",
        code("value"),
        " prop is \"our own text coming back\" or \"someone else changed the document\". It made a reasonable assumption, and ",
        code("startTransition"),
        " made the assumption false.",
      ],
    },

    { k: "h2", v: "An editor that owns its document", id: "controlled-vs-uncontrolled" },
    {
      k: "p",
      s: [
        "A React ",
        code("<textarea value={text} onChange={…}>"),
        " is controlled: React state is the source of truth, and the DOM is re-rendered from it. That's fine for a form field. For a multi-megabyte document it isn't, which is why we moved to CodeMirror (the ",
        a("50 MB formatter write-up", "/blog/format-50mb-json-in-browser"),
        " has the numbers).",
      ],
    },
    {
      k: "p",
      s: [
        "CodeMirror 6 can't be controlled in that sense. The ",
        code("EditorView"),
        " holds an immutable ",
        code("EditorState"),
        ", and every change, from a keystroke or from code, is a transaction dispatched to the view (",
        a("CodeMirror system guide", CM_GUIDE),
        "). The selection lives in that state, and so do the undo history and the syntax tree, which extensions keep in state fields. If you replaced the whole document on every React render, you would throw away the undo history and pay O(n) per keystroke, which is the cost we were trying to avoid.",
      ],
    },
    {
      k: "p",
      s: [
        "So the wrapper is two one-way pipes. Edits flow out: an update listener reads the document and calls ",
        code("onChange(text)"),
        ". External changes flow in: when the ",
        code("value"),
        " prop changes because the user clicked Format, Load sample or Swap, an effect dispatches one transaction that replaces the document.",
      ],
    },

    { k: "h2", v: "The echo problem", id: "the-echo-problem" },
    {
      k: "p",
      s: [
        "The pipes form a loop. You type ",
        code("a"),
        ", the editor emits ",
        code('"a"'),
        ", the parent stores it, re-renders, and passes ",
        code('value="a"'),
        " back down. The inbound effect must recognise that as its own echo and do nothing. Otherwise it resets the document to the text it already has, at best wasting work and at worst moving the cursor.",
      ],
    },
    {
      k: "p",
      s: ["The common way to recognise the echo is to remember the last thing you sent. This is the echo check from our minimal reproduction, the same one our editor relied on before the fix:"],
    },
    {
      k: "code",
      lang: "jsx",
      v: `// Outbound: CodeMirror update listener.
const text = update.state.doc.toString();
lastEmitted.current = text;
startTransition(() => onChange(text));

// Inbound: the value prop changed.
useEffect(() => {
  if (value === lastEmitted.current) return; // our own echo
  lastEmitted.current = value;               // external change
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
    annotations: external.of(true),          // don't emit this one back
    selection: { anchor: Math.min(view.state.selection.main.head, value.length) },
  });
}, [value]);`,
    },
    {
      k: "p",
      s: [
        "The check assumes one thing: by the time a ",
        code("value"),
        " arrives, it is either the newest text we emitted or something external. Anything else is classified as external. That holds if every emitted value is rendered and committed before the next keystroke. With a synchronous ",
        code("onChange"),
        " it does. With ",
        code("startTransition"),
        " it doesn't.",
      ],
    },

    { k: "h2", v: "What startTransition changes", id: "why-transitions" },
    {
      k: "p",
      s: [
        "We wrapped ",
        code("onChange"),
        " in a transition on purpose. A tool's re-render after an edit can be heavy: re-parse the JSON, re-run a diff, re-render a Markdown preview. Marking it non-urgent lets React render it in the background and keep the page responsive. React's documentation is direct about what that buys and what it costs (",
        a("startTransition reference", START_TRANSITION),
        "):",
      ],
    },
    {
      k: "ul",
      items: [
        ["\"A state update marked as a Transition will be interrupted by other state updates.\""],
        ["\"If there are multiple ongoing Transitions, React currently batches them together.\""],
        ["\"Transition updates can't be used to control text inputs.\""],
      ],
    },
    {
      k: "p",
      s: [
        "The third line is the whole bug in one sentence. It's easy to read it as being only about ",
        code("<input>"),
        ". It applies just as well to a CodeMirror document. A transition is rendered without blocking the browser, so keystrokes keep arriving while it renders. The listener runs for each of them and moves ",
        code("lastEmitted"),
        " forward. Then a render for an earlier keystroke commits, and the effect sees a ",
        code("value"),
        " that is ",
        em("ours"),
        " but older than ",
        code("lastEmitted"),
        ". The check calls it external and resets the editor to it. The keys typed since are gone.",
      ],
    },
    {
      k: "p",
      s: [
        "It gets worse from there. The reset also sets ",
        code("lastEmitted"),
        " to the old text. When the next commit delivers the newer text the user really typed, that no longer matches either, so it too is \"external\" and the editor jumps forward again. The cursor is clamped to where it was, not to the end of the restored text, so the next key lands in the middle. That's where the reordered letters came from.",
      ],
    },
    {
      k: "p",
      s: [
        "We want to be careful about what we claim here. We didn't trace React's scheduler; we logged what the effect received. React documents no ordering promise that would rule this out, and its ",
        a("useTransition troubleshooting", USE_TRANSITION),
        " section, written about async Actions rather than this case, says plainly that \"Actions within a Transition do not guarantee execution order\". The safe reading is simply: with transitions, the ",
        code("value"),
        " your effect sees can be older than the last value you emitted, and code must not assume otherwise.",
      ],
    },

    { k: "h2", v: "An 80-line reproduction", id: "reproduction" },
    {
      k: "p",
      s: [
        "To show this outside our app, we built the smallest version we could: React 19.3.1, CodeMirror 6, a parent that keeps the text in ",
        code("useState"),
        ", and the editor above. The heavy tool render is stood in for by 20 child components that each spin for 1.5 ms, so one render takes about 30 ms and React can yield between them. It was bundled with esbuild 0.28.2 in production mode and driven by Playwright in Chrome 158, typing ",
        code('" abcdefghijklmnop"'),
        " after the initial text ",
        code('"start"'),
        ". Three modes: the naive echo check, our fix (below), and a plain synchronous ",
        code("onChange"),
        ".",
      ],
    },
    {
      k: "p",
      s: ["Ten runs of each combination. A run passes if the editor ends with exactly ", code('"start abcdefghijklmnop"'), "; \"resets\" counts runs in which the inbound effect replaced the document at all:"],
    },
    {
      k: "table",
      head: [["Delay per key"], ["Naive echo check"], ["Queue (our fix)"], ["Sync onChange"]],
      rows: [
        [["0 ms"], ["10/10 correct, 10/10 with resets"], ["10/10, no resets"], ["10/10, no resets"]],
        [["5 ms"], ["0/10"], ["10/10, no resets"], ["10/10, no resets"]],
        [["20 ms"], ["0/10"], ["10/10, no resets"], ["10/10, no resets"]],
        [["40 ms"], ["0/10"], ["10/10, no resets"], ["10/10, no resets"]],
      ],
    },
    { k: "p", s: ["The first naive run at each delay, with the number of document resets:"] },
    {
      k: "code",
      lang: "text",
      v: `naive delay= 0ms "start abcdefghijklmnop" OK resets=2
naive delay= 5ms "start ghijklop" WRONG resets=4
naive delay=20ms "start beghjkmp" WRONG resets=13
naive delay=40ms "start bdeghijklmnopf" WRONG resets=9`,
    },
    {
      k: "p",
      s: [
        "At 40 ms per key, ",
        code("a"),
        " and ",
        code("c"),
        " were lost and ",
        code("f"),
        " landed at the end. The 0 ms row is the most instructive one. The final text is right, but the log shows two resets every time: React committed ",
        code('"start "'),
        ", the text after the first keystroke, when all sixteen letters were already in the editor. The effect wiped them, and a later commit of the full text put them back. Correct by luck, with a flash of lost text in between.",
      ],
    },
    {
      k: "p",
      s: [
        "Slowing down makes it go away. At 60 ms and 100 ms per key, five runs each, the naive editor was correct with no resets, consistent with each ~30 ms render committing before the next key arrives. In an earlier single run, 40 ms passed too, so that speed is at the edge on this machine. Real tool renders don't take a fixed time, which is exactly why this bug hides from manual testing: on our site it only showed up below 40 ms per key.",
      ],
    },

    { k: "h2", v: "The fix: a queue of unacknowledged values", id: "the-fix" },
    {
      k: "p",
      s: [
        "One remembered value can't tell \"older echo\" from \"external\". A list can. Every emitted document goes into ",
        code("inFlight"),
        ", and stays there until it comes back as ",
        code("value"),
        ". From ",
        code("primitives/code-editor/code-editor.tsx"),
        ", trimmed:",
      ],
    },
    {
      k: "code",
      lang: "ts",
      v: `const inFlight = useRef<string[]>([]);
const [emit] = useState(() => (text: string) => {
  lastEmitted.current = text;
  const q = inFlight.current;
  q.push(text);
  if (q.length > 64) q.shift();
});

// External value → editor (sample, Format, Repair, Swap, share link…).
useEffect(() => {
  const view = viewRef.current;
  if (!view) return;
  // Our own echo — possibly an older one committed late. Drop it and
  // everything emitted before it; the editor already holds newer text.
  const q = inFlight.current;
  const echo = q.lastIndexOf(value);
  if (echo !== -1) {
    q.splice(0, echo + 1);
    return;
  }
  if (value === lastEmitted.current) return;
  clearPending();
  lastEmitted.current = value;
  q.length = 0;
  if (view.state.doc.length === value.length && view.state.doc.toString() === value) return;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
    annotations: externalSync.of(true),
    selection: EditorSelection.cursor(Math.min(view.state.selection.main.head, value.length)),
  });
}, [value, clearPending]);`,
    },
    {
      k: "p",
      s: [
        "A value found in the queue is an acknowledgement: React has caught up to at least that point. It and everything emitted before it are dropped, and the editor is left alone, because it already holds newer text. Only a value we never emitted counts as external. When one arrives, the queue is cleared, since the external text replaces everything that was in flight. The cap of 64 keeps the queue bounded if, for some reason, acknowledgements stop arriving.",
      ],
    },
    {
      k: "p",
      s: [
        "The comparisons are string equality, so each is O(n) in the worst case. In practice two different documents almost always differ in length or early on, and the queue is short, because transitions batch and acknowledgements trim it. Above 200,000 characters, edits are debounced (more on that below), so the queue sees one entry per typing pause, not one per key.",
      ],
    },

    { k: "h3", v: "Where the queue is wrong, and the alternatives" },
    {
      k: "p",
      s: [
        "Strings can't carry identity. If a genuinely external change produces text equal to something we emitted that is still in the queue, the effect will take it for an echo and ignore it. In practice that is harmless, since the editor holds the latest text and the parent will see it on the next emit, but it's a real limit. We considered two alternatives:",
      ],
    },
    {
      k: "ul",
      items: [
        [
          strong("Synchronous onChange."),
          " React's own recommendation for inputs. The sync row above shows it is correct, and for small documents it's the simplest answer. We kept the transition because a synchronous re-render of a heavy tool on every key would make typing in it lag, which is the thing transitions exist to prevent. React's suggested pattern, one urgent state for the input and a deferred copy for the expensive part, is close to what CodeMirror already gives us: the document is the urgent state.",
        ],
        [
          strong("Version counters."),
          " Emit ",
          code("{ text, version }"),
          " and have the parent pass the version back, so the editor compares numbers instead of strings and can tell a stale echo from an equal external value. It's the most robust design. It also changes the ",
          code("onChange(text)"),
          " signature for every tool that uses the editor, which is why we chose the queue, which needs no API change.",
        ],
      ],
    },

    { k: "h2", v: "The other half: actions right after typing", id: "flush-before-action" },
    {
      k: "p",
      s: [
        "Above 200,000 characters the editor debounces ",
        code("onChange"),
        " (120 ms, growing with size to a 600 ms cap) so a burst of typing costs one ",
        code("doc.toString()"),
        " and re-parse instead of one per key. That opens a related hole. Type a character and press a shortcut for Format within the debounce window, and Format runs on the parent's old text. Its result then arrives as an external ",
        code("value"),
        " and overwrites what you just typed.",
      ],
    },
    {
      k: "p",
      s: [
        "Clicking a button is covered: the editor loses focus first, and its blur handler flushes the pending edit. Keyboard shortcuts and programmatic actions don't blur anything, so each editor registers its pending flush in a module-level set, and any action that reads or replaces editor text calls ",
        code("flushPendingEdits()"),
        " first. It delivers every pending edit synchronously, outside a transition, so state the handler sets next is applied after it. From the diff checker:",
      ],
    },
    {
      k: "code",
      lang: "ts",
      v: `// pending.ts — no CodeMirror imports, safe for first-load code.
const pending = new Set<() => void>();
export function flushPendingEdits(): void {
  for (const flush of [...pending]) flush();
}

// use-diff-checker.ts
const readNow = useCallback(() => {
  flushPendingEdits();
  return latest.current; // a ref onChange writes, not the stale closure
}, []);`,
    },
    {
      k: "p",
      s: [
        "The last line matters. After the flush, the handler's own closure still holds the old state. It has to read the new text from a ref that ",
        code("onChange"),
        " updates synchronously, or from the editor handle's ",
        code("flush()"),
        ", which returns the document. The editor also flushes on unmount, so switching tabs never loses a pending edit.",
      ],
    },

    { k: "h2", v: "Testing typing at fixed speeds", id: "testing" },
    {
      k: "p",
      s: [
        "Our unit tests didn't catch this, and a simulated DOM would struggle to: the bug needs a real browser scheduler, real event timing and a render slow enough to overlap a keystroke. The test that caught it is a Playwright script that types at fixed delays and reads the editor back:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: `const ed = page.locator(".cm-content").first();
await ed.click();
await page.keyboard.press("Control+End");
await page.keyboard.type(" abcdefghijklmnop", { delay }); // 0, 5, 20 ms
await page.waitForTimeout(1000);
console.log(JSON.stringify((await ed.textContent()).slice(-20)));`,
    },
    {
      k: "p",
      s: [
        "A distinct letter per keystroke makes both losses and reordering obvious in the output. Delays of 0, 5 and 20 ms cover \"everything arrives in one batch\", \"faster than a render\" and \"about one render\". Before the fix, the code formatter ended at 5 ms with ",
        code('" abdfhikmnop"'),
        ". With the fix, we ran it against nine tools that share the editor: code formatter, SQL formatter, Markdown preview, diff checker, JSON diff, JSON formatter, JSON to TypeScript, YAML to JSON and JSON Schema. All nine end in ",
        code('" abcdefghijklmnop"'),
        " at 0, 5 and 20 ms, and we re-ran it on the current build while writing this post.",
      ],
    },

    { k: "h2", v: "What we took away", id: "lessons" },
    {
      k: "ul",
      items: [
        [
          strong("\"Last emitted\" is not enough once updates can be deferred."),
          " Track every value you've sent and not yet seen come back, or give each one a version.",
        ],
        [
          strong("The document React holds is a delayed copy."),
          " With an uncontrolled editor and transitions, the editor is the truth and React's ",
          code("value"),
          " can lag behind it. Never let a lagging copy overwrite the truth.",
        ],
        [
          strong("Debounce means flush."),
          " Any action that reads or replaces debounced text must deliver the pending edit first, and read the result from a ref.",
        ],
        [
          strong("Test at machine speed."),
          " 100 words per minute is about 120 ms per character, so people rarely sustain the speeds that trigger races like this. Playwright at 0, 5 and 20 ms does, every run.",
        ],
      ],
    },
    {
      k: "quote",
      s: [
        strong("The short version:"),
        " an uncontrolled editor plus ",
        code("startTransition"),
        " means the ",
        code("value"),
        " prop can be an old echo of your own text. Treat any value you emitted and haven't seen acknowledged as an echo, not an external change.",
      ],
    },
    {
      k: "p",
      s: [
        strong("Try it:"),
        " the ",
        a("utilyx JSON formatter", "/tools/json-formatter"),
        " uses this editor. Type as fast as you like; it all runs in your browser.",
      ],
    },
  ],
};
