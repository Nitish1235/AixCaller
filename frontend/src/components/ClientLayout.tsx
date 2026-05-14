"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePathname } from "next/navigation";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");

  return (
    <>
      {!isDashboard && (
        <div className="bg-mesh">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>
      )}
      {!isDashboard && <Navbar />}
      {children}
      {!isDashboard && <Footer />}
    </>
  );
}
