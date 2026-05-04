import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <div className={styles.logoIcon}>🎙️</div>
        AIxCaller<span className={styles.logoDot}>.live</span>
      </Link>
      <ul className={styles.navLinks}>
        <li><Link href="/#features">Features</Link></li>
        <li><Link href="/#how-it-works">How It Works</Link></li>
        <li><Link href="/#use-cases">Use Cases</Link></li>
        <li><Link href="/#pricing">Pricing</Link></li>
      </ul>
      <div className={styles.actions}>
        <Link href="/login" className={styles.loginLink}>Log in</Link>
        <Link href="/signup" className={styles.ctaBtn}>Get Started Free →</Link>
      </div>
    </nav>
  );
}
