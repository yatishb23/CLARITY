import type { Metadata } from "next";
import { Geist, Inter, Roboto_Flex } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const roboto = Roboto_Flex({ subsets: ["latin"], variable: "--font-header" });

export const metadata: Metadata = {
  title: "CLARITY - Explainable Radiology AI",
  description:
    "Advanced AI-powered radiology analysis with explainability features",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${roboto.variable} bg-background`}
    >
      <body className="font-sans antialiased bg-background text-foreground selection:bg-primary/20">
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
