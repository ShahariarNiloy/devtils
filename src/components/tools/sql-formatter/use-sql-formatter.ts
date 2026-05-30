"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  copyAs as copyAsLib,
  detectDialect,
  format,
  getDialect,
  minify,
  statsFor,
  type CopyAsFormat,
  type DialectId,
  type FormatResult,
  type SqlFormatOptions,
  type SqlStats,
} from "./sql-formatter.lib";
import {
  decodeShare,
  encodeShare,
  readShareFromHash,
  shareHashFor,
} from "./sql-share";

const DEBOUNCE_MS = 250;
const STORAGE_KEY = "sql-formatter:dialect";
const DEFAULT_DIALECT: DialectId = "sql";

/**
 * Per-dialect sample queries — each picks shapes that exercise the
 * dialect's distinctive syntax so the highlighter + formatter both
 * demonstrate themselves on first load.
 */
const SAMPLES: Record<DialectId, string> = {
  sql: `SELECT u.id,u.name,COUNT(o.id) AS orders FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE u.active=TRUE GROUP BY u.id,u.name HAVING COUNT(o.id)>0 ORDER BY orders DESC LIMIT 25;`,
  postgresql: `WITH active_users AS (SELECT id,name FROM users WHERE active=true)
INSERT INTO audit (user_id,action,at) SELECT id,'login',now() FROM active_users RETURNING id,user_id;
SELECT to_jsonb(u) FROM users u WHERE u.created_at > now()-interval '7 days';`,
  mysql: "SELECT `u`.`id`,`u`.`name`,GROUP_CONCAT(`r`.`name` SEPARATOR ', ') AS roles FROM `users` `u` JOIN `user_roles` `ur` ON `ur`.`user_id`=`u`.`id` JOIN `roles` `r` ON `r`.`id`=`ur`.`role_id` WHERE `u`.`active`=1 GROUP BY `u`.`id`,`u`.`name`;",
  mariadb: "SELECT id,name,JSON_EXTRACT(meta,'$.email') AS email FROM users WHERE active=1 ORDER BY id DESC LIMIT 50;",
  sqlite: `PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,active INTEGER DEFAULT 1);
INSERT INTO users (name,active) VALUES ('Ada',1),('Linus',1);
SELECT * FROM users WHERE active=1;`,
  transactsql: `SELECT TOP 10 u.[Id],u.[Name],COUNT(o.[Id]) AS Orders FROM dbo.Users u LEFT OUTER JOIN dbo.Orders o ON o.UserId=u.Id WHERE u.Active=1 GROUP BY u.Id,u.Name ORDER BY Orders DESC;`,
  plsql: `SELECT u.id,u.name,COUNT(o.id) AS orders FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE u.created<SYSDATE-INTERVAL '7' DAY GROUP BY u.id,u.name ORDER BY orders DESC FETCH FIRST 25 ROWS ONLY;`,
  bigquery: `SELECT user_id,ARRAY_AGG(STRUCT(event_name,event_time) ORDER BY event_time) AS events FROM \`project.dataset.events\` WHERE DATE(event_time)=CURRENT_DATE() GROUP BY user_id;`,
  snowflake: `MERGE INTO target t USING (SELECT id,name,updated_at FROM staging) s ON t.id=s.id
WHEN MATCHED AND s.updated_at>t.updated_at THEN UPDATE SET t.name=s.name,t.updated_at=s.updated_at
WHEN NOT MATCHED THEN INSERT (id,name,updated_at) VALUES (s.id,s.name,s.updated_at);`,
  redshift: `COPY events FROM 's3://bucket/events.json' IAM_ROLE 'arn:aws:iam::123:role/redshift' FORMAT AS JSON 'auto';
SELECT user_id,COUNT(*) FROM events WHERE event_date>=CURRENT_DATE-7 GROUP BY user_id HAVING COUNT(*)>10;`,
};

export type ViewMode = "output" | "diff";
export type OutputMode = "format" | "minify";

export interface SqlFormatterState {
  input: string;
  setInput: (v: string) => void;
  output: string;
  error: string | null;
  errorLine: number | undefined;
  dialect: DialectId;
  setDialect: (id: DialectId) => void;
  options: SqlFormatOptions;
  setOption: <K extends keyof SqlFormatOptions>(
    key: K,
    value: SqlFormatOptions[K],
  ) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  mode: OutputMode;
  setMode: (m: OutputMode) => void;
  pending: boolean;
  elapsed: number;
  stats: SqlStats;
  hydrated: boolean;

  loadSample: () => void;
  clear: () => void;
  share: () => Promise<string | null>;
  download: () => boolean;
  copyOutput: () => Promise<boolean>;
  copyAs: (format: CopyAsFormat) => Promise<boolean>;
  acceptDroppedFile: (file: File) => Promise<void>;
}

/**
 * State + debounced formatting + share/persist/IO actions for the SQL
 * formatter. Mirrors the code-formatter hook's shape so the orchestrator
 * component can stay similar.
 *
 * URL-hash hydration is one-shot on mount; dialect persists to
 * localStorage so a returning visitor lands on the dialect they last used.
 */
export function useSqlFormatter(): SqlFormatterState {
  const [dialect, setDialectRaw] = useState<DialectId>(DEFAULT_DIALECT);
  const [input, setInput] = useState<string>(SAMPLES[DEFAULT_DIALECT]);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | undefined>(undefined);
  const [options, setOptions] = useState<SqlFormatOptions>({
    tabWidth: 2,
    useTabs: false,
    keywordCase: "upper",
    identifierCase: "preserve",
    functionCase: "preserve",
    dataTypeCase: "upper",
    expressionWidth: 50,
    linesBetweenQueries: 1,
    logicalOperatorNewline: "before",
    leadingComma: false,
    newlineBeforeSemicolon: false,
    indentStyle: "standard",
  });
  const [view, setView] = useState<ViewMode>("output");
  const [mode, setMode] = useState<OutputMode>("format");
  const [pending, setPending] = useState<boolean>(true);
  const [elapsed, setElapsed] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef<number>(0);

  // ── Hydration: URL hash → state, else localStorage dialect ─────────
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const token = readShareFromHash(window.location.hash);
    if (token) {
      void decodeShare(token).then((shared) => {
        if (shared) {
          setDialectRaw(shared.dialect);
          setInput(shared.sql);
        }
        setHydrated(true);
      });
      return;
    }

    // No share token — pick up the persisted dialect. These setState calls
    // are legitimate mount-time external-state bridging (localStorage).
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== DEFAULT_DIALECT) {
        try {
          getDialect(stored as DialectId);
          setDialectRaw(stored as DialectId);
          setInput(SAMPLES[stored as DialectId]);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // localStorage unavailable (private mode etc.) — ignore.
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // ── Persist dialect ────────────────────────────────────────────────
  // Separate from hydration so it tracks subsequent changes too.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, dialect);
    } catch {
      // ignore quota / disabled
    }
  }, [dialect, hydrated]);

  // ── Debounced format / minify ──────────────────────────────────────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const id = ++requestId.current;
      const started = performance.now();
      // Minify mode short-circuits sql-formatter entirely — it's a
      // string-aware whitespace-collapse pass, not a parser run. Format
      // mode keeps the normal Prettier-style pipeline.
      if (mode === "minify") {
        const out = minify(input);
        if (id !== requestId.current) return;
        setElapsed(Math.round(performance.now() - started));
        setOutput(out);
        setError(null);
        setErrorLine(undefined);
        setPending(false);
        return;
      }
      void format(input, dialect, options).then((result: FormatResult) => {
        if (id !== requestId.current) return;
        const ms = Math.round(performance.now() - started);
        setElapsed(ms);
        if (result.ok) {
          setOutput(result.output);
          setError(null);
          setErrorLine(undefined);
        } else {
          setError(result.error);
          setErrorLine(result.line);
        }
        setPending(false);
      });
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [input, dialect, options, mode]);

  // ── Derived ────────────────────────────────────────────────────────
  const stats = useMemo(() => statsFor(input, output), [input, output]);

  // ── Actions ────────────────────────────────────────────────────────
  const setOption = useCallback(
    <K extends keyof SqlFormatOptions>(
      key: K,
      value: SqlFormatOptions[K],
    ) => {
      setOptions((o) => ({ ...o, [key]: value }));
    },
    [],
  );

  const setDialect = useCallback((id: DialectId) => {
    setDialectRaw(id);
  }, []);

  const loadSample = useCallback(() => {
    setInput(SAMPLES[dialect] ?? "");
  }, [dialect]);

  const clear = useCallback(() => {
    setInput("");
  }, []);

  const share = useCallback(async (): Promise<string | null> => {
    try {
      const token = await encodeShare(input, dialect);
      const hash = shareHashFor(token);
      const url = `${window.location.origin}${window.location.pathname}${hash}`;
      window.history.replaceState(null, "", hash);
      await navigator.clipboard.writeText(url);
      return url;
    } catch {
      return null;
    }
  }, [input, dialect]);

  const download = useCallback((): boolean => {
    if (!output) return false;
    const blob = new Blob([output], { type: "text/x-sql;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.sql";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }, [output]);

  const copyOutput = useCallback(async (): Promise<boolean> => {
    if (!output) return false;
    try {
      await navigator.clipboard.writeText(output);
      return true;
    } catch {
      return false;
    }
  }, [output]);

  const copyAs = useCallback(
    async (fmt: CopyAsFormat): Promise<boolean> => {
      if (!output) return false;
      try {
        await navigator.clipboard.writeText(copyAsLib(output, fmt));
        return true;
      } catch {
        return false;
      }
    },
    [output],
  );

  const acceptDroppedFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return;
    const text = await file.text();
    setInput(text);
    // Best-effort auto-detection on drop — overrides current dialect only
    // when we're confident. Caller's previous selection wins otherwise.
    const detected = detectDialect(text);
    if (detected) setDialectRaw(detected);
  }, []);

  return {
    input,
    setInput,
    output,
    error,
    errorLine,
    dialect,
    setDialect,
    options,
    setOption,
    view,
    setView,
    mode,
    setMode,
    pending,
    elapsed,
    stats,
    hydrated,
    loadSample,
    clear,
    share,
    download,
    copyOutput,
    copyAs,
    acceptDroppedFile,
  };
}
