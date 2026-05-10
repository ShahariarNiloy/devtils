import { Icon } from "./tool-svg-icons-a";
import type { IconProps } from "./tool-svg-icons-a";

export const DiffChecker = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="4" width="9" height="16" rx="1.5" />
    <rect x="13" y="4" width="9" height="16" rx="1.5" />
    <line x1="4" y1="8" x2="9" y2="8" />
    <line x1="4" y1="11.5" x2="9" y2="11.5" />
    <line x1="4" y1="17" x2="9" y2="17" />
    <line x1="15" y1="8" x2="20" y2="8" />
    <line x1="15" y1="11.5" x2="20" y2="11.5" />
    <line x1="15" y1="17" x2="20" y2="17" />
    {/* minus (removed) */}
    <line x1="4.5" y1="14.5" x2="7.5" y2="14.5" />
    {/* plus (added) */}
    <line x1="15.5" y1="14.5" x2="18.5" y2="14.5" />
    <line x1="17" y1="13" x2="17" y2="16" />
  </Icon>
);

export const MarkdownPreview = (p: IconProps) => (
  <Icon {...p}>
    <line x1="3" y1="6" x2="3" y2="11" />
    <line x1="6.5" y1="6" x2="6.5" y2="11" />
    <line x1="3" y1="8.5" x2="6.5" y2="8.5" />
    <line x1="8.5" y1="8.5" x2="13" y2="8.5" />
    <line x1="3" y1="14.5" x2="21" y2="14.5" />
    <line x1="3" y1="17.5" x2="18" y2="17.5" />
    <line x1="3" y1="20.5" x2="14" y2="20.5" />
  </Icon>
);

export const PasswordGenerator = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3L20.5 7V13C20.5 17.5 16.5 21 12 22C7.5 21 3.5 17.5 3.5 13V7L12 3Z" />
    <line x1="12" y1="9.5" x2="12" y2="15.5" />
    <line x1="9" y1="11" x2="15" y2="14" />
    <line x1="15" y1="11" x2="9" y2="14" />
  </Icon>
);

export const HtmlEntity = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8L1 12L3 16" />
    <path d="M21 8L23 12L21 16" />
    <path d="M14.5 17.5L9 12C7.5 10.5 7.5 8 9 6.5S12.5 6 13.5 7.5S13 10.5 11.5 12L16.5 16.5" />
    <path d="M13.5 17.5C14.5 17.5 16 17 17 16" />
  </Icon>
);

export const YamlToJson = (p: IconProps) => (
  <Icon {...p}>
    <line x1="2" y1="5.5" x2="7" y2="5.5" />
    <line x1="4" y1="9" x2="10" y2="9" />
    <line x1="4" y1="12.5" x2="9" y2="12.5" />
    <line x1="6" y1="16" x2="11" y2="16" />
    <path d="M12 12H14M13.2 11L14 12L13.2 13" />
    <path d="M16.5 5.5Q15 5.5 15 7V10Q15 11.5 14 12Q15 12.5 15 14V17Q15 18.5 16.5 18.5" />
    <path d="M21.5 5.5Q23 5.5 23 7V10Q23 11.5 24 12Q23 12.5 23 14V17Q23 18.5 21.5 18.5" />
  </Icon>
);

export const WordCounter = (p: IconProps) => (
  <Icon {...p}>
    <line x1="3" y1="7" x2="16" y2="7" />
    <line x1="3" y1="11" x2="21" y2="11" />
    <line x1="3" y1="15" x2="13" y2="15" />
    <rect x="16" y="13" width="6" height="6" rx="2" />
    <line x1="18" y1="16" x2="20" y2="16" />
    <line x1="19" y1="14.5" x2="19" y2="17.5" />
  </Icon>
);

export const CronParser = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="4" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="4" r="1" fill="currentColor" stroke="none" />
    <line x1="8" y1="5" x2="8" y2="7" />
    <line x1="12" y1="4" x2="12" y2="7" />
    <line x1="16" y1="5" x2="16" y2="7" />
    <circle cx="12" cy="14.5" r="7.5" />
    <path d="M12 11V14.5L14.5 16" />
  </Icon>
);

export const SqlFormatter = (p: IconProps) => (
  <Icon {...p}>
    <ellipse cx="12" cy="6" rx="8" ry="2.5" />
    <line x1="4" y1="6" x2="4" y2="17" />
    <line x1="20" y1="6" x2="20" y2="17" />
    <ellipse cx="12" cy="17" rx="8" ry="2.5" />
    <path d="M4 11.5C7 13 17 13 20 11.5" />
    <line x1="7" y1="8.5" x2="12" y2="8.5" />
    <line x1="9.5" y1="14.5" x2="17" y2="14.5" />
  </Icon>
);

export const CsvToJson = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="4" width="10.5" height="16" rx="1.5" />
    <line x1="2" y1="9" x2="12.5" y2="9" />
    <line x1="2" y1="14" x2="12.5" y2="14" />
    <line x1="7.25" y1="4" x2="7.25" y2="20" />
    <path d="M14 11.5H15.5M15 10.5L16 11.5L15 12.5" />
    <path d="M17.5 5Q16 5 16 6.5V9.5Q16 11 15 12Q16 13 16 14.5V17.5Q16 19 17.5 19" />
    <path d="M22.5 5Q24 5 24 6.5V9.5Q24 11 25 12Q24 13 24 14.5V17.5Q24 19 22.5 19" />
  </Icon>
);

export const ChmodCalculator = (p: IconProps) => (
  <Icon {...p}>
    {/* Row 1 owner: rwx all on */}
    <rect x="2" y="3" width="5.5" height="4.5" rx="1.25" />
    <rect x="9.25" y="3" width="5.5" height="4.5" rx="1.25" />
    <rect x="16.5" y="3" width="5.5" height="4.5" rx="1.25" />
    {/* Row 2 group: r-x */}
    <rect x="2" y="9.75" width="5.5" height="4.5" rx="1.25" />
    <rect x="9.25" y="9.75" width="5.5" height="4.5" rx="1.25" strokeDasharray="2 1.5" strokeOpacity="0.4" />
    <rect x="16.5" y="9.75" width="5.5" height="4.5" rx="1.25" />
    {/* Row 3 other: r-- */}
    <rect x="2" y="16.5" width="5.5" height="4.5" rx="1.25" />
    <rect x="9.25" y="16.5" width="5.5" height="4.5" rx="1.25" strokeDasharray="2 1.5" strokeOpacity="0.4" />
    <rect x="16.5" y="16.5" width="5.5" height="4.5" rx="1.25" strokeDasharray="2 1.5" strokeOpacity="0.4" />
  </Icon>
);
