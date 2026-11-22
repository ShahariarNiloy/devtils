import type { BlogPost, Span } from "../types";

const strong = (v: string): Span => ({ t: "strong", v });
const em = (v: string): Span => ({ t: "em", v });
const code = (v: string): Span => ({ t: "code", v });
const a = (v: string, href: string): Span => ({ t: "link", v, href });

export const post: BlogPost = {
  slug: "format-50mb-json-in-browser",
  title: "Formatting a 50 MB JSON file without freezing the browser",
  description:
    "JSON.parse handles 50 MB in about a quarter of a second. The freezes come from everything around it. How our formatter avoids them, with measurements.",
  date: "2026-11-21",
  author: "The utilyx team",
  tags: ["Engineering", "JSON", "Performance"],
  readingTime: "10 min",
  cover: "bigfile",
  tool: { name: "JSON formatter", glyph: "{}", tint: "clay", href: "/tools/json-formatter" },
  blocks: [
    {
      k: "p",
      s: [
        "You export a day of events from an API, get a 50 MB JSON file, and drop it into an online formatter. The tab goes grey, the fan spins up, and a few seconds later the browser offers to kill the page. It's tempting to blame JSON for being slow to parse.",
      ],
    },
    {
      k: "p",
      s: [
        "It isn't. On the laptop we used for this post, ",
        code("JSON.parse"),
        " reads 50 MB in 226 ms. What freezes the tab is everything a formatter does ",
        em("around"),
        " the parse: handing the browser 80 MB of text to lay out, creating millions of DOM nodes, highlighting text nobody is looking at, copying the data between threads. This is how the ",
        a("utilyx JSON formatter", "/tools/json-formatter"),
        " avoids each of those, what it costs, and where it is still slow.",
      ],
    },

    { k: "h2", v: "Where the time actually goes", id: "where-the-time-goes" },
    {
      k: "p",
      s: [
        "We generated a deterministic test file: 194,646 records like ",
        code('{"id":0,"uuid":"…","name":"…","tags":[…],"address":{"geo":{…}}}'),
        ", 52,426,946 bytes (50.0 MiB) minified on one line. Then we timed the building blocks with the formatter's own code, compiled from our TypeScript and run in Node.js 26.13.1 on an Intel Core i7-1355U. Each figure is the median of three to five runs with a forced GC between them.",
      ],
    },
    {
      k: "table",
      head: [["Operation on the 50 MB file"], ["Median"]],
      rows: [
        [[code("JSON.parse")], ["226 ms"]],
        [[code("JSON.stringify(v, null, 2)"), " (80 MB out, 4,282,214 lines)"], ["238 ms"]],
        [[code("JSON.stringify(v)"), " (minify)"], ["101 ms"]],
        [["UTF-8 byte count with ", code("TextEncoder")], ["26 ms"]],
        [["Our lossless-number scan (", code("scanJsonText"), ")"], ["254 ms"]],
        [["Our Format path (validate, then format)"], ["1,010 ms"]],
        [[code("structuredClone"), " of the parsed value"], ["502 ms"]],
        [["Flatten the tree (default expansion, 230,638 rows)"], ["165 ms"]],
        [["Flatten every node (3,503,629 rows)"], ["900 ms"]],
      ],
    },
    {
      k: "p",
      s: [
        "These are engine numbers, not browser numbers. Chrome runs the same V8 engine, but a tab also has layout, paint and garbage collection competing for the thread, so treat the table as a floor. We didn't measure in-browser timings for this post, so we describe the browser side by its behaviour only.",
      ],
    },
    {
      k: "p",
      s: [
        "A frame at 60 Hz is about 16 ms. Every row is many frames, and the rows that hurt most aren't parsing.",
      ],
    },

    { k: "h2", v: "Rule 1: never give the browser text it won't show", id: "the-editor" },
    {
      k: "p",
      s: [
        "The obvious editor is a ",
        code("<textarea>"),
        ", or a ",
        code("contenteditable"),
        " with highlighted spans. Both hand the browser the whole document to lay out, and that cost grows with the document. We shipped a textarea first and watched typing get visibly laggy at a few megabytes. Syntax highlighting makes it far worse: a highlighted 80 MB document is millions of styled spans, and rebuilding that markup on a keystroke is hopeless.",
      ],
    },
    {
      k: "p",
      s: [
        "Our input and output editors use ",
        a("CodeMirror 6", "https://codemirror.net/"),
        ". It keeps the document in a tree of line chunks and only creates DOM for the lines in or near the viewport. A 4.3 million line document has roughly the same DOM as a 40 line one. On top of that, the editor has three size-based rules:",
      ],
    },
    {
      k: "ul",
      items: [
        [
          strong("Highlighting turns off above 1,000,000 characters"),
          " (",
          code("HIGHLIGHT_MAX"),
          "). CodeMirror highlights incrementally, but on a multi-megabyte document its parser still burns background time that delays keystroke paints. VS Code does the same with very large files.",
        ],
        [
          strong("React hears about edits late, on purpose."),
          " Keystrokes are handled entirely inside CodeMirror. Getting the text out (",
          code("doc.toString()"),
          ") is O(n), and so is everything React does with it next, so above 200,000 characters the update is debounced, and the delay grows with the document.",
        ],
        [
          strong("The editor isn't in the first page load."),
          " CodeMirror is ",
          code("React.lazy"),
          "-loaded in its own chunk. Until it arrives, the pane shows a plain ",
          code("<pre>"),
          " with the first 20,000 characters, using the same font, padding and gutter width, so nothing shifts when the editor takes over.",
        ],
      ],
    },
    { k: "p", s: ["The debounce, from ", code("primitives/code-editor/code-editor.tsx"), ":"] },
    {
      k: "code",
      lang: "ts",
      v: `const DEBOUNCE_ABOVE = 200_000;
const debounceMs = (len: number) => Math.min(600, 120 + Math.round(len / 50_000));`,
    },
    {
      k: "p",
      s: [
        "That's 124 ms at 200 KB and 600 ms (the cap) from about 24 MB. A burst of typing in a large file costs one re-parse instead of one per key. The trade-off is that the tree view lags behind your typing by that much, which is the right way round: the text you are typing never lags.",
      ],
    },

    { k: "h2", v: "Rule 2: parse where the user can't feel it", id: "parsing-in-a-worker" },
    {
      k: "p",
      s: [
        "226 ms is fourteen frozen frames. So inputs above 256,000 characters (",
        code("WORKER_THRESHOLD"),
        ") are parsed in a Web Worker, which also reports the byte count, line count and, on failure, the error's line and column. That means the main thread never parses a large document just to show the validation banner.",
      ],
    },
    {
      k: "p",
      s: [
        "Below the threshold we parse synchronously during render. A 256 KB file of the same records parses in 0.88 ms in Node, well under the cost of posting a message to a worker and waiting for the reply. Small documents, which are most documents, never see a loading state.",
      ],
    },
    {
      k: "p",
      s: [
        "Two details keep the worker path correct. Every request carries an incrementing id, and responses from superseded requests are dropped, so a slow parse of an old draft can never overwrite a newer one. And the last good value stays on screen until the new parse resolves. If your edit makes the document invalid, the tree keeps showing the previous valid state while the banner points at the error.",
      ],
    },
    {
      k: "p",
      s: [
        "There's a cost we haven't removed. The worker sends the parsed value back with ",
        code("postMessage"),
        ", which uses the structured clone algorithm, and the receiving side rebuilds the whole object graph on the main thread. In Node, ",
        code("v8.serialize"),
        " (the same V8 serializer) took 152 ms for our parsed file and ",
        code("v8.deserialize"),
        " took 309 ms. It's a rough proxy, but taken at face value, receiving a valid 50 MB tree costs the main thread more than parsing it there would have. The worker still earns its place: while you edit, the document is often invalid, and then only an error message crosses back; and the main thread stays free while the parse runs. But this is our biggest open problem, and our JSON-to-TypeScript/Go/YAML converter shows the fix: its worker parses the text itself and sends back only the output string.",
      ],
    },

    { k: "h2", v: "Rule 3: a tree is a list in disguise", id: "the-tree-view" },
    {
      k: "p",
      s: [
        "The naive tree view is a recursive component: one element per node, nested to match the data. Our test file has 3,503,629 nodes. Several million DOM elements will freeze any browser, and most of them would be inside collapsed branches that nobody opened.",
      ],
    },
    {
      k: "p",
      s: [
        "Instead, ",
        code("flattenTree"),
        " walks the parsed value and emits a flat list of only the ",
        em("visible"),
        " rows, in display order. A collapsed container's children are never visited, so a collapsed branch with a million nodes costs one row. The list is then windowed: rows are a fixed 30 px, so the first visible row is ",
        code("Math.floor(scrollTop / 30)"),
        ", and we render that slice plus 8 rows of overscan inside a spacer div as tall as the whole list. Scroll position is read once per animation frame, not once per scroll event.",
      ],
    },
    {
      k: "p",
      s: [
        "Wrapped text breaks the fixed-height assumption, so wrap mode uses a second hook, ",
        code("useMeasuredVirtualList"),
        ". Rows start at an estimated height, a ",
        code("ResizeObserver"),
        " measures them once rendered (batched per frame), and heights are keyed by JSONPath so expanding one branch doesn't forget every other row's size. Finding the first visible row is a binary search over prefix offsets.",
      ],
    },
    {
      k: "p",
      s: [
        "Two caps stop expansion from undoing all of this. On load, the tree expands the root plus one level, but stops after 4,000 containers. \"Expand all\" stops at 60,000. In our test file the default view is 230,638 rows (the root's 194,646 children, plus the first 3,999 records opened up), and flattening it takes 165 ms. Uncapped, flattening every node takes 900 ms before React renders anything.",
      ],
    },
    {
      k: "p",
      s: [
        "A spinner can't help if the heavy work runs in the same commit as the spinner, because the browser never paints it. So our ",
        code("DeferredMount"),
        " component renders a \"Rendering…\" placeholder, waits two animation frames so it is actually on screen, then mounts the real view.",
      ],
    },

    { k: "h2", v: "The 7 MB string", id: "the-7-mb-string" },
    {
      k: "p",
      s: [
        "Virtualization assumes rows are small. A Base64-encoded image or an embedded HTML page can put megabytes into one string value, which is one row. Parsing it isn't the problem. In Node, ",
        code("JSON.parse"),
        " reads a document holding one 7,340,032-character string in 5 ms. The problem is the next step. If that string goes into a DOM node, the browser has to lay out and paint every character, and in wrap mode it also has to work out where all of the line breaks go. One row is enough to freeze the page.",
      ],
    },
    { k: "p", s: ["So the views never hand the DOM more text than it can usefully show. From ", code("views/clip-text.ts"), ":"] },
    {
      k: "code",
      lang: "ts",
      v: `export const DISPLAY_CHARS = 2_000;
export const CELL_CHARS = 300;

/** Clip \`s\` to \`max\` chars; \`rest\` is how many were left out (0 if none). */
export function clipText(s: string, max: number): { text: string; rest: number } {
  return s.length <= max ? { text: s, rest: 0 } : { text: s.slice(0, max), rest: s.length - max };
}`,
    },
    {
      k: "p",
      s: [
        "A tree row shows the first 2,000 characters and a ",
        code("+7.3M more chars"),
        " chip. Table cells, which are one line and ellipsised anyway, get 300. Clipping only changes what's drawn: clicking the value still copies the full string, and Code view shows all of it. The table view has one more cap. It renders the first 1,000 rows and says so in its header instead of hiding the cut.",
      ],
    },

    { k: "h2", v: "Not losing digits along the way", id: "lossless-numbers" },
    {
      k: "p",
      s: [
        "The fastest way to pretty-print JSON is ",
        code("JSON.stringify(JSON.parse(text), null, 2)"),
        ". It's also quietly lossy. JavaScript numbers are 64-bit floats, so a 64-bit ID gets rounded:",
      ],
    },
    {
      k: "code",
      lang: "bash",
      v: `$ node -e 'console.log(JSON.stringify(JSON.parse("{\\"id\\":12345678901234567890}")))'
{"id":12345678901234567000}`,
    },
    {
      k: "p",
      s: [
        "It also turns ",
        code("1.50"),
        " into ",
        code("1.5"),
        " and ",
        code("1e400"),
        " into ",
        code("null"),
        ", and it moves integer-like keys such as ",
        code('"1"'),
        " to the front of an object. A formatter that changes your data is broken, however fast it is.",
      ],
    },
    {
      k: "p",
      s: [
        "So before formatting, ",
        code("scanJsonText"),
        " makes one pass over the source text, skipping string contents, and checks whether the native round trip would change any number or key order. If not, we use the fast native path. If so, ",
        code("formatLossless"),
        " re-emits the document from the source tokens, copying every number and string verbatim and changing only whitespace (and key order, if you asked to sort). The scan costs 254 ms on our 50 MB file, about as much as the parse. Planting one 20-digit ID in the file forces the slow path, which takes 1,875 ms, compared with 238 ms for the native stringify.",
      ],
    },
    {
      k: "p",
      s: [
        "That's a real cost, and we pay it only when the alternative is corrupting a number. One limitation remains: the Tree, Table and Graph views display parsed JavaScript values, so they show rounded numbers. They also say how many numbers are affected instead of hiding it. Code view, Copy and Download keep the exact digits.",
      ],
    },

    { k: "h2", v: "Why the upload cap is 50 MB", id: "why-50-mb" },
    {
      k: "p",
      s: [
        "The parser isn't the limit. Copies are. A loaded document exists as the input string, CodeMirror's own copy of it, the parsed value (built in the worker, then cloned to the main thread), the formatted output (80 MB for our file, since pretty-printing added 53% here), and the output editor's copy of that. V8 stores pure-ASCII strings at one byte per character but switches to two bytes per character once a string contains anything outside Latin-1, so non-English text doubles the string copies.",
      ],
    },
    {
      k: "p",
      s: [
        "Our Node benchmark kept just three of those alive, the source string, the parsed value and the pretty output, and its heap stood at 568 MiB. A browser tab has the DOM, the rest of the app and the other copies on top of that. At 50 MB of input that's already hundreds of megabytes for one tab; at several hundred megabytes of input it would be gigabytes. So the file picker refuses anything over 50 MB with a toast that gives the file's actual size. Pasting has no hard cap. Some extras also scale back: drafts over 1 MB aren't autosaved, and share links are limited to about 256 KB compressed.",
      ],
    },

    { k: "h2", v: "What's still slow", id: "whats-still-slow" },
    {
      k: "p",
      s: ["On a 50 MB document, these still run on the main thread, on top of receiving the parsed tree:"],
    },
    {
      k: "ul",
      items: [
        [
          strong("Format and Minify."),
          " The Format path validates and then formats synchronously: about 1 s in Node on our file, and the page can't respond to input until it's done.",
        ],
        [
          strong("Paste-to-format."),
          " Pasting valid JSON into an empty editor formats it in the paste handler, so a huge paste pays the same cost as Format.",
        ],
        [
          strong("Repair."),
          " Our repair parser handles trailing commas, comments, single quotes and many other problems, and we've removed its quadratic cases: a line/column lookup now uses a binary search over a newline index, and string-closing guesses are bounded to a window. It's still a hand-written parser in JavaScript, and on our 50 MB file with one trailing comma it took 3,084 ms.",
        ],
        [
          strong("Expanding and collapsing."),
          " Each toggle re-flattens the visible rows, so its cost grows with how much is open: about 165 ms in Node with the default 230,638 rows.",
        ],
        [
          strong("The number-precision scan"),
          " for the tree's \"rounded numbers\" notice, about 254 ms in Node. It's skipped while Code view is active.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "The fix for most of these is the same: keep the parsed document in the worker and send the main thread only what's on screen, for example the visible tree rows. That's the next step. Until then, if you regularly work with files of hundreds of megabytes, a command-line tool such as ",
        code("jq"),
        " is the better choice. It doesn't have to render anything, and its ",
        code("--stream"),
        " mode can process a document without holding all of it in memory.",
      ],
    },
    {
      k: "quote",
      s: [
        strong("The short version:"),
        " parsing 50 MB is cheap. Rendering it isn't. Draw only the lines on screen, parse off the main thread, flatten trees into windowed lists, clip long values for display, keep the source digits, and cap what one tab has to hold.",
      ],
    },
    {
      k: "p",
      s: [
        strong("Try it:"),
        " drop a large file into the ",
        a("utilyx JSON formatter", "/tools/json-formatter"),
        ". It runs in your browser, so the file never leaves your machine.",
      ],
    },
  ],
};
