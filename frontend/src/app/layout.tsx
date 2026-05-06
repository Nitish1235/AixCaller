"use client";
import { Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePathname } from "next/navigation";

const outfit = Outfit({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");

  return (
    <html lang="en">
      <body className={outfit.className}>
        {!isDashboard && (
          <div className="bg-mesh">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="blob blob-3"></div>
          </div>
        )}
        
        {!isDashboard && <Navbar />}
        {children}
        {!isDashboard && <Footer />}
      </body>
    </html>
  );
}
