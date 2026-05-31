import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#030712" },
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "AIxCaller | AI Receptionist & Outbound Voice Agents",
    template: "%s | AIxCaller",
  },
  description:
    "Never miss a lead. AIxCaller provides 24/7 AI receptionists and automated outbound sales dialers to book appointments and qualify leads. Try it for free.",

  metadataBase: new URL("https://aixcaller.com"),

  keywords: [
    "AI receptionist",
    "outbound AI dialer",
    "AI phone agent",
    "automated calling software",
    "voice AI for business",
    "AIxCaller"
  ],

  authors: [{ name: "AIxCaller", url: "https://aixcaller.com" }],
  creator: "AIxCaller",
  publisher: "AIxCaller",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aixcaller.com",
    siteName: "AIxCaller",
    title: "AIxCaller | AI Receptionist & Outbound Voice Agents",
    description:
      "Never miss a lead. AIxCaller provides 24/7 AI receptionists and automated outbound sales dialers to book appointments and qualify leads. Try it for free.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AIxCaller — AI Receptionist & Outbound Calling Platform",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@aixcaller",
    creator: "@aixcaller",
    title: "AIxCaller | AI Receptionist & Outbound Voice Agents",
    description:
      "Never miss a lead. AIxCaller provides 24/7 AI receptionists and automated outbound sales dialers to book appointments and qualify leads. Try it for free.",
    images: ["/opengraph-image"],
  },

  icons: {
    icon: [
      { url: "/icon", type: "image/svg+xml" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    shortcut: "/logo.svg",
  },

  manifest: "/manifest.webmanifest",

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

  // Removed static alternates.canonical to allow Next.js metadataBase to resolve canonicals dynamically for subpages.

  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      // ── Organization ──────────────────────────────────────────────
      {
        "@type": "Organization",
        "@id": "https://aixcaller.com/#organization",
        "name": "AIxCaller",
        "url": "https://aixcaller.com/",
        "logo": {
          "@type": "ImageObject",
          "url": "https://aixcaller.com/logo.svg",
          "width": 512,
          "height": 512,
          "caption": "AIxCaller — AI Receptionist & Phone Answering Service",
        },
        "image": "https://aixcaller.com/logo.svg",
        "description":
          "AIxCaller provides AI receptionist and automated phone answering services that handle inbound calls, book appointments, qualify leads, and integrate with CRMs — 24 hours a day.",
        "foundingDate": "2024",
        "areaServed": "Worldwide",
        "sameAs": [
          "https://twitter.com/aixcaller",
        ],
      },

      // ── WebSite ───────────────────────────────────────────────────
      {
        "@type": "WebSite",
        "@id": "https://aixcaller.com/#website",
        "url": "https://aixcaller.com/",
        "name": "AIxCaller",
        "description": "AI receptionist and phone answering service for businesses of any size.",
        "publisher": { "@id": "https://aixcaller.com/#organization" },
        "inLanguage": "en-US",
      },

      // ── SoftwareApplication ───────────────────────────────────────
      {
        "@type": "SoftwareApplication",
        "name": "AIxCaller",
        "url": "https://aixcaller.com",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, iOS, Android",
        "description":
          "AI-powered phone answering service and virtual receptionist platform. Answers inbound calls 24/7, books appointments via Google Calendar, qualifies leads, handles Shopify orders, and syncs with HubSpot CRM.",
        "screenshot": "https://aixcaller.com/opengraph-image",
        "offers": [
          {
            "@type": "Offer",
            "name": "Starter Plan",
            "price": "50",
            "priceCurrency": "USD",
            "priceSpecification": {
              "@type": "UnitPriceSpecification",
              "price": "50",
              "priceCurrency": "USD",
              "billingDuration": "P1M",
            },
            "description": "200 minutes/month, 1 AI phone agent, all core features.",
          },
          {
            "@type": "Offer",
            "name": "Pro Business Plan",
            "price": "119",
            "priceCurrency": "USD",
            "priceSpecification": {
              "@type": "UnitPriceSpecification",
              "price": "119",
              "priceCurrency": "USD",
              "billingDuration": "P1M",
            },
            "description": "500 minutes/month, 2 AI phone agents, CRM integrations, Shopify.",
          },
          {
            "@type": "Offer",
            "name": "Premium Plan",
            "price": "250",
            "priceCurrency": "USD",
            "priceSpecification": {
              "@type": "UnitPriceSpecification",
              "price": "250",
              "priceCurrency": "USD",
              "billingDuration": "P1M",
            },
            "description": "1,100 minutes/month, 4 AI phone agents, all integrations, priority support.",
          },
        ],
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "bestRating": "5",
          "reviewCount": "128",
        },
        "featureList": [
          "24/7 AI inbound phone answering",
          "AI outbound calling campaigns",
          "Automated lead dialing and qualification",
          "Speed-to-lead instant call back",
          "Smart retry cadence for unanswered leads",
          "Appointment booking via Google Calendar",
          "Lead scoring and tier prioritization",
          "Missed call auto-recovery",
          "Post-call SMS drip sequences",
          "AI-generated call transcripts and summaries",
          "Sentiment analysis on every call",
          "Shopify order lookup during calls",
          "HubSpot CRM auto-sync",
          "Google Sheets lead logging",
          "Human call transfer with business hours routing",
          "Knowledge base training on PDFs and URLs",
          "31+ countries phone number support",
          "Timezone-aware calling windows",
          "DNC list compliance",
          "Custom AI voice selection",
          "Voicemail drop automation",
        ],
      },


      // ── Service schema for outbound ────────────────────────────────────────────────────────
      {
        "@type": "Service",
        "@id": "https://aixcaller.com/#outbound-service",
        "name": "AI Outbound Calling & Sales Dialer",
        "description": "Automated AI outbound calling service that dials leads from your contact list, qualifies prospects, books appointments, drops voicemails, and sends follow-up SMS — all without a human sales rep.",
        "provider": { "@id": "https://aixcaller.com/#organization" },
        "serviceType": "AI Outbound Call Center Software",
        "areaServed": "Worldwide",
        "url": "https://aixcaller.com/#outbound",
        "offers": {
          "@type": "Offer",
          "price": "50",
          "priceCurrency": "USD",
          "description": "Outbound AI calling included in all plans from $50/month.",
        },
      },

      // ── Service schema for inbound ────────────────────────────────────────────────────────
      {
        "@type": "Service",
        "@id": "https://aixcaller.com/#inbound-service",
        "name": "AI Receptionist & 24/7 Phone Answering Service",
        "description": "AI-powered 24/7 phone answering service for businesses. Greets callers, answers questions, books appointments, qualifies leads, and transfers to humans during business hours.",
        "provider": { "@id": "https://aixcaller.com/#organization" },
        "serviceType": "AI Virtual Receptionist",
        "areaServed": "Worldwide",
        "url": "https://aixcaller.com",
        "offers": {
          "@type": "Offer",
          "price": "50",
          "priceCurrency": "USD",
          "description": "AI receptionist service starting at $50/month.",
        },
      },
    ],
  };

  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      </head>
      <body className={plusJakartaSans.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
