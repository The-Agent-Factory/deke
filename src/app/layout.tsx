import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ConditionalChrome } from "@/components/layout/conditional-chrome";
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
  ],
  authors: [{ name: "Deke Sharon" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Deke Sharon",
    title: "Deke Sharon | The Father of Contemporary A Cappella",
    description:
      "World-renowned vocal coach, arranger, and the father of contemporary a cappella.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deke Sharon | The Father of Contemporary A Cappella",
    description:
      "World-renowned vocal coach, arranger, and the father of contemporary a cappella.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`scroll-smooth ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
        >
          Skip to main content
        </a>
        <ConditionalChrome
          header={<Header />}
          footer={<Footer />}
          widgets={
            <>
              <HarmonyWidget />
              <NotificationPopup />
              <NewsletterPopup />
            </>
          }
        >
          {children}
        </ConditionalChrome>
      </body>
    </html>
  );
}
