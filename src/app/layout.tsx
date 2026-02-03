import type { Metadata } from "next";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/convexClientProvider";
import { Modals } from "@/components/modals";
import { Toaster } from "sonner";
import { JotaiProvider } from "@/components/jotaiProvider";


export const metadata: Metadata = {
  title: "Sebas Note",
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
              <Modals />
              {children}
            </JotaiProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
