"use client";

import { useCallback, useMemo } from "react";
import {
  booleanCodec,
  ConverterShell,
  enumCodec,
  JSON_SAMPLES,
  OptionDivider,
  OptionLabel,
  OptionsRow,
  stringCodec,
  useConverter,
  useUrlState,
} from "@/components/json-converter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { Switch } from "@/components/primitives/switch";
import { toTypeScript, type TypeScriptOptions } from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToTypeScriptContent } from "./content";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);

/**
 * JSON → TypeScript types tool. Owns the option panel for declaration style
 * (`interface` vs `type`), readonly fields, declaration order, and a custom
 * root type name. The conversion runs synchronously on every input/option
 * change — the codegen pipeline is fast enough on representative payloads
 * that there's no benefit in punting to a worker here.
 */
export function JsonToTypeScript({ tool }: { tool: Tool }) {
  const [rootName, setRootName] = useUrlState("root", stringCodec("Root"));
  const [declarationStyle, setDeclarationStyle] = useUrlState(
    "style",
    enumCodec(["interface", "type"] as const, "interface"),
  );
  const [useReadonly, setUseReadonly] = useUrlState("readonly", booleanCodec(false));
  const [childrenFirst, setChildrenFirst] = useUrlState("childrenFirst", booleanCodec(true));

  const safeRootName = useMemo(
    () => (/^[A-Za-z_$][\w$]*$/.test(rootName) ? rootName : "Root"),
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

  const convert = useCallback(
    (value: unknown) => toTypeScript(value, options),
    [options],
  );

  const c = useConverter({
    convert,
    worker: { target: "typescript", options },
    initialInput: DEFAULT_INPUT,
  });

  return (
    <ConverterShell
      tool={tool}
      input={c.input}
      onInputChange={c.setInput}
      parseError={c.parse.error}
      inputBytes={c.inputBytes}
      onLoadSample={(s) => c.loadInput(JSON.stringify(s.value, null, 2))}
      output={c.output}
      outputBytes={c.outputBytes}
      outputLang="typescript"
      outputLabel="TypeScript"
      downloadExt="ts"
      downloadMime="text/x-typescript"
      downloadName={safeRootName}
      conversionError={c.conversionError}
      content={<JsonToTypeScriptContent />}
      optionsBar={
        <OptionsRow>
          <OptionLabel label="Root">
            <input
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              className="h-8 w-32 rounded-md border border-border bg-surface-soft px-2 text-sm font-mono text-text outline-none focus:border-brand"
              aria-label="Root type name"
            />
          </OptionLabel>

          <OptionDivider />

          <OptionLabel label="Style">
            <Select
              value={declarationStyle}
              onValueChange={(v) => setDeclarationStyle(v as typeof declarationStyle)}
            >
              <SelectTrigger size="sm" className="h-8 w-[112px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interface">interface</SelectItem>
                <SelectItem value="type">type</SelectItem>
              </SelectContent>
            </Select>
          </OptionLabel>

          <OptionDivider />

          <OptionLabel label="readonly">
            <Switch
              checked={useReadonly}
              onCheckedChange={setUseReadonly}
              aria-label="Mark all properties readonly"
            />
          </OptionLabel>

          <OptionDivider />

          <OptionLabel label="Children first">
            <Switch
              checked={childrenFirst}
              onCheckedChange={setChildrenFirst}
              aria-label="Declare child types before their parents"
            />
          </OptionLabel>
        </OptionsRow>
      }
    />
  );
}
