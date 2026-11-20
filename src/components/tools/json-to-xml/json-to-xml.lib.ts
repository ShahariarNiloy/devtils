/**
 * Post-processing for the shared XML emitter (pure, no React).
 */

export const XML_TAG = /^[A-Za-z_][\w.-]*$/;

/**
 * Empty arrays / objects come out of the emitter as an open tag, a blank
 * line and a close tag. Collapse them to `<tag/>` (self-close on) or
 * `<tag></tag>`; with self-close off, `nil="true"` nulls get explicit
 * close tags too.
 */
export function tidyEmptyElements(xml: string, selfClose: boolean): string {
  const collapsed = xml.replace(
    /^([ \t]*)<([^\s>/]+)>\n(?:[ \t]*\n)*\1<\/\2>$/gm,
    (_, ind: string, tag: string) => (selfClose ? `${ind}<${tag}/>` : `${ind}<${tag}></${tag}>`),
  );
  if (selfClose) return collapsed;
  return collapsed.replace(/<([^\s>/]+)( [^>]*?)?\/>/g, (_, tag: string, attrs = "") => `<${tag}${attrs}></${tag}>`);
}
