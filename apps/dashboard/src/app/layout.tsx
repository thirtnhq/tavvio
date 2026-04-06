import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Open_Sans } from "next/font/google";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import "./globals.css";
import { ToastProvider } from "@useroutr/ui";
import { TooltipProvider } from "@/components/ui/tooltip";

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

export const metadata: Metadata = {
  title: {
    default: "Useroutr Dashboard",
    template: "%s | Useroutr Dashboard",
  },
  description: "Manage your payments, invoices, and analytics with Useroutr.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem("useroutr-theme");var t=p==="dark"?"dark":p==="light"?"light":window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";document.documentElement.classList.add(t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${openSans.variable} antialiased`}>
        <ThemeProvider>
          <QueryProvider>
            <Suspense>
              <AuthProvider>
                <TooltipProvider>
                  <ToastProvider>{children}</ToastProvider>
                </TooltipProvider>
              </AuthProvider>
            </Suspense>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
