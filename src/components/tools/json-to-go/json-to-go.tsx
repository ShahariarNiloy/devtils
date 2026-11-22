"use client";

import { useCallback, useMemo } from "react";
import {
  booleanCodec,
  ConverterShell,
  enumCodec,
  JSON_SAMPLES,
  MenuChoice,
  plural,
  stringCodec,
  ToggleChip,
  ToolbarField,
  useConverter,
  useUrlState,
} from "@/components/json-converter";
import { toGo, type GoOptions } from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToGoContent, seoData } from "./content";
import { countGoTypes, GO_IDENT, postProcessGo, safeGoTypeName } from "./json-to-go.lib";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);

const TAG_STYLES = [
  ["original", "Original keys"],
  ["snake", "snake_case"],
  ["camel", "camelCase"],
] as const;

/**
 * JSON → Go structs. The shared emitter picks pointer-with-omitempty for
 * optional fields and `*T` for nullable values; a post-pass renames the
 * root type, applies Go initialisms (ID, URL) and aligns fields like
 * gofmt. Toolbar: root, package, omitempty, package line; tag style in ⋯.
 */
export function JsonToGo({ tool }: { tool: Tool }) {
  const [rootName, setRootName] = useUrlState("root", stringCodec("Root"));
  const [packageName, setPackageName] = useUrlState("pkg", stringCodec("main"));
  const [packageLine, setPackageLine] = useUrlState("pkgLine", booleanCodec(true));
  const [jsonTagStyle, setJsonTagStyle] = useUrlState(
    "tags",
    enumCodec(["original", "snake", "camel"] as const, "original"),
  );
  const [omitemptyOnOptional, setOmitemptyOnOptional] = useUrlState("omitempty", booleanCodec(true));

  const safePackage = useMemo(() => (GO_IDENT.test(packageName.trim()) ? packageName.trim() : "main"), [packageName]);
  const safeRoot = useMemo(() => safeGoTypeName(rootName), [rootName]);

  const options = useMemo<GoOptions>(
    () => ({ rootName: safeRoot, packageName: safePackage, jsonTagStyle, omitemptyOnOptional }),
    [safeRoot, safePackage, jsonTagStyle, omitemptyOnOptional],
  );

  const convert = useCallback((value: unknown) => toGo(value, options), [options]);
  const postProcess = useCallback(
    (out: string) => postProcessGo(out, { packageLine }),
    [packageLine],
  );

  const c = useConverter({
    convert,
    worker: { target: "go", options },
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
      outputLang="go"
      outputLabel="Go"
      summary={c.output ? plural(countGoTypes(c.output), "type") : ""}
      statusNote={safeRoot}
      downloadExt="go"
      downloadMime="text/x-go"
      downloadName={`${safePackage}_types`}
      conversionError={c.conversionError}
      isComputing={c.isComputing}
      content={<JsonToGoContent />}
      toolbar={
        <>
          <ToolbarField label="Root" value={rootName} onChange={setRootName} ariaLabel="Root struct name" />
          {packageLine && (
            <ToolbarField
              label="package"
              value={packageName}
              onChange={setPackageName}
              ariaLabel="Go package name"
              className="flex-[0_1_180px]"
            />
          )}
          <ToggleChip label="omitempty" checked={omitemptyOnOptional} onChange={setOmitemptyOnOptional} hint="Add ,omitempty to optional fields" />
          <ToggleChip label="Package line" checked={packageLine} onChange={setPackageLine} hint="Start the file with a package clause" />
        </>
      }
      menu={<MenuChoice label="json tag keys" value={jsonTagStyle} options={TAG_STYLES} onChange={setJsonTagStyle} />}
    />
  );
}
