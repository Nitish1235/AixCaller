// AIxCaller Brand Logo
//
// Overlapping sine wave ribbons of dots on a rounded white square — symbolizes
// live voice intelligence.
// Brand palette: Navy Blue (#1E40AF) → Royal Blue (#2563EB) → Dodger Blue (#3B82F6)
//
// Props:
//   size      — pixel height of the logo block (default 36)
//   showText  — render the "AIXCALLER" word-mark next to the icon
//   dark      — renders light text for dark backgrounds

interface LogoProps {
  size?: number;
  showText?: boolean;
  dark?: boolean;
}

export default function Logo({ size = 36, showText = true, dark = false }: LogoProps) {
  // We align text and shadows to match the beautiful new premium blue palette
  const text_color = dark ? "#FFFFFF" : "#1D4ED8"; // Premium brand blue
  const shadow_color = "rgba(29, 78, 216, 0.12)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: Math.round(size * 0.28),
      }}
    >
      {/* Icon block — rounded white block with glowing dot ribbons */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.225),
          background: "#2563eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 2px 8px ${shadow_color}`,
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={{ display: "block", transform: "scale(0.8)" }}
          aria-hidden="true"
        >
          <path d="M 14,40 L 14,60 M 32,28 L 32,72 M 50,15 L 50,85 M 68,28 L 68,72 M 86,40 L 86,60" stroke="white" strokeWidth="9" strokeLinecap="round" />
        </svg>
      </div>

      {/* Word-mark */}
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span
            style={{
              fontWeight: 900,
              fontSize: Math.round(size * 0.44),
              color: text_color,
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
