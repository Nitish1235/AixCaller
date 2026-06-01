import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "AI Receptionist & 24/7 Call Answering Service | AIxCaller",
    template: "%s | AIxCaller",
  },
  description:
    "Never miss a call. AIxCaller is your 24/7 AI receptionist and virtual call answering service — answers calls in under 1 second, books appointments, qualifies leads, and syncs your CRM automatically. Try free.",

  metadataBase: new URL("https://aixcaller.com"),

  keywords: [
    "AI receptionist",
    "virtual receptionist",
    "AI call answering service",
    "24/7 phone answering service",
    "AI virtual receptionist",
    "automated answering service",
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
    title: "AI Receptionist & 24/7 Call Answering Service | AIxCaller",
    description:
      "Never miss a call. AIxCaller is your 24/7 AI receptionist and virtual call answering service — answers calls in under 1 second, books appointments, qualifies leads, and syncs your CRM automatically. Try free.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AIxCaller — AI Receptionist & 24/7 Call Answering Service",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@aixcaller",
    creator: "@aixcaller",
    title: "AI Receptionist & 24/7 Call Answering Service | AIxCaller",
    description:
      "Never miss a call. AIxCaller is your 24/7 AI receptionist and virtual call answering service — answers calls in under 1 second, books appointments, qualifies leads, and syncs your CRM automatically. Try free.",
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
        "alternateName": ["AI Caller", "AIx Caller", "AI Receptionist Service", "Virtual Receptionist AI"],
        "url": "https://aixcaller.com/",
        "logo": {
          "@type": "ImageObject",
          "url": "https://aixcaller.com/logo.svg",
          "width": 512,
          "height": 512,
          "caption": "AIxCaller — AI Receptionist & 24/7 Call Answering Service",
        },
        "image": "https://aixcaller.com/logo.svg",
        "description":
          "AIxCaller provides AI receptionist and virtual call answering services that handle inbound calls 24/7, book appointments via Google Calendar, qualify leads, and integrate with HubSpot, Shopify, and Google Sheets.",
        "foundingDate": "2024",
        "areaServed": "Worldwide",
        "sameAs": [
          "https://twitter.com/aixcaller",
          "https://www.linkedin.com/company/aixcaller",
          "https://www.producthunt.com/posts/aixcaller",
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
          "worstRating": "1",
          "reviewCount": "128",
        },
        "review": [
          {
            "@type": "Review",
            "author": { "@type": "Person", "name": "David Chen" },
            "datePublished": "2025-03-12",
            "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
            "reviewBody": "Telephony routing is perfectly crisp. We got our numbers running and configured our AI receptionist in minutes. It answers every call without fail."
          },
          {
            "@type": "Review",
            "author": { "@type": "Person", "name": "Sarah Jenkins" },
            "datePublished": "2025-04-01",
            "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
            "reviewBody": "Knowledge base queries take less than a second while live on the phone. Our AI call answering service handles 80% of inbound questions without any human involvement."
          },
          {
            "@type": "Review",
            "author": { "@type": "Person", "name": "Marcus Thompson" },
            "datePublished": "2025-04-18",
            "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
            "reviewBody": "The virtual receptionist has saved us two full-time salaries. It books appointments directly into our Google Calendar and follows up with SMS automatically."
          },
          {
            "@type": "Review",
            "author": { "@type": "Person", "name": "Rachel Wu" },
            "datePublished": "2025-05-07",
            "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
            "reviewBody": "Best AI phone answering service we have tried. Setup took 10 minutes and it was live the same day. Our dental practice stopped missing after-hours calls entirely."
          },
          {
            "@type": "Review",
            "author": { "@type": "Person", "name": "James Orton" },
            "datePublished": "2025-05-20",
            "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
            "reviewBody": "The outbound AI dialer books solar appointments on autopilot. We run campaigns while we sleep — answer rate is 61% and booking rate has tripled since switching."
          },
        ],
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
        "alternateName": "Automated Outbound Call Center",
        "description": "Automated AI outbound calling service that dials leads from your contact list, qualifies prospects, books appointments, drops personalized voicemails, and sends follow-up SMS — all without a human sales rep. Includes speed-to-lead (calls new leads in under 60 seconds), smart retry cadence, timezone-aware dialing, and DNC compliance.",
        "provider": { "@id": "https://aixcaller.com/#organization" },
        "serviceType": "AI Outbound Call Center Software",
        "areaServed": "Worldwide",
        "url": "https://aixcaller.com/#outbound",
        "offers": {
          "@type": "Offer",
          "price": "50",
          "priceCurrency": "USD",
          "description": "Outbound AI calling included in all plans from $50/month. No contracts.",
        },
      },

      // ── Service schema for inbound ────────────────────────────────────────────────────────
      {
        "@type": "Service",
        "@id": "https://aixcaller.com/#inbound-service",
        "name": "AI Receptionist & 24/7 Call Answering Service",
        "alternateName": ["Virtual Receptionist", "AI Phone Answering Service", "Automated Answering Service"],
        "description": "AI-powered 24/7 virtual receptionist and call answering service for businesses of all sizes. Answers inbound calls in under 1 second, greets callers by name, answers FAQs from your knowledge base, books appointments via Google Calendar, qualifies leads, handles Shopify order lookups, and transfers to a live agent during business hours. Available in 31+ countries.",
        "provider": { "@id": "https://aixcaller.com/#organization" },
        "serviceType": "AI Virtual Receptionist",
        "areaServed": "Worldwide",
        "url": "https://aixcaller.com",
        "offers": {
          "@type": "Offer",
          "price": "50",
          "priceCurrency": "USD",
          "description": "AI receptionist and virtual call answering service starting at $50/month. No contracts, no setup fees.",
        },
      },
    ],
  };

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="dns-prefetch" href="https://api.aixcaller.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      </head>
      <body className={inter.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
