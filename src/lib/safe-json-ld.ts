/**
 * Safely serialise an object for embedding inside an HTML `<script>` tag.
 *
 * `JSON.stringify` does NOT escape `<`, `>`, `&`, U+2028, or U+2029 — all
 * of which can break out of the script element or break a JSON parser at
 * runtime. The classic incident is a string containing `</script>` that
 * terminates the script tag early and treats the rest of the JSON as
 * HTML — a script-element XSS sink.
 *
 * Today every JSON-LD payload comes from hand-written content + the typed
 * registry, so no real attacker-controlled string reaches this function.
 * The escape is the right default anyway: any future hot-loaded FAQ data,
 * dynamic tool registration, or community-contributed copy is safe-by-
 * construction.
 *
 * The replacements use Unicode escapes inside the JSON string so the
 * structure is preserved character-for-character — a JSON parser still
 * sees `</script>`, but the browser's HTML scanner doesn't end the script
 * tag, and an older ECMAScript parser doesn't choke on a raw U+2028.
 *
 * The U+2028 / U+2029 patterns use `new RegExp` rather than a regex literal
 * because both characters are line terminators in JS source, which makes
 * embedding them inside a `/.../` literal a syntax error.
 */
const U2028 = new RegExp(" ", "g");
const U2029 = new RegExp(" ", "g");

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026")
    .replace(U2028, "\\u2028")
    .replace(U2029, "\\u2029");
}
