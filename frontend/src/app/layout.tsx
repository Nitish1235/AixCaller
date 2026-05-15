import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AIxCaller — AI-Powered Calling Platform",
    template: "%s | AIxCaller",
  },
  description:
    "Automate outbound & inbound calls with intelligent AI voice agents. Save hours, qualify leads, and book appointments — on autopilot.",
  metadataBase: new URL("https://aixcaller.com"),
  keywords: [
    "AI call assistant",
    "AI virtual caller",
    "AI caller",
    "AI call handler",
    "virtual voice assistant",
    "AI phone answering",
    "AI voice agent",
    "automated call center AI",
    "sales automation",
    "AIxCaller",
  ],
  authors: [{ name: "AIxCaller Team", url: "https://aixcaller.com" }],
  creator: "AIxCaller",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aixcaller.com",
    siteName: "AIxCaller",
    title: "AIxCaller — AI-Powered Calling Platform",
    description:
      "Automate outbound & inbound calls with intelligent AI voice agents. Save hours, qualify leads, and book appointments — on autopilot.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AIxCaller — AI-Powered Calling Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@aixcaller",
    creator: "@aixcaller",
    title: "AIxCaller — AI-Powered Calling Platform",
    description:
      "Automate outbound & inbound calls with intelligent AI voice agents.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/logo.svg",
    shortcut: "/logo.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://aixcaller.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://aixcaller.com/#website",
        "url": "https://aixcaller.com/",
        "name": "AIxCaller",
        "description": "Automate outbound & inbound calls with intelligent AI voice agents.",
        "publisher": {
          "@id": "https://aixcaller.com/#organization"
        }
      },
      {
        "@type": "Organization",
        "@id": "https://aixcaller.com/#organization",
        "name": "AIxCaller",
        "url": "https://aixcaller.com/",
        "logo": "https://aixcaller.com/logo.svg",
        "sameAs": [
          "https://twitter.com/aixcaller"
        ]
      }
    ]
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      </head>
      <body className={outfit.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
