import { MetadataRoute } from "next";

// Web App Manifest — used by Chrome/Android "Add to Home Screen", iOS, and
// Edge to register the site as a Progressive Web App. The icons listed here
// are also picked up by Google for rich-result branding.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AIxCaller — AI-Powered Calling Platform",
    short_name: "AIxCaller",
    description:
      "Automate outbound & inbound calls with intelligent AI voice agents. Save hours, qualify leads, and book appointments — on autopilot.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#10B981",
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        // Code-generated PNG (Next.js will produce one at /apple-icon)
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity"],
  };
}
