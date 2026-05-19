"use client";

import { TimezoneCard } from "../components/TimezoneCard";
import { FormatsGrid } from "../components/FormatsGrid";
import { QuickReferenceChips } from "../components/QuickReferenceChips";
import { CodePanel } from "../components/CodePanel";
import { RightRail } from "../components/RightRail";
import type { UseTimestampConverter } from "../useTimestampConverter";

interface Props {
  s: UseTimestampConverter;
}

export function SingleMode({ s }: Props) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
