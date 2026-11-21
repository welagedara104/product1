import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const display = Fraunces({
  variable: "--font-report-display",
  subsets: ["latin"],
});

const sans = Source_Sans_3({
  variable: "--font-report-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cranial Be.Sci audit",
  description: "Private behavioural-science website audit reports",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
