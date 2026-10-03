import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Pwa } from "@/components/pwa";
export const metadata: Metadata = {
  title: { default: "JN Fin Services", template: "%s · JN Fin Services" },
  description: "Internal branch and team administration",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "JN Fin Services" },
  icons: {
    icon: "/branding/jayant-logo.jpg",
    apple: "/branding/jayant-logo.jpg",
  },
};
export const viewport: Viewport = { themeColor: "#082f17" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Browser extensions such as Grammarly add body attributes before hydration.
          Tolerate only this element; application children still report mismatches. */}
      <body suppressHydrationWarning>
        <a href="#main" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        {children}
        <Pwa />
      </body>
    </html>
  );
}
