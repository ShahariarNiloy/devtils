"use client";

import { TimezoneCard } from "../components/timezone-card";
import { FormatsGrid } from "../components/formats-grid";
import { QuickReferenceChips } from "../components/quick-reference-chips";
import { CodePanel } from "../components/code-panel";
import { RightRail } from "../components/right-rail";
import type { UseTimestampConverter } from "../useTimestampConverter";

interface Props {
  s: UseTimestampConverter;
}

export function SingleMode({ s }: Props) {
  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TimezoneCard
            title="Primary"
            isPrimary
            view={s.primaryView}
            tz={s.primaryTz}
            onTzChange={s.setPrimaryTz}
          />
          <TimezoneCard
            title="Secondary"
            view={s.secondaryView}
            tz={s.secondaryTz}
            onTzChange={s.setSecondaryTz}
          />
        </div>

        <FormatsGrid formats={s.formats} />

        <QuickReferenceChips
          parseResult={s.parseResult}
          primaryTz={s.primaryTz}
          onApply={s.setRawInput}
        />

        <CodePanel
          parseResult={s.parseResult}
          primaryTz={s.primaryTz}
          activeLanguage={s.activeLanguage}
          onLanguage={s.setActiveLanguage}
        />
      </div>

      <RightRail s={s} />
    </div>
  );
}
