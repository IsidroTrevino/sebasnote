import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/convexClientProvider";
import { Modals } from "@/components/modals";
import { Toaster } from "sonner";
import { JotaiProvider } from "@/components/jotaiProvider";
import { PwaRegister } from "@/components/pwaRegister";


export const metadata: Metadata = {
  title: "Sebas Note",
  description: "A personal workspace for notes, boards, references, rankings, spreadsheets, and music lists.",
  manifest: "/manifest.json",
  applicationName: "Sebas Note",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sebas Note",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en">
        <body className="bg-[#1a1a1a] min-h-screen">
          <ConvexClientProvider>
            <JotaiProvider>
              <Toaster 
                theme="dark"
                toastOptions={{
                  style: {
                    background: '#1e1e1e',
                    border: '1px solid #3a3a3a',
                    color: '#e5e5e5',
                  },
                }}              
              />
              <PwaRegister />
              <Modals />
              {children}
            </JotaiProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
