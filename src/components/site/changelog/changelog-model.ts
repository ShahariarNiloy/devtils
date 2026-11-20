import type { ChangelogEntry } from "@/lib/changelog";

/** Badge shown on every highlight line. Mirrors the v2 mockup tags. */
export type ReleaseTag = "New" | "Improved" | "Fixed";

export interface ReleaseView {
  /** ISO date, used for `<time dateTime>` and as the React key. */
  date: string;
  /** Pre-formatted on the server so the client never re-formats. */
  dateLabel: string;
  title: string;
  tag: ReleaseTag;
  dot: "clay" | "sage" | "teal" | "faint";
  highlights: string[];
}

const TAG_ORDER: ReleaseTag[] = ["New", "Improved", "Fixed"];
const DOTS = ["clay", "sage", "teal"] as const;

/**
 * Entries without a `kind` are single-tool launches in the data file
 * ("Timestamp converter", "Image compressor"), so they read as New.
 */
function tagFor(kind: ChangelogEntry["kind"]): ReleaseTag {
  return kind === "improved" ? "Improved" : "New";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function toReleaseViews(entries: ChangelogEntry[]): ReleaseView[] {
  return entries.map((e, i) => ({
    date: e.date,
    dateLabel: formatDate(e.date),
    title: e.title,
    tag: tagFor(e.kind),
    dot: i === entries.length - 1 ? "faint" : DOTS[i % DOTS.length],
    highlights: e.highlights,
  }));
}

/** Only offer filters that match at least one release — no dead chips. */
export function availableTags(views: ReleaseView[]): ReleaseTag[] {
  return TAG_ORDER.filter((t) => views.some((v) => v.tag === t));
}
