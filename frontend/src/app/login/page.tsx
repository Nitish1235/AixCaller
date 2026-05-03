"use client";
import Link from "next/link";
import styles from "../auth.module.css";

export default function LoginPage() {
  return (
    <main className={styles.container}>
      <div className={styles.authCard}>
        <h1>Welcome Back</h1>
        <p>Log in to access your AixCaller.live dashboard.</p>
        
        <form onSubmit={(e) => e.preventDefault()}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" placeholder="you@company.com" required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input type="password" id="password" placeholder="••••••••" required />
          </div>
          <button type="submit" className={`btn btn-primary ${styles.submitBtn}`}>Log In</button>
        </form>

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        <button className={styles.socialBtn}>
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={20} height={20} />
          Continue with Google
        </button>

        <div className={styles.footerText}>
          Don't have an account? <Link href="/signup">Sign up</Link>
        </div>
      </div>
    </main>
  );
}
