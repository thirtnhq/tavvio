interface WordmarkProps {
  className?: string;
  inverted?: boolean;
}

/**
 * Useroutr wordmark — small geometric mark + lowercase wordmark.
 * Editorial Frontier: black mark, sentence-case wordmark in display sans.
 */
export function Wordmark({ className, inverted }: WordmarkProps) {
  const ink = inverted ? "#F4F1EA" : "#0E0E0C";
  const stroke = inverted ? "#0E0E0C" : "#F4F1EA";
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <svg
        viewBox="0 0 28 28"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect x="1" y="1" width="26" height="26" rx="6" fill={ink} />
        {/* Two interlocked routes */}
        <path
          d="M8 10 C 10 14, 12 14, 14 14 C 16 14, 18 10, 20 10"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M8 18 C 10 14, 12 14, 14 14 C 16 14, 18 18, 20 18"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="14" cy="14" r="1.4" fill={stroke} />
      </svg>
      <span
        className="text-[18px] font-medium tracking-[-0.04em]"
        style={{
          fontFamily: "var(--font-display)",
          color: ink,
          fontFeatureSettings: '"ss01", "ss02"',
        }}
      >
        useroutr
      </span>
    </div>
  );
}
