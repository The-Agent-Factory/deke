import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HarmonyWidget } from "@/components/chat/harmony-widget";
import { NotificationPopup } from "@/components/notification-popup";
import { NewsletterPopup } from "@/components/newsletter-popup";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Deke Sharon | The Father of Contemporary A Cappella",
    template: "%s | Deke Sharon",
  },
  description:
    "World-renowned vocal coach, arranger, and the father of contemporary a cappella. Custom arrangements, coaching, workshops, and masterclasses for vocal groups worldwide.",
  keywords: [
    "a cappella",
    "vocal coach",
    "music arranger",
    "Deke Sharon",
    "vocal group",
    "singing",
    "Pitch Perfect",
    "The Sing-Off",
    "a cappella workshops",
    "vocal group coaching",
    "a cappella arrangements",
    "CASA",
    "ICCA",
    "In Transit Broadway",
  ],
  authors: [{ name: "Deke Sharon" }],
  metadataBase: new URL("https://dekesharon.com"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://dekesharon.com",
    siteName: "Deke Sharon",
    title: "Deke Sharon | The Father of Contemporary A Cappella",
    description:
      "World-renowned vocal coach, arranger, and the father of contemporary a cappella. Custom arrangements, coaching, workshops, and masterclasses for vocal groups worldwide.",
    images: [
      {
        url: "/images/deke/biotop.jpg",
        width: 1200,
        height: 630,
        alt: "Deke Sharon — The Father of Contemporary A Cappella",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@dekesharon",
    creator: "@dekesharon",
    title: "Deke Sharon | The Father of Contemporary A Cappella",
    description:
      "World-renowned vocal coach, arranger, and the father of contemporary a cappella.",
    images: ["/images/deke/biotop.jpg"],
  },
};

const personStructuredData = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Deke Sharon",
  url: "https://dekesharon.com",
  image: "https://dekesharon.com/images/deke/biotop.jpg",
  description:
    "World-renowned vocal coach, arranger, and the father of contemporary a cappella. Music director for Pitch Perfect, NBC's The Sing-Off, and Broadway's In Transit.",
  jobTitle: "Vocal Coach, Music Arranger, Producer",
  knowsAbout: ["A Cappella", "Vocal Coaching", "Music Arrangement", "Choral Music", "Music Production"],
  sameAs: [
    "https://en.wikipedia.org/wiki/Deke_Sharon",
    "https://www.imdb.com/name/nm1102503/",
    "https://www.facebook.com/dekesharon",
    "https://www.instagram.com/dekesharon",
  ],
  award: [
    "PT Barnum Award for Excellence in Entertainment",
    "CASA Lifetime Achievement Award",
    "A Cappella Music Awards Lifetime Achievement Award",
    "Grammy Nomination — Pitch Perfect 2 Soundtrack",
  ],
  worksFor: {
    "@type": "Organization",
    name: "Deke Sharon Music",
    url: "https://dekesharon.com",
  },
  hasOccupation: {
    "@type": "Occupation",
    name: "Vocal Coach and Music Arranger",
    occupationLocation: {
      "@type": "Country",
      name: "United States",
    },
  },
};

const serviceStructuredData = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Deke Sharon",
  url: "https://dekesharon.com",
  image: "https://dekesharon.com/images/deke/biotop.jpg",
  description:
    "Custom a cappella arrangements, vocal group coaching, workshops, masterclasses, and speaking engagements.",
  priceRange: "$$",
  serviceType: [
    "A Cappella Vocal Coaching",
    "Custom Music Arrangement",
    "Vocal Group Workshops",
    "Music Masterclasses",
    "Keynote Speaking",
  ],
  areaServed: "Worldwide",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`scroll-smooth ${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceStructuredData) }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
        >
          Skip to main content
        </a>
        <Header />
        <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
        <Footer />
        <HarmonyWidget />
        <NotificationPopup />
        <NewsletterPopup />
      </body>
    </html>
  );
}
