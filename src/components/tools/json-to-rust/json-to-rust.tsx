"use client";

import { useCallback, useMemo } from "react";
import {
  booleanCodec,
  ConverterShell,
  JSON_SAMPLES,
  MenuCheck,
  plural,
  stringCodec,
  ToggleChip,
  ToolbarField,
  useConverter,
  useUrlState,
} from "@/components/json-converter";
import { toRust, type RustOptions } from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToRustContent, seoData } from "./content";
import { countStructs, stripClone, stripPub } from "./json-to-rust.lib";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);
const RUST_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * JSON → Rust serde structs. The emitter derives Serialize, Deserialize,
 * Debug and Clone and adds `#[serde(rename)]` where keys aren't
 * snake_case. Toolbar: root, public fields, derive Clone; Default,
 * PartialEq and deny_unknown_fields live in the ⋯ menu.
 */
export function JsonToRust({ tool }: { tool: Tool }) {
  const [rootName, setRootName] = useUrlState("root", stringCodec("Root"));
  const [publicFields, setPublicFields] = useUrlState("pub", booleanCodec(true));
  const [deriveClone, setDeriveClone] = useUrlState("clone", booleanCodec(true));
  const [deriveDefault, setDeriveDefault] = useUrlState("default", booleanCodec(false));
  const [derivePartialEq, setDerivePartialEq] = useUrlState("partialEq", booleanCodec(false));
  const [denyUnknownFields, setDenyUnknownFields] = useUrlState("denyUnknown", booleanCodec(false));

  const safeRoot = useMemo(() => (RUST_IDENT.test(rootName.trim()) ? rootName.trim() : "Root"), [rootName]);

  const options = useMemo<RustOptions>(() => {
    const extraDerives: string[] = [];
    if (deriveDefault) extraDerives.push("Default");
    if (derivePartialEq) extraDerives.push("PartialEq");
    return { rootName: safeRoot, extraDerives, denyUnknownFields };
  }, [safeRoot, deriveDefault, derivePartialEq, denyUnknownFields]);

  const convert = useCallback((value: unknown) => toRust(value, options), [options]);

  const postProcess = useMemo(() => {
    if (publicFields && deriveClone) return undefined;
    return (out: string) => {
      let s = out;
      if (!publicFields) s = stripPub(s);
      if (!deriveClone) s = stripClone(s);
      return s;
    };
  }, [publicFields, deriveClone]);

  const c = useConverter({
    convert,
    worker: { target: "rust", options },
    initialInput: DEFAULT_INPUT,
    postProcess,
  });

  return (
    <ConverterShell
      tool={tool}
      relatedSlugs={seoData.relatedSlugs}
      input={c.input}
      onInputChange={c.setInput}
      parseError={c.parse.error}
      onLoadSample={(s) => c.loadInput(JSON.stringify(s.value, null, 2))}
      output={c.output}
      outputBytes={c.outputBytes}
      outputLang="rust"
      outputLabel="Rust"
      summary={c.output ? plural(countStructs(c.output), "type") : ""}
      statusNote={safeRoot}
      downloadExt="rs"
      downloadMime="text/x-rust"
      downloadName="types"
      conversionError={c.conversionError}
      isComputing={c.isComputing}
      content={<JsonToRustContent />}
      toolbar={
        <>
          <ToolbarField label="Root" value={rootName} onChange={setRootName} ariaLabel="Root struct name" />
          <ToggleChip label="Public fields" checked={publicFields} onChange={setPublicFields} hint="pub on structs and fields" />
          <ToggleChip label="Derive Clone" checked={deriveClone} onChange={setDeriveClone} hint="Add Clone to the derive list" />
        </>
      }
      menu={
        <>
          <MenuCheck label="Derive Default" checked={deriveDefault} onChange={setDeriveDefault} />
          <MenuCheck label="Derive PartialEq" checked={derivePartialEq} onChange={setDerivePartialEq} />
          <MenuCheck
            label="deny_unknown_fields"
            hint="Reject extra keys when deserializing"
            checked={denyUnknownFields}
            onChange={setDenyUnknownFields}
          />
        </>
      }
    />
  );
}
