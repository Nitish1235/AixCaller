import { ImageResponse } from "next/og";

// Required Apple touch icon size for iOS home-screen.
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
          background: "#2563eb",
          borderRadius: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 30px rgba(37,99,235,0.3)",
        }}
      >
        <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 14,40 L 14,60 M 32,28 L 32,72 M 50,15 L 50,85 M 68,28 L 68,72 M 86,40 L 86,60" stroke="white" strokeWidth="9" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
