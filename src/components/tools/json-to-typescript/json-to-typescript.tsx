"use client";

import { useCallback, useMemo } from "react";
import {
  booleanCodec,
  ConverterShell,
  enumCodec,
  JSON_SAMPLES,
  MenuCheck,
  plural,
  Segmented,
  stringCodec,
  ToggleChip,
  ToolbarField,
  useConverter,
  useUrlState,
} from "@/components/json-converter";
import { toTypeScript, type TypeScriptOptions } from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToTypeScriptContent, seoData } from "./content";
import { countDeclarations, makeAllOptional } from "./json-to-typescript.lib";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);

const KINDS = [
  ["interface", "interface"],
  ["type", "type"],
] as const;

/**
 * JSON → TypeScript types. Toolbar: root name, interface / type, optional
 * fields, readonly. Declaration order lives in the ⋯ menu. Large inputs
 * convert in the shared worker; "optional fields" is a post-pass so it
 * applies to both paths.
 */
export function JsonToTypeScript({ tool }: { tool: Tool }) {
  const [rootName, setRootName] = useUrlState("root", stringCodec("Root"));
  const [declarationStyle, setDeclarationStyle] = useUrlState(
    "style",
    enumCodec(["interface", "type"] as const, "interface"),
  );
  const [allOptional, setAllOptional] = useUrlState("optional", booleanCodec(false));
  const [useReadonly, setUseReadonly] = useUrlState("readonly", booleanCodec(false));
  const [childrenFirst, setChildrenFirst] = useUrlState("childrenFirst", booleanCodec(true));

  const safeRootName = useMemo(
    () => (/^[A-Za-z_$][\w$]*$/.test(rootName.trim()) ? rootName.trim() : "Root"),
    [rootName],
  );

  const options = useMemo<TypeScriptOptions>(
    () => ({
      rootName: safeRootName,
      declarationStyle,
      readonly: useReadonly,
      childrenFirst,
    }),
    [safeRootName, declarationStyle, useReadonly, childrenFirst],
  );

  const convert = useCallback((value: unknown) => toTypeScript(value, options), [options]);

  const c = useConverter({
    convert,
    worker: { target: "typescript", options },
    initialInput: DEFAULT_INPUT,
    postProcess: allOptional ? makeAllOptional : undefined,
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
      outputLang="typescript"
      outputLabel="TypeScript"
      summary={c.output ? plural(countDeclarations(c.output), "type") : ""}
      statusNote={safeRootName}
      downloadExt="ts"
      downloadMime="text/x-typescript"
      downloadName={safeRootName}
      conversionError={c.conversionError}
      isComputing={c.isComputing}
      content={<JsonToTypeScriptContent />}
      toolbar={
        <>
          <ToolbarField label="Root" value={rootName} onChange={setRootName} ariaLabel="Root type name" />
          <Segmented label="Declaration style" value={declarationStyle} options={KINDS} onChange={setDeclarationStyle} />
          <ToggleChip label="Optional fields" checked={allOptional} onChange={setAllOptional} hint="Mark every property with ?" />
          <ToggleChip label="Readonly" checked={useReadonly} onChange={setUseReadonly} hint="Mark every property readonly" />
        </>
      }
      menu={
        <MenuCheck
          label="Children first"
          hint="Declare nested types above their parents"
          checked={childrenFirst}
          onChange={setChildrenFirst}
        />
      }
    />
  );
}
