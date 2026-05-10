/**
 * DefaultIllustration
 *
 * Fallback illustration shown for tool slugs without a dedicated illustration.
 */

export function DefaultIllustration() {
  return (
    <svg viewBox="0 0 320 160" fill="none" className="w-full h-full" aria-hidden>
      <rect width="320" height="160" fill="#F5F0E5" />
      {[0, 1, 2, 3].map(i => (
        <rect
          key={i}
          x="24"
          y={20 + i * 30}
          width={160 + (i % 2) * 60}
          height="14"
          rx="4"
          fill="#DDE0D0"
          className={`ti-anim-l${(i + 1) as 1 | 2 | 3 | 4} ti-d${(i + 1) as 1 | 2 | 3 | 4}`}
        />
      ))}
      <rect
        x="24" y="140" width="80" height="14" rx="4" fill="#3D4435" opacity="0.3"
        className="ti-anim-fade ti-d5"
      />
    </svg>
  );
}
