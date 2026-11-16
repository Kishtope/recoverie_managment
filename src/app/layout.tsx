import type { Metadata } from "next";
import { Anek_Devanagari, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { QueryProvider } from "@/components/providers/query-provider";
import { BASE_PATH } from "@/lib/base-path";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Headline font; the wdth axis enables the condensed cut used by .display-number.
const anek = Anek_Devanagari({
  subsets: ["latin", "devanagari"],
  axes: ["wdth"],
  variable: "--font-anek",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KishtoPe",
  description: "KishtoPe recovery management",
  // favicon.ico in src/app is picked up automatically; these add the PNG sizes, iOS icon and PWA manifest.
  icons: {
    icon: [
      { url: `${BASE_PATH}/brand/mark.svg`, type: "image/svg+xml" },
      { url: `${BASE_PATH}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${BASE_PATH}/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${BASE_PATH}/apple-touch-icon.png`, sizes: "180x180" }],
  },
  manifest: `${BASE_PATH}/site.webmanifest`,
};

/**
 * @component RootLayout
 * @description Root shell; mounts the tooltip and toast providers the shadcn components require.
 */
const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", anek.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <TooltipProvider>
            <Toaster>{children}</Toaster>
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
