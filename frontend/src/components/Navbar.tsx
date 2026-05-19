"use client";
import Link from "next/link";
import styles from "./Navbar.module.css";
import { useEffect, useState } from "react";
import Logo from "./Logo";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Check if tenant_id cookie exists
    const hasCookie = document.cookie.includes("tenant_id=");
    setIsLoggedIn(hasCookie);
  }, []);

  // Close menu on route change / resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo} style={{ textDecoration: "none" }}>
          <Logo size={38} showText={true} dark={false} />
        </Link>

        {/* Desktop nav links */}
        <ul className={styles.navLinks}>
          <li><Link href="/#features">Features</Link></li>
          <li><Link href="/use-cases/real-estate-ai-voice-agent">Real Estate AI</Link></li>
          <li><Link href="/compare/bland-ai-alternative">Compare</Link></li>
          <li><Link href="/#pricing">Pricing</Link></li>
        </ul>

        {/* Desktop actions */}
        <div className={styles.actions}>
          {isLoggedIn ? (
            <Link href="/dashboard" className={styles.ctaBtn}>Go to Dashboard →</Link>
          ) : (
            <>
              <Link href="/login" className={`${styles.loginLink} ${styles.desktopOnly}`}>Log in</Link>
              <Link href="/signup" className={styles.ctaBtn}>Get Started Free →</Link>
            </>
          )}
          {/* Hamburger button — mobile only */}
          <button
            className={styles.hamburger}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span className={menuOpen ? styles.hamburgerClose : styles.hamburgerIcon}>
              {menuOpen ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile drop-down menu */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`}>
        <ul className={styles.mobileLinks}>
          <li><Link href="/#features" onClick={() => setMenuOpen(false)}>Features</Link></li>
          <li><Link href="/use-cases/real-estate-ai-voice-agent" onClick={() => setMenuOpen(false)}>Real Estate AI</Link></li>
          <li><Link href="/compare/bland-ai-alternative" onClick={() => setMenuOpen(false)}>Compare</Link></li>
          <li><Link href="/#pricing" onClick={() => setMenuOpen(false)}>Pricing</Link></li>
        </ul>
        <div className={styles.mobileActions}>
          {isLoggedIn ? (
            <Link href="/dashboard" className={styles.mobileCta} onClick={() => setMenuOpen(false)}>
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className={styles.mobileLogin} onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link href="/signup" className={styles.mobileCta} onClick={() => setMenuOpen(false)}>
                Get Started Free →
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Overlay */}
      {menuOpen && (
        <div className={styles.menuOverlay} onClick={() => setMenuOpen(false)} />
      )}
    </>
  );
}
