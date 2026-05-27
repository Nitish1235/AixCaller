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
    default: "AIxCaller — AI Receptionist & Outbound AI Calling for Businesses",
    template: "%s | AIxCaller",
  },
  description:
    "AIxCaller is the AI phone platform that answers every inbound call 24/7 AND dials your leads automatically with outbound AI calling campaigns. Book appointments, qualify leads, and close more deals — starting at $50/mo.",

  metadataBase: new URL("https://callerx.ai"),

  keywords: [
    // ── Highest-intent inbound (what buyers type right before purchasing) ──
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

    // ── Outbound AI calling (high-intent, fast-growing) ──
    "AI outbound calling",
    "AI outbound dialer",
    "automated outbound calling software",
    "AI sales dialer",
    "AI cold calling software",
    "AI lead calling",
    "outbound call automation",
    "AI appointment setter",
    "AI appointment booking calls",
    "outbound AI voice agent",
    "automated lead follow-up calls",
    "AI sales outreach tool",
    "speed to lead software",
    "AI lead dialer",

    // ── Voice agent & automation ──
    "AI voice agent",
    "AI voice assistant for business",
    "AI call handler",
    "AI phone call automation",
    "voice AI for business",
    "conversational AI phone",
    "no-code AI voice agent",
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
    "how to automate sales calls",
    "how to follow up leads automatically",

    // ── Vertical / niche ──
    "AI receptionist for dental office",
    "AI receptionist for real estate",
    "AI phone answering for HVAC",
    "AI receptionist for law firm",
    "AI receptionist for restaurants",
    "AI receptionist for healthcare",
    "AI receptionist for e-commerce",
    "AI receptionist for plumbers",
    "AI outbound calling for solar",
    "AI outbound calling for insurance",
    "AI sales calls for real estate",

    // ── Integration / technical ──
    "AI receptionist with CRM integration",
    "AI receptionist Google Calendar",
    "Shopify AI phone support",
    "HubSpot CRM AI calling",
    "AI call transcription and summary",
    "call sentiment analysis AI",
    "AI voicemail drop software",
    "Google Sheets lead tracking AI",

    // ── Competitor comparison (people searching alternatives) ──
    "Bland AI alternative",
    "Air AI alternative",
    "Synthflow alternative",
    "Vapi alternative",
    "Retell AI alternative",
    "cheaper AI calling software",

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
    title: "AIxCaller — AI Receptionist & Outbound AI Calling Platform",
    description:
      "Never miss another business call. AIxCaller answers inbound calls 24/7 AND runs outbound AI calling campaigns — books appointments, qualifies leads, syncs CRM. From $50/mo.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AIxCaller — AI Receptionist & Outbound Calling Platform for Businesses",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@aixcaller",
    creator: "@aixcaller",
    title: "AIxCaller — AI Receptionist & Outbound AI Calling Platform",
    description:
      "Inbound AI that answers every call 24/7 + Outbound AI that dials your leads automatically. Books appointments, qualifies leads, syncs CRM. From $50/mo.",
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
          "AI-powered phone answering service and virtual receptionist platform. Answers inbound calls 24/7, books appointments via Google Calendar, qualifies leads, handles Shopify orders, and syncs with HubSpot CRM.",
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
            "name": "Does AIxCaller integrate with CRM software?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Yes. AIxCaller integrates with HubSpot CRM, automatically creating or updating lead records after every call. It also syncs with Shopify for e-commerce order lookups, and Google Sheets for lead logging.",
            },
          },
          {
            "@type": "Question",
            "name": "What is AI outbound calling?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "AI outbound calling is when an AI voice agent automatically dials leads from your contact list, qualifies them in conversation, and books appointments on your calendar — without any human sales rep involved. AIxCaller's outbound AI dialer supports timezone-aware calling, smart retry cadences, voicemail drops, and post-call SMS follow-up.",
            },
          },
          {
            "@type": "Question",
            "name": "How does AIxCaller's outbound AI dialer work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "You upload a Google Sheet or CSV with your leads. AIxCaller's AI scores each lead, calls them in the right timezone during business hours, has a natural conversation to qualify their interest, books appointments directly to Google Calendar, and sends a follow-up SMS if they don't answer. You see every call's transcript, sentiment, and outcome in your dashboard.",
            },
          },
          {
            "@type": "Question",
            "name": "Can AI make outbound sales calls?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Yes. AIxCaller's outbound AI calling feature places automated sales calls to your leads list, holds a natural conversation using AI voice technology, qualifies prospects, and books appointments — all without a human sales rep. It works 24/7 and can handle hundreds of calls simultaneously.",
            },
          },
          {
            "@type": "Question",
            "name": "What is speed to lead and why does it matter?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Speed to lead means calling a new prospect immediately after they express interest — for example, right after filling out a web form. Studies show businesses that call within 5 minutes are 100x more likely to reach the lead. AIxCaller can trigger an outbound AI call within 60 seconds of a new lead arriving, automatically.",
            },
          },
        ],
      },

      // ── Service schema for outbound ────────────────────────────────────────────────────────
      {
        "@type": "Service",
        "@id": "https://callerx.ai/#outbound-service",
        "name": "AI Outbound Calling & Sales Dialer",
        "description": "Automated AI outbound calling service that dials leads from your contact list, qualifies prospects, books appointments, drops voicemails, and sends follow-up SMS — all without a human sales rep.",
        "provider": { "@id": "https://callerx.ai/#organization" },
        "serviceType": "AI Outbound Call Center Software",
        "areaServed": "Worldwide",
        "url": "https://callerx.ai/#outbound",
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
        "@id": "https://callerx.ai/#inbound-service",
        "name": "AI Receptionist & 24/7 Phone Answering Service",
        "description": "AI-powered 24/7 phone answering service for businesses. Greets callers, answers questions, books appointments, qualifies leads, and transfers to humans during business hours.",
        "provider": { "@id": "https://callerx.ai/#organization" },
        "serviceType": "AI Virtual Receptionist",
        "areaServed": "Worldwide",
        "url": "https://callerx.ai",
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
