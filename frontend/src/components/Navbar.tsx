"use client";
import Link from "next/link";
import styles from "./Navbar.module.css";
import { useEffect, useState } from "react";
import Logo from "./Logo";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if tenant_id cookie exists
    const hasCookie = document.cookie.includes("tenant_id=");
    setIsLoggedIn(hasCookie);
  }, []);

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo} style={{ textDecoration: "none" }}>
        <Logo size={38} showText={true} dark={false} />
      </Link>
      <ul className={styles.navLinks}>
        <li><Link href="/#features">Features</Link></li>
        <li><Link href="/use-cases/real-estate-ai-voice-agent">Real Estate AI</Link></li>
        <li><Link href="/compare/bland-ai-alternative">Compare</Link></li>
        <li><Link href="/#pricing">Pricing</Link></li>
      </ul>
      <div className={styles.actions}>
        {isLoggedIn ? (
          <Link href="/dashboard" className={styles.ctaBtn}>Go to Dashboard →</Link>
        ) : (
          <>
            <Link href="/login" className={styles.loginLink}>Log in</Link>
            <Link href="/signup" className={styles.ctaBtn}>Get Started Free →</Link>
          </>
        )}
      </div>
    </nav>
  );
}
