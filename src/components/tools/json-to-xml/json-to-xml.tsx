"use client";

import { useCallback, useMemo } from "react";
import {
  booleanCodec,
  ConverterShell,
  enumCodec,
  JSON_SAMPLES,
  linesSummary,
  Segmented,
  stringCodec,
  ToggleChip,
  ToolbarField,
  useConverter,
  useUrlState,
} from "@/components/json-converter";
import { toXML, type XmlOptions } from "@/components/tools/json-formatter/json-convert";
import type { Tool } from "@/lib/tools-registry";
import { JsonToXmlContent, seoData } from "./content";
import { tidyEmptyElements, XML_TAG } from "./json-to-xml.lib";

const DEFAULT_INPUT = JSON.stringify(JSON_SAMPLES[0].value, null, 2);

const INDENTS = [
  ["2", "2 spaces"],
  ["4", "4 spaces"],
] as const;

/**
 * JSON → XML. Keys become elements, values text content, arrays repeated
 * `<item>` siblings. Toolbar: root and item tag names, indent, XML
 * declaration, and self-closing empty elements.
 */
export function JsonToXml({ tool }: { tool: Tool }) {
  const [rootTag, setRootTag] = useUrlState("root", stringCodec("root"));
  const [itemTag, setItemTag] = useUrlState("item", stringCodec("item"));
  const [indent, setIndent] = useUrlState("indent", enumCodec(["2", "4"] as const, "2"));
  const [declaration, setDeclaration] = useUrlState("decl", booleanCodec(true));
  const [selfClose, setSelfClose] = useUrlState("selfClose", booleanCodec(true));

  const safeRoot = XML_TAG.test(rootTag.trim()) ? rootTag.trim() : "root";
  const safeItem = XML_TAG.test(itemTag.trim()) ? itemTag.trim() : "item";

  const options = useMemo<XmlOptions>(
    () => ({ rootTag: safeRoot, itemTag: safeItem, declaration, indent: Number(indent) }),
    [safeRoot, safeItem, declaration, indent],
  );

  const convert = useCallback((value: unknown) => toXML(value, options), [options]);
  const postProcess = useCallback((out: string) => tidyEmptyElements(out, selfClose), [selfClose]);

  const c = useConverter({
    convert,
    worker: { target: "xml", options },
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
      outputLang="xml"
      outputLabel="XML"
      summary={linesSummary(c.output)}
      statusNote={`<${safeRoot}>`}
      downloadExt="xml"
      downloadMime="application/xml"
      downloadName={safeRoot}
      conversionError={c.conversionError}
      isComputing={c.isComputing}
      content={<JsonToXmlContent />}
      toolbar={
        <>
          <ToolbarField label="Root" value={rootTag} onChange={setRootTag} ariaLabel="Root element name" />
          <ToolbarField
            label="Item"
            value={itemTag}
            onChange={setItemTag}
            ariaLabel="Element name for array items"
            className="flex-[0_1_160px]"
          />
          <Segmented label="Indent" value={indent} options={INDENTS} onChange={setIndent} />
          <ToggleChip label="Declaration" checked={declaration} onChange={setDeclaration} hint='Start with <?xml version="1.0"?>' />
          <ToggleChip label="Self-close empty" checked={selfClose} onChange={setSelfClose} hint="Write empty elements as <tag/>" />
        </>
      }
    />
  );
}
