import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

const outfit = Outfit({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#064E3B" },
  ],
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "AIxCaller — AI Receptionist & Phone Answering Service for Businesses",
    template: "%s | AIxCaller",
  },
  description:
    "AIxCaller is the AI receptionist that answers every call 24/7. Book appointments, qualify leads, and handle inbound calls automatically — starting at $50/mo. No staff needed.",

  metadataBase: new URL("https://callerx.ai"),

  keywords: [
    // ── Highest-intent (what buyers type right before purchasing) ──
    "AI receptionist",
    "AI phone answering service",
    "AI answering service for small business",
    "AI virtual receptionist",
    "AI phone agent",
    "AI call answering",
    "automated phone answering service",
    "24/7 phone answering service",
    "after hours answering service",
    "AI call center software",

    // ── Voice agent & automation ──
    "AI voice agent",
    "AI voice assistant for business",
    "AI call handler",
    "AI phone call automation",
    "voice AI for business",
    "conversational AI phone",
    "no-code AI voice agent",
    "AI outbound caller",
    "automated outbound calling",
    "AI inbound call handling",

    // ── Problem-driven searches ──
    "never miss a business call",
    "missed call automation",
    "AI lead qualification",
    "AI appointment booking",
    "AI appointment scheduling phone",
    "automated appointment reminders",
    "AI customer service phone",
    "reduce missed calls small business",
    "replace receptionist with AI",

    // ── Vertical / niche ──
    "AI receptionist for dental office",
    "AI receptionist for real estate",
    "AI phone answering for HVAC",
    "AI receptionist for law firm",
    "AI receptionist for restaurants",
    "AI receptionist for healthcare",
    "AI receptionist for e-commerce",
    "AI receptionist for plumbers",

    // ── Integration / technical ──
    "AI receptionist with CRM integration",
    "AI receptionist Google Calendar",
    "Shopify AI phone support",
    "Zoho CRM AI calling",
    "Telnyx AI voice bot",
    "AI call transcription and summary",
    "call sentiment analysis AI",

    // ── Brand ──
    "AIxCaller",
    "callerx",
    "callerx.ai",
  ],

  authors: [{ name: "AIxCaller", url: "https://callerx.ai" }],
  creator: "AIxCaller",
  publisher: "AIxCaller",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://callerx.ai",
    siteName: "AIxCaller",
    title: "AIxCaller — AI Receptionist & Phone Answering Service",
    description:
      "Never miss another business call. AIxCaller's AI receptionist answers 24/7, books appointments, qualifies leads, and syncs with your CRM — from $50/mo.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AIxCaller — AI Receptionist answering business calls 24/7",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@aixcaller",
    creator: "@aixcaller",
    title: "AIxCaller — AI Receptionist & Phone Answering Service",
    description:
      "AI that answers every call 24/7. Books appointments, qualifies leads, syncs CRM. Starts at $50/mo. No staff needed.",
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

  alternates: {
    canonical: "https://callerx.ai",
  },

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
        "@id": "https://callerx.ai/#organization",
        "name": "AIxCaller",
        "url": "https://callerx.ai/",
        "logo": {
          "@type": "ImageObject",
          "url": "https://callerx.ai/logo.svg",
          "width": 512,
          "height": 512,
          "caption": "AIxCaller — AI Receptionist & Phone Answering Service",
        },
        "image": "https://callerx.ai/logo.svg",
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
        "@id": "https://callerx.ai/#website",
        "url": "https://callerx.ai/",
        "name": "AIxCaller",
        "description": "AI receptionist and phone answering service for businesses of any size.",
        "publisher": { "@id": "https://callerx.ai/#organization" },
        "inLanguage": "en-US",
      },

      // ── SoftwareApplication ───────────────────────────────────────
      {
        "@type": "SoftwareApplication",
        "name": "AIxCaller",
        "url": "https://callerx.ai",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, iOS, Android",
        "description":
          "AI-powered phone answering service and virtual receptionist platform. Answers inbound calls 24/7, books appointments via Google Calendar, qualifies leads, handles Shopify orders, and syncs with Zoho & HubSpot CRM.",
        "screenshot": "https://callerx.ai/opengraph-image",
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
          "24/7 AI phone answering",
          "Appointment booking via Google Calendar",
          "Lead qualification and scoring",
          "Missed call auto-recovery",
          "AI-generated call transcripts and summaries",
          "Sentiment analysis on every call",
          "Shopify order lookup",
          "Zoho CRM and HubSpot sync",
          "Human call transfer",
          "Knowledge base training on PDFs and URLs",
          "31+ countries phone number support",
          "Custom AI voice selection",
        ],
      },

      // ── FAQPage (targets Featured Snippets) ───────────────────────
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is an AI receptionist?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "An AI receptionist is software that answers your business phone calls automatically using a natural-sounding AI voice. It can greet callers, answer questions from your business knowledge base, book appointments, qualify leads, and transfer calls to a human — all without any staff. AIxCaller's AI receptionist works 24 hours a day, 7 days a week.",
            },
          },
          {
            "@type": "Question",
            "name": "How much does an AI phone answering service cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "AIxCaller's AI phone answering service starts at $50/month for the Starter plan, which includes 200 minutes and one AI agent. The Pro plan is $119/month (500 minutes, 2 agents) and Premium is $250/month (1,100 minutes, 4 agents). There are no setup fees and you can cancel anytime.",
            },
          },
          {
            "@type": "Question",
            "name": "Can an AI answering service book appointments?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Yes. AIxCaller integrates directly with Google Calendar so your AI agent can check availability and book appointments in real-time during the phone call, without any human involvement.",
            },
          },
          {
            "@type": "Question",
            "name": "What businesses benefit most from AI phone answering?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Any business that receives phone calls benefits from AI answering. The highest ROI is seen in dental offices, HVAC and home services, real estate agencies, law firms, restaurants, e-commerce stores, and healthcare clinics. AIxCaller works for any business that wants to stop missing calls and stop paying for a full-time receptionist.",
            },
          },
          {
            "@type": "Question",
            "name": "Does AIxCaller work with my existing phone number?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Yes. You can keep your existing business number and forward calls to your AIxCaller AI agent, or provision a new local or toll-free number in 31+ countries directly from the dashboard in under 2 minutes.",
            },
          },
          {
            "@type": "Question",
            "name": "Can the AI transfer calls to a human?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Yes. AIxCaller supports live call transfer. You can configure business hours, and the AI will automatically transfer callers to a human agent during staffed hours. Outside of those hours, it handles calls fully autonomously.",
            },
          },
          {
            "@type": "Question",
            "name": "Does the AI receptionist integrate with CRM software?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Yes. AIxCaller integrates with Zoho CRM and HubSpot, automatically creating or updating lead records after every call. It also syncs with Shopify for e-commerce order lookups, and Google Sheets for lead logging.",
            },
          },
        ],
      },
    ],
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
