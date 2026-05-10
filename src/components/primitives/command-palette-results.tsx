"use client";

import { Command } from "cmdk";
import { cn } from "@/lib/cn";
import { CATEGORIES, TOOLS } from "@/lib/tools-registry";

const GROUP_HEADING_CLASS =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-sm [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-faint";

interface CommandPaletteResultsProps {
  recentTools: typeof TOOLS;
  query: string;
  onSelect: (slug: string) => void;
}

export function CommandPaletteResults({
  recentTools,
  query,
  onSelect,
}: CommandPaletteResultsProps) {
  return (
    <Command.List className="max-h-[60vh] overflow-y-auto p-2">
      <Command.Empty className="py-8 text-center text-sm text-text-faint">
        No matching tools.
      </Command.Empty>

      {recentTools.length > 0 && !query && (
        <Command.Group heading="Recent" className={GROUP_HEADING_CLASS}>
          {recentTools.map((t) => (
            <PaletteItem
              key={t.slug}
              value={`${t.name} ${t.tags.join(" ")}`}
              onSelect={() => onSelect(t.slug)}
            >
              <span className="text-text">{t.name}</span>
              <span className="ml-auto text-sm text-text-faint uppercase tracking-wider">
                {t.category}
              </span>
            </PaletteItem>
          ))}
        </Command.Group>
      )}

      {CATEGORIES.map((cat) => {
        const inCat = TOOLS.filter((t) => t.category === cat);
        if (inCat.length === 0) return null;
        return (
          <Command.Group
            key={cat}
            heading={cat}
            className={cn(GROUP_HEADING_CLASS, "mt-1")}
          >
            {inCat.map((t) => (
              <PaletteItem
                key={t.slug}
                value={`${t.name} ${t.description} ${t.tags.join(" ")} ${t.category}`}
                onSelect={() => onSelect(t.slug)}
              >
                <span className="text-text">{t.name}</span>
                <span className="text-sm text-text-faint truncate">
                  {t.description}
                </span>
              </PaletteItem>
            ))}
          </Command.Group>
        );
      })}
    </Command.List>
  );
}

function PaletteItem({
  value,
  onSelect,
  children,
}: {
  value: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer text-sm text-text-muted",
        "data-[selected=true]:bg-surface-3 data-[selected=true]:text-text",
      )}
    >
      {children}
    </Command.Item>
  );
}
