/**
 * Shared v2 "seo" workspace (mockup family `is.seo`). Every SEO tool is the
 * same window: optional top bar → form ‖ results → status bar.
 *
 * Layout
 *   <SeoWorkspace top? form results counts detail />  window + status bar.
 *     `counts` = countChecks(checks); `detail` = tool.name.
 *   <SeoPresets presets onPick />       "Start from" pills (put in `top`).
 *   <SeoSegmented label options value onChange />  type picker (in `top`).
 *   <SeoPanel title>…</SeoPanel>         bordered panel in the form column.
 *
 * Form (left column; wrap each control in <SeoField label counter? counterTone? hint?>)
 *   SeoTextInput {label value onChange placeholder? mono? invalid?}
 *   SeoTextArea  {label value onChange placeholder? height? mono=true}
 *   SeoSelect    {label value onChange options:{value,label}[]}
 *   SeoToggles   {items:{id,label,on}[] onToggle(id)}
 *   SeoRows      {columns:{key,label,flex}[] rows onChange newRow addLabel isBad?}
 *
 * Results (right column, in this order)
 *   <SeoChecks checks />                summary chips + sorted check rows.
 *   <SeoSerpCard … /> / <SeoSocialCards … />  previews (meta / OG tools).
 *   <SeoTable label rows:{level,a,b,note}[] />  per-item audit rows.
 *   <SeoCodePanel text lang label? tabs? tab? onTab? menu? emptyText? />
 *     Copy copies `text`; extra actions (download, sample, clear) go in
 *     `menu` behind ⋯ — never drop a feature for lack of room.
 *
 * Pure helpers (seo.lib.ts — import from "@/components/tools/seo-shared/seo.lib"
 * in your own *.lib.ts so it stays React-free):
 *   Check {level:"err"|"warn"|"info"|"ok", text}, countChecks, hasProblems,
 *   sortChecks, summaryChips, statusOf, checkLangCode, isAbsUrl, sameUrl,
 *   escapeXml, decodeEntities, highlight(text, "markup"|"robots"|"plain"|"json"),
 *   parseTable (CSV/TSV), findTags(html, "link"|"meta"…) (skips comments/scripts),
 *   stripInertHtml, daysInMonth, isRealDate.
 * Client helpers: useCopy(), downloadText(filename, text, mime?).
 */

export { SeoWorkspace, SeoPresets, SeoSegmented, SeoPanel } from "./seo-workspace";
export { SeoField, SeoTextInput, SeoTextArea, SeoSelect, SeoToggles, SeoRows } from "./seo-fields";
export type { SeoRowColumn, CounterTone } from "./seo-fields";
export { SeoChecks, SeoTable, SeoCodePanel, useCopy, downloadText } from "./seo-results";
export type { SeoTableRow, SeoMenuItem } from "./seo-results";
export { SeoSerpCard, SeoSocialCards } from "./seo-previews";
export * from "./seo.lib";
