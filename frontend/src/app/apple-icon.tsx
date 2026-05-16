import { ImageResponse } from "next/og";

// Required Apple touch icon size for iOS home-screen.
// Next.js auto-serves this at /apple-icon and injects:
//   <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon">
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "180px",
          height: "180px",
          background: "#FFFFFF",
          borderRadius: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="150" height="150" viewBox="0 0 100 100">
          <rect x="10" y="38" width="8" height="24" rx="4" fill="#86EFAC" />
          <rect x="22" y="18" width="8" height="64" rx="4" fill="#10B981" />
          <rect x="34" y="26" width="8" height="48" rx="4" fill="#064E3B" />
          <rect x="46" y="12" width="8" height="76" rx="4" fill="#10B981" />
          <rect x="58" y="22" width="8" height="56" rx="4" fill="#064E3B" />
          <rect x="70" y="32" width="8" height="36" rx="4" fill="#86EFAC" />
          <rect x="82" y="40" width="8" height="20" rx="4" fill="#86EFAC" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
