// AIxCaller Brand Logo Component
// Violet half-citrus slice on a lime-green (#4ADE80) background block.
// Props: size (default 36), showText (default true), dark (for dark sidebar)

interface LogoProps {
  size?: number;
  showText?: boolean;
  dark?: boolean;
}

export default function Logo({ size = 36, showText = true, dark = false }: LogoProps) {
  const pad = Math.round(size * 0.18);
  const blockSize = size;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.28) }}>
      {/* The Logo Block */}
      <div style={{
        width: blockSize,
        height: blockSize,
        borderRadius: Math.round(blockSize * 0.26),
        background: "#4ADE80",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: dark ? "2px 2px 0 #fff" : "0 2px 8px rgba(74,222,128,0.4)",
        border: dark ? "2px solid #fff" : "none",
      }}>
        <svg
          width={blockSize - pad * 2}
          height={blockSize - pad * 2}
          viewBox="0 0 120 120"
          style={{ display: "block" }}
        >
          {/* Violet Tilted Half-Citrus Slice */}
          <g transform="rotate(45, 60, 60)">
            {/* Outer rind */}
            <path d="M10,60 A50,50 0 0,0 110,60 L10,60 Z" fill="#A855F7" opacity="0.35"/>
            {/* Inner rind (white separator) */}
            <path d="M15,60 A45,45 0 0,0 105,60 L15,60 Z" fill="#E2E8F0" opacity="0.9"/>
            {/* Fruit flesh */}
            <path d="M20,60 A40,40 0 0,0 100,60 L20,60 Z" fill="#A855F7"/>
            {/* Segment lines */}
            <g transform="translate(60,60)">
              <line x1="0" y1="0" x2="0" y2="40" stroke="#fff" strokeWidth="2" opacity="0.7"/>
              <line x1="0" y1="0" x2="28" y2="28" stroke="#fff" strokeWidth="2" opacity="0.7"/>
              <line x1="0" y1="0" x2="-28" y2="28" stroke="#fff" strokeWidth="2" opacity="0.7"/>
              <line x1="0" y1="0" x2="38" y2="10" stroke="#fff" strokeWidth="2" opacity="0.7"/>
              <line x1="0" y1="0" x2="-38" y2="10" stroke="#fff" strokeWidth="2" opacity="0.7"/>
            </g>
            {/* Center pip */}
            <path d="M55,60 A5,5 0 0,0 65,60 L55,60 Z" fill="#fff"/>
          </g>
        </svg>
      </div>

      {/* Brand Name */}
      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{
            fontWeight: 900,
            fontSize: Math.round(size * 0.44),
            color: dark ? "#fff" : "#064E3B",
            letterSpacing: "-0.5px",
            textTransform: "uppercase",
          }}>
            AIxCaller
          </span>
        </div>
      )}
    </div>
  );
}
