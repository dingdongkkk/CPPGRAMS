import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./experience.css";
import "./voice-location.css";
import "./security.css";
import "./language.css";
import "./institution.css";
import "./portal.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jansetu-citizen-grievance.myacc5010.chatgpt.site"),
  title: "JanSetu — Your grievance, clearly heard",
  description: "Describe, file and track a public grievance in plain language.",
  openGraph: {
    title: "JanSetu — Your grievance, clearly heard",
    description: "Your voice. The right desk. A clear answer.",
    type: "website",
    images: [{ url: "/og.png", width: 1675, height: 941, alt: "JanSetu — Your voice. The right desk. A clear answer." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "JanSetu — Your grievance, clearly heard",
    description: "Your voice. The right desk. A clear answer.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
