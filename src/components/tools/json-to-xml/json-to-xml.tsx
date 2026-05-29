"use client";

import { useCallback, useMemo } from "react";
import {
  booleanCodec,
  ConverterShell,
  JSON_SAMPLES,
  OptionDivider,
  OptionLabel,
  OptionsRow,
  stringCodec,
  useConverter,
  useUrlState,
} from "@/components/json-converter";
import { Switch } from "@/components/primitives/switch";
import {
  toXML,
  type XmlOptions,
} from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToXmlContent } from "./content";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);
const XML_TAG = /^[A-Za-z_][\w-]*$/;

/**
 * JSON → XML tool. JSON's keys map naturally to elements; values become
 * text content; arrays expand to repeated `<itemTag>` siblings. The XML
 * declaration is opt-in so the output can be embedded directly into a
 * larger document.
 */
export function JsonToXml({ tool }: { tool: Tool }) {
  const [rootTag, setRootTag] = useUrlState("root", stringCodec("root"));
  const [itemTag, setItemTag] = useUrlState("item", stringCodec("item"));
  const [declaration, setDeclaration] = useUrlState("decl", booleanCodec(true));

  const safeRoot = XML_TAG.test(rootTag) ? rootTag : "root";
  const safeItem = XML_TAG.test(itemTag) ? itemTag : "item";

  const options = useMemo<XmlOptions>(
    () => ({ rootTag: safeRoot, itemTag: safeItem, declaration }),
    [safeRoot, safeItem, declaration],
  );

  const convert = useCallback(
    (value: unknown) => toXML(value, options),
    [options],
  );

  const c = useConverter({
    convert,
    worker: { target: "xml", options },
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
      outputLang="xml"
      outputLabel="XML"
      downloadExt="xml"
      downloadMime="application/xml"
      downloadName={safeRoot}
      conversionError={c.conversionError}
      content={<JsonToXmlContent />}
      optionsBar={
        <OptionsRow>
          <OptionLabel label="Root tag">
            <input
              value={rootTag}
              onChange={(e) => setRootTag(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              className="h-8 w-32 rounded-md border border-border bg-surface-soft px-2 text-sm font-mono text-text outline-none focus:border-brand"
              aria-label="Root XML tag"
            />
          </OptionLabel>

          <OptionDivider />

          <OptionLabel label="Item tag">
            <input
              value={itemTag}
              onChange={(e) => setItemTag(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              className="h-8 w-28 rounded-md border border-border bg-surface-soft px-2 text-sm font-mono text-text outline-none focus:border-brand"
              aria-label="Tag used for array items"
            />
          </OptionLabel>

          <OptionDivider />

          <OptionLabel label="XML declaration">
            <Switch
              checked={declaration}
              onCheckedChange={setDeclaration}
              aria-label="Emit XML declaration"
            />
          </OptionLabel>
        </OptionsRow>
      }
    />
  );
}
