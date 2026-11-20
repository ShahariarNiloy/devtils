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
  ToolbarField,
  useConverter,
  useUrlState,
} from "@/components/json-converter";
import { toPython, type PythonOptions } from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToPythonContent, seoData } from "./content";
import { countClasses, safeClassName } from "./json-to-python.lib";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);

const KINDS = [
  ["dataclass", "dataclass"],
  ["typeddict", "TypedDict"],
  ["pydantic", "Pydantic"],
] as const;

/**
 * JSON → Python: stdlib `@dataclass`, `TypedDict` or Pydantic v2
 * `BaseModel`. `slots=True` (dataclass only, ≈20% less memory) is in the
 * ⋯ menu.
 */
export function JsonToPython({ tool }: { tool: Tool }) {
  const [rootName, setRootName] = useUrlState("root", stringCodec("Root"));
  const [classKind, setClassKind] = useUrlState(
    "kind",
    enumCodec(["dataclass", "typeddict", "pydantic"] as const, "dataclass"),
  );
  const [useSlots, setUseSlots] = useUrlState("slots", booleanCodec(false));

  const safeRoot = useMemo(() => safeClassName(rootName), [rootName]);

  const options = useMemo<PythonOptions>(
    () => ({ rootName: safeRoot, classKind, useSlots: classKind === "dataclass" && useSlots }),
    [safeRoot, classKind, useSlots],
  );

  const convert = useCallback((value: unknown) => toPython(value, options), [options]);

  const c = useConverter({
    convert,
    worker: { target: "python", options },
    initialInput: DEFAULT_INPUT,
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
      outputLang="python"
      outputLabel="Python"
      summary={c.output ? plural(countClasses(c.output), "type") : ""}
      statusNote={safeRoot}
      downloadExt="py"
      downloadMime="text/x-python"
      downloadName="models"
      conversionError={c.conversionError}
      isComputing={c.isComputing}
      content={<JsonToPythonContent />}
      toolbar={
        <>
          <ToolbarField label="Root" value={rootName} onChange={setRootName} ariaLabel="Root class name" />
          <Segmented label="Model style" value={classKind} options={KINDS} onChange={setClassKind} />
        </>
      }
      menu={
        classKind === "dataclass" ? (
          <MenuCheck label="slots=True" hint="Dataclass slots: less memory per instance" checked={useSlots} onChange={setUseSlots} />
        ) : undefined
      }
    />
  );
}
