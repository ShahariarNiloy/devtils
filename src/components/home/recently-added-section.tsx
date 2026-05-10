import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { getNewTools, type Tool } from "@/lib/tools-registry";
import { Band } from "./band";
import { SectionHeading } from "./section-heading";
import { ToolChip } from "./tool-chip";

export function RecentlyAddedSection() {
  const allNew = getNewTools();
  const newest = allNew.slice(0, 8);
  const isAvailable = (slug: string) => IMPLEMENTED_TOOL_SLUGS.has(slug);

  if (newest.length === 0) return null;

  return (
    <Band tone="soft" aria-label="Recently added" className="pt-14 pb-16">
      <SectionHeading
        eyebrow="Hot off the press"
        title="Recently added"
        hint={`${newest.length} of ${allNew.length} new tools`}
        cta={{ href: "/tools", label: "All tools" }}
      />
      <div className="flex flex-wrap gap-2.5">
        {newest.map((tool: Tool, i: number) => (
          <ToolChip
            key={tool.slug}
            tool={tool}
            index={i}
            available={isAvailable(tool.slug)}
          />
        ))}
      </div>
    </Band>
  );
}
