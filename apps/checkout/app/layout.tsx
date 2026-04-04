import type { Metadata } from "next";
import { Inter, Open_Sans, IBM_Plex_Mono } from "next/font/google";
import { WalletProviders } from "@/providers/WalletProviders";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Useroutr Checkout",
  description: "Secure payment checkout powered by Useroutr",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${openSans.variable} ${ibmPlexMono.variable} light`}
    >
      <body className="min-h-screen bg-background antialiased">
        <WalletProviders>{children}</WalletProviders>
      </body>
    </html>
  );
}
