"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyFlavor,
  detectFlavor,
  format,
  minify,
  statsFor,
  xmlToJson,
  type Flavor,
  type FormatResult,
  type XmlFormatOptions,
  type XmlStats,
} from "./xml-formatter.lib";
import {
  decodeShare,
  encodeShare,
  readShareFromHash,
  shareHashFor,
} from "./xml-share";

const DEBOUNCE_MS = 250;
const STORAGE_KEY = "xml-formatter:flavor";

/**
 * Per-flavor sample documents. Each demonstrates the shapes the
 * tokenizer + formatter handle distinctively for that dialect (SOAP
 * envelopes, RSS items, SVG paths with attributes, POM groupId/version,
 * Android layout attribute soup).
 */
const SAMPLES: Record<Exclude<Flavor, "auto">, string> = {
  generic: `<?xml version="1.0" encoding="UTF-8"?>
<devtils version="1.0"><catalog><tool slug="json-formatter" tier="free" featured="true"><name>JSON formatter</name><category>JSON</category><runtime>browser</runtime></tool><tool slug="sql-formatter" tier="free"><name>SQL formatter</name><category>Code</category><dialects>10</dialects></tool><tool slug="xml-formatter" tier="free"><name>XML formatter</name><category>Code</category><flavors>7</flavors></tool></catalog><privacy><staysOnDevice>true</staysOnDevice><note>All formatting runs locally in your browser.</note></privacy></devtils>`,
  svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><!-- a simple icon --><circle cx="12" cy="12" r="10" fill="#cde65a"/><path d="M8 12l2 2 4-4" stroke="#3d4435" stroke-width="2" fill="none"/></svg>`,
  soap: `<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:m="http://example.com/stock"><soap:Header><m:Trans soap:mustUnderstand="1">234</m:Trans></soap:Header><soap:Body><m:GetStockPrice><m:StockName>IBM</m:StockName></m:GetStockPrice></soap:Body></soap:Envelope>`,
  rss: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>devtils blog</title><link>https://devtils.com</link><description>Handcrafted developer utilities</description><item><title>SQL formatter ships with 10 dialects</title><link>https://devtils.com/blog/sql</link><pubDate>Mon, 25 May 2026 09:00:00 GMT</pubDate><description><![CDATA[Format <em>any</em> SQL dialect locally.]]></description></item></channel></rss>`,
  atom: `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>devtils blog</title><link href="https://devtils.com/atom"/><id>https://devtils.com/</id><updated>2026-05-25T09:00:00Z</updated><entry><title>XML formatter ships</title><link href="https://devtils.com/blog/xml"/><id>tag:devtils.com,2026:xml</id><updated>2026-05-25T09:00:00Z</updated><summary>Now with SOAP, RSS, Atom, POM and SVG presets.</summary></entry></feed>`,
  pom: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><groupId>com.example</groupId><artifactId>devtils-client</artifactId><version>1.0.0</version><dependencies><dependency><groupId>org.junit.jupiter</groupId><artifactId>junit-jupiter</artifactId><version>5.10.0</version><scope>test</scope></dependency></dependencies></project>`,
  android: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android" android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="vertical" android:padding="16dp"><TextView android:id="@+id/title" android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="@string/welcome" android:textSize="20sp"/><Button android:id="@+id/cta" android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="@string/get_started"/></LinearLayout>`,
};

export type ViewMode = "output" | "diff";
export type OutputMode = "format" | "minify" | "json";

export interface XmlFormatterState {
  input: string;
  setInput: (v: string) => void;
  output: string;
  error: string | null;
  errorLine: number | undefined;
  flavor: Flavor;
  setFlavor: (f: Flavor) => void;
  /** Concrete flavor after resolving "auto". */
  effectiveFlavor: Exclude<Flavor, "auto">;
  options: XmlFormatOptions;
  setOption: <K extends keyof XmlFormatOptions>(
    key: K,
    value: XmlFormatOptions[K],
  ) => void;
  mode: OutputMode;
  setMode: (m: OutputMode) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  pending: boolean;
  elapsed: number;
  stats: XmlStats;
  hydrated: boolean;

  loadSample: () => void;
  clear: () => void;
  share: () => Promise<string | null>;
  download: () => boolean;
  copyOutput: () => Promise<boolean>;
  acceptDroppedFile: (file: File) => Promise<void>;
}

export function useXmlFormatter(): XmlFormatterState {
  const [flavor, setFlavorRaw] = useState<Flavor>("auto");
  const [input, setInput] = useState<string>(SAMPLES.generic);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | undefined>(undefined);
  const [options, setOptions] = useState<XmlFormatOptions>({});
  const [mode, setMode] = useState<OutputMode>("format");
  const [view, setView] = useState<ViewMode>("output");
  const [pending, setPending] = useState<boolean>(true);
  const [elapsed, setElapsed] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef<number>(0);

  // Resolve "auto" once per input change so the rest of the hook + UI
  // can deal in concrete flavors only.
  const effectiveFlavor = useMemo<Exclude<Flavor, "auto">>(
    () => (flavor === "auto" ? detectFlavor(input) : flavor),
    [flavor, input],
  );

  // ── Hydration: URL hash → state, else localStorage flavor ──────────
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const token = readShareFromHash(window.location.hash);
    if (token) {
      void decodeShare(token).then((shared) => {
        if (shared) {
          setFlavorRaw(shared.flavor);
          setInput(shared.xml);
        }
        setHydrated(true);
      });
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== "auto") {
        setFlavorRaw(stored as Flavor);
        if (stored in SAMPLES) {
          setInput(SAMPLES[stored as Exclude<Flavor, "auto">]);
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist flavor.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, flavor);
    } catch {
      // ignore
    }
  }, [flavor, hydrated]);

  // ── Debounced format / minify / json ───────────────────────────────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const id = ++requestId.current;
      const started = performance.now();
      const finish = (result: FormatResult) => {
        if (id !== requestId.current) return;
        setElapsed(Math.round(performance.now() - started));
        if (result.ok) {
          setOutput(result.output);
          setError(null);
          setErrorLine(undefined);
        } else {
          setError(result.error);
          setErrorLine(result.line);
        }
        setPending(false);
      };

      if (mode === "minify") {
        finish({ ok: true, output: minify(input) });
        return;
      }
      if (mode === "json") {
        void xmlToJson(input).then(finish);
        return;
      }
      const opts = applyFlavor(options, effectiveFlavor);
      void format(input, opts).then(finish);
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [input, options, effectiveFlavor, mode]);

  // ── Derived ────────────────────────────────────────────────────────
  const stats = useMemo(() => statsFor(input, output), [input, output]);

  // ── Actions ────────────────────────────────────────────────────────
  const setOption = useCallback(
    <K extends keyof XmlFormatOptions>(key: K, value: XmlFormatOptions[K]) => {
      setOptions((o) => ({ ...o, [key]: value }));
    },
    [],
  );

  const setFlavor = useCallback((f: Flavor) => {
    setFlavorRaw(f);
  }, []);

  const loadSample = useCallback(() => {
    setInput(SAMPLES[effectiveFlavor]);
  }, [effectiveFlavor]);

  const clear = useCallback(() => {
    setInput("");
  }, []);

  const share = useCallback(async (): Promise<string | null> => {
    try {
      const token = await encodeShare(input, flavor);
      const hash = shareHashFor(token);
      const url = `${window.location.origin}${window.location.pathname}${hash}`;
      window.history.replaceState(null, "", hash);
      await navigator.clipboard.writeText(url);
      return url;
    } catch {
      return null;
    }
  }, [input, flavor]);

  const download = useCallback((): boolean => {
    if (!output) return false;
    const ext = mode === "json" ? "json" : "xml";
    const mime = mode === "json" ? "application/json" : "application/xml";
    const blob = new Blob([output], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formatted.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }, [output, mode]);

  const copyOutput = useCallback(async (): Promise<boolean> => {
    if (!output) return false;
    try {
      await navigator.clipboard.writeText(output);
      return true;
    } catch {
      return false;
    }
  }, [output]);

  const acceptDroppedFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return;
    const text = await file.text();
    setInput(text);
  }, []);

  return {
    input,
    setInput,
    output,
    error,
    errorLine,
    flavor,
    setFlavor,
    effectiveFlavor,
    options,
    setOption,
    mode,
    setMode,
    view,
    setView,
    pending,
    elapsed,
    stats,
    hydrated,
    loadSample,
    clear,
    share,
    download,
    copyOutput,
    acceptDroppedFile,
  };
}
