// AIxCaller Brand Logo
//
// Seven rounded waveform bars on a white rounded square — symbolises live
// voice/audio. Brand palette: light mint (#86EFAC) → emerald (#10B981) →
// dark forest (#064E3B). The single source of truth for the mark is
// /public/logo.svg; this component mirrors it so we don't pay an extra
// network request inside the React tree.
//
// Props:
//   size      — pixel height of the logo block (default 36)
//   showText  — render the "AIXCALLER" word-mark next to the icon
//   dark      — for dark sidebars/footers: swaps mid-bars to light mint
//               and uses an outlined white box so it stays legible

interface LogoProps {
  size?: number;
  showText?: boolean;
  dark?: boolean;
}

export default function Logo({ size = 36, showText = true, dark = false }: LogoProps) {
  // On dark backgrounds we keep the white inner block (the design IS a
  // white-bg mark by spec) but add a subtle border so the block has a
  // crisp edge against the dark surface.
  const accentLight = "#86EFAC";
  const accentMid = "#10B981";
  const accentDark = dark ? "#A7F3D0" : "#064E3B";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: Math.round(size * 0.28),
      }}
    >
      {/* Icon block — always white inside, optional outline on dark UIs */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.22),
          background: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: dark
            ? "0 0 0 1.5px rgba(255,255,255,0.9)"
            : "0 2px 8px rgba(16,185,129,0.18)",
        }}
      >
        <svg
          width={Math.round(size * 0.84)}
          height={Math.round(size * 0.84)}
          viewBox="0 0 100 100"
          style={{ display: "block" }}
          aria-hidden="true"
        >
          <rect x="10" y="38" width="8" height="24" rx="4" fill={accentLight} />
          <rect x="22" y="18" width="8" height="64" rx="4" fill={accentMid} />
          <rect x="34" y="26" width="8" height="48" rx="4" fill={accentDark} />
          <rect x="46" y="12" width="8" height="76" rx="4" fill={accentMid} />
          <rect x="58" y="22" width="8" height="56" rx="4" fill={accentDark} />
          <rect x="70" y="32" width="8" height="36" rx="4" fill={accentLight} />
          <rect x="82" y="40" width="8" height="20" rx="4" fill={accentLight} />
        </svg>
      </div>

      {/* Word-mark */}
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span
            style={{
              fontWeight: 900,
              fontSize: Math.round(size * 0.44),
              color: dark ? "#FFFFFF" : "#064E3B",
              letterSpacing: "-0.5px",
              textTransform: "uppercase",
            }}
          >
            AIxCaller
          </span>
        </div>
      )}
    </div>
  );
}
