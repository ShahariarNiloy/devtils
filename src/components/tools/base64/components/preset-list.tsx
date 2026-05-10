"use client";

import { Image as ImageIcon, Key, Lock, Shield, type LucideIcon } from "lucide-react";
import { PRESETS } from "../base64.lib";
import type { PresetItem } from "../base64.types";

const ICON_MAP: Record<string, LucideIcon> = {
  lock: Lock,
  key: Key,
  image: ImageIcon,
  shield: Shield,
};

interface PresetListProps {
  onSelect: (preset: PresetItem) => void;
}

export function PresetList({ onSelect }: PresetListProps) {
  return (
    <div className="flex flex-col">
      <p className="text-sm uppercase tracking-wider font-semibold text-text-faint px-3 py-2">
        Quick presets
      </p>
      <ul className="flex flex-col">
        {PRESETS.map((p) => {
          const Icon = ICON_MAP[p.icon] ?? Lock;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p)}
                title={p.description}
                className="w-full flex items-start gap-2 px-3 py-2 text-left text-sm text-text-muted hover:text-text hover:bg-surface-soft transition-colors cursor-pointer rounded-button"
              >
                <Icon size={14} aria-hidden className="mt-0.5 shrink-0 text-text-faint" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-text truncate">{p.label}</span>
                  <span className="block text-sm text-text-faint truncate">{p.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
