import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        AixCaller.live
      </Link>
      <ul className={styles.navLinks}>
        <li><Link href="/#features">Features</Link></li>
        <li><Link href="/#how-it-works">How It Works</Link></li>
        <li><Link href="/#use-cases">Use Cases</Link></li>
        <li><Link href="/#pricing">Pricing</Link></li>
      </ul>
      <div className={styles.actions}>
        <Link href="/login" style={{ fontWeight: 600, fontSize: "0.95rem", opacity: 0.8 }}>Log in</Link>
        <Link href="/signup" className="btn btn-primary" style={{ padding: "0.5rem 1.2rem", fontSize: "0.9rem" }}>
          Get Started
        </Link>
      </div>
    </nav>
  );
}
