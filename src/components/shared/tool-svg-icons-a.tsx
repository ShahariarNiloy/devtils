import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function Icon({ size = 24, children, ...p }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      {children}
    </svg>
  );
}

export const JsonFormatter = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 4Q7 4 7 6.5V10Q7 12 6 12Q7 12 7 14V17.5Q7 20 9 20" />
    <path d="M15 4Q17 4 17 6.5V10Q17 12 18 12Q17 12 17 14V17.5Q17 20 15 20" />
    <line x1="10.5" y1="8.5" x2="13.5" y2="8.5" />
    <line x1="10.5" y1="12" x2="14.5" y2="12" />
    <line x1="10.5" y1="15.5" x2="12.5" y2="15.5" />
  </Icon>
);

export const RegexTester = (p: IconProps) => (
  <Icon {...p}>
    <line x1="5" y1="20" x2="9.5" y2="4" />
    <line x1="14.5" y1="20" x2="19" y2="4" />
    <path d="M12 8V13M10 9.5L14 11.5M14 9.5L10 11.5" />
    <circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
  </Icon>
);

export const ColorConverter = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10" cy="9.5" r="5" />
    <circle cx="14" cy="9.5" r="5" />
    <circle cx="12" cy="13.5" r="5" />
  </Icon>
);

export const Base64 = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="7" width="8" height="10" rx="2" />
    <rect x="14" y="7" width="8" height="10" rx="2" />
    <path d="M10.5 10H13.5M12.5 9L13.5 10L12.5 11" />
    <path d="M13.5 14H10.5M11.5 13L10.5 14L11.5 15" />
    <line x1="4" y1="11" x2="8" y2="11" />
    <line x1="4" y1="13" x2="7" y2="13" />
    <line x1="4" y1="15" x2="8" y2="15" />
  </Icon>
);

export const CaseConverter = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 19L8.5 5L13.5 19" />
    <line x1="5.5" y1="14.5" x2="11.5" y2="14.5" />
    <path d="M16 11C16 9.3 18.5 9 19.5 10.5S20 13.5 18 14.5C16 15.5 15.5 17 17.5 17.5H20" />
    <line x1="20.5" y1="10.5" x2="20.5" y2="17.5" />
  </Icon>
);

export const JwtDecoder = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 9.5V7.5C9.5 5.8 14.5 5.8 14.5 7.5V9.5" />
    <rect x="8.5" y="9.5" width="7" height="5" rx="1.5" />
    <rect x="2" y="16" width="5.5" height="3.5" rx="1.5" />
    <rect x="9.25" y="16" width="5.5" height="3.5" rx="1.5" />
    <rect x="16.5" y="16" width="5.5" height="3.5" rx="1.5" />
    <circle cx="8.1" cy="17.75" r=".6" fill="currentColor" stroke="none" />
    <circle cx="15.9" cy="17.75" r=".6" fill="currentColor" stroke="none" />
  </Icon>
);

export const UrlEncoder = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 14.5L7.5 17C5.8 18.7 3 18.7 1.3 17S-.4 12.3 1.3 10.6L4.5 7.4C6.2 5.7 9 5.7 10.7 7.4" />
    <path d="M14 9.5L16.5 7C18.2 5.3 21 5.3 22.7 7S24.4 11.7 22.7 13.4L19.5 16.6C17.8 18.3 15 18.3 13.3 16.6" />
    <line x1="9.5" y1="14.5" x2="14.5" y2="9.5" />
    <circle cx="10" cy="9.5" r="1.25" />
    <circle cx="14" cy="14.5" r="1.25" />
  </Icon>
);

export const UrlParser = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="11" r="8" />
    <line x1="4" y1="11" x2="20" y2="11" />
    <path d="M12 3C9 6 9 16 12 19M12 3C15 6 15 16 12 19" />
    <line x1="3" y1="21.5" x2="7.5" y2="21.5" />
    <circle cx="9" cy="21.5" r=".7" fill="currentColor" stroke="none" />
    <line x1="10.5" y1="21.5" x2="15.5" y2="21.5" />
    <circle cx="17" cy="21.5" r=".7" fill="currentColor" stroke="none" />
    <line x1="18.5" y1="21.5" x2="21" y2="21.5" />
  </Icon>
);

export const TimestampConverter = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="5" width="20" height="17" rx="2" />
    <line x1="2" y1="11" x2="22" y2="11" />
    <line x1="8" y1="3" x2="8" y2="7" />
    <line x1="16" y1="3" x2="16" y2="7" />
    <circle cx="12" cy="16.5" r="4" />
    <path d="M12 14.5V16.5L13.5 17.5" />
  </Icon>
);

export const UuidGenerator = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="8.5" width="7" height="3.5" rx="1.5" />
    <line x1="9.5" y1="10.25" x2="10.5" y2="10.25" />
    <rect x="11" y="8.5" width="4" height="3.5" rx="1.5" />
    <line x1="15.5" y1="10.25" x2="16.5" y2="10.25" />
    <rect x="17" y="8.5" width="5" height="3.5" rx="1.5" />
    <rect x="2" y="14" width="4.5" height="3.5" rx="1.5" />
    <line x1="7" y1="15.75" x2="8" y2="15.75" />
    <rect x="8.5" y="14" width="13.5" height="3.5" rx="1.5" />
    <path d="M9 6C10.5 4.3 13.5 4.3 15 6" />
    <path d="M15 6L14 7.5" />
  </Icon>
);
